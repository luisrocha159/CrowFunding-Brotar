import { HttpException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { Request, Response } from 'express'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'

/** PostgreSQL compartido: el límite no se reinicia al abrir otro proceso de API. */
@Injectable()
export class CampaignWriteLimitGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request & { brotarUser: { id: string } }>()
    // Sin trust proxy: no se acepta una IP elegida por el solicitante en X-Forwarded-For.
    const keys = [`account:${request.brotarUser.id}`, `ip:${request.ip ?? 'unknown'}`].sort()
    const scope = 'campaign-write:v1'
    const allowed = await this.database.connection().transaction(async manager => {
      await manager.query(`DELETE FROM brotar_extension.rate_bucket WHERE key_hash IN (
        SELECT key_hash FROM brotar_extension.rate_bucket WHERE expires_at<now()-interval '1 day' LIMIT 100 FOR UPDATE SKIP LOCKED)`)
      let ok = true
      for (const key of keys) {
        const [bucket] = await manager.query(`INSERT INTO brotar_extension.rate_bucket(key_hash,requests,expires_at)
          VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key_hash) DO UPDATE SET
          requests=CASE WHEN brotar_extension.rate_bucket.expires_at<=now() THEN 1 ELSE LEAST(brotar_extension.rate_bucket.requests+1,21) END,
          expires_at=CASE WHEN brotar_extension.rate_bucket.expires_at<=now() THEN now()+interval '1 minute' ELSE brotar_extension.rate_bucket.expires_at END
          RETURNING requests`, [createHash('sha256').update(`${scope}:${key}`).digest('hex')])
        if (bucket.requests > 20) ok = false
      }
      return ok
    })
    if (!allowed) { http.getResponse<Response>().setHeader('Retry-After', '60'); throw new HttpException('Demasiados intentos. Espera un minuto; tu borrador se conserva.', 429) }
    return true
  }
}
