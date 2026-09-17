import { EntitySchema } from 'typeorm'
export interface SessionTokenRecord {
  id: string; userId: string; tokenType: 'SESSION' | 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'PHONE_OTP'
  tokenHash: string; userAgent: string | null; ipAddress: string | null; createdAt: Date
  expiresAt: Date; usedAt: Date | null; revokedAt: Date | null
}
export const SessionTokenSchema = new EntitySchema<SessionTokenRecord>({
  name: 'UserToken', tableName: 'user_token', schema: 'public', columns: {
    id: { type: 'uuid', primary: true, default: () => 'gen_random_uuid()' },
    userId: { name: 'user_id', type: 'uuid' },
    tokenType: { name: 'token_type', type: 'enum', enumName: 'user_token_type', enum: ['SESSION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PHONE_OTP'] },
    tokenHash: { name: 'token_hash', type: 'text', select: false },
    userAgent: { name: 'user_agent', type: 'text', nullable: true },
    ipAddress: { name: 'ip_address', type: 'inet', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', default: () => 'now()' },
    expiresAt: { name: 'expires_at', type: 'timestamptz' },
    usedAt: { name: 'used_at', type: 'timestamptz', nullable: true },
    revokedAt: { name: 'revoked_at', type: 'timestamptz', nullable: true }
  }
})
