import { Link } from 'react-router-dom'
import { Badge } from './Badge'
import { ProgressBar } from './ProgressBar'
import styles from './ui.module.css'

export type ProjectCardData = {
  slug: string
  name: string
  summary: string
  category: string
  creator: string
  location: string
  image: string
  imageAlt: string
  goal: number
  raised: number
  verified: boolean
  status: 'active' | 'finished' | 'cancelled'
  daysRemaining: number
}

const amount = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const progress = project.goal > 0 ? Math.max(0, project.raised / project.goal * 100) : 0
  return <article className={styles.card}>
    <img className={styles.cardImage} src={project.image} alt={project.imageAlt} width={768} height={427} loading="lazy" />
    <div className={styles.cardBody}>
      <div className={styles.badges}>
        <Badge tone="success">{project.category}</Badge>
        {project.verified && <Badge tone="success">✓ Verificado</Badge>}
        {project.status !== 'active' && <Badge tone={project.status === 'cancelled' ? 'error' : 'neutral'}>{project.status === 'cancelled' ? 'Cancelada' : 'Finalizada'}</Badge>}
      </div>
      <h3><Link to={`/proyectos/${encodeURIComponent(project.slug)}`}>{project.name}</Link></h3>
      <p className={styles.cardDescription}>{project.summary}</p>
      <p className={styles.cardCreator}>{project.creator} · {project.location}</p>
      <ProgressBar value={progress} label={`Recaudación de ${project.name}`} />
      <p className={styles.cardNumbers}><span><strong>Bs {amount.format(project.raised)}</strong> de Bs {amount.format(project.goal)}</span><strong>{Math.round(progress)} %</strong></p>
      <div className={styles.cardBottom}>
        <span>{project.status === 'active' ? `${Math.max(0, project.daysRemaining)} días restantes` : 'Recaudación cerrada'}</span>
        <Link to={`/proyectos/${encodeURIComponent(project.slug)}`} aria-label={`Ver detalle de ${project.name}`}>Ver detalle →</Link>
      </div>
    </div>
  </article>
}
