import { Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'
import type { RecoveryDelivery } from '../application/password-recovery'

export function smtpRecoveryConfig(env: NodeJS.ProcessEnv) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM || !env.PUBLIC_WEB_ORIGIN) return null
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.SMTP_FROM)) return null
  const port = Number(env.SMTP_PORT ?? '587')
  if (![465, 587].includes(port)) return null
  let url: URL
  try { url = new URL(env.PUBLIC_WEB_ORIGIN) } catch { return null }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
  if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
  return { host: env.SMTP_HOST, port, user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.SMTP_FROM, origin: url.origin }
}

@Injectable()
export class SmtpRecoveryDelivery implements RecoveryDelivery {
  available(): boolean { return smtpRecoveryConfig(process.env) !== null }

  async send(email: string, token: string): Promise<void> {
    const config = smtpRecoveryConfig(process.env)
    if (!config) throw new Error('Correo no configurado.')
    const transport = nodemailer.createTransport({
      host: config.host, port: config.port, secure: config.port === 465, requireTLS: true,
      auth: { user: config.user, pass: config.password },
      tls: { rejectUnauthorized: true }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true
    })
    try {
      const result = await transport.sendMail({
        from: config.from, to: email, subject: 'Brotar: restablecer tu contraseña',
        text: `Solicitaste restablecer tu contraseña. Este enlace vence en una hora y se utiliza una sola vez:\n${config.origin}/recuperar-contrasena?token=${encodeURIComponent(token)}\nSi no lo solicitaste, ignora este mensaje.`
      })
      if (!result.accepted.length) throw new Error('El servidor de correo no aceptó el mensaje.')
    } catch {
      // Respuesta pública uniforme para no distinguir cuentas por un fallo del remitente.
      // Solo registra el fallo operacional, nunca destinatarios, tokens o credenciales.
      console.error('No se pudo entregar un mensaje de recuperación. Revisar el servicio SMTP.')
    } finally { transport.close() }
  }
}
