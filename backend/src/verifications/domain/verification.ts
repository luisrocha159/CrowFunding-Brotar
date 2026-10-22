export class InvalidVerification extends Error {}
export class VerificationPolicyUnavailable extends Error {}
export class VerificationUnavailable extends Error {}
export class VerificationConflict extends Error {}
export class VerificationForbidden extends Error {}
export interface VerificationPolicy {
  version: string; treatmentNotice: string; evidenceReference: string; approvedBy: string; approvedAt: string
  fields: { key: string; label: string; required: boolean; maxLength: number }[]
  documents: { documentTypeId: string; label: string; required: boolean }[]
  requiresAcceptance: boolean
}
export interface VerificationSubmission {
  policyVersion: string; fields: Record<string, string>
  documents: { documentTypeId: string; fileId: string }[]; accepted: boolean
}
export const CAPTURE_TYPES = ['KYC_IDENTITY', 'KYB_LEGAL', 'KYB_REPRESENTATIVE'] as const
export function assertEditableVerification(status: string) {
  if (status !== 'NOT_STARTED' && status !== 'REQUIRES_INFO') throw new InvalidVerification('Este caso no admite correcciones en su estado actual.')
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
// PostgreSQL JSONB admite Unicode bien formado pero no NUL ni sustitutos aislados.
const jsonText = (value: unknown): value is string => typeof value === 'string' && !value.includes('\u0000') && !/[\uD800-\uDFFF]/u.test(value)
const nonemptyText = (value: unknown): value is string => jsonText(value) && value.trim().length > 0
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function approvedPolicy(policy: unknown): policy is VerificationPolicy {
  if (!record(policy) || !nonemptyText(policy.version) || policy.version.length > 100 || !nonemptyText(policy.treatmentNotice) || !nonemptyText(policy.evidenceReference) || !nonemptyText(policy.approvedBy) || !nonemptyText(policy.approvedAt) || !Number.isFinite(Date.parse(policy.approvedAt))) return false
  if (!Array.isArray(policy.fields) || !Array.isArray(policy.documents) || typeof policy.requiresAcceptance !== 'boolean' || policy.fields.length > 30 || policy.documents.length > 20) return false
  const keys = new Set<string>(); const docs = new Set<string>()
  for (const field of policy.fields) {
    if (!record(field) || !nonemptyText(field.key) || !/^[a-z][a-zA-Z0-9_]{0,59}$/.test(field.key) || ['constructor', 'prototype', '__proto__'].includes(field.key) || !nonemptyText(field.label) || keys.has(field.key) || typeof field.maxLength !== 'number' || !Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 2000 || typeof field.required !== 'boolean') return false
    keys.add(field.key)
  }
  for (const doc of policy.documents) {
    if (!record(doc) || !nonemptyText(doc.documentTypeId) || !uuid.test(doc.documentTypeId) || !nonemptyText(doc.label) || docs.has(doc.documentTypeId) || typeof doc.required !== 'boolean') return false
    docs.add(doc.documentTypeId)
  }
  return policy.fields.length + policy.documents.length > 0
}
/** La política no se deduce de los catálogos ni se activa desde un formulario público. */
export function validateSubmission(policy: VerificationPolicy | null, input: VerificationSubmission, submitting = true): VerificationSubmission {
  if (!approvedPolicy(policy) || input.policyVersion !== policy.version) throw new VerificationPolicyUnavailable()
  if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields) || !Array.isArray(input.documents) || typeof input.accepted !== 'boolean') throw new InvalidVerification()
  if (Object.keys(input.fields).some(key => !policy.fields.some(field => field.key === key))) throw new InvalidVerification()
  const fields: Record<string, string> = {}
  for (const field of policy.fields) {
    const value = input.fields[field.key] ?? ''
    if (!jsonText(value) || value.trim().length > field.maxLength || (submitting && field.required && !value.trim())) throw new InvalidVerification()
    fields[field.key] = value.trim()
  }
  const files = new Set<string>(); const types = new Set<string>()
  for (const doc of input.documents) {
    if (!doc || !policy.documents.some(required => required.documentTypeId === doc.documentTypeId) || !jsonText(doc.fileId) || !uuid.test(doc.fileId) || files.has(doc.fileId) || types.has(doc.documentTypeId)) throw new InvalidVerification()
    files.add(doc.fileId); types.add(doc.documentTypeId)
  }
  if (submitting && (policy.documents.some(doc => doc.required && !types.has(doc.documentTypeId)) || (policy.requiresAcceptance && !input.accepted))) throw new InvalidVerification()
  return { policyVersion: policy.version, fields, documents: input.documents.map(doc => ({ documentTypeId: doc.documentTypeId, fileId: doc.fileId })), accepted: input.accepted }
}
