import { Injectable, HttpException, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { Request, Response } from 'express'

// Límite local de una instancia. Antes de despliegue multiinstancia usar almacén compartido.
@Injectable()
export class RegistrationLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, { count: number; until: number }>()
  canActivate(context: ExecutionContext): boolean {
    const now = Date.now()
    for (const [key, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(key)
    const http = context.switchToHttp()
    // Express sin trust proxy: no confía en X-Forwarded-For proporcionado por el cliente.
    const key = http.getRequest<Request>().ip ?? 'unknown'
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + 60000 }
    if (bucket.count >= 20 || (!this.buckets.has(key) && this.buckets.size >= 256)) {
      http.getResponse<Response>().setHeader('Retry-After', '60')
      throw new HttpException('Demasiadas solicitudes. Espera un minuto e inténtalo nuevamente.', 429)
    }
    bucket.count++
    this.buckets.set(key, bucket)
    return true
  }
}
