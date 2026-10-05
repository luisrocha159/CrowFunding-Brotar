import { canDiscardCampaign } from '../domain/lifecycle'

export interface ProjectSummary {
  id: string; title: string; summary: string | null; status: string; categoryName: string | null
  goalAmount: string | null; currencyCode: string | null; updatedAt: Date; submittedAt: Date | null
  creatorName: string
}
export interface ProjectDetail extends ProjectSummary {
  location: { locality: string | null; countryCode: string | null } | null
  story: { problem: string | null; solution: string | null; beneficiaries: string | null; expectedResults: string | null } | null
  history: { fromStatus: string | null; toStatus: string; changedAt: Date; reason: string | null }[]
}
export class ProjectMissing extends Error {}
export class ProjectConflict extends Error {}
export class DiscardUnconfirmed extends Error {}
export interface ProjectRepository {
  listOwn(userId: string): Promise<ProjectSummary[]>
  findOwn(userId: string, id: string): Promise<ProjectDetail | null>
  discardOwn(userId: string, id: string): Promise<void>
  reviewQueue(): Promise<ProjectSummary[]>
  findForReview(id: string): Promise<ProjectDetail | null>
}
export class Projects {
  constructor(private readonly repository: ProjectRepository) {}
  listOwn(userId: string) { return this.repository.listOwn(userId) }
  async findOwn(userId: string, id: string) {
    const project = await this.repository.findOwn(userId, id)
    if (!project) throw new ProjectMissing()
    return project
  }
  async discard(userId: string, id: string, confirmed: boolean) {
    if (confirmed !== true) throw new DiscardUnconfirmed()
    const project = await this.findOwn(userId, id)
    if (!canDiscardCampaign(project.status)) throw new ProjectConflict()
    // El repositorio reafirma propiedad/estado bajo bloqueo: evita carreras con envío/revisión.
    await this.repository.discardOwn(userId, id)
  }
  reviewQueue() { return this.repository.reviewQueue() }
  async findForReview(id: string) {
    const project = await this.repository.findForReview(id)
    if (!project) throw new ProjectMissing()
    return project
  }
}
