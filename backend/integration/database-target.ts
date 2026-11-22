import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import type { DatabaseConfig } from '../src/shared/infrastructure/database/database.config'

// Los tests con escritura apuntan exclusivamente al Compose de esta copia.
// Nunca asumir el nombre o el puerto de otra instalación local.
export function readTestDatabaseTarget(config: DatabaseConfig) {
  const env = parseEnv(readFileSync(resolve(process.cwd(), '../infra/postgres-v2/.env'), 'utf8'))
  const project = env.BROTAR_COMPOSE_PROJECT ?? 'brotar-provisional-v2'
  assert.match(project, /^[a-z0-9][a-z0-9_-]*$/)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.port, Number(env.POSTGRES_PORT))
  assert.equal(config.database, 'brotar_db')
  return { container: `${project}-postgres-1`, project, port: String(config.port) }
}

// A grant acknowledged by the API should already exist. This short settling window
// accommodates the clock adjustments observed on Docker Desktop, without retrying a mutation.
export async function waitForEffectiveAssignments(read: () => { label: string; age: number | null }[]) {
  const clockMarginSeconds = 5
  const deadline = performance.now() + 20_000
  for (;;) {
    const assignments = read()
    assert.ok(assignments.length, 'Se esperaba al menos una asignación')
    for (const { label, age } of assignments) {
      assert.ok(age !== null && age >= -clockMarginSeconds, `Asignación inmediata ausente o futura: ${label}`)
    }
    if (assignments.every(({ age }) => age !== null && age >= clockMarginSeconds)) return
    assert.ok(performance.now() < deadline, 'El reloj de PostgreSQL no estabilizó la vigencia de las asignaciones.')
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}
