import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { DataSource } from 'typeorm'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { readMigrationConfig } from '../src/shared/infrastructure/database/migration.config'
import {
  createMigrationDataSource, MIGRATIONS, MIGRATIONS_SCHEMA, MIGRATIONS_TABLE
} from '../src/shared/infrastructure/database/migration-data-source'

// Base desechable con nombre propio: nunca se toca brotar_db ni la copia del ensayo.
const GUARD_DATABASE = `brotar_db_drill_guard_${randomBytes(6).toString('hex')}`
const REJECTED_DATABASE = `brotar_db_drill_rejected_${randomBytes(6).toString('hex')}`

function adminConfig(): ReturnType<typeof readMigrationConfig> {
  const local = parseEnv(readFileSync(resolve(process.cwd(), '../infra/postgres-v2/.env'), 'utf8'))
  return readMigrationConfig({
    MIGRATION_DB_HOST: '127.0.0.1',
    MIGRATION_DB_PORT: local.POSTGRES_PORT,
    MIGRATION_DB_NAME: 'brotar_db',
    MIGRATION_DB_USER: 'postgres',
    MIGRATION_DB_PASSWORD: local.POSTGRES_PASSWORD
  })
}

// DataSource directo: el proyecto no incluye @types/pg y las demás integraciones usan TypeORM.
async function withAdmin<T>(database: string, run: (source: DataSource) => Promise<T>): Promise<T> {
  const config = adminConfig()
  const source = new DataSource({
    type: 'postgres', host: config.host, port: config.port, database,
    username: config.username, password: config.password, ssl: false,
    entities: [], synchronize: false, dropSchema: false, migrationsRun: false,
    logging: false, connectTimeoutMS: 5000, extra: { max: 1 }
  })
  await source.initialize()
  try { return await run(source) } finally { await source.destroy() }
}

test('migraciones: control fuera de public, línea base aplicada y sin pendientes', { timeout: 60000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL de desarrollo.')

  await withAdmin('brotar_db', async (source) => {
    // La tabla de control vive aparte: dentro de public alteraría el inventario de la línea base.
    const placement: { schema: string }[] = await source.query(
      `SELECT n.nspname AS schema FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = $1 AND c.relkind = 'r'`, [MIGRATIONS_TABLE])
    assert.deepEqual(placement, [{ schema: MIGRATIONS_SCHEMA }])

    const official: { n: number }[] = await source.query(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'`)
    assert.equal(official[0]?.n, 59, 'Migrar no debe alterar el inventario oficial.')

    const applied: { name: string }[] = await source.query(
      `SELECT name FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY timestamp`)
    assert.deepEqual(applied.map((row) => row.name), MIGRATIONS.map((migration) => migration.name))
  })
})

test('migraciones: una base incompleta se rechaza en vez de marcarse migrada', { timeout: 90000 }, async (context) => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL de desarrollo.')

  await withAdmin('postgres', (source) => source.query(`CREATE DATABASE ${GUARD_DATABASE}`))
  context.after(async () => {
    await withAdmin('postgres', (source) => source.query(`DROP DATABASE IF EXISTS ${GUARD_DATABASE}`))
  })

  await withAdmin(GUARD_DATABASE, (source) => source.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`))
  const source = createMigrationDataSource({ ...adminConfig(), database: GUARD_DATABASE })
  await source.initialize()
  try {
    await assert.rejects(
      () => source.runMigrations({ transaction: 'each' }),
      /línea base no está instalada/,
      'Sin el esquema oficial la migración debe fallar, no registrar un avance falso.'
    )
  } finally { await source.destroy() }

  // El rechazo no deja rastro: la base sigue sin migraciones registradas.
  const recorded = await withAdmin(GUARD_DATABASE, (source) => source
    .query(`SELECT count(*)::int AS n FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`)
    .then((rows: { n: number }[]) => rows[0]?.n ?? 0)
    .catch(() => 0))
  assert.equal(recorded, 0)
})

test('migraciones: REJECTED se añade sobre SQL oficial aislado, conserva datos y admite repetir up', { timeout: 90000 }, async (context) => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true', 'Solo ensayo explícito local.')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(config.host), 'Solo base LOCAL.')
  await withAdmin('postgres', (source) => source.query(`CREATE DATABASE ${REJECTED_DATABASE}`))
  context.after(async () => {
    await withAdmin('postgres', (source) => source.query(`DROP DATABASE IF EXISTS ${REJECTED_DATABASE}`))
  })
  const official = readFileSync(resolve(process.cwd(), '../infra/postgres-v2/official-schema.sql'), 'utf8')
  const enumValues = (source: DataSource) => source.query(
    `SELECT enumlabel FROM pg_enum WHERE enumtypid='public.campaign_status'::regtype ORDER BY enumsortorder`)
  const snapshot = (source: DataSource) => source.query(
    `SELECT code, name FROM public.role ORDER BY code`)
  let originalValues: { enumlabel: string }[] = []
  let originalRoles: unknown = []
  const legacyOwner = randomUUID(), legacyCampaign = randomUUID(), otherCampaign = randomUUID()
  const legacyActivity = randomUUID(), secondActivity = randomUUID(), foreignActivity = randomUUID(), legacyMilestone = randomUUID()
  await withAdmin(REJECTED_DATABASE, async (source) => {
    await source.query(official)
    originalValues = await enumValues(source)
    originalRoles = await snapshot(source)
    assert.equal((await source.query('SELECT count(*)::int AS n FROM public.category'))[0].n, 0, 'El SQL oficial no trae categorías de campañas.')
    assert.ok(!originalValues.some((row) => row.enumlabel === 'REJECTED'))
    await source.query(`INSERT INTO public.app_user(id,email,password_hash) VALUES('${legacyOwner}','migration-fixture@example.invalid','fixture-no-login');
      INSERT INTO public.campaign(id,slug,title,campaign_type,creator_user_id) VALUES
        ('${legacyCampaign}','legacy-fixture','Campaña anterior','DONATION','${legacyOwner}'),
        ('${otherCampaign}','other-fixture','Otra campaña','DONATION','${legacyOwner}');
      INSERT INTO public.campaign_activity(id,campaign_id,name) VALUES
        ('${legacyActivity}','${legacyCampaign}','Preparar terreno'),('${secondActivity}','${legacyCampaign}','Instalar riego'),
        ('${foreignActivity}','${otherCampaign}','Actividad ajena');
      INSERT INTO public.milestone(id,campaign_id,activity_id,name) VALUES('${legacyMilestone}','${legacyCampaign}','${legacyActivity}','Huerto listo');`)
    await source.query(`CREATE SCHEMA ${MIGRATIONS_SCHEMA}`)
  })
  const source = createMigrationDataSource({ ...adminConfig(), database: REJECTED_DATABASE })
  await source.initialize()
  try {
    const applied = await source.runMigrations({ transaction: 'each' })
    assert.deepEqual(applied.map((row) => row.name), MIGRATIONS.map((migration) => migration.name))
    assert.deepEqual(await enumValues(source), [...originalValues, { enumlabel: 'REJECTED' }])
    assert.deepEqual(await snapshot(source), originalRoles, 'Los catálogos iniciales se conservan.')
    assert.deepEqual(await source.query(`SELECT 'REJECTED'::public.campaign_status::text AS status`), [{ status: 'REJECTED' }])
    assert.deepEqual(await source.runMigrations({ transaction: 'each' }), [])
    assert.equal((await source.query('SELECT count(*)::int AS n FROM public.category WHERE is_active=true'))[0].n, 5, 'Instalación desde cero: categorías disponibles sin carga manual.')
    const demoPolicies=await source.query("SELECT t.code FROM brotar_extension.verification_policy p JOIN public.verification_type t ON t.id=p.verification_type_id WHERE p.is_active AND p.version='mvp-demo-1.0-20261023' ORDER BY t.code")
    assert.deepEqual(demoPolicies.map((row:{code:string})=>row.code),['KYB_LEGAL','KYB_REPRESENTATIVE','KYC_IDENTITY'],'Instalación limpia deja los tres acuerdos sintéticos, no requiere insertar políticas a mano.')
    assert.deepEqual(await source.query("SELECT key,value FROM public.system_setting WHERE key LIKE 'support.%' ORDER BY key"),[{key:'support.escalation_hours',value:120},{key:'support.first_response_hours',value:48}])
    await source.query("UPDATE public.system_setting SET value='24'::jsonb WHERE key='support.first_response_hours'")
    const {MvpDemoAgreements1792713600000}=await import('../src/shared/infrastructure/database/migrations/1792713600000-MvpDemoAgreements')
    const agreementRunner=source.createQueryRunner()
    try{await new MvpDemoAgreements1792713600000().up(agreementRunner)}finally{await agreementRunner.release()}
    assert.equal((await source.query("SELECT value FROM public.system_setting WHERE key='support.first_response_hours'"))[0].value,24,'Reaplicar conserva una configuración existente.')
    assert.equal((await source.query("SELECT count(*)::int AS n FROM brotar_extension.verification_policy WHERE version='mvp-demo-1.0-20261023'"))[0].n,3,'Reaplicar no duplica ni sustituye políticas.')
    assert.deepEqual(await source.query(`SELECT has_table_privilege('brotar_app','public.payment_event','INSERT') AS can_append,
      has_table_privilege('brotar_app','public.payment_event','UPDATE') AS can_edit,
      has_table_privilege('brotar_app','public.payment_event','DELETE') AS can_delete`),
    [{can_append:true,can_edit:false,can_delete:false}], 'El rol de API conserva el historial financiero como inserción/lectura.')
    assert.deepEqual(await source.query(`SELECT has_table_privilege('brotar_app','public.audit_log','SELECT,INSERT') AS can_append,
      has_table_privilege('brotar_app','public.audit_log','UPDATE') AS can_edit,
      has_table_privilege('brotar_app','public.audit_log','DELETE') AS can_delete`),
    [{can_append:true,can_edit:false,can_delete:false}], 'La auditoría de la aplicación solo admite lectura e inserción; no modifica el esquema oficial.')
    const { ProvisionalCatalogs1792015200000 } = await import('../src/shared/infrastructure/database/migrations/1792015200000-ProvisionalCatalogs')
    await source.query("UPDATE public.category SET name='Catálogo personalizado',is_active=false WHERE slug='medio-ambiente'")
    const catalogRunner = source.createQueryRunner()
    try { await new ProvisionalCatalogs1792015200000().up(catalogRunner) } finally { await catalogRunner.release() }
    assert.deepEqual(await source.query("SELECT name,is_active FROM public.category WHERE slug='medio-ambiente'"), [{ name: 'Catálogo personalizado', is_active: false }], 'Reaplicar no pisa decisiones ni reactiva categorías desactivadas.')
    const links = () => source.query('SELECT activity_id FROM brotar_extension.milestone_activity WHERE milestone_id=$1 ORDER BY activity_id', [legacyMilestone])
    assert.deepEqual(await links(), [{ activity_id: legacyActivity }], 'Migra el vínculo anterior sin borrar ni modificar el hito.')
    await source.query('INSERT INTO brotar_extension.milestone_activity(milestone_id,activity_id) VALUES($1,$2)', [legacyMilestone, secondActivity])
    assert.equal((await links()).length, 2)
    await assert.rejects(() => source.query('INSERT INTO brotar_extension.milestone_activity(milestone_id,activity_id) VALUES($1,$2)', [legacyMilestone, foreignActivity]), /misma campaña/)
    await assert.rejects(() => source.query('INSERT INTO brotar_extension.milestone_activity(milestone_id,activity_id) VALUES($1,$2)', [legacyMilestone, secondActivity]), /duplicate key/)
    assert.deepEqual(await source.query(`SELECT has_schema_privilege('brotar_app','brotar_extension','USAGE') AS allowed,
      has_table_privilege('brotar_app','brotar_extension.milestone_activity','SELECT,INSERT,UPDATE,DELETE') AS writable`), [{ allowed: true, writable: true }])
    const { MilestoneActivities1791849600000 } = await import('../src/shared/infrastructure/database/migrations/1791849600000-MilestoneActivities')
    const runner = source.createQueryRunner()
    try { await new MilestoneActivities1791849600000().up(runner) } finally { await runner.release() }
    assert.equal((await links()).length, 2, 'Reaplicar en una copia restaurada conserva todos los vínculos y no duplica el anterior.')
    await source.query('DELETE FROM public.campaign_activity WHERE id=$1', [legacyActivity])
    assert.deepEqual(await links(), [{ activity_id: secondActivity }], 'Borrar una actividad no elimina el hito ni sus demás relaciones.')
    assert.deepEqual(await source.query('SELECT id,activity_id FROM public.milestone WHERE id=$1', [legacyMilestone]), [{ id: legacyMilestone, activity_id: null }])
    await assert.rejects(() => source.undoLastMigration({ transaction: 'each' }), /no se revierte automáticamente/, 'No se ofrece un down que elimine restricciones o datos sin revisión.')
    // REJECTED sigue sin permitir eliminar su ENUM; no depende de ser la última.
    const { CampaignRejected1791244800000 } = await import('../src/shared/infrastructure/database/migrations/1791244800000-CampaignRejected')
    await assert.rejects(() => new CampaignRejected1791244800000().down(), /no elimina valores ENUM/)
    assert.equal(await source.showMigrations(), false)
    assert.deepEqual((await source.query("SELECT code FROM public.permission WHERE code IN ('campaign.lifecycle.read','campaign.lifecycle.manage','campaign.manage.own') ORDER BY code")).map((r:{code:string})=>r.code),['campaign.lifecycle.manage','campaign.lifecycle.read','campaign.manage.own'],'Cada permiso tiene un recurso distinto; no se omiten mutaciones por una colisión resource/action.')
    const tables: { n: number }[] = await source.query(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r'`)
    assert.equal(tables[0]?.n, 59)
    // Carga sintética SOLO en esta base desechable: verifica el plan real, sin forzar índices.
    await source.query(`INSERT INTO public.campaign(id,slug,title,campaign_type,creator_user_id)
      SELECT public.gen_random_uuid(),'load-identity-'||n,'Proyecto de carga '||n,'DONATION',$1 FROM generate_series(1,6000) n`, [legacyOwner])
    await source.query(`INSERT INTO public.campaign_story(campaign_id,problem,solution,beneficiaries,expected_results)
      SELECT id,'Problema de carga',CASE WHEN slug='load-identity-6000' THEN 'Restauración del humedal Ñandú mediante árboles nativos de Samaipata'
      ELSE md5(slug)||' '||md5(slug||'material')||' '||md5(slug||'actividad') END,'Beneficiarios de carga','Resultado de carga'
      FROM public.campaign WHERE slug LIKE 'load-identity-%'`)
    await source.query('VACUUM ANALYZE public.campaign_story')
    const explanation = await source.query(`EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON) SELECT campaign_id FROM public.campaign_story WHERE solution OPERATOR(public.%) $1`, ['Restauración del humedal Ñandú mediante árboles nativos de Samaipata'])
    const measured = explanation[0]['QUERY PLAN'][0]
    const [index] = await source.query("SELECT indisvalid FROM pg_index WHERE indexrelid='public.campaign_story_solution_trgm_idx'::regclass")
    assert.equal(index.indisvalid, true, 'Índice disponible y válido; no se obliga al planificador a usarlo en una carga pequeña.')
    assert.equal(measured.Plan['Actual Rows'], 1)
    context.diagnostic(`Carga sintética de búsqueda: 6000 registros, 1 candidato, plan ${measured.Plan['Node Type']}, ejecución ${measured['Execution Time']} ms, índice GIN válido. No es una medición de capacidad de producción ni garantiza que cada consulta use índice.`)
  } finally { await source.destroy() }
})
