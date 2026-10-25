import { HttpException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { Request, Response } from 'express'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { writeBudget } from '../../shared/infrastructure/http/write-budget'

/** PostgreSQL compartido: el límite no se reinicia al abrir otro proceso de API. */
@Injectable()
export class CampaignWriteLimitGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request & { brotarUser: { id: string } }>()
    // Sin trust proxy: no se acepta una IP elegida por el solicitante en X-Forwarded-For.
    const allowed = await writeBudget(this.database.connection(),'campaign-write:v1',request.brotarUser.id,request.ip ?? 'unknown')
    if (!allowed) { http.getResponse<Response>().setHeader('Retry-After', '60'); throw new HttpException('Demasiados intentos. Espera un minuto; tu borrador se conserva.', 429) }
    return true
  }
}
