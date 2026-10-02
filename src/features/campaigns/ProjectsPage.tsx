import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { EmptyState, Message } from '../../shared/components/Feedback'
import projectTree from '../../assets/figma/project-tree.svg'
import { canContinueProject, projectGoal, projectStatusNames, type ProjectSummary } from './projectsClient'
import { useProjects } from './useProjects'
import styles from './projects.module.css'

export function ProjectsList({ projects, onDiscard }: { projects: ProjectSummary[]; onDiscard: (project: ProjectSummary) => void }) {
  return <div className={styles.list}>{projects.map(project => <article key={project.id} className={styles.project}>
    <span className={styles.icon}><img src={projectTree} alt="" /></span>
    <div className={styles.projectInfo}><div className={styles.titleRow}><h2>{project.title}</h2><span className={`${styles.badge} ${project.status === 'PUBLISHED' ? styles.published : ''}`}>{projectStatusNames[project.status]}</span></div>
      <p>{project.categoryName ?? 'Categoría por definir'} · {projectGoal(project)}</p>
    </div>
    <div className={styles.actions}>
      {canContinueProject(project.status) && <ButtonLink variant="secondary" to={`/crear-campana?borrador=${encodeURIComponent(project.id)}`}>Continuar borrador</ButtonLink>}
      <ButtonLink variant="secondary" to={`/mis-proyectos/${encodeURIComponent(project.id)}`}>Ver detalle</ButtonLink>
      {canContinueProject(project.status) && <Button variant="tertiary" onClick={() => onDiscard(project)}>Descartar</Button>}
    </div>
  </article>)}</div>
}

export function ProjectsPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams()
  const location = useLocation()
  const data = useProjects(admin, id)
  const [confirmation, setConfirmation] = useState<ProjectSummary | null>(null)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal()
    else if (!confirmation && dialog.current?.open) dialog.current.close()
  }, [confirmation])
  if (data.state === 'anonymous') return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname)}`} />
  const visible = data.projects.filter(project => `${project.title} ${project.creatorName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const back = admin ? '/administracion/campanas' : '/mis-proyectos'
  return <div className={admin ? styles.adminLayout : styles.creatorLayout}>
    {admin && <aside className={styles.sidebar}><h2>Administración</h2><Link aria-current="page" to="/administracion/campanas">Panel de revisión</Link><Link to="/mi-cuenta">Mi cuenta y perfil</Link><p>Esta etapa incluye la cola de campañas. No incluye KYC ni operaciones financieras.</p></aside>}
    <section className={styles.content}>
      <header className={styles.heading}><div><h1>{id ? (admin ? 'Detalle para revisión' : 'Detalle de mi proyecto') : admin ? 'Revisión de campañas' : 'Mis proyectos'}</h1><p>{admin ? 'Campañas enviadas a revisión. La aprobación y la publicación son operaciones distintas.' : 'Lista completa de tus campañas y su estado actual.'}</p></div>
        {!admin && !id && data.state === 'ready' && <ButtonLink to="/crear-campana">+ Crear nueva campaña</ButtonLink>}
      </header>
      <p><ButtonLink to={id ? back : '/mi-cuenta'} variant="tertiary">{id ? 'Volver a la lista' : 'Volver a mi cuenta'}</ButtonLink></p>
      {data.state === 'loading' && <p role="status" aria-busy="true">Consultando campañas…</p>}
      {data.state === 'forbidden' && <Message tone="warning" title="Acceso no disponible">Necesitas el rol {admin ? 'Administrador' : 'Creador'} vigente. No puedes asignártelo desde esta pantalla.</Message>}
      {data.state === 'missing' && <Message tone="warning" title="Proyecto no disponible">No pertenece a tu cuenta, fue descartado o dejó de estar en revisión.</Message>}
      {data.state === 'error' && <><Message tone="error" title="No se pudieron consultar las campañas">Comprueba la API y PostgreSQL. Un error no se muestra como una lista vacía.</Message><Button onClick={data.refresh}>Reintentar</Button></>}
      {data.notice && <Message tone={data.discardError ? 'error' : 'success'} title={data.notice} />}
      {data.discardError && <Button variant="secondary" onClick={data.refresh}>Actualizar lista</Button>}
      {data.state === 'ready' && !id && (data.projects.length === 0 ? <EmptyState title={admin ? 'No hay campañas pendientes' : 'Todavía no tienes proyectos'} description={admin ? 'Aquí aparecerán las campañas que hayan sido enviadas a revisión.' : 'Crea un borrador para comenzar tu primera campaña.'} />
        : admin ? <><label className={styles.search}>Buscar campaña o creador<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className={styles.tableScroll}><table><caption>Campañas pendientes de revisión</caption><thead><tr><th>Campaña</th><th>Creador</th><th>Fecha de envío</th><th>Meta</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>{visible.map(project => <tr key={project.id}><td>{project.title}</td><td>{project.creatorName || 'Nombre no disponible'}</td><td>{project.submittedAt ? new Date(project.submittedAt).toLocaleDateString('es-BO') : 'Sin fecha de envío'}</td><td>{projectGoal(project)}</td><td><span className={styles.badge}>{projectStatusNames[project.status]}</span></td><td><Link to={`${back}/${encodeURIComponent(project.id)}`}>Revisar campaña</Link></td></tr>)}</tbody></table></div>
          {visible.length === 0 && <p role="status">No hay coincidencias con esa búsqueda.</p>}</>
          : <ProjectsList projects={data.projects} onDiscard={setConfirmation} />)}
      {data.state === 'ready' && id && data.detail && <>
        <section className={styles.panel}><div className={styles.titleRow}><h2>{data.detail.title}</h2><span className={styles.badge}>{projectStatusNames[data.detail.status]}</span></div><p>{data.detail.summary || 'Resumen todavía no registrado.'}</p>
          <dl><dt>Categoría</dt><dd>{data.detail.categoryName ?? 'Por definir'}</dd><dt>Meta</dt><dd>{projectGoal(data.detail)}</dd><dt>Creador</dt><dd>{data.detail.creatorName || 'Nombre no disponible'}</dd><dt>Ubicación</dt><dd>{[data.detail.location?.locality, data.detail.location?.countryCode].filter(Boolean).join(', ') || 'Por definir'}</dd></dl>
          {!admin && canContinueProject(data.detail.status) && <ButtonLink to={`/crear-campana?borrador=${encodeURIComponent(data.detail.id)}`}>Continuar borrador</ButtonLink>}
        </section>
        <section className={styles.panel}><h2>Historia e impacto</h2>{(['problem', 'solution', 'beneficiaries', 'expectedResults'] as const).map((key, index) => <div key={key}><h3>{['Problema', 'Solución', 'Beneficiarios', 'Resultados esperados'][index]}</h3><p className={styles.prose}>{data.detail!.story?.[key] || 'Información todavía no registrada.'}</p></div>)}</section>
        <section className={styles.panel}><h2>Historial registrado</h2>{data.detail.history.length === 0 ? <p>No hay movimientos registrados.</p> : <ol>{data.detail.history.map((event, index) => <li key={index}>{new Date(event.changedAt).toLocaleString('es-BO')} · {projectStatusNames[event.toStatus] ?? event.toStatus}{event.reason && <p>{event.reason}</p>}</li>)}</ol>}</section>
        {admin && <Message tone="info" title="Vista preparatoria de revisión">El detalle de plan, presupuesto, financiamiento y recompensas se integrará con los módulos del equipo. Las decisiones todavía no están habilitadas en esta pantalla.</Message>}
      </>}
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="discard-title" onCancel={event => { event.preventDefault(); if (!data.discarding) setConfirmation(null) }}>
        <h2 id="discard-title">¿Descartar este borrador?</h2><p>«{confirmation?.title}» dejará de aparecer en tus proyectos. Solo se admite esta acción mientras sea un borrador propio.</p>
        <div className={styles.actions}><Button variant="secondary" autoFocus disabled={data.discarding} onClick={() => setConfirmation(null)}>Conservar borrador</Button><Button loading={data.discarding} loadingLabel="Descartando…" onClick={async () => { if (!confirmation) return; await data.discard(confirmation); setConfirmation(null) }}>Confirmar descarte</Button></div>
      </dialog>
    </section>
  </div>
}
