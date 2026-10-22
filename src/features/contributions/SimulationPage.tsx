import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { SessionError } from '../../shared/api/sessionError'
import { ContributionSession } from './ContributionPages'
import { dateLabel, stateLabels } from './labels'
import { createSimulation, simulationSelectionError, readSimulation, readSimulations, readSupportOptions, transitionSimulation, type SimulationInput, type SimulationState, type SupportOptions, type SupportSimulation } from './simulationClient'
import styles from './contributions.module.css'
export function SimulationPage() {
  const [params] = useSearchParams(), campaignId = params.get('campaignId'), id = params.get('id')
  return <ContributionSession><section className={styles.layout}><nav className={styles.actions}><Link to="/panel-patrocinador">Mi panel</Link><Link to="/explorar">Explorar campañas</Link></nav><header><h1>Simulación de apoyo</h1><p className={styles.notice}><strong>SIMULACIÓN · Sin dinero real.</strong> Este ensayo no crea un aporte, no reserva cupos, no cobra ni emite comprobantes de pago. Los métodos son ficticios y no se solicitan datos de tarjetas ni direcciones.</p></header>
    {id ? <SimulationDetail key={`detail:${id}`} id={id} /> : campaignId ? <SimulationSelection key={`selection:${campaignId}`} campaignId={campaignId} /> : <p>Elige una campaña desde su detalle para probar monto y recompensa. Puedes recuperar tus ensayos recientes a continuación.</p>}
    <SimulationHistory key={`history:${id ?? 'list'}`} />
  </section></ContributionSession>
}
function errorMessage(error: unknown) {
  return error instanceof SessionError && error.status === 409 ? 'La selección, disponibilidad o versión cambió. Recarga el ensayo; tu referencia se conserva.' : error instanceof SessionError && error.status === 400 ? 'Revisa el importe, la recompensa y los mínimos registrados.' : error instanceof SessionError && error.status === 404 ? 'La campaña o el ensayo no está disponible para tu cuenta.' : 'No pudimos confirmar el resultado. Reintenta con la misma selección para conservar la referencia.'
}
function ExpiredSession() { return <Navigate to="/iniciar-sesion?continuar=%2Fsimulacion-apoyo" replace /> }
function SimulationSelection({ campaignId }: { campaignId: string }) {
  const [options, setOptions] = useState<SupportOptions | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false), [expired, setExpired] = useState(false)
  const [rewardId, setReward] = useState(''), [amount, setAmount] = useState(''), [method, setMethod] = useState<'TEST_QR' | 'TEST_CARD'>('TEST_QR')
  const [created, setCreated] = useState<string | null>(null)
  const active = useRef<AbortController | null>(null), request = useRef<{ payload: string; id: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    readSupportOptions(campaignId, controller.signal).then(value => { if (!controller.signal.aborted) setOptions(value) }).catch(reason => { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } })
    return () => { controller.abort(); active.current?.abort() }
  }, [campaignId, attempt])
  if (expired) return <ExpiredSession />
  if (created) return <Navigate replace to={`/simulacion-apoyo?id=${created}`} />
  const selected = options?.rewards.find(reward => reward.id === rewardId)
  async function submit() {
    if (active.current || !options?.eligible) return
    const validation = simulationSelectionError(options, amount.trim(), rewardId || null)
    if (validation) { setError(validation); return }
    setError(''); setBusy(true)
    const controller = new AbortController(); active.current = controller
    const input = { campaignId, rewardId: rewardId || null, amount: amount.trim(), method }
    const payload = JSON.stringify(input)
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() }
    try {
      const result = await createSimulation({ ...input, requestId: request.current.id }, controller.signal)
      if (!controller.signal.aborted) setCreated(result.id)
    } catch (reason) { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  return <section className={styles.card}><h2>Seleccionar apoyo de prueba</h2>{error && <p role="alert">{error}</p>}{!options ? <><p role="status">Consultando opciones…</p>{error && <Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar opciones</Button>}</> : <><h3>{options.title}</h3><p>Modalidad: {options.campaignType === 'DONATION' ? 'Donación' : options.campaignType === 'PRESALE' ? 'Preventa' : 'Recompensa'} · Moneda: {options.currency}</p><p>{options.minimum ? `Mínimo registrado: ${options.minimum} ${options.currency}` : 'La campaña no tiene un mínimo registrado. No se presupone un mínimo comercial.'}</p>
    {!options.eligible ? <p role="status">{options.unavailableReason}</p> : <form className={styles.form} onSubmit={event => { event.preventDefault(); void submit() }}>
      {options.campaignType !== 'DONATION' && <label>Recompensa {options.campaignType === 'PRESALE' ? '(obligatoria)' : '(opcional)'}<select value={rewardId} onChange={event => setReward(event.target.value)} required={options.campaignType === 'PRESALE'} disabled={busy}><option value="">Sin recompensa</option>{options.rewards.map(reward => <option key={reward.id} value={reward.id} disabled={reward.available === 0}>{reward.title} · desde {reward.minimum} {options.currency} · {reward.available === null ? 'sin cupo limitado registrado' : `${reward.available} disponibles`}</option>)}</select></label>}
      <label>Importe de prueba ({options.currency})<input inputMode="decimal" pattern="(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?" maxLength={15} required value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} aria-describedby="amount-help" /></label><p id="amount-help">Usa un punto para los decimales, hasta dos cifras. {selected ? `La recompensa exige al menos ${selected.minimum} ${options.currency}.` : ''} Los mínimos y la disponibilidad se vuelven a comprobar en el servidor.</p>
      <label>Método ficticio<select value={method} onChange={event => setMethod(event.target.value as SimulationInput['method'])} disabled={busy}><option value="TEST_QR">QR de prueba (sin código cobrable)</option><option value="TEST_CARD">Tarjeta ficticia (sin datos)</option></select></label><Button type="submit" loading={busy} loadingLabel="Guardando ensayo…">Guardar selección simulada</Button></form>}
    <p>Esta selección es un ensayo persistente. El checkout y la reserva real dependen de las reglas financieras y de campaña aprobadas.</p></>}</section>
}
function SimulationDetail({ id }: { id: string }) {
  const [data, setData] = useState<SupportSimulation | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0), [expired, setExpired] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    readSimulation(id, controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setError('') } }).catch(reason => { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } })
    return () => { controller.abort(); active.current?.abort() }
  }, [id, attempt])
  if (expired) return <ExpiredSession />
  async function change(state: SimulationState) {
    if (!data || active.current) return
    const controller = new AbortController(); active.current = controller; setBusy(true); setError('')
    try { const value = await transitionSimulation(id, state, data.version, controller.signal); if (!controller.signal.aborted) setData(value) }
    catch (reason) { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  const choices: SimulationState[] = data?.state === 'INITIATED' ? ['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'] : data?.state === 'PENDING' ? ['CONFIRMED', 'FAILED', 'EXPIRED'] : data?.state === 'FAILED' || data?.state === 'EXPIRED' ? ['INITIATED'] : []
  return <section className={styles.card}><h2>Resultado de prueba</h2>{error && <p role="alert">{error}</p>}{data ? <><p className={styles.reference}>{data.reference}</p><h3>{data.campaignTitle}</h3><p className={styles.amount}>{data.amount} {data.currency}</p><p>Estado simulado: <strong>{stateLabels[data.state]}</strong> · Intento {data.attempts}</p><p>{data.method === 'TEST_QR' ? 'QR ficticio' : 'Tarjeta ficticia'} · {data.rewardTitle ?? 'Sin recompensa'}</p><p>Actualizado: {dateLabel(data.updatedAt)}</p>{data.state === 'CONFIRMED' && <p className={styles.notice}>Confirmación SIMULADA. No existe un cobro, aporte, comprobante real ni reserva.</p>}<div className={styles.actions}>{choices.map(state => <Button key={state} variant="secondary" disabled={busy} onClick={() => { void change(state) }}>{state === 'INITIATED' ? 'Reintentar esta simulación' : `Simular: ${stateLabels[state]}`}</Button>)}<Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAttempt(value => value + 1) }}>Recargar ensayo</Button><Link to={`/simulacion-apoyo?campaignId=${data.campaignId}`}>Probar otra selección</Link></div></> : <><p role="status">Cargando ensayo…</p>{error && <Button onClick={() => setAttempt(value => value + 1)}>Reintentar consulta</Button>}</>}</section>
}
function SimulationHistory() {
  const [items, setItems] = useState<SupportSimulation[] | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [expired, setExpired] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    readSimulations(controller.signal).then(value => { if (!controller.signal.aborted) setItems(value) }).catch(reason => { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } })
    return () => controller.abort()
  }, [attempt])
  if (expired) return <ExpiredSession />
  return <section className={styles.card}><h2>Últimos 20 ensayos de tu cuenta</h2>{error && <><p role="alert">{error}</p><Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar historial</Button></>}{items ? items.length ? <ul>{items.map(item => <li key={item.id}><Link to={`/simulacion-apoyo?id=${item.id}`}>{item.campaignTitle} · SIMULACIÓN · {stateLabels[item.state]} · {item.amount} {item.currency}</Link></li>)}</ul> : <p>No tienes ensayos guardados.</p> : !error && <p role="status">Consultando ensayos…</p>}</section>
}
