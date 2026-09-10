import { Button, ButtonLink } from '../../../shared/components/Button'
import { EmptyState, ErrorState, ProjectCardSkeleton } from '../../../shared/components/Feedback'
import { ProjectCard } from '../../../shared/components/ProjectCard'
import hero from '../../../shared/assets/proyecto-reforestacion.webp'
import { DemoNotice, DemoStates } from '../PublicDemo'
import { useProjectResource } from '../useProjectResource'
import styles from '../public.module.css'

export function LandingPage() {
  const resource = useProjectResource({ featured: true })
  return <>
    <section className={styles.hero}>
      <img className={styles.heroImage} src={hero} alt="" width={1344} height={768} fetchPriority="high" />
      <div className={styles.heroShade} />
      <span className={styles.heroTag}>Financiamiento colectivo con propósito</span>
      <h1>Impulsa el cambio sostenible en Bolivia</h1>
      <p className="lead">Conectamos personas comprometidas con proyectos de impacto social, ambiental y productivo. Descubre una iniciativa y sé parte de lo que puede crecer.</p>
      <div className={styles.actions}><ButtonLink to="/explorar">Explorar proyectos →</ButtonLink><ButtonLink variant="secondary" to="/como-funciona">Cómo funciona</ButtonLink></div>
    </section>
    <div className={styles.stats} aria-label="Contenido de esta demostración"><div><strong>6</strong><span>campañas de ejemplo</span></div><div><strong>6</strong><span>ubicaciones en Bolivia</span></div><div><strong>3</strong><span>formas de impulsar ideas</span></div></div>
    <DemoNotice />
    <section className={styles.section}>
      <div className={styles.centered}><p className="eyebrow">Qué es Brotar</p><h2>Financiamiento colectivo con impacto real</h2><p>Muchas personas pueden hacer posible una buena idea. Brotar reúne iniciativas que buscan recursos y comunidades que quieren contribuir a su desarrollo.</p></div>
      <div className={styles.grid}>{[
        ['Impacto social', 'Oportunidades para fortalecer comunidades, ampliar el acceso a la educación y mejorar la calidad de vida.'],
        ['Impacto ambiental', 'Proyectos para recuperar ecosistemas, cuidar los recursos naturales y promover hábitos sostenibles.'],
        ['Impacto productivo', 'Ideas que impulsan el trabajo local, la economía circular y una producción responsable.']
      ].map(([title, description]) => <article className={styles.panel} key={title}><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>
    <section className={styles.section} aria-labelledby="featured-heading">
      <div className={styles.sectionHeading}><div><p className="eyebrow">Ideas que merecen crecer</p><h2 id="featured-heading">Proyectos destacados</h2><p>Conoce sus historias, sus metas y el impacto que buscan lograr.</p></div><ButtonLink variant="tertiary" to="/explorar">Ver todos los proyectos →</ButtonLink></div>
      {resource.status === 'loading' ? <div className={styles.grid}>{[1,2,3].map(id => <ProjectCardSkeleton key={id} />)}</div>
        : resource.status === 'error' ? <ErrorState action={<div className={styles.actions}><Button onClick={resource.retry}>Reintentar</Button><ButtonLink variant="secondary" to="/explorar">Ir a Explorar</ButtonLink></div>} />
        : resource.projects.length === 0 ? <EmptyState title="Todavía no hay proyectos destacados" description="Puedes explorar todas las campañas o conocer cómo funciona Brotar." action={<ButtonLink to="/explorar">Explorar proyectos</ButtonLink>} />
        : <div className={styles.grid}>{resource.projects.map(project => <ProjectCard key={project.id} project={project} />)}</div>}
    </section>
    <section className={styles.hero}><p className="eyebrow">Para quienes quieren transformar su entorno</p><h2>Tu idea puede ser el próximo comienzo</h2><p>Conoce cómo preparar una campaña, presentar su impacto y dar el primer paso con tu comunidad.</p><div className={styles.actions}><ButtonLink to="/para-creadores">Quiero crear un proyecto</ButtonLink><ButtonLink variant="secondary" to="/iniciar-sesion">Iniciar sesión</ButtonLink></div></section>
    <DemoStates />
  </>
}
