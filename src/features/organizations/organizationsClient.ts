import { SessionError } from '../access/session/sessionClient'
export interface OrganizationType { id: string; code: string; name: string }
export interface OrganizationInput { legalName: string; tradeName: string; organizationTypeId: string; contactEmail: string; contactPhone: string }
export interface Organization extends OrganizationInput { id: string; status: string; typeName: string; membershipRole: string }
export interface AssignedRole { code: string; name: string }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
async function request(path: string, input?: OrganizationInput, signal?: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(`/api/${path}`, {
      method: input ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', ...(input ? { 'X-Brotar-Request': '1' } : {}) },
      ...(input ? { body: JSON.stringify({ legalName: input.legalName.trim(), tradeName: input.tradeName.trim(), organizationTypeId: input.organizationTypeId, contactEmail: input.contactEmail.trim().toLowerCase(), contactPhone: input.contactPhone.trim() }) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new SessionError(response.status)
    return await response.json()
  } catch (error) { throw error instanceof SessionError ? error : new SessionError(0) }
}
function organization(value: unknown): Organization {
  if (!object(value) || !['id','status','typeName','membershipRole','legalName','tradeName','organizationTypeId','contactEmail','contactPhone'].every(key => typeof value[key] === 'string')) throw new SessionError(0)
  return { id: value.id as string, status: value.status as string, typeName: value.typeName as string, membershipRole: value.membershipRole as string, legalName: value.legalName as string, tradeName: value.tradeName as string, organizationTypeId: value.organizationTypeId as string, contactEmail: value.contactEmail as string, contactPhone: value.contactPhone as string }
}
export async function organizationTypes(signal?: AbortSignal): Promise<OrganizationType[]> {
  const data = await request('organizations/types', undefined, signal)
  if (!Array.isArray(data)) throw new SessionError(0)
  return data.map((item: unknown) => {
    if (!object(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.code !== 'string') throw new SessionError(0)
    return { id: item.id, name: item.name, code: item.code }
  })
}
export async function myOrganizations(signal?: AbortSignal): Promise<Organization[]> {
  const data = await request('organizations', undefined, signal)
  if (!Array.isArray(data)) throw new SessionError(0)
  return data.map(organization)
}
export async function createOrganization(input: OrganizationInput, signal?: AbortSignal): Promise<Organization> {
  return organization(await request('organizations', input, signal))
}
export async function myRoles(signal?: AbortSignal): Promise<AssignedRole[]> {
  const data = await request('access/roles', undefined, signal)
  if (!object(data) || !Array.isArray(data.roles)) throw new SessionError(0)
  return data.roles.map((item: unknown) => {
    if (!object(item) || typeof item.code !== 'string' || typeof item.name !== 'string') throw new SessionError(0)
    return { code: item.code, name: item.name }
  })
}
export function validateOrganization(input: OrganizationInput, types: OrganizationType[]): Partial<Record<keyof OrganizationInput, string>> {
  const errors: Partial<Record<keyof OrganizationInput, string>> = {}
  for (const key of ['legalName','tradeName'] as const) {
    const length = [...input[key].trim()].length
    if (!length || length>200) errors[key] = 'Escribe entre 1 y 200 caracteres.'
  }
  if (!types.some(type => type.id===input.organizationTypeId)) errors.organizationTypeId = 'Selecciona un tipo disponible.'
  if (input.contactEmail.trim().length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) errors.contactEmail = 'Escribe un correo de contacto válido.'
  if (!/^(?:\+?[0-9][0-9 ()-]{3,39})?$/.test(input.contactPhone.trim())) errors.contactPhone = 'Revisa el teléfono (máximo 40 caracteres) o déjalo vacío.'
  return errors
}
