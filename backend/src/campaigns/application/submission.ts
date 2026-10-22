import { DraftNotEditable, DraftNotFound, type DraftRepository } from './drafts'
import { missingForSubmission, type MissingField, type SubmissionSnapshot } from '../domain/submission'

export class SubmissionIncomplete extends Error {
  constructor(readonly missing: MissingField[]) { super('Campaña incompleta') }
}
export interface ReviewObservation { section: string; fieldPath: string | null; message: string }
export interface SubmissionRepository {
  snapshot(id: string): Promise<SubmissionSnapshot>
  observations(id: string): Promise<ReviewObservation[]>
  /** Comprueba de nuevo propiedad, estado y completitud dentro de la transacción. */
  submit(userId: string, id: string): Promise<void>
}

export class CampaignSubmission {
  constructor(private readonly drafts: DraftRepository, private readonly repository: SubmissionRepository) {}

  private async own(userId: string, id: string) {
    const draft = await this.drafts.findOwn(userId, id)
    if (!draft) throw new DraftNotFound()
    return draft
  }

  async review(userId: string, id: string) {
    const draft = await this.own(userId, id)
    const [snapshot, observations] = await Promise.all([this.repository.snapshot(id), this.repository.observations(id)])
    // Nunca revelar títulos, IDs, importes ni historia de campañas ajenas al creador.
    const possible = Boolean(snapshot.duplication?.matches.length)
    return { id, status: draft.status, missing: missingForSubmission(snapshot), observations,
      duplicateWarning: possible ? 'Se encontraron semejanzas con otras campañas. Son un aviso para la revisión administrativa y no impiden el envío; cada campaña tiene su propio identificador.' : null }
  }

  async submit(userId: string, id: string) {
    const draft = await this.own(userId, id)
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(draft.status)) throw new DraftNotEditable()
    const missing = missingForSubmission(await this.repository.snapshot(id))
    if (missing.length) throw new SubmissionIncomplete(missing)
    await this.repository.submit(userId, id)
    return this.review(userId, id)
  }
}
