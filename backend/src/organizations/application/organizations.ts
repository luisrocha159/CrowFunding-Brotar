import { normalizeOrganization, type Organization, type OrganizationInput, type OrganizationType } from '../domain/organization'
export type { Organization, OrganizationInput, OrganizationType } from '../domain/organization'
export interface OrganizationRepository {
  types(): Promise<OrganizationType[]>
  list(userId: string): Promise<Organization[]>
  find(userId: string, organizationId: string): Promise<Organization | null>
  create(userId: string, input: OrganizationInput): Promise<Organization>
}
export class OrganizationTypeUnavailable extends Error {}
export class OrganizationAccessUnavailable extends Error {}
export class Organizations {
  constructor(private readonly repository: OrganizationRepository) {}
  types() { return this.repository.types() }
  list(userId: string) { return this.repository.list(userId) }
  find(userId: string, organizationId: string) { return this.repository.find(userId, organizationId) }
  create(userId: string, input: OrganizationInput) {
    return this.repository.create(userId, normalizeOrganization(input))
  }
}
