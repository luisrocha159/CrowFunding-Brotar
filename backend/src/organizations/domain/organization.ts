export interface OrganizationType { id: string; code: string; name: string }
export interface OrganizationInput { legalName: string; tradeName: string; organizationTypeId: string; contactEmail: string; contactPhone: string }
export interface Organization extends OrganizationInput { id: string; status: string; typeName: string; membershipRole: string }
export function normalizeOrganization(input: OrganizationInput): OrganizationInput {
  return {
    legalName: input.legalName.trim(), tradeName: input.tradeName.trim(), organizationTypeId: input.organizationTypeId,
    contactEmail: input.contactEmail.trim().toLowerCase(), contactPhone: input.contactPhone.trim()
  }
}
