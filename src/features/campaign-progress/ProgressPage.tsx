import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useBeforeUnload, useBlocker, useParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { usePublicSession } from '../access/session/useHeaderSession'
import { SessionError } from '../../shared/api/sessionError'
import { progressStatuses, validateProgress } from '../../../backend/src/campaign-progress/domain/progress'
import { failureText, readProgress, saveProgress, type ActualRow, type ProgressState } from './progressClient'
import { UpdatesEditor } from './UpdatesEditor'
import { RewardsManager } from './RewardsManager'
import { projectStatusNames } from '../campaigns/projectsClient'
import styles from './progress.module.css'
const progressLabels: Record<string, string> = { PLANNED: 'Planificado', IN_PROGRESS: 'En curso', COMPLETED: 'Completado', DELAYED: 'Con retraso', CANCELLED: 'Cancelado' }
export function ProgressPage() {
  const session = usePublicSession(); const { id = '' } = useParams()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(`/mis-proyectos/${id}/avances`)}`} />
  return <ProgressEditor key={`${session.user.id}:${id}`} id={id} />
}
function ProgressEditor({ id }: { id: string }) {
  const [data, setData] = useState<ProgressState | null>(null); const [dirty, setDirty] = useState(false); const [updateDirty, setUpdateDirty] = useState(false)
  const [rewardDirty,setRewardDirty]=useState(false)
  const [discard, setDiscard] = useState(false)
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [retry, setRetry] = useState(0); const [busy, setBusy] = useState(false); const locked = useRef(false); const [expired, setExpired] = useState(false)
  const blocker = useBlocker(dirty || updateDirty || rewardDirty)
  useBeforeUnload(event => { if (dirty || updateDirty || rewardDirty) { event.preventDefault(); event.returnValue = '' } })
  useEffect(() => { const controller = new AbortController(); readProgress(id, controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setDirty(false); setError('') } }).catch(e => { if (!controller.signal.aborted) { if (e instanceof SessionError && e.status === 401) setExpired(true); else setError(failureText(e)) } }); return () => controller.abort() }, [id, retry])
  if (expired) return <Navigate replace to="/iniciar-sesion" />
  function edit(key: 'activities' | 'milestones', index: number, patch: Partial<ActualRow>) { setData(current => current ? { ...current, [key]: current[key].map((row, i) => i === index ? { ...row, ...patch } : row) } : current); setDirty(true); setNotice('') }
  async function save() {
    if (!data || locked.current) return
    const input = { revision: data.revision, activities: data.activities.map(({ id: rowId, responsibleName, status, progressPercent, actualStartOn, actualEndOn }) => ({ id: rowId, responsibleName, status, progressPercent, actualStartOn, actualEndOn })), milestones: data.milestones.map(({ id: rowId, responsibleName, status, progressPercent, actualStartOn, actualEndOn }) => ({ id: rowId, responsibleName, status, progressPercent, actualStartOn, actualEndOn })), indicators: data.indicators.map(row => ({ id: row.id, achievedValue: row.achievedValue === null || row.achievedValue === '' ? null : Number(row.achievedValue) })) }
    const errors = Object.values(validateProgress(input,Object.fromEntries(data.indicators.map(i=>[i.id,i.unit])))); if (errors.length) { setError(errors.join(' ')); return }
    locked.current = true; setBusy(true); setError(''); setNotice('')
    try { setData(await saveProgress(id, input)); setDirty(false); setNotice('Avances guardados. Publícalos mediante una novedad para compartirlos.') } catch (e) { if (e instanceof SessionError && e.status === 401) setExpired(true); else setError(failureText(e)) } finally { locked.current = false; setBusy(false) }
  }
  return <div className={styles.page}><nav className={styles.actions}><Link to="/panel-creador">Panel del creador</Link><Link to={`/mis-proyectos/${id}`}>Datos de la campaña</Link></nav><h1>Avances y novedades</h1>
    {blocker.state === 'blocked' && <section role="alertdialog" aria-label="Cambios sin guardar" className={styles.card}><h2>Hay cambios sin guardar</h2><p>Guarda antes de salir o descarta los cambios de esta pantalla.</p><div className={styles.actions}><Button autoFocus onClick={() => blocker.reset()}>Continuar editando</Button><Button variant="secondary" onClick={() => blocker.proceed()}>Descartar y salir</Button></div></section>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? error ? <Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button> : <p role="status">Cargando avances…</p> : <>
      <header><h2>{data.campaign.title}</h2><p>Estado: {projectStatusNames[data.campaign.status] ?? data.campaign.status}. Registrar avances no cambia el estado de la campaña ni confirma gastos o pagos.</p></header>
      {!data.editable && <p>Consulta disponible. El estado actual no permite editar avances.</p>}
      {(['activities', 'milestones'] as const).map(key => <section key={key}><h2>{key === 'activities' ? 'Actividades' : 'Hitos'}</h2>{!data[key].length && <p>No hay elementos planificados para registrar avance.</p>}<div className={styles.grid}>{data[key].map((row, index) => <article className={styles.card} key={row.id}><h3>{row.name}</h3><p>Plan: {row.plannedStartOn ?? 'Sin inicio'} → {row.plannedEndOn ?? 'Sin fin'}</p><fieldset disabled={!data.editable || busy} aria-label={row.name}>
        <label>Responsable<input maxLength={160} value={row.responsibleName} onChange={e => edit(key, index, { responsibleName: e.target.value })} /></label>
        <label htmlFor={`status-${row.id}`}>Estado del avance</label><select id={`status-${row.id}`} value={row.status} onChange={e => edit(key, index, { status: e.target.value })}>{progressStatuses.map(value => <option key={value} value={value}>{progressLabels[value]}</option>)}</select>
        <label>Avance (%)<input type="number" min={0} max={100} step={1} value={row.progressPercent} onChange={e => edit(key, index, { progressPercent: Number(e.target.value) })} /></label>
        <label>Inicio real<input type="date" value={row.actualStartOn ?? ''} onChange={e => edit(key, index, { actualStartOn: e.target.value || null })} /></label><label>Fin real<input type="date" value={row.actualEndOn ?? ''} onChange={e => edit(key, index, { actualEndOn: e.target.value || null })} /></label>
      </fieldset></article>)}</div></section>)}
      <section><h2>Resultados alcanzados</h2>{!data.indicators.length && <p>No hay indicadores registrados.</p>}<div className={styles.grid}>{data.indicators.map((row, index) => <article className={styles.card} key={row.id}><h3>{row.name}</h3><p>Meta: {row.targetValue ?? 'Sin definir'} {row.unit}</p><label>Valor alcanzado<input disabled={!data.editable || busy} type="number" min="0" step="0.01" value={row.achievedValue ?? ''} onChange={e => { setData({ ...data, indicators: data.indicators.map((item, i) => i === index ? { ...item, achievedValue: e.target.value || null } : item) }); setDirty(true) }} /></label></article>)}</div></section>
      <div className={styles.actions}><Button disabled={!data.editable || !dirty} loading={busy} onClick={() => { void save() }}>Guardar avances</Button><Button variant="secondary" disabled={busy || updateDirty} onClick={() => dirty ? setDiscard(true) : setRetry(v => v + 1)}>Actualizar datos</Button></div>
      <>{discard && <section role="alertdialog" aria-label="Recargar avances" className={styles.card}><h2>Recargar la versión guardada</h2><p>Se descartarán tus cambios locales de avances. Puedes cancelar para conservarlos y copiarlos antes de recargar.</p><div className={styles.actions}><Button onClick={() => { setRetry(v => v + 1); setDiscard(false) }}>Descartar cambios y recargar</Button><Button variant="secondary" onClick={() => setDiscard(false)}>Conservar mis cambios</Button></div></section>}</>
      <UpdatesEditor id={id} progress={data} progressDirty={dirty} onDirty={setUpdateDirty} />
      <RewardsManager id={id} onDirty={setRewardDirty} />
    </>}</div>
}
