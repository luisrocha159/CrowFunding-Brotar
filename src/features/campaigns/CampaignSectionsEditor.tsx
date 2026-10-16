import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import styles from '../access/access.module.css'
import { budgetTotal, planFrom, withoutActivity } from './sectionsClient'
import { useCampaignSections, type CampaignSectionsProps } from './useCampaignSections'
import { plannedAmount, RISK_IMPACTS, today } from '../../../backend/src/campaigns/domain/input-policy'

const newActivity = () => ({ name: '', responsibleName: '', plannedStartOn: '', plannedEndOn: '' })
const newMilestone = () => ({ ...newActivity(), activityIndexes: [] as number[] })
const newItem = () => ({ categoryId: '', description: '', quantity: 1, unitPrice: 0, plannedAmount: 0, notes: '' })
const newRisk = () => ({ title: '', description: '', likelihood: '', impact: '', mitigation: '' })
const day = (value: string | null) => value?.slice(0, 10) ?? ''
const instant = (value: string) => value ? `${value}T00:00:00.000Z` : null

/** Controles nativos con reglas compartidas, errores por campo y unidades explícitas. */
export function CampaignSectionsEditor(props: CampaignSectionsProps) {
  const { step, editable, campaignType } = props
  const { plan: storedPlan, setPlan, budget, setBudget, funding, setFunding, rewards, setRewards, catalogs, loading, saving, saved, setSaved,
    feedbackStep, error, fields: localFields, validateField, retryLoad, savePlanning, saveBudgetSection, saveFinancing, saveRewardSection } = useCampaignSections(props)
  const plan = storedPlan ? planFrom(storedPlan) : storedPlan
  const fields = { ...props.externalErrors, ...localFields }
  if (loading) return <p role="status">Cargando datos guardados…</p>
  if (!plan || !budget || !funding || !rewards || !catalogs) return <><Message tone="error" title="Secciones no disponibles">{error}</Message><Button onClick={retryLoad}>Reintentar</Button></>
  const field = (key: string) => ({ id: `section-${key}`, error: fields[key], onBlur: () => validateField(key) })
  const schedule = [['name', 'Nombre', 'text', 200], ['responsibleName', 'Responsable', 'text', 160], ['plannedStartOn', 'Inicio previsto', 'date', undefined], ['plannedEndOn', 'Fin previsto', 'date', undefined]] as const
  return <section aria-label="Configuración de campaña" onChange={() => { setSaved(false); props.onFieldsEdited?.() }}>
    <p>Los campos con * son obligatorios. Las fechas se validan según el día actual en Bolivia.</p>
    {saved && feedbackStep === step && <Message tone="success" title="Sección guardada">El bloque quedó persistido. Guarda también cualquier otro bloque modificado.</Message>}
    {error && feedbackStep === step && <Message tone="error" title="No se pudo guardar">{error}</Message>}
    {fields.goalAmount && step === 4 && <Message tone="error" title="Meta y presupuesto">{fields.goalAmount}</Message>}
    <fieldset disabled={saving || !editable} style={{ border: 0, padding: 0, margin: 0 }}>
    {step === 4 && <>
      <h3>Actividades e hitos</h3>
      <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void savePlanning() }}>
        {plan.activities.map((activity, index) => <fieldset key={index}><legend>Actividad {index + 1}</legend>
          {schedule.map(([key, label, type, max]) => <FormField key={key} {...field(`activities.${index}.${key}`)} label={label} type={type} required minLength={key === 'name' ? 5 : 2} maxLength={max ? max * 2 : undefined} min={type === 'date' ? (key === 'plannedEndOn' && activity.plannedStartOn > today() ? activity.plannedStartOn : today()) : undefined} value={activity[key]} help={type === 'text' ? `Entre ${key === 'name' ? 5 : 2} y ${max} caracteres.` : undefined} onChange={event => setPlan({ ...plan, activities: plan.activities.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item) })} />)}
          <Button variant="secondary" onClick={() => setPlan(withoutActivity(plan, index))}>Quitar actividad</Button>
        </fieldset>)}
        {fields.plan && <p role="alert">{fields.plan}</p>}{fields.activities && <p role="alert">{fields.activities}</p>}
        <Button variant="secondary" disabled={plan.activities.length >= 50} onClick={() => setPlan({ ...plan, activities: [...plan.activities, newActivity()] })}>Añadir actividad</Button>
        {plan.milestones.map((milestone, index) => <fieldset key={index}><legend>Hito {index + 1}</legend>
          <fieldset id={`section-milestones.${index}.activityIndexes`} tabIndex={-1} aria-invalid={Boolean(fields[`milestones.${index}.activityIndexes`])} aria-describedby={`milestone-${index}-activities-help${fields[`milestones.${index}.activityIndexes`] ? ` milestone-${index}-activities-error` : ''}`}>
            <legend>Actividades relacionadas (opcional)</legend>
            <p id={`milestone-${index}-activities-help`}>Marca una o varias. El hito representa un resultado, no otra actividad. Si quitas una actividad, se elimina solamente su vínculo con los hitos.</p>
            {plan.activities.length ? plan.activities.map((activity, activityIndex) => <label key={activityIndex} className={styles.checkbox}>
              <input type="checkbox" checked={milestone.activityIndexes.includes(activityIndex)} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, activityIndexes: event.target.checked ? [...item.activityIndexes, activityIndex].sort((a, b) => a - b) : item.activityIndexes.filter(selected => selected !== activityIndex) } : item) })} onBlur={() => validateField(`milestones.${index}.activityIndexes`)} />
              <span>{activity.name || `Actividad ${activityIndex + 1}`}</span>
            </label>) : <p>Añade actividades para poder relacionarlas con este hito.</p>}
            <p>{milestone.activityIndexes.length} actividades seleccionadas.</p>
            {fields[`milestones.${index}.activityIndexes`] && <p id={`milestone-${index}-activities-error`} role="alert">{fields[`milestones.${index}.activityIndexes`]}</p>}
          </fieldset>
          <p>El fin previsto del hito debe ser igual o posterior al fin de todas sus actividades relacionadas.</p>
          {schedule.map(([key, label, type, max]) => <FormField key={key} {...field(`milestones.${index}.${key}`)} label={label} type={type} required minLength={key === 'name' ? 5 : 2} maxLength={max ? max * 2 : undefined} min={type === 'date' ? today() : undefined} value={milestone[key]} onChange={event => setPlan({ ...plan, milestones: plan.milestones.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item) })} />)}
          <Button variant="secondary" onClick={() => setPlan({ ...plan, milestones: plan.milestones.filter((_, i) => i !== index) })}>Quitar hito</Button>
        </fieldset>)}
        <Button variant="secondary" disabled={plan.milestones.length >= 50} onClick={() => setPlan({ ...plan, milestones: [...plan.milestones, newMilestone()] })}>Añadir hito</Button>
        <Button type="submit" loading={saving} loadingLabel="Guardando planificación…">Guardar planificación</Button>
      </form>
      <h3>Presupuesto y riesgos</h3>
      <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void saveBudgetSection() }}>
        {budget.items.map((item, index) => <fieldset key={index}><legend>Partida {index + 1}</legend>
          <FormField as="select" {...field(`items.${index}.categoryId`)} label="Categoría de gasto" required value={item.categoryId} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, categoryId: event.target.value } : row) })}><option value="">Selecciona una categoría</option>{catalogs.expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</FormField>
          <FormField {...field(`items.${index}.description`)} label="Descripción" required minLength={10} maxLength={600} help="Entre 10 y 300 caracteres." value={item.description} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, description: event.target.value } : row) })} />
          {(['quantity', 'unitPrice'] as const).map(key => <FormField key={key} {...field(`items.${index}.${key}`)} label={key === 'quantity' ? 'Cantidad' : 'Precio unitario'} required type="number" inputMode="decimal" min="0.01" max={key === 'quantity' ? 9999999999.99 : 999999999999.99} step="0.01" value={Number.isNaN(item[key]) ? '' : item[key]} help="Número positivo con hasta dos decimales." onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => { if (i !== index) return row; const next = { ...row, [key]: event.target.value === '' ? NaN : Number(event.target.value) }; return { ...next, plannedAmount: plannedAmount(next.quantity, next.unitPrice) } }) })} />)}
          <FormField {...field(`items.${index}.plannedAmount`)} label="Importe planificado (calculado)" type="number" readOnly value={Number.isFinite(item.plannedAmount) ? item.plannedAmount : ''} help="Cantidad × precio unitario; no se escribe manualmente." />
          <FormField as="textarea" {...field(`items.${index}.notes`)} label="Notas (opcional)" maxLength={10000} help="Vacío o entre 5 y 5000 caracteres." value={item.notes} onChange={event => setBudget({ ...budget, items: budget.items.map((row, i) => i === index ? { ...row, notes: event.target.value } : row) })} />
          <Button variant="secondary" onClick={() => setBudget({ ...budget, items: budget.items.filter((_, i) => i !== index) })}>Quitar partida</Button>
        </fieldset>)}
        {fields.budget && <p role="alert">{fields.budget}</p>}{fields.items && <p role="alert">{fields.items}</p>}
        <Button variant="secondary" disabled={budget.items.length >= 50} onClick={() => setBudget({ ...budget, items: [...budget.items, newItem()] })}>Añadir partida</Button>
        <p>Total planificado: {Number.isFinite(budgetTotal(budget)) ? budgetTotal(budget).toFixed(2) : 'Completa los importes'}. La meta deberá ser mayor a este total.</p>
        {budget.risks.map((risk, index) => <fieldset key={index}><legend>Riesgo {index + 1}</legend>
          {(['title', 'description', 'mitigation'] as const).map(key => <FormField key={key} {...field(`risks.${index}.${key}`)} label={{ title: 'Riesgo', description: 'Descripción', mitigation: 'Mitigación' }[key]} required minLength={key === 'title' ? 5 : 10} maxLength={key === 'title' ? 400 : 10000} help={key === 'title' ? 'Entre 5 y 200 caracteres.' : 'Entre 10 y 5000 caracteres.'} value={risk[key]} onChange={event => setBudget({ ...budget, risks: budget.risks.map((row, i) => i === index ? { ...row, [key]: event.target.value } : row) })} />)}
          <FormField {...field(`risks.${index}.likelihood`)} label="Probabilidad (%)" required type="number" inputMode="decimal" min="0" max="100" step="0.01" value={risk.likelihood} help="De 0 a 100; no escribas el signo %." onChange={event => setBudget({ ...budget, risks: budget.risks.map((row, i) => i === index ? { ...row, likelihood: event.target.value } : row) })} />
          <FormField as="select" {...field(`risks.${index}.impact`)} label="Impacto" required value={risk.impact} onChange={event => setBudget({ ...budget, risks: budget.risks.map((row, i) => i === index ? { ...row, impact: event.target.value } : row) })}><option value="">Selecciona el impacto</option>{RISK_IMPACTS.map(impact => <option key={impact}>{impact}</option>)}</FormField>
          <Button variant="secondary" onClick={() => setBudget({ ...budget, risks: budget.risks.filter((_, i) => i !== index) })}>Quitar riesgo</Button>
        </fieldset>)}
        <Button variant="secondary" disabled={budget.risks.length >= 50} onClick={() => setBudget({ ...budget, risks: [...budget.risks, newRisk()] })}>Añadir riesgo</Button>
        <Button type="submit" loading={saving} loadingLabel="Guardando presupuesto…">Guardar presupuesto y riesgos</Button>
      </form>
    </>}
    {step === 5 && <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void saveFinancing() }}>
      <h3>Financiamiento</h3><p>Presupuesto guardado: {budgetTotal(budget).toFixed(2)}. La meta debe ser estrictamente mayor, en la moneda seleccionada.</p>
      <FormField {...field('goalAmount')} label="Meta" required type="number" inputMode="decimal" min="0.01" max={999999999999.99} step="0.01" value={funding.goalAmount ?? ''} onChange={event => setFunding({ ...funding, goalAmount: event.target.value ? Number(event.target.value) : null })} />
      <FormField as="select" {...field('currencyCode')} label="Moneda" required value={funding.currencyCode} onChange={event => setFunding({ ...funding, currencyCode: event.target.value })}><option value="">Selecciona una moneda</option>{catalogs.currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.name} ({currency.code})</option>)}</FormField>
      <FormField {...field('durationDays')} label="Duración (días)" required type="number" inputMode="numeric" min="1" max="365" step="1" value={funding.durationDays ?? ''} help="Entero de 1 a 365 días. Si indicas fechas, debe coincidir con el periodo." onChange={event => setFunding({ ...funding, durationDays: event.target.value ? Number(event.target.value) : null })} />
      <FormField as="select" {...field('fundingModel')} label="Modelo" required value={funding.fundingModel} onChange={event => setFunding({ ...funding, fundingModel: event.target.value })}><option value="">Selecciona un modelo</option><option value="ALL_OR_NOTHING">Todo o nada</option><option value="FLEXIBLE">Flexible</option></FormField>
      {(['startsAt', 'endsAt'] as const).map(key => <FormField key={key} {...field(key)} label={key === 'startsAt' ? 'Fecha de inicio (opcional)' : 'Fecha de fin (opcional)'} type="date" min={key === 'endsAt' && day(funding.startsAt) > today() ? day(funding.startsAt) : today()} value={day(funding[key])} help="Completa las dos fechas o deja ambas vacías." onChange={event => setFunding({ ...funding, [key]: instant(event.target.value) })} />)}
      <Button type="submit" loading={saving} loadingLabel="Guardando financiamiento…">Guardar financiamiento</Button>
    </form>}
    {step === 6 && <>
      <h3>{campaignType === 'PRESALE' ? 'Productos de preventa' : 'Recompensas'}</h3>
      {campaignType === 'DONATION' ? <p>Donación no requiere recompensas. Las anteriores se conservan, pero no se muestran como activas.</p> : <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void saveRewardSection() }}>
        {rewards.map((reward, index) => <fieldset key={index}><legend>{campaignType === 'PRESALE' ? 'Producto' : 'Recompensa'} {index + 1}</legend>
          <FormField {...field(`rewards.${index}.title`)} label="Título" required minLength={5} maxLength={400} help="Entre 5 y 200 caracteres." value={reward.title} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} />
          <FormField as="textarea" {...field(`rewards.${index}.description`)} label="Descripción" required minLength={10} maxLength={10000} help="Entre 10 y 5000 caracteres." value={reward.description} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, description: event.target.value } : row))} />
          <FormField as="select" {...field(`rewards.${index}.rewardKind`)} label="Tipo según modalidad" required value={reward.rewardKind} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, rewardKind: event.target.value } : row))}><option value="">Selecciona el tipo</option><option value={campaignType}>{campaignType === 'PRESALE' ? 'Producto en preventa' : 'Recompensa'}</option></FormField>
          <FormField {...field(`rewards.${index}.minAmount`)} label={campaignType === 'PRESALE' ? 'Precio por aporte' : 'Aporte mínimo'} required type="number" inputMode="decimal" min="0.01" max={funding.goalAmount ?? 999999999999.99} step="0.01" value={Number.isNaN(reward.minAmount) ? '' : reward.minAmount} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, minAmount: event.target.value === '' ? NaN : Number(event.target.value) } : row))} />
          <FormField {...field(`rewards.${index}.quantityTotal`)} label={campaignType === 'PRESALE' ? 'Cantidad disponible' : 'Disponibilidad (opcional, vacío = sin límite)'} required={campaignType === 'PRESALE'} type="number" inputMode="numeric" min="1" max="2147483647" step="1" value={reward.quantityTotal ?? ''} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, quantityTotal: event.target.value === '' ? null : Number(event.target.value) } : row))} />
          <FormField {...field(`rewards.${index}.estimatedDeliveryOn`)} label="Entrega estimada" required type="date" min={day(funding.endsAt) > today() ? day(funding.endsAt) : today()} value={reward.estimatedDeliveryOn ?? ''} onChange={event => setRewards(rewards.map((row, i) => i === index ? { ...row, estimatedDeliveryOn: event.target.value || null } : row))} />
          <Button variant="secondary" onClick={() => setRewards(rewards.filter((_, i) => i !== index))}>Quitar recompensa</Button>
        </fieldset>)}
        {fields.rewards && <p role="alert">{fields.rewards}</p>}
        <Button variant="secondary" disabled={rewards.length >= 50} onClick={() => setRewards([...rewards, { title: '', description: '', rewardKind: campaignType, minAmount: 0, quantityTotal: null, estimatedDeliveryOn: null }])}>Añadir {campaignType === 'PRESALE' ? 'producto' : 'recompensa'}</Button>
        <Button type="submit" loading={saving} loadingLabel="Guardando recompensas…">Guardar recompensas</Button>
      </form>}
    </>}
    </fieldset>
  </section>
}
