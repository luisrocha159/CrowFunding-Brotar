import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { Badge } from '../../shared/components/Badge'
import { FormField } from '../../shared/components/FormField'
import { EmptyState, ErrorState, Message, ProjectCardSkeleton } from '../../shared/components/Feedback'
import { ProjectCard } from '../../shared/components/ProjectCard'
import { projects, DEMO_NOTICE } from '../../mocks/projects/projects'
import styles from './preview.module.css'

const cardSamples = [projects.find(project => project.status === 'active'), projects.find(project => project.status === 'finished')].filter(project => project !== undefined)

export default function ComponentPreview() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [validated, setValidated] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)
  const emailError = validated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Ingresa un correo electrónico válido.' : undefined

  return <div className={styles.preview}>
    <header><p className="eyebrow">Fase 2 · Vista interna de desarrollo</p><h1>La base visual de Brotar</h1><p className="lead">Logo oficial, tipografías y componentes compartidos para la experiencia pública.</p><Link to="/">Volver al recorrido de pantallas →</Link></header>
    <section><h2>Identidad y color</h2><div className={styles.swatches}>
      <div className={styles.brandSwatch}>Verde Brotar<span>#0E4B34</span></div><div className={styles.actionSwatch}>Acción<span>#187B39</span></div><div className={styles.softSwatch}>Superficie suave<span>#EAF3ED</span></div><div className={styles.pageSwatch}>Fondo de página<span>#F8FAF8</span></div>
    </div><p className={styles.caption}>Poppins para títulos y botones · Inter para lectura y formularios · Recursos locales</p></section>
    <section><h2>Acciones y etiquetas</h2><div className={styles.row}><ButtonLink to="/explorar">Explorar proyectos</ButtonLink><ButtonLink variant="secondary" to="/como-funciona">Cómo funciona</ButtonLink><ButtonLink variant="tertiary" to="/registro">Crear una cuenta →</ButtonLink><Button disabled>No disponible</Button></div>
      <div className={styles.row}><Button loading={loading} loadingLabel="Guardando…" onClick={() => setLoading(true)}>Probar estado de carga</Button><Button variant="secondary" onClick={() => setLoading(false)}>Restablecer</Button></div>
      <div className={styles.row}><Badge tone="success">✓ Verificado</Badge><Badge>Donación</Badge><Badge tone="warning">Finalizada</Badge><Badge tone="error">Cancelada</Badge><Badge tone="info">Información</Badge></div>
    </section>
    <section><h2>Tarjetas de campaña</h2><p>{DEMO_NOTICE}</p><div className={styles.grid3}>{cardSamples.map(project => <ProjectCard key={project.id} project={project} />)}<ProjectCardSkeleton /></div></section>
    <section><h2>Campos y validación</h2><form className={styles.form} noValidate onSubmit={(event) => { event.preventDefault(); setValidated(true) }}>
      <FormField label="Correo electrónico de prueba" type="email" name="demo-email" autoComplete="off" value={email} onChange={(event) => { setEmail(event.target.value); setValidated(false) }} placeholder="nombre@ejemplo.com" required help="Prueba visual local; no se envía ninguna información." error={emailError} />
      <FormField as="select" label="Tipo de campaña" defaultValue="donacion"><option value="donacion">Donación</option><option value="recompensa">Recompensa</option><option value="preventa">Preventa</option></FormField>
      <FormField as="textarea" label="Resumen de prueba" placeholder="Describe brevemente la iniciativa" />
      <Button type="submit">Comprobar campo</Button>
      {validated && !emailError && <Message tone="success" title="Formato válido">El componente muestra la confirmación correctamente.</Message>}
    </form></section>
    <section><h2>Mensajes y estados</h2><div className={styles.grid2}><Message tone="info" title="Información">Los cambios se confirmarán al completar el formulario.</Message><Message tone="success" title="Solicitud recibida">La operación de ejemplo se completó.</Message><Message tone="warning" title="Revisa la información">Hay datos que requieren tu atención.</Message><Message tone="error" title="No se pudo continuar">Revisa los campos indicados e intenta nuevamente.</Message></div>
      <div className={styles.grid2}><EmptyState title="No se encontraron proyectos" description="Prueba otros filtros o vuelve al listado general." action={<ButtonLink variant="secondary" to="/explorar">Explorar proyectos</ButtonLink>} />{retrySuccess ? <Message tone="success" title="Reintento completado">La respuesta simulada se muestra correctamente.</Message> : <ErrorState action={<Button onClick={() => setRetrySuccess(true)}>Reintentar</Button>} />}</div>
    </section>
  </div>
}
