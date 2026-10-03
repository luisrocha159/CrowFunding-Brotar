import { ButtonLink } from '../../../shared/components/Button'
import styles from '../public.module.css'

const steps = [
  ['Descubre proyectos', 'Explora iniciativas de distintas comunidades. Busca por tema, ubicación o modalidad y encuentra una causa que te interese.'],
  ['Conoce la campaña', 'Revisa su historia, la meta, el impacto esperado y la información del creador. Consulta sus señales de confianza antes de decidir.'],
  ['Apoya una iniciativa', 'Elige la campaña que deseas impulsar. En esta muestra, el botón de apoyo te lleva al acceso; no se procesa ningún pago.'],
  ['Acompaña el avance', 'Vuelve al detalle público para consultar la recaudación y las actualizaciones que comparta el creador.'],
  ['Consulta los resultados', 'Revisa las novedades y el impacto comunicado. Los objetivos publicados no equivalen a resultados ya alcanzados.']
]
export function HowItWorksPage() {
  return <>
    <header className={styles.hero}><span className={styles.heroTag}>Cómo funciona Brotar</span><h1>Tu aporte, paso a paso</h1><p className="lead">Una idea puede crecer cuando encuentra una comunidad. Descubre el recorrido desde el primer encuentro hasta el seguimiento de su impacto.</p><div className={styles.actions}><ButtonLink to="/explorar">Explorar proyectos →</ButtonLink><ButtonLink variant="secondary" to="/para-creadores">Quiero crear</ButtonLink></div></header>
    <section className={styles.section}><div className={styles.centered}><p className="eyebrow">El recorrido completo</p><h2>Generar impacto positivo comienza con un primer paso</h2></div><ol className={styles.stepList}>{steps.map(([title, text], i) => <li className={styles.panel} key={title}><span className={styles.number}>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
    <section className={`${styles.section} ${styles.softSection}`}><p className="eyebrow">Un ciclo de colaboración</p><h2>Un ciclo virtuoso donde todos crecemos</h2><div className={styles.twoColumns}><p>Las personas encuentran causas que les importan. Los creadores presentan propuestas claras. La comunidad acompaña su avance y conoce lo que se va construyendo.</p><ul className={styles.checklist}><li>Objetivos y necesidades visibles desde el inicio.</li><li>Información del creador y señales de confianza.</li><li>Actualizaciones públicas para dar seguimiento.</li></ul></div></section>
    <section className={styles.section}><div className={styles.centered}><p className="eyebrow">Información para decidir</p><h2>La confianza empieza con la transparencia</h2></div><div className={styles.grid}><article className={styles.panel}><h3>Información del creador</h3><p>Consulta quién presenta la iniciativa y la información pública que acompaña a su campaña.</p></article><article className={styles.panel}><h3>Metas claras</h3><p>Revisa la meta y el avance calculado a partir de financiación confirmada, junto con la historia y el impacto esperado.</p></article><article className={styles.panel}><h3>Contenido publicado</h3><p>Explora campañas publicadas que cuentan con una imagen pública y consulta sus datos desde la API.</p></article></div></section>
    <section className={styles.hero}><h2>¿Listo para descubrir una buena idea?</h2><p>Explora campañas publicadas y conoce su historia. Esta etapa no procesa aportes ni pagos.</p><div className={styles.actions}><ButtonLink to="/explorar">Explorar campañas</ButtonLink><ButtonLink variant="secondary" to="/registro">Crear una cuenta</ButtonLink></div></section>
  </>
}
