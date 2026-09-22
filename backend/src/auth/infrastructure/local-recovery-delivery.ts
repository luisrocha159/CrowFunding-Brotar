import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { RecoveryDelivery } from '../application/password-recovery'

export const localRecoveryDirectory = (env: NodeJS.ProcessEnv): string => env.LOCALAPPDATA
  ? resolve(env.LOCALAPPDATA, 'Brotar', 'recovery-mail') : resolve('private/recovery-mail')

/** Buzón privado para ensayos locales; nunca publica tokens en la respuesta HTTP. */
export class LocalRecoveryDelivery implements RecoveryDelivery {
  constructor(private readonly env: NodeJS.ProcessEnv, private readonly directory = localRecoveryDirectory(env)) {}

  available(): boolean {
    if (this.env.NODE_ENV !== 'development' || this.env.PASSWORD_RESET_LOCAL_FILE !== 'true') return false
    if (!['127.0.0.1', 'localhost', '::1'].includes(this.env.HOST ?? '127.0.0.1')) return false
    try {
      const url = new URL(this.env.PUBLIC_WEB_ORIGIN ?? '')
      return ['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
        && url.origin === this.env.PUBLIC_WEB_ORIGIN
    } catch { return false }
  }

  async send(email: string, token: string): Promise<void> {
    if (!this.available()) throw new Error('Buzón local deshabilitado.')
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
    const text = `SOLO ENSAYO LOCAL — NO SE ENVIÓ CORREO\nPara: ${email}\nEnlace de uso único; vence en una hora:\n${this.env.PUBLIC_WEB_ORIGIN}/recuperar-contrasena?token=${encodeURIComponent(token)}\nNo compartir ni subir este archivo.\n`
    await writeFile(resolve(this.directory, `${Date.now()}-${randomUUID()}.txt`), text, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  }
}
