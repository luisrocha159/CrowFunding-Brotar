import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AccessShell } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { CoverDraftEditor } from '../campaign-drafts/CoverDraftPage'
import { GalleryEditor } from '../campaign-drafts/GalleryEditor'
import { CampaignSectionsEditor } from './CampaignSectionsEditor'
import { CampaignSubmissionPanel } from './CampaignSubmissionPanel'
import { CampaignModalityGuide } from './CampaignModalityGuide'
import {
  activeCategories, changeModality, createDraft, myDrafts, readDraft, readModality,
  saveDraft, validateDraft, CAMPAIGN_TYPES, DraftFieldError, readGeneral, readStory, saveGeneral,
  saveStory, needsBackConfirmation, type Category, type Draft, type DraftInput, type GeneralInput, type IndicatorInput,
  type Limits, type Modality, type StoryInput, STORY_LIMITS
} from './campaignsClient'
import styles from '../access/access.module.css'
import { INDICATOR_UNITS, MINIMUMS } from '../../../backend/src/campaigns/domain/input-policy'
import { validateGeneralInput, validateStoryInput } from './campaignsClient'
import { readSectionCatalogs } from './sectionsClient'
import { readSubmission, submissionFieldsForStep } from './submissionClient'
import { projectStatusNames as statusNames } from './projectsClient'

const empty: DraftInput = { title: '', summary: '', campaignType: 'DONATION', categoryId: null, organizationId: null }
const typeNames: Record<string, string> = { DONATION: 'Donación', REWARD: 'Recompensa', PRESALE: 'Preventa' }
const stepNames = ['Modalidad', 'Información general', 'Historia e impacto', 'Portada', 'Plan y presupuesto', 'Financiamiento', 'Recompensas', 'Revisión y envío']

type Saving = 'idle' | 'saving' | 'saved' | 'failed'
type Screen = 'loading' | 'ready' | 'error' | 'anonymous' | 'forbidden' | 'missing'

function toInput(draft: Draft): DraftInput {
  return {
    title: draft.title, summary: draft.summary ?? '', campaignType: draft.campaignType,
    categoryId: draft.categoryId, organizationId: draft.organizationId
  }
}

export function CampaignBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedDraft = searchParams.get('borrador')
  const requestKey = requestedDraft ?? ''
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('loading')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [current, setCurrent] = useState<Draft | null>(null)
  const [values, setValues] = useState<DraftInput>({ ...empty })
  const [errors, setErrors] = useState<Partial<Record<keyof DraftInput, string>>>({})
  const [saving, setSaving] = useState<Saving>('idle')
  const [sectionBusy, setSectionBusy] = useState(false)
  const [sectionDirty, setSectionDirty] = useState(false)
  const [backConfirmation, setBackConfirmation] = useState<{ id: string; step: number } | null>(null)
  const [returnedWithoutSaving, setReturnedWithoutSaving] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const [modality, setModality] = useState<Modality | null>(null)
  // Modalidad que el creador pidió y que la API retuvo por afectar a recompensas cargadas.
  const [pendingModality, setPendingModality] = useState<DraftInput['campaignType'] | null>(null)
  const [general, setGeneral] = useState<GeneralInput | null>(null)
  const [limits, setLimits] = useState<Limits | null>(null)
  const [story, setStory] = useState<StoryInput | null>(null)
  const [indicators, setIndicators] = useState<IndicatorInput[]>([])
  // Errores devueltos por la API asociados a su campo, para mostrarlos junto a cada entrada.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [retry, setRetry] = useState(0)
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([])
  const campaignId = current?.id
  useEffect(() => {
    if (!campaignId) return
    const controller = new AbortController()
    void readSectionCatalogs(campaignId, controller.signal).then(catalog => { if (!controller.signal.aborted) setCountries(catalog.countries) }).catch(() => { if (!controller.signal.aborted) setCountries([]) })
    return () => controller.abort()
  }, [campaignId])
  const active = useRef<AbortController | null>(null)
  // Lo último que se intentó guardar, para que Reintentar repita esa operación y no otra.
  const retrySave = useRef<(() => void) | null>(null)
  const creationAttempt = useRef<{ payload: string; key: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([myDrafts(controller.signal), activeCategories(controller.signal)])
      .then(async ([list, catalog]) => {
        if (controller.signal.aborted) return
        // loadedRequest oculta la selección anterior hasta recibir la nueva.
        setCurrent(null); setValues({ ...empty }); setModality(null); setGeneral(null)
        setStory(null); setIndicators([]); setLimits(null); setSaving('idle')
        setConflict(null); setFieldErrors({}); setErrors({}); retrySave.current = null
        if (requestedDraft) {
          const [draft, currentModality, currentGeneral, currentStory] = await Promise.all([
            readDraft(requestedDraft, controller.signal), readModality(requestedDraft, controller.signal),
            readGeneral(requestedDraft, controller.signal), readStory(requestedDraft, controller.signal)
          ])
          if (controller.signal.aborted) return
          const { limits: readLimits, ...info } = currentGeneral
          setCurrent(draft); setValues(toInput(draft)); setModality(currentModality)
          setGeneral(info); setLimits(readLimits); setStory(currentStory.story); setIndicators(currentStory.indicators)
        }
        setDrafts(list); setCategories(catalog); setLoadedRequest(requestKey); setScreen('ready')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadedRequest(requestKey)
        setScreen(error instanceof SessionError && error.status === 401 ? 'anonymous'
          : error instanceof SessionError && error.status === 403 ? 'forbidden'
          : requestedDraft && error instanceof SessionError && [400, 404].includes(error.status) ? 'missing' : 'error')
      })
    return () => { controller.abort(); active.current?.abort() }
  }, [retry, requestedDraft, requestKey])

  const fail = useCallback((error: unknown) => {
    if (error instanceof SessionError && error.status === 429) { setConflict('Demasiados intentos. Espera un minuto; no se confirmó otro guardado.'); setSaving('failed'); return }
    if (error instanceof DraftFieldError) { setFieldErrors(error.fields); setErrors(error.fields); setConflict('Revisa los campos señalados.'); setSaving('failed'); return }
    if (error instanceof SessionError && error.status === 401) { setScreen('anonymous'); return }
    if (error instanceof SessionError && error.status === 403) { setConflict('No gestionas esa organización.'); setSaving('failed'); return }
    if (error instanceof SessionError && error.status === 409) {
      setConflict('Ese paso no es alcanzable o el borrador ya no admite edición.'); setSaving('failed'); return
    }
    if (error instanceof SessionError && error.status === 400) { setConflict('Revisa los datos del formulario.'); setSaving('failed'); return }
    setConflict(null); setSaving('failed')
  }, [])

  /**
   * Cambiar de modalidad. La API retiene el cambio con 409 cuando dejaría recompensas
   * sin aplicar; entonces se pide confirmación en vez de descartar nada en silencio.
   */
  async function applyModality(type: DraftInput['campaignType'], acknowledge: boolean) {
    if (!current || active.current) return
    const controller = new AbortController()
    active.current = controller
    retrySave.current = () => { void applyModality(type, acknowledge) }
    setSaving('saving'); setConflict(null)
    try {
      const updated = await changeModality(current.id, type, null, acknowledge, controller.signal)
      if (controller.signal.aborted) return
      setModality(updated); setPendingModality(null); setSaving('saved')
      setValues((previous) => ({ ...previous, campaignType: updated.campaignType }))
      setCurrent((previous) => previous && { ...previous, campaignType: updated.campaignType })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof SessionError && error.status === 409) {
        setPendingModality(type); setSaving('idle'); setConflict(null)
        return
      }
      fail(error)
    } finally {
      if (active.current === controller) active.current = null
    }
  }

  /** Guarda una etapa del asistente y reparte los errores de la API por campo (BG-16 CA 2). */
  async function persistStage(run: (signal: AbortSignal) => Promise<void>, reload: (id: string) => Promise<void>) {
    if (!current || active.current) return
    const controller = new AbortController()
    active.current = controller
    retrySave.current = () => { void persistStage(run, reload) }
    setSaving('saving'); setConflict(null); setFieldErrors({}); setReturnedWithoutSaving(false); setBackConfirmation(null)
    try {
      await run(controller.signal)
      if (controller.signal.aborted) return
      await reload(current.id)
      if (!controller.signal.aborted) setSaving('saved')
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof DraftFieldError) {
        setFieldErrors(error.fields)
        setSaving('failed'); setConflict(Object.values(error.fields).join(' '))
        return
      }
      fail(error)
    } finally {
      if (active.current === controller) active.current = null
    }
  }

  async function open(id: string) {
    if (active.current || sectionBusy || sectionDirty) return
    if (requestedDraft !== id) {
      // URL explícita: recargar/volver no selecciona el borrador anterior.
      setSearchParams({ borrador: id })
      return
    }
    const controller = new AbortController()
    active.current = controller
    setSaving('idle'); setConflict(null)
    try {
      const [draft, currentModality, currentGeneral, currentStory] = await Promise.all([
        readDraft(id, controller.signal), readModality(id, controller.signal),
        readGeneral(id, controller.signal), readStory(id, controller.signal)
      ])
      if (controller.signal.aborted) return
      setCurrent(draft); setValues(toInput(draft)); setErrors({}); setFieldErrors({})
      setModality(currentModality); setPendingModality(null)
      const { limits: readLimits, ...rest } = currentGeneral
      setGeneral(rest); setLimits(readLimits)
      setStory(currentStory.story); setIndicators(currentStory.indicators)
      retrySave.current = null
    } catch (error) {
      if (!controller.signal.aborted) fail(error)
    } finally {
      if (active.current === controller) active.current = null
    }
  }

  function change<K extends keyof DraftInput>(key: K, value: DraftInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    if (saving !== 'saving') setSaving('idle')
  }

  function startAnother() {
    if (active.current || sectionBusy || sectionDirty) return
    setCurrent(null); setValues({ ...empty }); setModality(null); setGeneral(null)
    setStory(null); setIndicators([]); setLimits(null); setPendingModality(null)
    setErrors({}); setFieldErrors({}); setConflict(null); setSaving('idle'); retrySave.current = null
    // Conserva la lista y todos los datos persistidos; no actualiza ni descarta campañas.
    if (requestedDraft) setSearchParams({})
  }

  async function reloadGeneral(id: string) {
    const [latest, info] = await Promise.all([readDraft(id), readGeneral(id)])
    const { limits: nextLimits, ...rest } = info
    setCurrent(latest); setValues(toInput(latest)); setGeneral(rest); setLimits(nextLimits)
    setDrafts(previous => previous.map(item => item.id === id ? latest : item))
  }

  function move(next: number, discardIncomplete = false) {
    if (!current || sectionBusy || sectionDirty) return
    const id = current.id
    const errors = current.builderStep === 1 && general ? validateGeneralInput(general)
      : current.builderStep === 2 && story ? validateStoryInput(story, indicators) : {}
    const incompleteBack = needsBackConfirmation(current.builderStep, next, errors)
    if (incompleteBack && !discardIncomplete) { setBackConfirmation({ id, step: next }); return }
    setBackConfirmation(null)
    void persistStage(async signal => {
      // Guarda la etapa visible antes de avanzar. Nunca reenvía una copia antigua
      // del título/resumen/categoría sobre lo que guardó otra etapa.
      setReturnedWithoutSaving(incompleteBack)
      if (!incompleteBack && current.builderStep === 1 && general) await saveGeneral(id, general, signal)
      if (!incompleteBack && current.builderStep === 2 && story) await saveStory(id, story, indicators, signal)
      if (next > current.builderStep) {
        const missing = submissionFieldsForStep(await readSubmission(id, signal), current.builderStep)
        if (Object.keys(missing).length) throw new DraftFieldError(missing)
      }
      const latest = await readDraft(id, signal)
      await saveDraft(id, toInput(latest), next, signal)
    }, async id => {
      await reloadGeneral(id)
      if (incompleteBack) { const content = await readStory(id); setStory(content.story); setIndicators(content.indicators) }
    })
  }

  if (screen === 'anonymous') return <Navigate to={`/iniciar-sesion?continuar=${encodeURIComponent(`/crear-campana${requestedDraft ? `?borrador=${requestedDraft}` : ''}`)}`} replace />

  const step = current?.builderStep ?? 0
  const validateField = (field: string) => {
    const validation = step === 1 && general ? validateGeneralInput(general) : step === 2 && story ? validateStoryInput(story, indicators) : {}
    setFieldErrors(previous => { const next = { ...previous }; if (validation[field]) next[field] = validation[field]; else delete next[field]; return next })
  }
  const total = current?.totalSteps ?? 0
  const editable = current !== null && ['DRAFT', 'CHANGES_REQUESTED'].includes(current.status)
  const visibleScreen = loadedRequest === requestKey ? screen : 'loading'

  return <AccessShell
    centered
    title="Crear campaña"
    subtitle="El asistente guarda tu avance y lo recupera cuando vuelvas."
    notice={<><strong>Campaña conectada.</strong> Guarda cada sección antes de avanzar. Solo se envía cuando confirmas «Enviar a revisión» en el último paso. No activa pagos.</>}
  >
    <div className={styles.actions}><ButtonLink to="/mi-cuenta" variant="secondary">Volver a mi cuenta</ButtonLink>
    {requestedDraft && <ButtonLink to="/mis-proyectos" variant="secondary">Volver a mis proyectos</ButtonLink>}</div>

    {visibleScreen === 'loading' && <p role="status">Consultando tus borradores…</p>}
    {visibleScreen === 'forbidden' && <Message tone="error" title="Rol no disponible">
      Necesitas el rol Usuario registrado vigente. Consulta al equipo responsable.
    </Message>}
    {visibleScreen === 'missing' && <Message tone="warning" title="Borrador no disponible">No pertenece a tu cuenta, fue descartado o el enlace no es válido. Vuelve a tus proyectos para elegir uno disponible.</Message>}
    {visibleScreen === 'error' && <>
      <Message tone="error" title="No se pudieron consultar tus borradores">
        Comprueba la API y la base de datos. No se mostrará una lista vacía como si fuera una respuesta correcta.
      </Message>
      <Button onClick={() => { setScreen('loading'); setRetry((value) => value + 1) }}>Reintentar</Button>
    </>}

    {visibleScreen === 'ready' && <>
      {current === null && saving === 'failed' && <Message tone="error" title="No se pudo completar la operación">
        {conflict ?? 'Comprueba la conexión e inténtalo otra vez. Tus campos se conservan; no se confirmó el guardado.'}
      </Message>}
      <section className={styles.savedDrafts} aria-label="Borradores guardados">
        <h2>Mis campañas guardadas ({drafts.length})</h2>
        <p>Cada borrador se guarda por separado. Abrir o crear otro no reemplaza el anterior. Guarda los cambios de la sección antes de cambiar de campaña.</p>
        {drafts.length > 0 && <FormField id="saved-draft-selector" label="Elegir campaña guardada">
          <select id="saved-draft-selector" value={current?.id ?? ''} disabled={saving === 'saving' || sectionBusy || sectionDirty}
            onChange={event => { if (event.target.value) void open(event.target.value) }}>
            <option value="">Selecciona una campaña</option>
            {drafts.map(item => <option key={item.id} value={item.id}>{item.title} · {statusNames[item.status] ?? item.status} · {item.id.slice(0, 8)}</option>)}
          </select>
        </FormField>}
        {current && <Button variant="secondary" disabled={saving === 'saving' || sectionBusy || sectionDirty} onClick={startAnother}>Crear otro borrador · conservar los anteriores</Button>}
        {drafts.length === 0
          ? <p>Todavía no tienes borradores. Crea uno para empezar.</p>
          : <details open={!current}><summary>Ver lista completa de campañas guardadas ({drafts.length})</summary><ul>{drafts.map((item) => <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{typeNames[item.campaignType] ?? item.campaignType} · {statusNames[item.status] ?? item.status} · Código: <span title={item.id}>{item.id.slice(0, 8)}</span></p>
            <Button variant="secondary" disabled={saving === 'saving' || sectionBusy || sectionDirty} onClick={() => { void open(item.id) }}>
              {item.id === current?.id ? 'Abierto' : item.status === 'CHANGES_REQUESTED' ? 'Corregir' : item.status === 'DRAFT' ? 'Continuar' : 'Consultar'}
            </Button>
          </li>)}</ul></details>}
      </section>

      {current === null && <form className={styles.form} aria-label="Crear borrador" noValidate onSubmit={async (event) => {
        event.preventDefault()
        if (active.current) return
        const next = validateDraft(values)
        setErrors(next)
        if (Object.keys(next).length > 0) return
        const controller = new AbortController()
        active.current = controller
        setSaving('saving'); setConflict(null)
        try {
          const body = JSON.stringify(values)
          if (creationAttempt.current?.payload !== body) creationAttempt.current = { payload: body, key: crypto.randomUUID() }
          const created = await createDraft(values, controller.signal, creationAttempt.current.key)
          if (controller.signal.aborted) return
          setCurrent(created); setValues(toInput(created)); setSaving('saved')
          creationAttempt.current = null
          setDrafts((previous) => [created, ...previous])
          setModality(await readModality(created.id, controller.signal))
          const [info, content] = await Promise.all([readGeneral(created.id, controller.signal), readStory(created.id, controller.signal)])
          const { limits: nextLimits, ...rest } = info
          setGeneral(rest); setLimits(nextLimits); setStory(content.story); setIndicators(content.indicators)
        } catch (error) {
          if (!controller.signal.aborted) fail(error)
        } finally {
          if (active.current === controller) active.current = null
        }
      }}>
        <h2>Nuevo borrador</h2>
        <p>Los campos marcados con * son obligatorios. Al enviar se comprueba si la iniciativa, propósito y etapa ya tienen una campaña, incluso desde otra cuenta. Guardar un borrador no reserva una causa.</p>
        <FormField id="draft-title" label="Nombre de la campaña" help="Entre 5 y 200 caracteres." error={errors.title}>
          <input id="draft-title" value={values.title} minLength={MINIMUMS.title} maxLength={400} required onBlur={() => setErrors(previous => ({ ...previous, title: validateDraft(values).title }))}
            onChange={(event) => change('title', event.target.value)} />
        </FormField>
        <FormField id="draft-summary" label="Resumen corto" help="Entre 11 y 500 caracteres." error={errors.summary}>
          <textarea id="draft-summary" value={values.summary} minLength={MINIMUMS.summary} maxLength={1000} required onBlur={() => setErrors(previous => ({ ...previous, summary: validateDraft(values).summary }))}
            onChange={(event) => change('summary', event.target.value)} />
        </FormField>
        <FormField id="draft-type" label="Modalidad" error={errors.campaignType}>
          <select id="draft-type" value={values.campaignType} required
            onChange={(event) => change('campaignType', event.target.value as DraftInput['campaignType'])}>
            {CAMPAIGN_TYPES.map((type) => <option key={type} value={type}>{typeNames[type]}</option>)}
          </select>
        </FormField>
        <Button type="submit" disabled={saving === 'saving'}>
          {saving === 'saving' ? 'Guardando…' : 'Crear borrador'}
        </Button>
      </form>}

      {current !== null && <section aria-label="Asistente de campaña">
        <fieldset disabled={saving === 'saving'} onChange={() => { if (saving === 'saved') setSaving('idle') }} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
        <h2>{current.title}</h2>
        <p>Identificador: <code>{current.id}</code>. El nombre puede coincidir con el de otras campañas.</p>
        <p role="status">Paso {step + 1} de {total}: {stepNames[step]} · {statusNames[current.status] ?? current.status}</p>
        <progress value={step + 1} max={total} aria-label={`Progreso: paso ${step + 1} de ${total}`} />

        {!editable && <Message tone="info" title="Campaña en consulta">
          Su estado actual no admite edición. Podrás corregirla aquí si el revisor solicita cambios.
        </Message>}

        {/* Confirmación de guardado (CA 1) y error con reintento (CA 2). */}
        {saving === 'saved' && <Message tone="success" title={returnedWithoutSaving ? 'Volviste a la versión guardada' : 'Avance guardado'}>
          {returnedWithoutSaving ? 'Se descartaron los cambios no guardados de la sección incompleta. Tu posición quedó guardada; los demás datos se conservan.' : 'Tu contenido y tu posición quedaron guardados. Puedes cerrar sesión y continuar después.'}
        </Message>}
        {saving === 'failed' && <>
          <Message tone="error" title="No se pudo guardar">
            {conflict ?? 'No se confirmó el guardado. No se da por guardado lo que no confirmó la API.'}
          </Message>
          <Button onClick={() => {
            retrySave.current?.()
          }}>Reintentar guardado</Button>
        </>}

        {step === 0 && modality !== null && <section aria-label="Modalidad de campaña">
          <h3>Modalidad</h3>
          <CampaignModalityGuide modality={modality} />
          {pendingModality !== null && <>
            <Message tone="error" title="Confirma el cambio de modalidad">
              Tienes {modality.rewardCount} recompensa(s) cargada(s) que dejarán de aplicar en donación.
              No se borran: si vuelves a recompensa o preventa, seguirán ahí.
            </Message>
            <Button onClick={() => { void applyModality(pendingModality, true) }}>Cambiar de todos modos</Button>
            <Button variant="secondary" onClick={() => { setPendingModality(null) }}>Mantener la modalidad actual</Button>
          </>}
          <FormField id="builder-modality" label="Modalidad de la campaña">
            <select id="builder-modality" value={modality.campaignType} disabled={!editable || saving === 'saving'}
              onChange={(event) => { void applyModality(event.target.value as DraftInput['campaignType'], false) }}>
              {CAMPAIGN_TYPES.map((type) => <option key={type} value={type}>{typeNames[type]}</option>)}
            </select>
          </FormField>
        </section>}

        {step === 1 && general !== null && limits !== null && <section aria-label="Información general">
          <h3>Información general</h3>
          <form className={styles.form} noValidate onSubmit={(event) => {
            event.preventDefault()
            void persistStage(
              (signal) => saveGeneral(current.id, general, signal),
              reloadGeneral)
          }}>
            <FormField id="general-title" label={`Nombre de la campaña (5–${limits.title} caracteres)`} error={fieldErrors.title}>
              <input id="general-title" value={general.title} minLength={MINIMUMS.title} maxLength={limits.title * 2} required onBlur={() => validateField('title')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, title: event.target.value })} />
            </FormField>
            <FormField id="general-summary" label={`Resumen corto (11–${limits.summary} caracteres)`} error={fieldErrors.summary}>
              <textarea id="general-summary" value={general.summary} minLength={11} maxLength={limits.summary * 2} required onBlur={() => validateField('summary')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, summary: event.target.value })} />
            </FormField>
            <FormField id="general-category" label="Categoría" error={fieldErrors.categoryId}>
              <select id="general-category" value={general.categoryId ?? ''} required onBlur={() => validateField('categoryId')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, categoryId: event.target.value || null })}>
                <option value="">Elige una categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </FormField>
            {categories.length === 0 && <Message tone="info" title="Catálogo pendiente de configuración">
              No hay categorías activas. El responsable debe configurar el catálogo aprobado para guardar esta etapa.
              Tu borrador inicial sigue guardado; este bloqueo no significa que hayas escrito mal los datos.
            </Message>}
            <FormField id="general-country" label="País" error={fieldErrors.countryCode}>
              <select id="general-country" value={general.location.countryCode ?? ''} required disabled={!editable} onBlur={() => validateField('countryCode')}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, countryCode: event.target.value || null } })}><option value="">Selecciona un país del catálogo</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
            </FormField>
            <FormField id="general-locality" label={`Localidad (máximo ${limits.locality})`} error={fieldErrors.locality}>
              <input id="general-locality" value={general.location.locality} minLength={2} maxLength={limits.locality * 2} required onBlur={() => validateField('locality')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, locality: event.target.value } })} />
            </FormField>
            <FormField id="general-address" label="Dirección (opcional)" help="Vacío o entre 5 y 500 caracteres." error={fieldErrors.addressLine}>
              <input id="general-address" value={general.location.addressLine} minLength={5} maxLength={limits.addressLine * 2} onBlur={() => validateField('addressLine')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, addressLine: event.target.value } })} />
            </FormField>
            <FormField id="general-reference" label="Referencia (opcional)" help="Vacío o entre 5 y 500 caracteres." error={fieldErrors.reference}>
              <input id="general-reference" value={general.location.reference} minLength={5} maxLength={limits.reference * 2} onBlur={() => validateField('reference')} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, reference: event.target.value } })} />
            </FormField>
            <Button type="submit" disabled={!editable || saving === 'saving'}>Guardar información general</Button>
          </form>
        </section>}

        {step === 2 && story !== null && <section aria-label="Historia e impacto">
          <h3>Historia e impacto</h3>
          <p>Describe metas esperadas. Los resultados conseguidos se registran más adelante, durante el seguimiento.</p>
          <form className={styles.form} noValidate onSubmit={(event) => {
            event.preventDefault()
            void persistStage(
              (signal) => saveStory(current.id, story, indicators, signal),
              async (id) => {
                const next = await readStory(id)
                setStory(next.story); setIndicators(next.indicators)
              })
          }}>
            {([['problem', 'Problema'], ['solution', 'Solución'], ['beneficiaries', 'Beneficiarios'], ['expectedResults', 'Resultados esperados']] as const)
              .map(([field, label]) => <FormField key={field} id={`story-${field}`} label={label} error={fieldErrors[field]}>
                <textarea id={`story-${field}`} value={story[field]} minLength={MINIMUMS.story} maxLength={STORY_LIMITS.text * 2} required onBlur={() => validateField(field)} disabled={!editable}
                  onChange={(event) => setStory({ ...story, [field]: event.target.value })} />
              </FormField>)}

            <h4>Indicadores</h4>
            {indicators.map((indicator, index) => <fieldset key={index}>
              <legend>Indicador {index + 1}</legend>
              <FormField id={`indicator-name-${index}`} label="Nombre" error={fieldErrors[`indicators.${index}.name`]}>
                <input id={`indicator-name-${index}`} value={indicator.name} minLength={5} maxLength={STORY_LIMITS.indicatorName * 2} required onBlur={() => validateField(`indicators.${index}.name`)} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} />
              </FormField>
              <FormField id={`indicator-unit-${index}`} label="Unidad" error={fieldErrors[`indicators.${index}.unit`]}>
                <select id={`indicator-unit-${index}`} value={indicator.unit} required onBlur={() => validateField(`indicators.${index}.unit`)} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index ? { ...item, unit: event.target.value } : item))}><option value="">Selecciona una unidad</option>{INDICATOR_UNITS.map(unit => <option key={unit}>{unit}</option>)}</select>
              </FormField>
              <FormField id={`indicator-target-${index}`} label="Meta esperada" error={fieldErrors[`indicators.${index}.targetValue`]}>
                <input id={`indicator-target-${index}`} type="number" step={['personas', 'familias', 'unidades'].includes(indicator.unit) ? 1 : 0.01} min={0} max={indicator.unit === '%' ? 100 : 999999999999.99} required onBlur={() => validateField(`indicators.${index}.targetValue`)} value={indicator.targetValue ?? ''} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index
                    ? { ...item, targetValue: event.target.value === '' ? null : Number(event.target.value) } : item))} />
              </FormField>
              <Button variant="secondary" disabled={!editable}
                onClick={() => { setIndicators(indicators.filter((_, position) => position !== index)); setSaving('idle') }}>Quitar indicador</Button>
            </fieldset>)}
            {fieldErrors.indicators && <p role="alert">{fieldErrors.indicators}</p>}
            <p>Historia: 20–5000 caracteres por campo. Añade de 1 a {STORY_LIMITS.indicators} indicadores. Personas, familias y unidades requieren enteros; porcentajes van de 0 a 100; otras unidades admiten dos decimales.</p>
            <Button variant="secondary" disabled={!editable || indicators.length >= STORY_LIMITS.indicators}
              onClick={() => { setIndicators([...indicators, { name: '', description: '', unit: '', baselineValue: null, targetValue: null }]); setSaving('idle') }}>
              Añadir indicador
            </Button>
            <Button type="submit" disabled={!editable || saving === 'saving'}>Guardar historia e impacto</Button>
          </form>
        </section>}

        {step === 3 && editable && <><CoverDraftEditor embedded key={current.id} campaignId={current.id} /><GalleryEditor key={`gallery-${current.id}`} campaignId={current.id} onBusyChange={setSectionBusy} onDirtyChange={setSectionDirty} /></>}
        {step >= 4 && step <= 6 && <CampaignSectionsEditor key={current.id} id={current.id} step={step} editable={editable} campaignType={current.campaignType} externalErrors={fieldErrors} onFieldsEdited={() => setFieldErrors({})} onBusyChange={setSectionBusy} onDirtyChange={setSectionDirty} />}
        {step === 7 && <CampaignSubmissionPanel key={current.id} id={current.id} categories={categories} onGoTo={move} onBusyChange={setSectionBusy} onStatusChange={status => {
          setCurrent(previous => previous ? { ...previous, status } : previous)
          setDrafts(previous => previous.map(item => item.id === current.id ? { ...item, status } : item))
        }} />}
        {sectionDirty && <Message tone="warning" title="Cambios sin guardar">Guarda las secciones modificadas antes de cambiar de paso o de borrador.</Message>}
        {backConfirmation?.id === current.id && <Message tone="warning" title="Esta sección todavía está incompleta">
          <p>Puedes seguir editándola o volver usando su última versión guardada. Volver sin guardar descartará los cambios no guardados de esta sección, no el borrador completo.</p>
          <div className={styles.actions}><Button variant="secondary" onClick={() => setBackConfirmation(null)}>Seguir editando</Button><Button onClick={() => move(backConfirmation.step, true)}>Volver sin guardar esta sección</Button></div>
        </Message>}
          <nav aria-label="Navegación del asistente" className={styles.actions}>
          <Button variant="secondary" disabled={!editable || step === 0 || saving === 'saving' || sectionBusy || sectionDirty}
            onClick={() => move(step === 7 && current.campaignType === 'DONATION' ? 5 : step - 1)}>Anterior</Button>
          <Button disabled={!editable || step >= total - 1 || saving === 'saving' || sectionBusy || sectionDirty}
            onClick={() => move(step === 5 && current.campaignType === 'DONATION' ? 7 : step + 1)}>Siguiente</Button>
        </nav>
        </fieldset>
      </section>}
    </>}
  </AccessShell>
}
