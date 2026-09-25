import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import { RESPONSIBILITY_ROLES } from '../src/roles/domain/responsibility'
import { readTestDatabaseTarget } from './database-target'

test('permisos y pertenencia reales: denegaciones en API, auditor en lectura y catálogo separado', { timeout: 90000 }, async () => {
  const config = readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES === 'true',
    'Configura DATABASE_ENABLED=true y ALLOW_DB_TEST_WRITES=true para esta prueba explícita.')
  assert.equal(config.host, '127.0.0.1'); assert.notEqual(process.env.NODE_ENV, 'production')

  const { container } = readTestDatabaseTarget(config)
  // Administración limitada a los fixtures de ESTA prueba. La API nunca recibe estas facultades.
  const admin = (sql: string) => execFileSync('docker',
    ['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'brotar_db'],
    { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 })

  const source = createDataSource(config)
  const suffix = randomUUID()
  const password = randomBytes(24).toString('hex')
  const ids: string[] = []
  const permissionCode = `prueba.permiso.${suffix}`
  const app = await NestFactory.create(AppModule, { logger: false })
  configureHttp(app, readEnvironment({ NODE_ENV: 'test' }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  const request = (path: string, cookie = '', body?: unknown) => fetch(`${base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brotar-Request': '1', Cookie: cookie, Origin: 'http://127.0.0.1:5173' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const register = async (label: string) => {
    const email = `perm-${label}-${suffix}@example.invalid`
    const created = await request('auth/register', '', { firstName: 'Prueba', lastName: 'Permisos', email, password, demoConsent: true })
    assert.equal(created.status, 201)
    const { id } = await created.json() as { id: string }
    assert.match(id, /^[a-f0-9-]{36}$/); ids.push(id)
    const login = await request('auth/login', '', { email, password })
    assert.equal(login.status, 200)
    return { id, cookie: login.headers.get('set-cookie')!.split(';')[0]! }
  }

  try {
    await source.initialize()

    // CA 1: las ocho responsabilidades existen separadas en el catálogo oficial.
    const catalog: { code: string }[] = await source.query(
      'SELECT code FROM public.role WHERE code = ANY($1) ORDER BY code', [[...RESPONSIBILITY_ROLES]])
    assert.deepEqual(catalog.map((row) => row.code), [...RESPONSIBILITY_ROLES].sort())

    const creator = await register('creador')
    const outsider = await register('ajeno')

    // CA 3: el registro público no concede ninguna responsabilidad.
    const granted: { code: string }[] = await source.query(
      'SELECT r.code FROM user_role ur JOIN role r ON r.id = ur.role_id WHERE ur.user_id = $1', [creator.id])
    assert.deepEqual(granted, [{ code: 'REGISTERED_USER' }])

    const types = await (await request('organizations/types', creator.cookie)).json() as { id: string }[]
    const created = await request('organizations', creator.cookie, {
      legalName: `Organización permisos ${suffix}`, tradeName: 'Permisos',
      organizationTypeId: types[0]!.id, contactEmail: 'contact@example.invalid', contactPhone: ''
    })
    assert.equal(created.status, 201)
    const organization = await created.json() as { id: string }

    // CA 2: la pertenencia se resuelve en la API. El dueño gestiona; un ajeno ni siquiera la ve.
    const own = await request(`organizations/${organization.id}/membership`, creator.cookie)
    assert.equal(own.status, 200)
    assert.deepEqual(await own.json(), { organizationId: organization.id, organizationRole: 'OWNER', manages: true })
    assert.equal((await request(`organizations/${organization.id}/membership`, outsider.cookie)).status, 404,
      'Un no miembro no distingue entre inexistente y ajena.')
    assert.equal((await request(`organizations/${organization.id}/membership`)).status, 401)

    // MEMBER pertenece pero no gestiona: la denegación no depende de ocultar botones.
    admin(`UPDATE organization_member SET organization_role='MEMBER' WHERE user_id='${creator.id}' AND organization_id='${organization.id}';`)
    assert.deepEqual(await (await request(`organizations/${organization.id}/membership`, creator.cookie)).json(),
      { organizationId: organization.id, organizationRole: 'MEMBER', manages: false })

    // Salir de la organización retira la pertenencia sin tocar la sesión.
    admin(`UPDATE organization_member SET left_at=now() WHERE user_id='${creator.id}' AND organization_id='${organization.id}';`)
    assert.equal((await request(`organizations/${organization.id}/membership`, creator.cookie)).status, 404)
    assert.equal((await request('auth/me', creator.cookie)).status, 200)
    admin(`UPDATE organization_member SET left_at=NULL, organization_role='OWNER' WHERE user_id='${creator.id}' AND organization_id='${organization.id}';`)

    // CA 3: el auditor lee pero no escribe, y acumular ADMIN no levanta la restricción.
    admin(`INSERT INTO user_role(user_id, role_id) SELECT '${creator.id}', id FROM role WHERE code IN ('AUDITOR','ADMIN');`)
    const auditorRoles = await (await request('access/roles', creator.cookie)).json() as { roles: { code: string }[] }
    assert.deepEqual(auditorRoles.roles.map((role) => role.code).sort(), ['ADMIN', 'AUDITOR', 'REGISTERED_USER'])
    assert.equal((await request(`organizations/${organization.id}/membership`, creator.cookie)).status, 200,
      'El auditor conserva la lectura.')
    const blocked = await request('organizations', creator.cookie, {
      legalName: `Bloqueada ${suffix}`, tradeName: 'Bloqueada',
      organizationTypeId: types[0]!.id, contactEmail: 'blocked@example.invalid', contactPhone: ''
    })
    assert.equal(blocked.status, 403, 'El auditor no escribe aunque acumule ADMIN.')
    assert.match((await blocked.json() as { message: string }).message, /auditor/i)
    const count: { n: string }[] = await source.query(
      'SELECT count(*)::text AS n FROM organization WHERE created_by = $1', [creator.id])
    assert.equal(count[0]!.n, '1', 'La escritura denegada no dejó rastro.')

    admin(`DELETE FROM user_role WHERE user_id='${creator.id}' AND role_id IN (SELECT id FROM role WHERE code IN ('AUDITOR','ADMIN'));`)

    // CA 2: el mecanismo de permisos resuelve contra role_permission, que hoy está vacía (D06).
    const empty: { n: string }[] = await source.query('SELECT count(*)::text AS n FROM role_permission')
    assert.equal(empty[0]!.n, '0', 'El catálogo de permisos sigue pendiente de D06; no se inventa aquí.')
    const { TypeormPermissionRepository } = await import('../src/roles/infrastructure/typeorm-permission.repository')
    const repository = new TypeormPermissionRepository({ connection: () => source } as never)
    assert.deepEqual(await repository.granted(creator.id), [], 'Sin catálogo no hay permiso concedido.')

    // Con una concesión de prueba el mecanismo sí resuelve, y se retira al terminar.
    admin(`INSERT INTO permission(code, resource, action, description)
      VALUES('${permissionCode}','prueba','read','Permiso temporal de esta prueba');
      INSERT INTO role_permission(role_id, permission_id)
      SELECT r.id, p.id FROM role r, permission p WHERE r.code='REGISTERED_USER' AND p.code='${permissionCode}';`)
    assert.deepEqual(await repository.granted(creator.id), [permissionCode])
    assert.deepEqual(await repository.granted(outsider.id), [permissionCode])

    // Un rol caducado deja de conceder su permiso: se lee de la base en cada petición.
    admin(`UPDATE user_role SET granted_at=now()-interval '2 days', expires_at=now()-interval '1 day' WHERE user_id='${creator.id}';`)
    assert.deepEqual(await repository.granted(creator.id), [])
    admin(`UPDATE user_role SET expires_at=NULL, granted_at=now() WHERE user_id='${creator.id}';`)
  } finally {
    await app.close()
    try {
      admin(`DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code='${permissionCode}');
        DELETE FROM permission WHERE code='${permissionCode}';`)
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/)
        admin(`DELETE FROM organization WHERE created_by='${id}';`)
        if (source.isInitialized) await source.getRepository(UserSchema).delete({ id })
      }
    } finally { if (source.isInitialized) await source.destroy() }
  }
})
