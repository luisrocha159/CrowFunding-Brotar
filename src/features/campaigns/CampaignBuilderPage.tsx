import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AccessShell } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import {
  activeCategories, canMoveTo, changeModality, createDraft, myDrafts, readDraft, readModality,
  saveDraft, validateDraft, CAMPAIGN_TYPES, DraftFieldError, readGeneral, readStory, saveGeneral,
  saveStory, type Category, type Draft, type DraftInput, type GeneralInput, type IndicatorInput,
  type Limits, type Modality, type StoryInput
} from './campaignsClient'
import styles from '../access/access.module.css'

const empty: DraftInput = { title: '', summary: '', campaignType: 'DONATION', categoryId: null, organizationId: null }
const typeNames: Record<string, string> = { DONATION: 'Donación', REWARD: 'Recompensa', PRESALE: 'Preventa' }
const statusNames: Record<string, string> = {
  DRAFT: 'Borrador', PENDING_VERIFICATION: 'Pendiente de verificación', IN_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Cambios solicitados', APPROVED: 'Aprobada', PUBLISHED: 'Publicada'
}

type Saving = 'idle' | 'saving' | 'saved' | 'failed'
type Screen = 'loading' | 'ready' | 'error' | 'anonymous' | 'forbidden'

function toInput(draft: Draft): DraftInput {
  return {
    title: draft.title, summary: draft.summary ?? '', campaignType: draft.campaignType,
    categoryId: draft.categoryId, organizationId: draft.organizationId
  }
}

export function CampaignBuilderPage() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [current, setCurrent] = useState<Draft | null>(null)
  const [values, setValues] = useState<DraftInput>({ ...empty })
  const [errors, setErrors] = useState<Partial<Record<keyof DraftInput, string>>>({})
  const [saving, setSaving] = useState<Saving>('idle')
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
  const active = useRef<AbortController | null>(null)
  // Lo último que se intentó guardar, para que Reintentar repita esa operación y no otra.
  const pending = useRef<{ input: DraftInput; step: number } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([myDrafts(controller.signal), activeCategories(controller.signal)])
      .then(([list, catalog]) => {
        if (controller.signal.aborted) return
        setDrafts(list); setCategories(catalog); setScreen('ready')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setScreen(error instanceof SessionError && error.status === 401 ? 'anonymous'
          : error instanceof SessionError && error.status === 403 ? 'forbidden' : 'error')
      })
    return () => { controller.abort(); active.current?.abort() }
  }, [retry])

  const fail = useCallback((error: unknown) => {
    if (error instanceof SessionError && error.status === 401) { setScreen('anonymous'); return }
    if (error instanceof SessionError && error.status === 403) { setConflict('No gestionas esa organización.'); setSaving('failed'); return }
    if (error instanceof SessionError && error.status === 409) {
      setConflict('Ese paso no es alcanzable o el borrador ya no admite edición.'); setSaving('failed'); return
    }
    if (error instanceof SessionError && error.status === 400) { setConflict('Revisa los datos del formulario.'); setSaving('failed'); return }
    setConflict(null); setSaving('failed')
  }, [])

  /** Guardado del asistente: datos y posición juntos, con reintento explícito si falla. */
  const persist = useCallback(async (input: DraftInput, step: number) => {
    if (!current || active.current) return
    const next = validateDraft(input)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const controller = new AbortController()
    active.current = controller
    pending.current = { input, step }
    setSaving('saving'); setConflict(null)
    try {
      const saved = await saveDraft(current.id, input, step, controller.signal)
      if (controller.signal.aborted) return
      setCurrent(saved); setValues(toInput(saved)); setSaving('saved'); pending.current = null
      setDrafts((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)])
    } catch (error) {
      if (!controller.signal.aborted) fail(error)
    } finally {
      if (active.current === controller) active.current = null
    }
  }, [current, fail])

  /**
   * Cambiar de modalidad. La API retiene el cambio con 409 cuando dejaría recompensas
   * sin aplicar; entonces se pide confirmación en vez de descartar nada en silencio.
   */
  async function applyModality(type: DraftInput['campaignType'], acknowledge: boolean) {
    if (!current || active.current) return
    const controller = new AbortController()
    active.current = controller
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
    setSaving('saving'); setConflict(null); setFieldErrors({})
    try {
      await run(controller.signal)
      if (controller.signal.aborted) return
      await reload(current.id)
      if (!controller.signal.aborted) setSaving('saved')
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof DraftFieldError) {
        setFieldErrors(error.fields)
        setSaving('failed'); setConflict('Revisa los campos señalados.')
        return
      }
      fail(error)
    } finally {
      if (active.current === controller) active.current = null
    }
  }

  async function open(id: string) {
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

  if (screen === 'anonymous') return <Navigate to="/iniciar-sesion?continuar=%2Fcrear-campana" replace />

  const step = current?.builderStep ?? 0
  const total = current?.totalSteps ?? 0
  const editable = current !== null && current.status === 'DRAFT'

  return <AccessShell
    centered
    title="Crear campaña"
    subtitle="El asistente guarda tu avance y lo recupera cuando vuelvas."
    notice={<><strong>Borrador conectado.</strong> Se guarda el contenido y la posición del asistente vinculados a tu cuenta. No envía la campaña a revisión ni activa pagos.</>}
  >
    <ButtonLink to="/mi-cuenta" variant="secondary">Volver a mi cuenta</ButtonLink>

    {screen === 'loading' && <p role="status">Consultando tus borradores…</p>}
    {screen === 'forbidden' && <Message tone="error" title="Rol no disponible">
      Necesitas el rol Usuario registrado vigente. Consulta al equipo responsable.
    </Message>}
    {screen === 'error' && <>
      <Message tone="error" title="No se pudieron consultar tus borradores">
        Comprueba la API y la base de datos. No se mostrará una lista vacía como si fuera una respuesta correcta.
      </Message>
      <Button onClick={() => { setScreen('loading'); setRetry((value) => value + 1) }}>Reintentar</Button>
    </>}

    {screen === 'ready' && <>
      <section aria-label="Borradores guardados">
        <h2>Borradores guardados</h2>
        {drafts.length === 0
          ? <p>Todavía no tienes borradores. Crea uno para empezar.</p>
          : <ul>{drafts.map((item) => <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{typeNames[item.campaignType] ?? item.campaignType} · {statusNames[item.status] ?? item.status}</p>
            <Button variant="secondary" onClick={() => { void open(item.id) }}>
              {item.id === current?.id ? 'Abierto' : 'Continuar'}
            </Button>
          </li>)}</ul>}
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
          const created = await createDraft(values, controller.signal)
          if (controller.signal.aborted) return
          setCurrent(created); setValues(toInput(created)); setSaving('saved')
          setDrafts((previous) => [created, ...previous])
          setModality(await readModality(created.id, controller.signal))
        } catch (error) {
          if (!controller.signal.aborted) fail(error)
        } finally {
          if (active.current === controller) active.current = null
        }
      }}>
        <h2>Nuevo borrador</h2>
        <FormField id="draft-title" label="Nombre de la campaña" error={errors.title}>
          <input id="draft-title" value={values.title} maxLength={200} required
            onChange={(event) => change('title', event.target.value)} />
        </FormField>
        <FormField id="draft-summary" label="Resumen corto" error={errors.summary}>
          <textarea id="draft-summary" value={values.summary} maxLength={300}
            onChange={(event) => change('summary', event.target.value)} />
        </FormField>
        <FormField id="draft-type" label="Modalidad" error={errors.campaignType}>
          <select id="draft-type" value={values.campaignType}
            onChange={(event) => change('campaignType', event.target.value as DraftInput['campaignType'])}>
            {CAMPAIGN_TYPES.map((type) => <option key={type} value={type}>{typeNames[type]}</option>)}
          </select>
        </FormField>
        <Button type="submit" disabled={saving === 'saving'}>
          {saving === 'saving' ? 'Guardando…' : 'Crear borrador'}
        </Button>
      </form>}

      {current !== null && <section aria-label="Asistente de campaña">
        <h2>{current.title}</h2>
        <p role="status">Paso {step + 1} de {total} · {statusNames[current.status] ?? current.status}</p>
        <progress value={step + 1} max={total} aria-label={`Progreso: paso ${step + 1} de ${total}`} />

        {!editable && <Message tone="error" title="Edición cerrada">
          Esta campaña ya no es un borrador: su edición sigue el flujo de revisión, no el asistente.
        </Message>}

        {/* Confirmación de guardado (CA 1) y error con reintento (CA 2). */}
        {saving === 'saved' && <Message tone="success" title="Avance guardado">
          Tu contenido y tu posición quedaron guardados. Puedes cerrar sesión y continuar después.
        </Message>}
        {saving === 'failed' && <>
          <Message tone="error" title="No se pudo guardar">
            {conflict ?? 'No se confirmó el guardado. No se da por guardado lo que no confirmó la API.'}
          </Message>
          <Button onClick={() => {
            const last = pending.current
            if (last) void persist(last.input, last.step)
          }}>Reintentar guardado</Button>
        </>}

        {modality !== null && <section aria-label="Modalidad de campaña">
          <h3>Modalidad</h3>
          <p>
            <strong>Donación:</strong> aportes sin contraprestación.{' '}
            <strong>Recompensa:</strong> el aportante recibe algo a cambio.{' '}
            <strong>Preventa:</strong> se compra por adelantado un producto en preparación.
          </p>
          <p role="status">
            {modality.rewardsApply
              ? `Esta modalidad usa recompensas. Cargadas: ${modality.rewardCount}.`
              : 'La donación omite la etapa de recompensas.'}
          </p>
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

        <form className={styles.form} aria-label="Contenido del borrador" noValidate onSubmit={(event) => {
          event.preventDefault()
          void persist(values, step)
        }}>
          <FormField id="builder-title" label="Nombre de la campaña" error={errors.title}>
            <input id="builder-title" value={values.title} maxLength={200} required disabled={!editable}
              onChange={(event) => change('title', event.target.value)} />
          </FormField>
          <FormField id="builder-summary" label="Resumen corto" error={errors.summary}>
            <textarea id="builder-summary" value={values.summary} maxLength={300} disabled={!editable}
              onChange={(event) => change('summary', event.target.value)} />
          </FormField>
          <FormField id="builder-category" label="Categoría">
            <select id="builder-category" value={values.categoryId ?? ''} disabled={!editable}
              onChange={(event) => change('categoryId', event.target.value || null)}>
              <option value="">Sin categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>
          <Button type="submit" disabled={!editable || saving === 'saving'}>
            {saving === 'saving' ? 'Guardando…' : 'Guardar avance'}
          </Button>
        </form>

        {general !== null && limits !== null && <section aria-label="Información general">
          <h3>Información general</h3>
          <form className={styles.form} noValidate onSubmit={(event) => {
            event.preventDefault()
            void persistStage(
              (signal) => saveGeneral(current.id, general, signal),
              async (id) => {
                const { limits: next, ...rest } = await readGeneral(id)
                setGeneral(rest); setLimits(next)
              })
          }}>
            <FormField id="general-title" label={`Nombre de la campaña (máximo ${limits.title})`} error={fieldErrors.title}>
              <input id="general-title" value={general.title} maxLength={limits.title} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, title: event.target.value })} />
            </FormField>
            <FormField id="general-summary" label={`Resumen corto (máximo ${limits.summary})`} error={fieldErrors.summary}>
              <textarea id="general-summary" value={general.summary} maxLength={limits.summary} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, summary: event.target.value })} />
            </FormField>
            <FormField id="general-category" label="Categoría" error={fieldErrors.categoryId}>
              <select id="general-category" value={general.categoryId ?? ''} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, categoryId: event.target.value || null })}>
                <option value="">Elige una categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </FormField>
            <FormField id="general-country" label="País (código de dos letras)" error={fieldErrors.countryCode}>
              <input id="general-country" value={general.location.countryCode ?? ''} maxLength={2} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, countryCode: event.target.value.toUpperCase() || null } })} />
            </FormField>
            <FormField id="general-locality" label={`Localidad (máximo ${limits.locality})`} error={fieldErrors.locality}>
              <input id="general-locality" value={general.location.locality} maxLength={limits.locality} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, locality: event.target.value } })} />
            </FormField>
            <FormField id="general-address" label="Dirección" error={fieldErrors.addressLine}>
              <input id="general-address" value={general.location.addressLine} maxLength={limits.addressLine} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, addressLine: event.target.value } })} />
            </FormField>
            <FormField id="general-reference" label="Referencia" error={fieldErrors.reference}>
              <input id="general-reference" value={general.location.reference} maxLength={limits.reference} disabled={!editable}
                onChange={(event) => setGeneral({ ...general, location: { ...general.location, reference: event.target.value } })} />
            </FormField>
            <Button type="submit" disabled={!editable || saving === 'saving'}>Guardar información general</Button>
          </form>
        </section>}

        {story !== null && <section aria-label="Historia e impacto">
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
                <textarea id={`story-${field}`} value={story[field]} disabled={!editable}
                  onChange={(event) => setStory({ ...story, [field]: event.target.value })} />
              </FormField>)}

            <h4>Indicadores</h4>
            {indicators.map((indicator, index) => <fieldset key={index}>
              <legend>Indicador {index + 1}</legend>
              <FormField id={`indicator-name-${index}`} label="Nombre" error={fieldErrors[`indicators.${index}.name`]}>
                <input id={`indicator-name-${index}`} value={indicator.name} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} />
              </FormField>
              <FormField id={`indicator-unit-${index}`} label="Unidad" error={fieldErrors[`indicators.${index}.unit`]}>
                <input id={`indicator-unit-${index}`} value={indicator.unit} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index ? { ...item, unit: event.target.value } : item))} />
              </FormField>
              <FormField id={`indicator-target-${index}`} label="Meta esperada" error={fieldErrors[`indicators.${index}.targetValue`]}>
                <input id={`indicator-target-${index}`} type="number" value={indicator.targetValue ?? ''} disabled={!editable}
                  onChange={(event) => setIndicators(indicators.map((item, position) => position === index
                    ? { ...item, targetValue: event.target.value === '' ? null : Number(event.target.value) } : item))} />
              </FormField>
              <Button variant="secondary" disabled={!editable}
                onClick={() => setIndicators(indicators.filter((_, position) => position !== index))}>Quitar indicador</Button>
            </fieldset>)}
            <Button variant="secondary" disabled={!editable}
              onClick={() => setIndicators([...indicators, { name: '', description: '', unit: '', baselineValue: null, targetValue: null }])}>
              Añadir indicador
            </Button>
            <Button type="submit" disabled={!editable || saving === 'saving'}>Guardar historia e impacto</Button>
          </form>
        </section>}

        <nav aria-label="Navegación del asistente">
          <Button variant="secondary" disabled={!editable || step === 0 || saving === 'saving'}
            onClick={() => { void persist(values, step - 1) }}>Anterior</Button>
          <Button disabled={!editable || !canMoveTo(step, step + 1, total) || saving === 'saving'}
            onClick={() => { void persist(values, step + 1) }}>Siguiente</Button>
        </nav>
      </section>}
    </>}
  </AccessShell>
}
