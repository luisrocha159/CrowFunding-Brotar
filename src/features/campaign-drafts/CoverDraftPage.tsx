import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { AccessShell, AccessSuccess, ValidationSummary } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { COVER_HELP, coverImageUrl, readCoverDraft, saveCoverDraft, uploadCoverImage, validateCover, type CoverDraft, type CoverErrors, type CoverValues } from './coverDraftClient'
import styles from './coverDraft.module.css'
import accessStyles from '../access/access.module.css'

const initialValues: CoverValues = { altText: '', file: null }
const errorMessage: Record<number, string> = {
  0: 'No pudimos confirmar el guardado. Conservamos el formulario para que puedas reintentar.',
  400: 'La portada no cumple los límites permitidos.',
  401: 'Inicia sesión para cargar la portada.',
  403: 'Tu cuenta no tiene permisos para modificar esta portada.',
  404: 'La imagen cargada ya no está disponible. Selecciona otra portada.',
  413: 'La imagen supera el tamaño permitido.',
  429: 'Se alcanzó el límite de solicitudes. Espera un minuto antes de reintentar.',
  503: 'El servicio no está disponible. Comprueba que la API esté iniciada.'
}

export function CoverDraftPage() {
  const [params] = useSearchParams()
  const campaignId = params.get('borrador') ?? ''
  if (!/^[a-f0-9-]{36}$/i.test(campaignId)) return <AccessShell centered title="Selecciona un borrador" subtitle="La portada pertenece a una campaña concreta."><Link to="/crear-campana">Abrir mis borradores</Link></AccessShell>
  return <CoverDraftEditor key={campaignId} campaignId={campaignId} />
}

function FilePreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (image.current) image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={image} alt="Vista previa local de la portada seleccionada" />
}

export function CoverDraftEditor({ campaignId }: { campaignId: string }) {
  const [values, setValues] = useState<CoverValues>({ ...initialValues })
  const [errors, setErrors] = useState<CoverErrors>({})
  const [cover, setCover] = useState<CoverDraft | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'load-error' | 'save-error'>('loading')
  const [lastError, setLastError] = useState(0)
  const active = useRef<AbortController | null>(null)
  const busy = status === 'saving'

  useEffect(() => {
    let mounted = true
    readCoverDraft(campaignId).then(result => {
      if (!mounted) return
      setCover(result)
      setValues({ altText: result?.altText ?? '', file: null })
      setStatus('ready')
    }).catch((error: unknown) => {
      if (!mounted) return
      setLastError(error instanceof SessionError ? error.status : 0)
      setStatus('load-error')
    })
    return () => { mounted = false; active.current?.abort(); active.current = null }
  }, [campaignId])

  useEffect(() => {
    if (status === 'save-error' || status === 'load-error') document.getElementById('cover-response')?.focus()
  }, [status])

  function change<K extends keyof CoverValues>(key: K, value: CoverValues[K]) {
    setValues(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    if (status === 'save-error' || status === 'saved') setStatus('ready')
  }

  if (status === 'loading') return <AccessShell centered title="Portada del borrador" subtitle="Carga y reemplaza la imagen principal de tu propuesta."><p role="status">Cargando portada…</p></AccessShell>
  if (status === 'load-error') return <AccessShell centered title="Portada del borrador" subtitle="Carga y reemplaza la imagen principal de tu propuesta.">
    <div id="cover-response" tabIndex={-1}><Message tone="error" title="No se pudo cargar la portada">{errorMessage[lastError] ?? errorMessage[0]}</Message></div>
    <div className={accessStyles.actions}><Button onClick={() => { setStatus('loading'); readCoverDraft(campaignId).then(result => { setCover(result); setValues({ altText: result?.altText ?? '', file: null }); setStatus('ready') }).catch(() => setStatus('load-error')) }}>Reintentar</Button><Link to="/crear-campana">Volver a mis borradores</Link></div>
  </AccessShell>

  return <AccessShell centered title="Portada del borrador" subtitle="Selecciona, previsualiza y guarda la portada de tu propuesta."
    notice={<><strong>Borrador conectado.</strong> La imagen se guarda como archivo público autorizado. Si el guardado falla, tus campos y la vista previa permanecen en pantalla.</>}>
    {status === 'saved' && <AccessSuccess title="Portada guardada"><p>La portada quedó asociada al borrador. Puedes reemplazarla seleccionando otra imagen y guardando de nuevo.</p></AccessSuccess>}
    {status === 'save-error' && <div id="cover-response" tabIndex={-1} className={accessStyles.response}><Message tone="error" title="No se pudo guardar la portada">{errorMessage[lastError] ?? errorMessage[0]}</Message></div>}
    <form className={accessStyles.form} aria-label="Cargar portada de campaña" noValidate onSubmit={async event => {
      event.preventDefault()
      if (active.current) return
      const next = validateCover(values)
      setErrors(next)
      const first = (Object.keys(next) as (keyof CoverValues)[])[0]
      if (first) { document.getElementById(first === 'file' ? 'cover-file' : `cover-${first}`)?.focus(); return }
      if (!values.file) return
      const controller = new AbortController()
      active.current = controller
      setStatus('saving')
      try {
        const uploaded = await uploadCoverImage(values.file, controller.signal)
        const saved = await saveCoverDraft(campaignId, uploaded.id, values.altText, controller.signal)
        if (!controller.signal.aborted) { setCover(saved); setValues({ altText: saved.altText, file: null }); setErrors({}); setStatus('saved') }
      } catch (error) {
        if (!controller.signal.aborted) { setLastError(error instanceof SessionError ? error.status : 0); setStatus('save-error') }
      } finally { if (active.current === controller) active.current = null }
    }}>
      <ValidationSummary prefix="cover" errors={errors} />
      <fieldset className={accessStyles.fields} disabled={busy}>
        <div className={styles.preview} aria-label="Vista previa de portada">
          {values.file ? <FilePreview file={values.file} /> : cover ? <img src={coverImageUrl(cover)} alt={cover.altText} /> : <div className={styles.emptyPreview}>Sin portada guardada</div>}
        </div>
        <div>
          <label className={styles.filePicker} htmlFor="cover-file">
            <span>{values.file ? values.file.name : cover ? 'Reemplazar portada' : 'Seleccionar portada'}</span>
            <input id="cover-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="cover-file-help" onChange={event => change('file', event.target.files?.[0] ?? null)} />
          </label>
          <p id="cover-file-help" className={styles.help}>{COVER_HELP}</p>
          {errors.file && <p className={accessStyles.fieldError}>{errors.file}</p>}
        </div>
        <FormField as="textarea" id="cover-altText" name="altText" label="Texto alternativo de la portada" required rows={4} value={values.altText} error={errors.altText} help="Describe el contenido visual sin prometer resultados ni verificaciones." onChange={event => change('altText', event.target.value)} />
        <div className={accessStyles.actions}><Button type="submit" loading={busy} loadingLabel="Guardando portada…">{cover ? 'Reemplazar portada' : 'Guardar portada'}</Button><Link to="/mi-cuenta">Volver a mi cuenta</Link></div>
      </fieldset>
    </form>
  </AccessShell>
}
