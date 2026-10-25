import { createHash } from 'node:crypto'
import type { DataSource } from 'typeorm'

/** Límite compartido entre procesos. No confía en X-Forwarded-For. */
export async function writeBudget(source: DataSource, scope: string, userId: string, ip: string): Promise<boolean> {
  return source.transaction(async manager => {
    await manager.query(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN (
      SELECT key_hash FROM brotar_extension.rate_bucket WHERE expires_at<now()-interval '1 day' LIMIT 100 FOR UPDATE SKIP LOCKED)`)
    let allowed = true
    for (const key of [`account:${userId}`,`ip:${ip}`].sort()) {
      const [bucket] = await manager.query(`INSERT INTO brotar_extension.rate_bucket(key_hash,requests,expires_at)
        VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key_hash) DO UPDATE SET
        requests=CASE WHEN brotar_extension.rate_bucket.expires_at<=now() THEN 1 ELSE LEAST(brotar_extension.rate_bucket.requests+1,21) END,
        expires_at=CASE WHEN brotar_extension.rate_bucket.expires_at<=now() THEN now()+interval '1 minute' ELSE brotar_extension.rate_bucket.expires_at END
        RETURNING requests`,[createHash('sha256').update(`${scope}:${key}`).digest('hex')])
      if (bucket.requests>20) allowed=false
    }
    return allowed
  })
}
