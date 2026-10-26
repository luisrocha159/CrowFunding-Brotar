import { Injectable } from '@nestjs/common'
import nodemailer from 'nodemailer'
import type { RecoveryDelivery } from '../application/password-recovery'

export function smtpRecoveryConfig(env: NodeJS.ProcessEnv) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM || !env.PUBLIC_WEB_ORIGIN) return null
  const host=env.SMTP_HOST.trim().toLowerCase(),user=env.SMTP_USER.trim(),from=env.SMTP_FROM.trim()
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)) return null
  // Solo Gmail: su clave de aplicación puede copiarse como cuatro grupos separados.
  // No normalizar contraseñas de usuarios de Brotar ni claves de otros servidores SMTP.
  const password=host==='smtp.gmail.com'?env.SMTP_PASSWORD.replace(/\s/g,''):env.SMTP_PASSWORD
  if(host==='smtp.gmail.com'&&(!/^[A-Za-z0-9]{16}$/.test(password)||user.toLowerCase()!==from.toLowerCase()))return null
  const port = Number(env.SMTP_PORT ?? '587')
  if (![465, 587].includes(port)) return null
  let url: URL
  try { url = new URL(env.PUBLIC_WEB_ORIGIN) } catch { return null }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
  if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
  return { host, port, user, password, from, origin: url.origin }
}

/** Misma conexión TLS para recuperación y diagnóstico; no habilita logs de credenciales. */
export function smtpRecoveryTransport(config:NonNullable<ReturnType<typeof smtpRecoveryConfig>>){
  return nodemailer.createTransport({
    host:config.host,port:config.port,secure:config.port===465,requireTLS:true,
    auth:{user:config.user,pass:config.password},tls:{rejectUnauthorized:true},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true
  })
}

@Injectable()
export class SmtpRecoveryDelivery implements RecoveryDelivery {
  available(): boolean { return smtpRecoveryConfig(process.env) !== null }

  async send(email: string, token: string): Promise<void> {
    const config = smtpRecoveryConfig(process.env)
    if (!config) throw new Error('Correo no configurado.')
    const transport = smtpRecoveryTransport(config)
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
