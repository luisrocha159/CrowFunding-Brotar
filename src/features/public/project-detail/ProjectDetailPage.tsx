import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Badge } from '../../../shared/components/Badge'
import { ProgressBar } from '../../../shared/components/ProgressBar'
import { EmptyState, ErrorState, Message, ProjectCardSkeleton } from '../../../shared/components/Feedback'
import { campaignTypeLabels } from '../../../shared/types/project'
import { getProgressPercentage } from '../../../shared/utils/project'
import { useProjectResource } from '../useProjectResource'
import shared from '../public.module.css'
import styles from './detail.module.css'

const amount = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })
export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const resource = useProjectResource({ slug: slug ?? '' })
  const project = resource.projects[0]
  useEffect(() => { if (project) document.title = `${project.name} | Brotar` }, [project])
  if (resource.status === 'loading') return <><h1>Detalle del proyecto</h1><p role="status">Cargando la campaña…</p><div className={shared.twoColumns}><ProjectCardSkeleton /><ProjectCardSkeleton /></div></>
  if (resource.status === 'error') return <><h1>Detalle del proyecto</h1><ErrorState action={<div className={shared.actions}><Button onClick={resource.retry}>Reintentar</Button><ButtonLink variant="secondary" to="/explorar">Volver a Explorar</ButtonLink></div>} /></>
  if (!project) return <><h1>Campaña no disponible</h1><EmptyState title="No encontramos este proyecto" description="La campaña no está publicada, no tiene una imagen pública o el enlace es incorrecto." action={<ButtonLink to="/explorar">Volver a Explorar</ButtonLink>} /></>
  const progress = getProgressPercentage(project)
  const funding = <aside className={styles.funding} aria-label="Avance de la campaña"><h2>Avance de la campaña</h2><span className={styles.percentage}>{progress} %</span><p className={styles.small}>calculado con datos de financiación confirmados</p><ProgressBar value={progress} label={`Avance de ${project.name}`} /><dl><div><dt>Monto confirmado</dt><dd>Bs {amount.format(project.raised)}</dd></div><div><dt>Meta de la campaña</dt><dd>Bs {amount.format(project.goal)}</dd></div><div><dt>Modalidad</dt><dd>{campaignTypeLabels[project.campaignType]}</dd></div><div><dt>Estado</dt><dd>{project.status === 'active' ? `Publicada · ${project.daysRemaining} días restantes` : project.status === 'finished' ? 'Finalizada' : 'Cancelada'}</dd></div></dl><Message tone="info" title="Aportes">Los aportes, checkout y pagos todavía no forman parte de esta etapa.</Message><ButtonLink variant="secondary" to="/explorar">Ver otras campañas</ButtonLink>
  </aside>
  return <>
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación"><Link to="/explorar">Explorar proyectos</Link> / {project.name}</nav>
    <div className={styles.layout}>
        <div className={styles.overview}>
        <div className={shared.actions}><Badge tone="success">{project.category}</Badge><Badge>{campaignTypeLabels[project.campaignType]}</Badge></div>
        <h1>{project.name}</h1><p className="lead">{project.summary}</p><p>{project.creator} · {project.location}</p>
        <figure className={styles.figure}><img className={styles.cover} src={project.image} alt={project.imageAlt} width={768} height={427} /><figcaption>{project.imageCaption}</figcaption></figure>
        </div>
        {funding}
        <div className={styles.story}>
        <nav className={shared.anchorNav} aria-label="Secciones del proyecto"><a href="#historia">Historia</a><a href="#impacto">Impacto</a><a href="#creador">Creador y confianza</a><a href="#actualizaciones">Actualizaciones</a></nav>
        <section id="historia" className={shared.contentSection}><h2>Historia del proyecto</h2><p>{project.description}</p><div className={shared.panel}><h3>El problema</h3><p>{project.problem}</p><h3>La solución propuesta</h3><p>{project.solution}</p><h3>¿A quién beneficia?</h3><p>{project.beneficiaries}</p></div></section>
        <section id="impacto" className={shared.contentSection}><h2>Impacto esperado</h2><p>Estas son las metas de la propuesta, no resultados ya alcanzados.</p><div className={styles.metrics}>{project.impact.map(item => <div className={shared.panel} key={item.indicator}><strong>{item.target}</strong><span>{item.indicator}</span></div>)}</div></section>
        <section id="creador" className={shared.contentSection}><h2>Quién impulsa esta iniciativa</h2><article className={shared.panel}><h3>{project.creator}</h3><p>{project.creatorDescription || 'La campaña presenta esta información pública sobre su creador.'}</p></article></section>
        <section id="recompensas" className={shared.contentSection}><h2>Recompensas</h2>{project.rewards?.length ? project.rewards.map(reward => <article key={reward.id} className={shared.panel}><h3>{reward.title}</h3><p>{reward.description}</p><p>Desde {reward.currency} {amount.format(reward.minAmount)}</p></article>) : <p>Esta campaña no publica recompensas.</p>}</section>
        </div>
    </div>
  </>
}
