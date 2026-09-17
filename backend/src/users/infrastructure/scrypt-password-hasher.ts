import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { PasswordHasher } from '../application/register-user'

// OWASP scrypt: N=2^14, r=8, p=5; Node estable, sin dependencias nativas extra.
@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  private active = 0
  async verify(password: string, encoded: string | null): Promise<boolean> {
    if (this.active >= 2) throw new ServiceUnavailableException()
    this.active++
    try {
      const supported = /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded ?? '')
      // Mismo trabajo criptográfico para cuentas inexistentes y formatos no compatibles.
      const parts = supported ? encoded!.split('$') : ['scrypt', '16384', '8', '5', '0'.repeat(32), '0'.repeat(128)]
      const key = await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, parts[4]!, 64, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result))
      })
      return timingSafeEqual(key, Buffer.from(parts[5]!, 'hex')) && supported
    } finally { this.active-- }
  }
  async hash(password: string): Promise<string> {
    if (this.active >= 2) throw new ServiceUnavailableException()
    this.active++
    try {
      const salt = randomBytes(16).toString('hex')
      const key = await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, 64, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
      })
      return `scrypt$16384$8$5$${salt}$${key.toString('hex')}`
    } finally { this.active-- }
  }
}
