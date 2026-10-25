import type { VerificationPolicy, VerificationSubmission } from '../domain/verification'
export interface VerificationType { id: string; code: string; name: string; appliesTo: 'USER' | 'ORGANIZATION'; policy: VerificationPolicy | null }
export interface VerificationSummary { id: string; typeName: string; typeCode: string; organizationId: string | null; organizationName: string | null; status: string; updatedAt: string }
export interface VerificationDocument { fileId: string; documentTypeId: string; label: string; originalName: string; reviewNotes: string | null; isValid: boolean | null }
export interface VerificationDetail extends VerificationSummary {
  version: string; resultNotes: string | null; rejectionReason: string | null; submittedAt: string | null
  policy: VerificationPolicy | null; fields: Record<string, string>; documents: VerificationDocument[]
  history: { status: string; at: string; reason: string | null }[]
  revisions: { id: string; operation: string; recordedAt: string; policyVersion: string; fields: Record<string, string>; documents: VerificationDocument[]; resultNotes: string | null; rejectionReason: string | null }[]
}
export interface PayoutSummary { id: string; organizationId: string | null; accountHolderName: string; bankName: string | null; last4: string | null; currency: string; status: string }
export interface VerificationRepository {
  types(userId: string): Promise<VerificationType[]>
  list(userId: string): Promise<VerificationSummary[]>
  detail(userId: string, id: string): Promise<VerificationDetail>
  start(userId: string, typeId: string, organizationId: string | null): Promise<VerificationDetail>
  save(userId: string, id: string, expectedVersion: string, input: VerificationSubmission, submit: boolean): Promise<VerificationDetail>
  documentOwner(userId: string, id: string, fileId: string): Promise<string>
  payouts(userId: string): Promise<PayoutSummary[]>
}
export class Verifications {
  constructor(private readonly repository: VerificationRepository) {}
  types(userId: string) { return this.repository.types(userId) }
  list(userId: string) { return this.repository.list(userId) }
  detail(userId: string, id: string) { return this.repository.detail(userId, id) }
  start(userId: string, typeId: string, organizationId: string | null) { return this.repository.start(userId, typeId, organizationId) }
  save(userId: string, id: string, expectedVersion: string, input: VerificationSubmission, submit: boolean) { return this.repository.save(userId, id, expectedVersion, input, submit) }
  documentOwner(userId: string, id: string, fileId: string) { return this.repository.documentOwner(userId, id, fileId) }
  payouts(userId: string) { return this.repository.payouts(userId) }
}
