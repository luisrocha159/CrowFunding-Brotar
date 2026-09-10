import type { Project, ProjectCardData } from '../types/project'

/** Uncapped percentage; the visual progress element alone clamps at 100%. */
export function getProgressPercentage(project: Pick<ProjectCardData, 'goal' | 'raised'>): number {
  if (!Number.isFinite(project.goal) || project.goal <= 0 || !Number.isFinite(project.raised)) return 0
  return Math.round(Math.max(0, project.raised) / project.goal * 100)
}

export function canSupportProject(project: Pick<ProjectCardData, 'status'>): boolean {
  return project.status === 'active'
}

export function toProjectCardData(project: Project): ProjectCardData {
  const { slug, name, summary, category, creator, location, image, imageAlt, goal, raised, verified, status, daysRemaining } = project
  return { slug, name, summary, category, creator, location, image, imageAlt, goal, raised, verified, status, daysRemaining }
}
