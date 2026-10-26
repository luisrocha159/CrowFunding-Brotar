import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { QueryRunner } from 'typeorm'
import { SupportCaseHistory1792800000004 } from '../src/shared/infrastructure/database/migrations/1792800000004-SupportCaseHistory'

test('S3-10: historial aditivo de soporte conserva eventos y bloquea su borrado por la API', async () => {
  const statements: string[] = []
  const runner = { query: async (sql: string) => { statements.push(sql); return [] } } as unknown as QueryRunner
  const migration = new SupportCaseHistory1792800000004()
  await migration.up(runner)
  const sql = statements.join('\n')
  assert.match(sql, /CREATE TABLE brotar_extension\.support_case_event/)
  assert.match(sql, /previous_status public\.support_case_status/)
  assert.match(sql, /reason varchar\(500\) NOT NULL/)
  assert.match(sql, /GRANT SELECT,INSERT ON brotar_extension\.support_case_event TO brotar_app/)
  assert.match(sql, /REVOKE UPDATE,DELETE ON brotar_extension\.support_case_event FROM brotar_app/)
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|COLUMN)\b/i)
  await assert.rejects(migration.down(), /no se elimina automáticamente/)
})
