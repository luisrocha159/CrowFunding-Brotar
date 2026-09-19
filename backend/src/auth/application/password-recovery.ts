export interface PasswordResetToken {
  raw: string
  hash: string
  expiresAt: Date
}

export interface PasswordResetTokens {
  create(): PasswordResetToken
  hash(raw: string): string
}

export interface PasswordRecoveryRepository {
  issue(email: string, tokenHash: string, expiresAt: Date): Promise<boolean>
  reset(tokenHash: string, passwordHash: string): Promise<boolean>
}

export interface PasswordRecoveryHasher {
  hash(password: string): Promise<string>
}

export class PasswordResetUnavailable extends Error {}

export class PasswordRecovery {
  constructor(
    private readonly repository: PasswordRecoveryRepository,
    private readonly passwords: PasswordRecoveryHasher,
    private readonly tokens: PasswordResetTokens,
    private readonly exposeLocalResetLink = false
  ) {}

  async request(email: string): Promise<{ accepted: true; resetPath?: string }> {
    const token = this.tokens.create()
    const issued = await this.repository.issue(email.trim().toLowerCase(), token.hash, token.expiresAt)
    return {
      accepted: true,
      ...(issued && this.exposeLocalResetLink ? { resetPath: `/recuperar-contrasena?token=${token.raw}` } : {})
    }
  }

  async reset(rawToken: string, password: string): Promise<void> {
    const passwordHash = await this.passwords.hash(password)
    if (!await this.repository.reset(this.tokens.hash(rawToken), passwordHash)) throw new PasswordResetUnavailable()
  }
}
