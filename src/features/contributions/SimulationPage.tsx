import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { RewardChoices } from './RewardChoices'
import { SessionError } from '../../shared/api/sessionError'
import { ContributionSession } from './ContributionPages'
import { createSimulation, simulationSelectionError, simulationAmountError, readSimulations, readSupportOptions, type SimulationInput, type SupportOptions, type SupportSimulation } from './simulationClient'
import styles from './contributions.module.css'
export function SimulationPage() {
  const [params] = useSearchParams(), campaignId = params.get('campaignId'), id = params.get('id')
  return <ContributionSession><section className={styles.layout}><nav className={styles.actions}><Link to="/panel-patrocinador">Mi panel</Link><Link to="/explorar">Explorar campañas</Link></nav><header><h1>Aportar a la campaña</h1><p>Elige el importe y las opciones de tu aporte. Podrás revisar el resumen antes de confirmar.</p></header>
    {id ? <Navigate replace to={`/apoyo-demo?seleccion=${encodeURIComponent(id)}`}/> : campaignId ? <SimulationSelection key={`selection:${campaignId}`} campaignId={campaignId} /> : <p>Elige una campaña desde el catálogo o vuelve a una selección reciente.</p>}
    {!id && !campaignId && <SimulationHistory />}
  </section></ContributionSession>
}
function errorMessage(error: unknown) {
  return error instanceof SessionError && error.status === 409 ? 'La selección, disponibilidad o versión cambió. Vuelve a consultar las opciones disponibles.' : error instanceof SessionError && error.status === 400 ? 'Revisa el importe, la recompensa y los mínimos registrados.' : error instanceof SessionError && error.status === 404 ? 'La campaña o la selección no está disponible para tu cuenta.' : 'No pudimos confirmar el resultado. Reintenta con la misma selección para conservar la referencia.'
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
  if (created) return <Navigate replace to={`/apoyo-demo?seleccion=${created}`} />
  const selected = options?.rewards.find(reward => reward.id === rewardId)
  const amountError=options&&amount.trim()?simulationAmountError(options,amount.trim()):null
  const selectionError=options?simulationSelectionError(options,amount.trim(),rewardId||null):null
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
  return <section className={styles.card}><h2>Seleccionar apoyo</h2>{error && <p role="alert">{error}</p>}{!options ? <><p role="status">Consultando opciones…</p>{error && <Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar opciones</Button>}</> : <><h3>{options.title}</h3><p>Modalidad: {options.campaignType === 'DONATION' ? 'Donación' : options.campaignType === 'PRESALE' ? 'Preventa' : 'Recompensa'} · Moneda: {options.currency}</p>
    {!options.eligible ? <p role="status">{options.unavailableReason}</p> : <form className={`${styles.form} ${styles.selectionForm}`} onSubmit={event => { event.preventDefault(); void submit() }}>
      <div className={styles.amountBlock}><FormField label={`1. ¿Cuánto quieres aportar? (${options.currency})`} inputMode="decimal" pattern="(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?" maxLength={15} required value={amount} onChange={event=>{setAmount(event.target.value);setError('')}} disabled={busy} error={amountError??undefined} help={`${options.minimum?`Mínimo de la campaña: ${options.minimum} ${options.currency}. `:'Elige un importe mayor que cero. '}Usa un punto y hasta dos decimales.`}/></div>
      <RewardChoices options={options} amount={amount} value={rewardId} disabled={busy} onChange={id=>{setReward(id);setError('')}}/>
      {selected&&selectionError&&!amountError&&<p role="alert" className={styles.selectionProblem}>{selectionError} Elige otra opción o ajusta el importe.</p>}
      {amount.trim()&&!amountError&&<p role="status" className={styles.selectionSummary}>{selectionError?'Revisa tu elección para continuar.':`Tu aporte: ${amount.trim()} ${options.currency} · ${selected?selected.title:'Sin recompensa'}`}</p>}
      <div className={styles.amountBlock}><FormField as="select" label={`${options.campaignType==='DONATION'?'2':'3'}. Método`} value={method} onChange={event=>setMethod(event.target.value as SimulationInput['method'])} disabled={busy}><option value="TEST_QR">QR</option><option value="TEST_CARD">Tarjeta (sin datos bancarios)</option></FormField></div><div><Button type="submit" disabled={busy||Boolean(selectionError)} loading={busy} loadingLabel="Preparando resumen…">Continuar</Button></div></form>}
    <p>Todavía no se registra el aporte ni se reservan unidades. En el siguiente paso podrás revisar y confirmar tu elección.</p></>}</section>
}
function SimulationHistory() {
  const [items, setItems] = useState<SupportSimulation[] | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [expired, setExpired] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    readSimulations(controller.signal).then(value => { if (!controller.signal.aborted) setItems(value) }).catch(reason => { if (!controller.signal.aborted) { if (reason instanceof SessionError && reason.status === 401) setExpired(true); else setError(errorMessage(reason)) } })
    return () => controller.abort()
  }, [attempt])
  if (expired) return <ExpiredSession />
  return <section className={styles.card}><h2>Selecciones recientes</h2>{error && <><p role="alert">{error}</p><Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar historial</Button></>}{items ? items.length ? <ul>{items.map(item => <li key={item.id}><Link to={`/simulacion-apoyo?id=${item.id}`}>{item.campaignTitle} · {item.amount} {item.currency}</Link></li>)}</ul> : <p>Aún no guardaste ninguna selección.</p> : !error && <p role="status">Consultando selecciones…</p>}</section>
}
