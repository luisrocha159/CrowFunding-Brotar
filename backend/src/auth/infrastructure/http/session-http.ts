import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { Request, Response, CookieOptions } from 'express'
import { readEnvironment } from '../../../config/environment'

export const SESSION_COOKIE = 'brotar_session'
export function readSessionCookie(request: Request): string | undefined {
  const entries = (request.headers.cookie ?? '').split(';').map(item => item.trim()).filter(item => item.startsWith(`${SESSION_COOKIE}=`))
  if (entries.length !== 1) return undefined
  const value = entries[0]!.slice(SESSION_COOKIE.length + 1)
  return /^[a-f0-9]{64}$/.test(value) ? value : undefined
}
export function sessionCookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api' }
}
export function clearSessionCookie(response: Response): void { response.clearCookie(SESSION_COOKIE, sessionCookieOptions()) }

@Injectable()
export class SessionMutationGuard implements CanActivate {
  private readonly origins = readEnvironment(process.env).corsOrigins
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    if (request.headers['x-brotar-request'] !== '1'
      || (request.headers.origin !== undefined && !this.origins.includes(request.headers.origin))
      || request.headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException('Origen de solicitud no permitido.')
    return true
  }
}
