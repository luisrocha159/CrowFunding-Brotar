import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { usePublicSession } from '../access/session/useHeaderSession'
import { failureText } from './progressClient'
import styles from './progress.module.css'
interface Report { id: string; periodLabel: string | null; periodStart: string | null; periodEnd: string | null; isFinal: boolean; status: string; fundsReceived: string | null; fundsSpent: string | null; balance: string | null; currency: string; varianceExplanation: string | null; narrative: string | null; expenses: { id: string; budgetItemId: string | null; description: string; spentAmount: string; currency: string; spentOn: string | null; evidenceCount: number }[] }
interface Accountability { campaign: { id: string; title: string; status: string; currency: string | null }; captureAvailable: false; budget: { id: string; description: string; plannedAmount: string; category: string }[]; reports: Report[] }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const nullable = (v: unknown) => v === null || typeof v === 'string'
function from(v: unknown): Accountability {
  if (!object(v) || !object(v.campaign) || !['id', 'title', 'status'].every(k => typeof (v.campaign as Record<string, unknown>)[k] === 'string') || !nullable(v.campaign.currency) || v.captureAvailable !== false || !Array.isArray(v.budget) || !v.budget.every(b => object(b) && ['id', 'description', 'plannedAmount', 'category'].every(k => typeof b[k] === 'string')) || !Array.isArray(v.reports) || !v.reports.every(r => object(r) && ['id', 'status', 'currency'].every(k => typeof r[k] === 'string') && ['periodLabel', 'periodStart', 'periodEnd', 'fundsReceived', 'fundsSpent', 'balance', 'varianceExplanation', 'narrative'].every(k => nullable(r[k])) && typeof r.isFinal === 'boolean' && Array.isArray(r.expenses) && r.expenses.every(e => object(e) && ['id', 'description', 'spentAmount', 'currency'].every(k => typeof e[k] === 'string') && nullable(e.budgetItemId) && nullable(e.spentOn) && Number.isSafeInteger(e.evidenceCount)))) throw new SessionError(0)
  return v as unknown as Accountability
}
export function AccountabilityPage() {
  const session = usePublicSession(); const { id = '' } = useParams()
  if (session.checking) return <p role="status">Comprobando sesión…</p>
  if (session.unavailable) return <><p role="alert">No pudimos comprobar la sesión.</p><Button onClick={session.retry}>Reintentar</Button></>
  if (!session.user) return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(`/mis-proyectos/${id}/rendicion`)}`} />
  return <Results key={`${session.user.id}:${id}`} id={id} />
}
function Results({ id }: { id: string }) {
  const [data, setData] = useState<Accountability | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0)
  useEffect(() => { const c = new AbortController(); requestApi(`/api/campaigns/${encodeURIComponent(id)}/accountability`, { signal: c.signal }).then(readJson).then(from).then(value => { if (!c.signal.aborted) { setData(value); setError('') } }).catch(e => { if (!c.signal.aborted) setError(failureText(e)) }); return () => c.abort() }, [id, retry])
  return <div className={styles.page}><Link to="/panel-creador">Volver al panel del creador</Link><h1>Rendición registrada</h1><p>Consulta del presupuesto y los informes existentes. La captura, revisión y cierre están pendientes de las reglas de rendición; esta pantalla no acredita gastos ni cierra campañas.</p>
    {error && <><p role="alert">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Reintentar</Button></>}{!data && !error && <p role="status">Cargando rendición…</p>}
    {data && <><h2>{data.campaign.title}</h2><section className={styles.card}><h2>Presupuesto planificado</h2>{!data.budget.length ? <p>No hay partidas registradas.</p> : <ul>{data.budget.map(b => <li key={b.id}>{b.description} · {b.category}: {data.campaign.currency} {b.plannedAmount}</li>)}</ul>}</section>
      {!data.reports.length && <p>No hay informes de rendición registrados. Los importes ausentes no se consideran cero.</p>}
      {data.reports.map(r => <section key={r.id} className={styles.card}><h2>{r.periodLabel ?? (r.isFinal ? 'Informe final' : 'Informe de rendición')}</h2><p>{r.status} · {r.periodStart ?? 'Sin inicio'} → {r.periodEnd ?? 'Sin fin'}</p><dl className={styles.summary}><div><dt>Recibido</dt><dd>{r.fundsReceived === null ? 'Sin registrar' : `${r.currency} ${r.fundsReceived}`}</dd></div><div><dt>Utilizado</dt><dd>{r.fundsSpent === null ? 'Sin registrar' : `${r.currency} ${r.fundsSpent}`}</dd></div><div><dt>Saldo</dt><dd>{r.balance === null ? 'Sin datos completos' : `${r.currency} ${r.balance}`}</dd></div></dl><p className={styles.body}>{r.narrative ?? 'Sin narración registrada.'}</p><p>Variaciones: {r.varianceExplanation ?? 'Sin explicación registrada.'}</p><h3>Gastos del informe</h3>{!r.expenses.length && <p>Sin gastos detallados.</p>}<ul>{r.expenses.map(e => { const budget = data.budget.find(b => b.id === e.budgetItemId); return <li key={e.id}>{e.description}: {e.currency} {e.spentAmount} · {e.spentOn ?? 'Sin fecha'} · {budget ? `Partida planificada: ${budget.description} (${budget.plannedAmount})` : 'Sin partida vinculada'} · {e.evidenceCount} adjuntos registrados</li> })}</ul></section>)}
      <Link to={`/mis-proyectos/${id}/avances`}>Consultar resultados y novedades</Link>
    </>}
  </div>
}
