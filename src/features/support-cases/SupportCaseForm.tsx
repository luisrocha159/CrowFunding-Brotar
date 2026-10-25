import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../../shared/api/sessionError'
import { createSupportCase, supportInput, supportError, uploadSupportEvidence, SUPPORT_TYPES, type SupportContext, type SupportDraft, type SupportReceipt } from './supportClient'
import styles from './support.module.css'
interface Evidence { key: string; name: string; file: File | null; id: string | null }
export function SupportCaseForm({ context, onCreated, onUnauthorized }: { context: SupportContext; onCreated: (receipt: SupportReceipt) => void; onUnauthorized: () => void }) {
  const [draft, setDraft] = useState<SupportDraft>({ category: '', subject: '', description: '', confirmed: false })
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [requestId] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState<Partial<Record<keyof SupportDraft, string>>>({})
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  async function submit() {
    if (active.current || forbidden) return
    const validation = supportInput(draft, context, requestId, evidence.flatMap(item => item.id ? [item.id] : []))
    setErrors(validation.errors)
    if (Object.keys(validation.errors).length) return
    const controller = new AbortController(); active.current = controller; setBusy(true); setError('')
    const uploaded = [...evidence]
    let creating = false
    try {
      for (const [index, item] of uploaded.entries()) {
        if (!item.file) continue
        const file = await uploadSupportEvidence(item.file, controller.signal)
        if (controller.signal.aborted) return
        uploaded[index] = { ...item, id: file.id, file: null }; setEvidence([...uploaded])
      }
      creating = true
      const receipt = await createSupportCase(supportInput(draft, context, requestId, uploaded.map(item => item.id!)).input, controller.signal)
      if (!controller.signal.aborted) onCreated(receipt)
    } catch (cause) {
      if (controller.signal.aborted) return
      if (cause instanceof SessionError && cause.status === 401) onUnauthorized()
      setError(supportError(cause))
      if (cause instanceof SessionError && cause.status === 403) setForbidden(true)
      if (creating && (!(cause instanceof SessionError) || cause.status === 0 || cause.status >= 500 || cause.status === 409)) setUncertain(true)
    } finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  return <form className={styles.panel} noValidate onSubmit={event => { event.preventDefault(); void submit() }}>
    <h2>Reportar sobre {context.campaignTitle}</h2>
    {context.contributionReference && <p>Aporte: {context.contributionReference}</p>}
    <p>El reporte registra una solicitud de soporte. No inicia una devolución ni cambia pagos, recompensas o el estado de la campaña.</p>
    {error && <Message tone="error" title="No se confirmó el reporte">{error}</Message>}
    {uncertain && <Message tone="warning" title="Comprueba el resultado">Puedes reintentar con los mismos datos para recuperar la referencia. La edición queda bloqueada mientras el resultado sea desconocido.</Message>}
    <fieldset className={styles.fields} disabled={busy || uncertain || forbidden}>
      <FormField as="select" label="Tipo de incidencia" required value={draft.category} error={errors.category} onChange={event => setDraft(value => ({ ...value, category: event.target.value }))}>
        <option value="">Selecciona el tipo</option>{SUPPORT_TYPES.filter(([value]) => !context.publicReport || value === 'INCORRECT_INFORMATION' || value === 'PROJECT_NOT_EXECUTED').map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </FormField>
      <FormField label="Asunto" required maxLength={200} value={draft.subject} error={errors.subject} onChange={event => setDraft(value => ({ ...value, subject: event.target.value }))} />
      <FormField as="textarea" label="Descripción" required maxLength={10000} rows={7} value={draft.description} error={errors.description} help="Explica qué ocurrió. Evita incluir contraseñas o datos completos de tarjeta." onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} />
      <FormField label="Evidencias privadas (opcional)" type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" help="Hasta 10 archivos PDF, PNG, JPG o WebP de 5 MB cada uno. Solo adjunta archivos que estés autorizado a compartir." onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = ''
        if (files.length + evidence.length > 10) { setError('Puedes adjuntar hasta 10 archivos.'); return }
        setError(''); setEvidence(previous => [...previous, ...files.map(file => ({ key: crypto.randomUUID(), file, id: null, name: file.name }))])
      }} />
      {evidence.length > 0 && <ul>{evidence.map(item => <li key={item.key} className={styles.attachment}>{item.name} {item.id && <span>· Cargado privado</span>}<Button variant="tertiary" onClick={() => setEvidence(previous => previous.filter(file => file.key !== item.key))} aria-label={`Quitar ${item.name}`}>Quitar adjunto</Button></li>)}</ul>}
      <label className={styles.confirmation}><input type="checkbox" checked={draft.confirmed} aria-invalid={Boolean(errors.confirmed)} aria-describedby={errors.confirmed ? 'support-confirmation-error' : undefined} onChange={event => setDraft(value => ({ ...value, confirmed: event.target.checked }))} />Confirmo el contenido del reporte y que puedo compartir sus evidencias privadas.</label>
      {errors.confirmed && <p id="support-confirmation-error" role="alert">{errors.confirmed}</p>}
    </fieldset>
    <Button type="submit" disabled={forbidden} loading={busy} loadingLabel="Registrando incidencia…">{uncertain ? 'Reintentar la misma solicitud' : 'Registrar incidencia'}</Button>
  </form>
}
