import { allowsBuilderEditing } from '../domain/draft'
import { normalizeGeneral, validateGeneral, type GeneralInput } from '../domain/general'
import { normalizeIndicator, normalizeStory, validateIndicator, validateStory, STORY_LIMITS, type IndicatorInput, type StoryInput } from '../domain/story'
import { DraftNotEditable, DraftNotFound, type DraftRepository } from './drafts'
export type { GeneralInput, LocationInput } from '../domain/general'
export type { IndicatorInput, StoryInput } from '../domain/story'

export class FieldErrors extends Error {
  constructor(readonly fields: Record<string, string>) { super() }
}
export class CountryUnavailable extends Error {}
export class CategoryUnavailable extends Error {}
export class TooManyIndicators extends Error {}

export interface Indicator extends IndicatorInput {
  id: string
  /** Resultado conseguido; lo registra el seguimiento, nunca el asistente. */
  achievedValue: number | null
  displayOrder: number
}

export interface GeneralSummary extends GeneralInput { status: string }
export interface StorySummary { story: StoryInput; indicators: Indicator[] }

export interface GeneralRepository {
  readGeneral(campaignId: string): Promise<GeneralInput>
  saveGeneral(creatorUserId: string, campaignId: string, input: GeneralInput): Promise<void>
  countryExists(code: string): Promise<boolean>
  categoryIsActive(categoryId: string): Promise<boolean>
  readStory(campaignId: string): Promise<StorySummary>
  saveStory(creatorUserId: string, campaignId: string, story: StoryInput, indicators: IndicatorInput[]): Promise<void>
}

/** Información general del borrador (BG-16) e historia e impacto (BG-19). */
export class GeneralInfo {
  constructor(
    private readonly drafts: DraftRepository,
    private readonly repository: GeneralRepository
  ) {}

  private async editable(creatorUserId: string, id: string) {
    const draft = await this.drafts.findOwn(creatorUserId, id)
    if (!draft) throw new DraftNotFound()
    if (!allowsBuilderEditing(draft.status)) throw new DraftNotEditable()
    return draft
  }

  private async own(creatorUserId: string, id: string) {
    const draft = await this.drafts.findOwn(creatorUserId, id)
    if (!draft) throw new DraftNotFound()
    return draft
  }

  async readGeneral(creatorUserId: string, id: string): Promise<GeneralSummary> {
    const draft = await this.own(creatorUserId, id)
    return { ...await this.repository.readGeneral(id), status: draft.status }
  }

  async saveGeneral(creatorUserId: string, id: string, input: GeneralInput): Promise<GeneralSummary> {
    await this.editable(creatorUserId, id)
    const normalized = normalizeGeneral(input)
    const errors = validateGeneral(normalized)
    if (Object.keys(errors).length > 0) throw new FieldErrors(errors)
    // Referencias comprobadas contra el catálogo: no se acepta un país ni una categoría inventados.
    if (normalized.categoryId !== null && !await this.repository.categoryIsActive(normalized.categoryId)) {
      throw new CategoryUnavailable()
    }
    if (normalized.location.countryCode !== null && !await this.repository.countryExists(normalized.location.countryCode)) {
      throw new CountryUnavailable()
    }
    await this.repository.saveGeneral(creatorUserId, id, normalized)
    return this.readGeneral(creatorUserId, id)
  }

  async readStory(creatorUserId: string, id: string): Promise<StorySummary> {
    await this.own(creatorUserId, id)
    return this.repository.readStory(id)
  }

  async saveStory(creatorUserId: string, id: string, story: StoryInput, indicators: IndicatorInput[]): Promise<StorySummary> {
    await this.editable(creatorUserId, id)
    if (indicators.length > STORY_LIMITS.indicators) throw new TooManyIndicators()

    const normalizedStory = normalizeStory(story)
    const errors = validateStory(normalizedStory)
    const normalizedIndicators = indicators.map(normalizeIndicator)
    normalizedIndicators.forEach((indicator, index) => {
      for (const [field, message] of Object.entries(validateIndicator(indicator))) {
        errors[`indicators.${index}.${field}`] = message
      }
    })
    if (Object.keys(errors).length > 0) throw new FieldErrors(errors)

    await this.repository.saveStory(creatorUserId, id, normalizedStory, normalizedIndicators)
    return this.readStory(creatorUserId, id)
  }

  /**
   * Proyección para tarjeta y revisión (BG-16 CA 3, BG-19 CA 3). Devuelve solo lo
   * guardado: no calcula recaudado, ni progreso, ni distintivos de verificación, porque
   * un borrador no los tiene y mostrarlos sería inventarlos.
   */
  async review(creatorUserId: string, id: string) {
    const draft = await this.own(creatorUserId, id)
    const [general, story] = await Promise.all([
      this.repository.readGeneral(id), this.repository.readStory(id)
    ])
    return {
      id: draft.id,
      status: draft.status,
      campaignType: draft.campaignType,
      builderStep: draft.builderStep,
      general,
      story: story.story,
      indicators: story.indicators,
      // Explícito para que ninguna vista rellene estos huecos por su cuenta.
      raisedAmount: null,
      goalAmount: null,
      verified: false
    }
  }
}
