import { allowsBasicAccess, type BasicAccessStatus } from './basic-access'

export interface Credentials {
  id: string; passwordHash: string; status: string; lockedUntil: Date | null
}
export interface CurrentUser { id: string; email: string; firstName: string; lastName: string; status: BasicAccessStatus }
export interface SessionRepository {
  credentials(email: string): Promise<Credentials | null>
  failedAttempt(id: string): Promise<void>
  open(user: Credentials, tokenHash: string, expiresAt: Date, previousHash?: string): Promise<boolean>
  current(tokenHash: string): Promise<CurrentUser | null>
  revoke(tokenHash: string): Promise<void>
}
export interface SessionTokens { create(): { raw: string; hash: string; expiresAt: Date }; hash(raw: string): string }
export interface PasswordVerifier { verify(password: string, encoded: string | null): Promise<boolean> }
export class InvalidCredentials extends Error {}
export class AccountUnavailable extends Error {}
export class SessionMissing extends Error {}

export class Sessions {
  constructor(private readonly repository: SessionRepository, private readonly passwords: PasswordVerifier, private readonly tokens: SessionTokens) {}
  async login(email: string, password: string, previous?: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.repository.credentials(email.trim().toLowerCase())
    const valid = await this.passwords.verify(password, user?.passwordHash ?? null)
    if (!valid || !user) {
      if (user) await this.repository.failedAttempt(user.id)
      throw new InvalidCredentials()
    }
    if (!allowsBasicAccess(user.status) || (user.lockedUntil && user.lockedUntil.getTime() > Date.now())) throw new AccountUnavailable()
    const token = this.tokens.create()
    if (!await this.repository.open(user, token.hash, token.expiresAt, previous ? this.tokens.hash(previous) : undefined)) throw new AccountUnavailable()
    return { token: token.raw, expiresAt: token.expiresAt }
  }
  async current(raw?: string): Promise<CurrentUser> {
    if (!raw) throw new SessionMissing()
    const user = await this.repository.current(this.tokens.hash(raw))
    if (!user) throw new SessionMissing()
    return user
  }
  async logout(raw?: string): Promise<void> { if (raw) await this.repository.revoke(this.tokens.hash(raw)) }
}
