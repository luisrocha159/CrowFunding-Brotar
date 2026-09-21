import {
  allowsBuilderEditing, allowsStepMove, isValidBuilderStep, isValidSummary, isValidTitle,
  normalizeDraft, type Draft, type DraftInput
} from '../domain/draft'
export type { Draft, DraftInput, CampaignType } from '../domain/draft'

export class DraftInvalid extends Error {}
export class DraftNotFound extends Error {}
/** El borrador existe pero ya no admite edición por el asistente. */
export class DraftNotEditable extends Error {}
/** La organización indicada no pertenece al creador o no la gestiona. */
export class DraftOrganizationForbidden extends Error {}
export class DraftCategoryUnavailable extends Error {}
/** El paso solicitado no es alcanzable desde la posición actual. */
export class DraftStepUnreachable extends Error {}

export interface DraftRepository {
  /** Borradores del creador. La propiedad se filtra en la consulta, no después. */
  listOwn(creatorUserId: string): Promise<Draft[]>
  findOwn(creatorUserId: string, id: string): Promise<Draft | null>
  create(creatorUserId: string, input: DraftInput): Promise<Draft>
  save(creatorUserId: string, id: string, input: DraftInput, builderStep: number): Promise<Draft>
  categoryIsActive(categoryId: string): Promise<boolean>
}

/** Gestión de organizaciones del creador; la aporta S1-13. */
export interface DraftMembership {
  manages(userId: string, organizationId: string): Promise<boolean>
}

export class Drafts {
  constructor(
    private readonly repository: DraftRepository,
    private readonly memberships: DraftMembership
  ) {}

  listOwn(creatorUserId: string): Promise<Draft[]> {
    return this.repository.listOwn(creatorUserId)
  }

  /** Recuperar el borrador propio; la propiedad se comprueba aquí, no en el cliente. */
  async findOwn(creatorUserId: string, id: string): Promise<Draft> {
    const draft = await this.repository.findOwn(creatorUserId, id)
    if (!draft) throw new DraftNotFound()
    return draft
  }

  private async validate(creatorUserId: string, input: DraftInput): Promise<DraftInput> {
    const normalized = normalizeDraft(input)
    if (!isValidTitle(normalized.title)) throw new DraftInvalid()
    if (!isValidSummary(normalized.summary)) throw new DraftInvalid()
    if (normalized.categoryId !== null && !await this.repository.categoryIsActive(normalized.categoryId)) {
      throw new DraftCategoryUnavailable()
    }
    // Una organización ajena no se adopta por enviar su identificador.
    if (normalized.organizationId !== null && !await this.memberships.manages(creatorUserId, normalized.organizationId)) {
      throw new DraftOrganizationForbidden()
    }
    return normalized
  }

  async create(creatorUserId: string, input: DraftInput): Promise<Draft> {
    return this.repository.create(creatorUserId, await this.validate(creatorUserId, input))
  }

  /**
   * Guardado del asistente: datos y posición en la misma operación, para que no
   * quede una posición avanzada sobre datos que no llegaron a escribirse.
   */
  async save(creatorUserId: string, id: string, input: DraftInput, builderStep: number): Promise<Draft> {
    if (!isValidBuilderStep(builderStep)) throw new DraftInvalid()
    const current = await this.findOwn(creatorUserId, id)
    if (!allowsBuilderEditing(current.status)) throw new DraftNotEditable()
    if (!allowsStepMove(current.builderStep, builderStep)) throw new DraftStepUnreachable()
    return this.repository.save(creatorUserId, id, await this.validate(creatorUserId, input), builderStep)
  }
}
