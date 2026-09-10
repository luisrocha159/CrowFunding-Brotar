import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Badge } from '../../../shared/components/Badge'
import { ProgressBar } from '../../../shared/components/ProgressBar'
import { EmptyState, ErrorState, Message, ProjectCardSkeleton } from '../../../shared/components/Feedback'
import { campaignTypeLabels } from '../../../shared/types/project'
import { canSupportProject, getProgressPercentage } from '../../../shared/utils/project'
import { useProjectResource } from '../useProjectResource'
import { DemoNotice, DemoStates } from '../PublicDemo'
import shared from '../public.module.css'
import styles from './detail.module.css'

const amount = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const resource = useProjectResource({ slug: slug ?? '' })
  const project = resource.projects[0]
  useEffect(() => { if (project) document.title = `${project.name} | Brotar` }, [project])
  if (resource.status === 'loading') return <><h1>Detalle del proyecto</h1><p role="status">Cargando la campaña…</p><div className={shared.twoColumns}><ProjectCardSkeleton /><ProjectCardSkeleton /></div></>
  if (resource.status === 'error') return <><h1>Detalle del proyecto</h1><ErrorState action={<div className={shared.actions}><Button onClick={resource.retry}>Reintentar</Button><ButtonLink variant="secondary" to="/explorar">Volver a Explorar</ButtonLink></div>} /><DemoStates /></>
  if (!project) return <><h1>Campaña no disponible</h1><EmptyState title="No encontramos este proyecto" description="El enlace puede ser incorrecto o la campaña no está disponible en esta muestra." action={<ButtonLink to="/explorar">Volver a Explorar</ButtonLink>} /><DemoStates /></>
  const progress = getProgressPercentage(project)
  const supportUrl = `/iniciar-sesion?${new URLSearchParams({ continuar: `/proyectos/${project.slug}` })}`
  const funding = <aside className={styles.funding} aria-label="Recaudación y apoyo"><h2>Impulsa esta iniciativa</h2><span className={styles.percentage}>{progress} %</span><p className={styles.small}>de la meta propuesta</p><ProgressBar value={progress} label={`Recaudación de ${project.name}`} /><dl><div><dt>Monto recaudado</dt><dd>Bs {amount.format(project.raised)}</dd></div><div><dt>Meta de la campaña</dt><dd>Bs {amount.format(project.goal)}</dd></div><div><dt>Modalidad</dt><dd>{campaignTypeLabels[project.campaignType]}</dd></div><div><dt>Estado</dt><dd>{project.status === 'active' ? `Activa · ${project.daysRemaining} días restantes` : project.status === 'finished' ? 'Finalizada' : 'Cancelada'}</dd></div></dl>
    {canSupportProject(project) ? <><ButtonLink to={supportUrl}>Apoyar este proyecto</ButtonLink><p className={styles.small}>Continuarás al acceso. En esta demostración no se procesan aportes ni pagos.</p></> : <><Message tone={project.status === 'cancelled' ? 'warning' : 'info'} title="Recaudación cerrada">{project.statusReason}</Message><Button disabled>Aportes no disponibles</Button></>}
    <ButtonLink variant="secondary" to="/explorar">Ver otros proyectos</ButtonLink>
  </aside>
  return <>
    <nav className={styles.breadcrumb} aria-label="Ruta de navegación"><Link to="/explorar">Explorar proyectos</Link> / {project.name}</nav>
    <DemoNotice />
    <div className={styles.layout}>
        <div className={styles.overview}>
        <div className={shared.actions}><Badge tone="success">{project.category}</Badge><Badge>{campaignTypeLabels[project.campaignType]}</Badge>{project.verified && <Badge tone="success">Verificación simulada</Badge>}</div>
        <h1>{project.name}</h1><p className="lead">{project.summary}</p><p>{project.creator} · {project.location}</p>
        <figure className={styles.figure}><img className={styles.cover} src={project.image} alt={project.imageAlt} width={768} height={427} /><figcaption>{project.imageCaption}</figcaption></figure>
        </div>
        {funding}
        <div className={styles.story}>
        <nav className={shared.anchorNav} aria-label="Secciones del proyecto"><a href="#historia">Historia</a><a href="#impacto">Impacto</a><a href="#creador">Creador y confianza</a><a href="#actualizaciones">Actualizaciones</a></nav>
        <section id="historia" className={shared.contentSection}><h2>Historia del proyecto</h2><p>{project.description}</p><div className={shared.panel}><h3>El problema</h3><p>{project.problem}</p><h3>La solución propuesta</h3><p>{project.solution}</p><h3>¿A quién beneficia?</h3><p>{project.beneficiaries}</p></div></section>
        <section id="impacto" className={shared.contentSection}><h2>Impacto esperado</h2><p>Estas son las metas de la propuesta, no resultados ya alcanzados.</p><div className={styles.metrics}>{project.impact.map(item => <div className={shared.panel} key={item.indicator}><strong>{item.target}</strong><span>{item.indicator}</span></div>)}</div></section>
        <section id="creador" className={shared.contentSection}><h2>Quién impulsa esta iniciativa</h2><article className={shared.panel}><h3>{project.creator}</h3><p>{project.creatorDescription}</p><h3>Información y confianza</h3><ul className={shared.checklist}>{project.trustSignals.map(signal => <li key={signal}>{signal}</li>)}</ul><p className={styles.small}>Las identidades y verificaciones son ficticias y solo representan el comportamiento del prototipo.</p></article></section>
        <section id="actualizaciones" className={shared.contentSection}><h2>Actualizaciones</h2>{project.updates.length ? project.updates.map(update => <article key={update.id} className={styles.update}><time dateTime={update.date}>{date.format(new Date(`${update.date}T00:00:00Z`))}</time><h3>{update.title}</h3><p>{update.content}</p></article>) : <EmptyState title="Todavía no hay novedades" description="Las actualizaciones del creador aparecerán aquí cuando estén disponibles." />}</section>
        </div>
    </div><DemoStates />
  </>
}
