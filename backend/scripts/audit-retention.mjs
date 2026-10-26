import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'

// Separado del servidor: nunca concede DELETE de auditoría al rol de API.
const [command, ...flags] = process.argv.slice(2)
if (!['plan','apply'].includes(command) || flags.some(flag => flag!=='--confirm-12-months')
  || (command==='apply' && !flags.includes('--confirm-12-months'))) throw new Error('Uso: node scripts/audit-retention.mjs plan | apply --confirm-12-months')
if (process.env.NODE_ENV==='production') throw new Error('Mantenimiento local del MVP: no disponible en producción.')
const require = createRequire(import.meta.url), infra = new URL('../../infra/postgres-v2/', import.meta.url)
const admin = parseEnv(readFileSync(new URL('.env', infra), 'utf8'))
const { readMigrationConfig } = require('../dist/shared/infrastructure/database/migration.config.js')
const { createMigrationDataSource } = require('../dist/shared/infrastructure/database/migration-data-source.js')
const { auditRetention } = require('../dist/audit/audit-retention.js')
const config = readMigrationConfig({ MIGRATION_DB_HOST: '127.0.0.1', MIGRATION_DB_PORT: admin.POSTGRES_PORT,
  MIGRATION_DB_NAME: 'brotar_db', MIGRATION_DB_USER: 'postgres', MIGRATION_DB_PASSWORD: admin.POSTGRES_PASSWORD })
const source = createMigrationDataSource(config)
await source.initialize()
try {
  // Siempre planificar antes. Un bloqueo conserva TODO el detalle, no una selección incompleta de casos.
  const plan = await auditRetention(source)
  console.log(JSON.stringify(plan))
  if (command==='apply' && !plan.held && plan.eligible!=='0') {
    const repository = fileURLToPath(new URL('../../', import.meta.url))
    const directory = resolve(process.env.BROTAR_RETENTION_BACKUP_DIR ?? join(homedir(),'Documents','brotar-privado','retencion'))
    const inside = relative(repository,directory)
    if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw new Error('El respaldo debe quedar fuera del repositorio.')
    mkdirSync(directory,{recursive:true,mode:0o700})
    const filename = `audit-retention-${randomUUID()}.dump`, containerFile = `/tmp/${filename}`, backupFile = join(directory,filename)
    const compose = ['compose','--env-file',fileURLToPath(new URL('.env',infra)),'-f',fileURLToPath(new URL('compose.yaml',infra))]
    const published = execFileSync('docker',[...compose,'port','postgres','5432'],{timeout:15000,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
    if (published!==`127.0.0.1:${config.port}`) throw new Error('El respaldo y la conexión deben apuntar al mismo contenedor y puerto local.')
    execFileSync('docker',[...compose,'exec','-T','postgres','pg_dump','-U','postgres','-d','brotar_db','-Fc','-f',containerFile],{timeout:180000,stdio:'pipe'})
    execFileSync('docker',[...compose,'exec','-T','postgres','pg_restore','--list',containerFile],{timeout:30000,stdio:'pipe'})
    execFileSync('docker',[...compose,'cp',`postgres:${containerFile}`,backupFile],{timeout:30000,stdio:'pipe'})
    if (statSync(backupFile).size<100) throw new Error('No se confirmó el respaldo. No se aplica retención.')
    console.log(`Respaldo privado completo: ${backupFile}`)
    // Se vuelven a comprobar bloqueos dentro de la transacción; plan no autoriza un estado obsoleto.
    console.log(JSON.stringify(await auditRetention(source,true)))
  }
} finally { await source.destroy() }
