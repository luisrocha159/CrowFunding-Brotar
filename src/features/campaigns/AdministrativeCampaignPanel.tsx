import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../access/session/sessionClient'
import { administrativeDetailFrom, decideCampaign, decisionErrors, publishCampaign, readAdministrativeDetail, reviewSections, type AdministrativeDetail, type Decision, type DecisionInput, type Observation } from './administrativeClient'
import { budgetTotal } from './sectionsClient'
import { projectStatusNames } from './projectsClient'
import styles from './projects.module.css'
import { useAccessPermissions } from '../access/session/accessPermissions'

const decisions = { APPROVED: 'Aprobar', CHANGES_REQUESTED: 'Solicitar cambios', REJECTED: 'Rechazar' }
const reviewDecisionNames: Readonly<Record<string, string>> = { PENDING: 'Pendiente', APPROVED: 'Aprobada', CHANGES_REQUESTED: 'Cambios solicitados', REJECTED: 'Rechazada' }
/** Vista de solo lectura: no usa las APIs privadas del creador ni oculta datos enviados. */
export function AdministrativeInformation({ detail }: { detail: AdministrativeDetail }) {
  const { general, story, plan, budget, funding, rewards } = detail
  return <>
    {detail.duplication && detail.duplication.matches.length > 0 && <section className={styles.panel} aria-label="Coincidencias de campañas">
      <h2>Coincidencias orientativas</h2><p>Estas semejanzas no prueban duplicidad ni bloquean la decisión. Se permiten nombres iguales o parecidos; si generan confusión, puedes solicitar ajustes durante la revisión.</p>
      <ul>{detail.duplication.matches.map(match => <li key={match.id}>
        <Link to={`/administracion/campanas/${encodeURIComponent(match.id)}`}>{match.title}</Link>
        <p>{match.kind === 'COPY' ? 'Coincidencia fuerte de contenido: revisar el contexto' : 'Posible semejanza de contenido'} · {projectStatusNames[match.status] ?? match.status}</p>
        <ul>{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      </li>)}</ul>
    </section>}
    <section className={styles.panel}><h2>{detail.project.title}</h2><p className={styles.badge}>{projectStatusNames[detail.project.status]}</p><p className={styles.prose}>{general.summary}</p>
      <dl><dt>Identificador</dt><dd>{detail.project.id}</dd><dt>Slug</dt><dd>{detail.slug}</dd><dt>Creador</dt><dd>{detail.project.creatorName}</dd><dt>Organización</dt><dd>{detail.organizationName ?? 'Campaña personal'}</dd><dt>Modalidad</dt><dd>{{ DONATION: 'Donación', REWARD: 'Recompensas', PRESALE: 'Preventa' }[detail.campaignType] ?? detail.campaignType}</dd><dt>Categoría</dt><dd>{detail.project.categoryName ?? 'No disponible'}</dd><dt>Ubicación</dt><dd>{[general.location.locality, general.location.countryCode, general.location.addressLine, general.location.reference].filter(Boolean).join(' · ')}</dd></dl>
      {detail.cover && <img className={styles.cover} src={`/api/files/public/${encodeURIComponent(detail.cover.fileId)}`} alt={detail.cover.altText} />}
    </section>
    {detail.initiative && <section className={styles.panel} aria-label="Declaración histórica de la iniciativa"><h2>Iniciativa y etapa · declaración anterior</h2>
      <h3>{detail.initiative.initiativeName} · {detail.initiative.stageName}</h3><p>{detail.initiative.purpose}</p>
      <p>Lugar o ámbito: {detail.initiative.siteReference} · {detail.initiative.locality}</p>
      <p>Objetivo de la etapa: {detail.initiative.objective}</p><p>Ejecución: {detail.initiative.startsOn} a {detail.initiative.endsOn}</p>
      <p>Datos anteriores conservados para consulta. No son KYC/KYB ni un requisito para aprobar o publicar.</p>
    </section>}
    <section className={styles.panel}><h2>Historia e impacto</h2>{(['problem', 'solution', 'beneficiaries', 'expectedResults'] as const).map((key, index) => <div key={key}><h3>{['Problema', 'Solución', 'Beneficiarios', 'Resultados esperados'][index]}</h3><p className={styles.prose}>{story.story[key]}</p></div>)}
      <h3>Indicadores</h3><ul>{story.indicators.map((item, index) => <li key={index}>{item.name} · línea base {item.baselineValue ?? 'no registrada'} · meta {item.targetValue ?? 'no registrada'} {item.unit}<p className={styles.prose}>{item.description}</p></li>)}</ul>
    </section>
    <section className={styles.panel}><h2>Plan y cronograma</h2><ul>{plan.activities.map((item, index) => <li key={index}>{item.name} · {item.responsibleName} · {item.plannedStartOn} a {item.plannedEndOn}</li>)}</ul>
      <h3>Hitos</h3>{plan.milestones.length ? <ul>{plan.milestones.map((item, index) => <li key={index}>{item.name} · {item.responsibleName} · {item.plannedStartOn} a {item.plannedEndOn} · actividades: {item.activityIndexes.length ? item.activityIndexes.map(activityIndex => plan.activities[activityIndex]?.name ?? 'no disponible').join(', ') : 'sin vínculo'}</li>)}</ul> : <p>No se registraron hitos.</p>}
      <h3>Presupuesto</h3><ul>{budget.items.map((item, index) => <li key={index}>{item.description} · {item.quantity} × {item.unitPrice} · planificado {item.plannedAmount} {funding.currencyCode}{item.notes && <p className={styles.prose}>{item.notes}</p>}</li>)}</ul><p>Total planificado: {budgetTotal(budget).toFixed(2)} {funding.currencyCode}</p>
      <h3>Riesgos</h3>{budget.risks.length ? <ul>{budget.risks.map((risk, index) => <li key={index}>{risk.title}<p>{risk.description}</p><p>Probabilidad: {risk.likelihood ? `${risk.likelihood} %` : 'no indicada'} · impacto: {risk.impact || 'no indicado'}</p><p>Mitigación: {risk.mitigation}</p></li>)}</ul> : <p>No se registraron riesgos.</p>}
    </section>
    <section className={styles.panel}><h2>Financiamiento</h2><p>Meta: {funding.goalAmount} {funding.currencyCode} · {funding.durationDays} días · {{ FLEXIBLE: 'Flexible', ALL_OR_NOTHING: 'Todo o nada' }[funding.fundingModel] ?? funding.fundingModel}</p><p>Periodo: {funding.startsAt ?? 'no fijado'} a {funding.endsAt ?? 'no fijado'}</p>
      {detail.campaignType !== 'DONATION' && <><h3>Recompensas y preventas</h3><ul>{rewards.map((item, index) => <li key={index}>{item.title} · {item.rewardKind}<p className={styles.prose}>{item.description}</p><p>Mínimo: {item.minAmount} {funding.currencyCode} · disponibilidad: {item.quantityTotal ?? 'sin límite'} · entrega: {item.estimatedDeliveryOn ?? 'no fijada'}</p></li>)}</ul></>}
      {detail.missing.length > 0 && <Message tone="warning" title="Información faltante"><ul>{detail.missing.map(item => <li key={item.field}>{item.label}</li>)}</ul><p>No se puede aprobar ni publicar hasta corregirla.</p></Message>}
    </section>
    <section className={styles.panel}><h2>Rondas de revisión</h2>{detail.rounds.map(round => <article key={round.id}><h3>Ronda {round.round} · {reviewDecisionNames[round.decision]}</h3><p>{round.reviewerName ?? 'Sin revisor asignado'} · {round.decidedAt ? new Date(round.decidedAt).toLocaleString('es-BO') : 'Sin decisión'}</p>{round.summary && <p className={styles.prose}>{round.summary}</p>}<ul>{round.observations.map((item, index) => <li key={index}>{reviewSections[item.section as keyof typeof reviewSections] ?? item.section}{item.fieldPath && ` · ${item.fieldPath}`}<p className={styles.prose}>{item.message}</p></li>)}</ul></article>)}</section>
    <section className={styles.panel}><h2>Historial de estados</h2><ol>{detail.project.history.map((event, index) => <li key={index}>{new Date(event.changedAt).toLocaleString('es-BO')} · {projectStatusNames[event.toStatus] ?? event.toStatus}{event.reason && <p>{event.reason}</p>}</li>)}</ol></section>
  </>
}

export function AdministrativeCampaignPanel({ id }: { id: string }) {
  const permissions = useAccessPermissions()
  const [detail, setDetail] = useState<AdministrativeDetail | null>(null)
  const [decision, setDecision] = useState<Decision>('APPROVED')
  const [comment, setComment] = useState('')
  const [observations, setObservations] = useState<Observation[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<'decision' | 'publish' | null>(null)
  const [retry, setRetry] = useState(0)
  const [access, setAccess] = useState(0)
  const active = useRef<AbortController | null>(null)
  const loaded = useRef(false)
  useEffect(() => {
    const controller = new AbortController(); loaded.current = true
    void readAdministrativeDetail(id, controller.signal).then(result => { if (!controller.signal.aborted) { setDetail(result); setConfirmation(null) } })
      .catch(error => { if (!controller.signal.aborted) { setAccess(error instanceof SessionError ? error.status : 0); setMessage('No se pudo cargar la revisión completa. Actualiza antes de decidir.'); setSuccess(false) } })
    return () => { loaded.current = false; controller.abort(); active.current?.abort() }
  }, [id, retry])
  if (access === 401) return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(`/administracion/campanas/${id}`)}`} />
  const round = detail?.rounds.at(-1)
  const input: DecisionInput = { decision, comment, observations: decision === 'CHANGES_REQUESTED' ? observations : [], expectedRound: round?.round ?? 0 }
  const refresh = () => { if (active.current) return; setDetail(null); setAccess(0); setConfirmation(null); setMessage(''); setRetry(value => value + 1) }
  async function act() {
    if (!detail || !confirmation || active.current) return
    if (!permissions.can(confirmation === 'publish' ? 'campaign.publish' : 'campaign.review.decide')) { setConfirmation(null); return }
    if (confirmation === 'decision') {
      const fields = decisionErrors(input); setErrors(fields)
      if (Object.keys(fields).length) { setConfirmation(null); return }
    }
    const controller = new AbortController(); active.current = controller; setBusy(true); setMessage(''); setSuccess(false)
    try {
      const result = confirmation === 'publish' ? await publishCampaign(id, input.expectedRound, controller.signal) : await decideCampaign(id, input, controller.signal)
      if (!loaded.current || controller.signal.aborted) return
      // El estado confirmado se refleja incluso si falla la consulta posterior; no ofrecer repetir.
      setDetail(administrativeDetailFrom({ ...detail, project: { ...detail.project, status: result.status } }))
      setConfirmation(null); setComment(''); setObservations([]); setErrors({}); setSuccess(true)
      setMessage(result.status === 'PUBLISHED' ? 'Campaña publicada: ya está disponible para visitantes.' : `Decisión guardada: ${projectStatusNames[result.status]}.`)
      try { const current = await readAdministrativeDetail(id, controller.signal); if (loaded.current && !controller.signal.aborted) setDetail(current) }
      catch { if (loaded.current && !controller.signal.aborted) setMessage('La operación fue confirmada. Actualiza para consultar el historial más reciente.') }
    } catch (error) {
      if (!loaded.current || controller.signal.aborted) return
      const status = error instanceof SessionError ? error.status : 0
      if (status === 401) setAccess(401)
      setConfirmation(null)
      setMessage(status === 409 ? 'El estado o la ronda cambió. Actualiza la campaña antes de decidir.'
        : status === 422 ? 'No se realizó la operación: hay datos obligatorios incompletos o inválidos. Actualiza para verlos.'
        : status === 403 ? 'No tienes permiso vigente para esta acción o la publicación está deshabilitada.'
        : status === 400 ? 'Revisa el motivo y las observaciones. No se guardó la decisión.'
        : 'No pudimos confirmar la operación. Actualiza antes de reintentar para comprobar el estado.')
      // Ante un resultado incierto se exige una nueva lectura; nunca un segundo POST a ciegas.
      setAccess(status === 400 ? 0 : status || -1)
    } finally { if (active.current === controller) active.current = null; if (loaded.current && !controller.signal.aborted) setBusy(false) }
  }
  return <div>
    {message && <Message tone={success ? 'success' : 'error'} title={message} />}
    <Button variant="secondary" disabled={busy} onClick={refresh}>Actualizar revisión</Button>
    {!detail && !message && <p role="status">Cargando información completa…</p>}
    {detail && <><AdministrativeInformation detail={detail} />
      {detail.project.status === 'PUBLISHED' && <Link to={`/proyectos/${encodeURIComponent(detail.slug)}`}>Ver campaña pública</Link>}
      {permissions.error && <Message tone="warning" title="No se pudieron consultar tus permisos">Recarga antes de intentar una operación.</Message>}
      {permissions.access?.readOnly && <p>Acceso de auditor: puedes consultar, pero no modificar campañas.</p>}
      {permissions.can('campaign.review.decide') && detail.project.status === 'IN_REVIEW' && round?.decision === 'PENDING' && <section className={styles.panel}><h2>Decidir · ronda {round.round}</h2><p>Aprobar no publica la campaña. El motivo de rechazo o cambios será visible para el creador.</p>
        <fieldset className={styles.reviewForm} disabled={busy || access !== 0}>
          <label>Decisión *<select required value={decision} onChange={event => { setDecision(event.target.value as Decision); setConfirmation(null); setErrors({}) }}>{Object.entries(decisions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Comentario {decision === 'APPROVED' ? '(opcional)' : '*'}<textarea required={decision !== 'APPROVED'} minLength={5} maxLength={10000} onBlur={() => setErrors(previous => ({ ...previous, comment: decisionErrors(input).comment ?? '' }))} value={comment} aria-invalid={Boolean(errors.comment)} aria-describedby="review-comment-error" onChange={event => { setComment(event.target.value); setConfirmation(null) }} /></label>
          {errors.comment && <p id="review-comment-error" role="alert">{errors.comment}</p>}
          {decision === 'CHANGES_REQUESTED' && <><h3>Observaciones por sección (opcionales)</h3>{observations.map((item, index) => <div key={index}><label>Sección {index + 1} *<select required value={item.section} onChange={event => { setObservations(observations.map((row, i) => i === index ? { ...row, section: event.target.value } : row)); setConfirmation(null) }}>{Object.entries(reviewSections).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Cambio solicitado *<textarea required minLength={5} maxLength={10000} onBlur={() => setErrors(previous => ({ ...previous, [`observations.${index}`]: decisionErrors(input)[`observations.${index}`] ?? '' }))} value={item.message} aria-invalid={Boolean(errors[`observations.${index}`])} onChange={event => { setObservations(observations.map((row, i) => i === index ? { ...row, message: event.target.value } : row)); setConfirmation(null) }} /></label>{errors[`observations.${index}`] && <p role="alert">{errors[`observations.${index}`]}</p>}<Button variant="tertiary" onClick={() => { setObservations(observations.filter((_, i) => i !== index)); setConfirmation(null) }}>Quitar observación {index + 1}</Button></div>)}<Button variant="secondary" disabled={observations.length >= 50} onClick={() => { setObservations([...observations, { section: 'general', fieldPath: null, message: '' }]); setConfirmation(null) }}>Añadir observación</Button></>}
          <Button disabled={decision === 'APPROVED' && detail.missing.length > 0} onClick={() => { const fields = decisionErrors(input); setErrors(fields); if (!Object.keys(fields).length) setConfirmation('decision') }}>{decisions[decision]}</Button>
        </fieldset>
      </section>}
      {detail.project.status === 'APPROVED' && <section className={styles.panel}><h2>Publicación</h2><p>La campaña está aprobada pero aún es privada. Publicarla la hará visible en Explorar.</p>{!permissions.can('campaign.publish') ? <p>No tienes permiso vigente para publicar.</p> : detail.publicationEnabled ? <Button disabled={busy || access !== 0 || detail.missing.length > 0 || round?.decision !== 'APPROVED'} onClick={() => setConfirmation('publish')}>Publicar campaña</Button> : <Message tone="warning" title="Publicación deshabilitada">Falta habilitar la configuración acordada para D05.</Message>}</section>}
      {confirmation && <section className={styles.panel} role="region" aria-label="Confirmación de operación"><h3>Confirmar {confirmation === 'publish' ? 'publicación pública' : decisions[decision].toLowerCase()}</h3><p>Campaña: «{detail.project.title}» · ronda {round?.round}.</p><div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Cancelar</Button><Button loading={busy} loadingLabel="Guardando…" onClick={() => { void act() }}>Confirmar operación</Button></div></section>}
    </>}
  </div>
}
