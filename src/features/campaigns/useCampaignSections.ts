import { useEffect, useRef, useState } from 'react'
import { DraftFieldError } from './campaignsClient'
import { readBudget, readFunding, readPlan, readRewards, readSectionCatalogs, saveBudget, saveFunding, savePlan, saveRewards,
  type BudgetInput, type FundingInput, type PlanInput, type RewardInput, type SectionCatalogs } from './sectionsClient'

export interface CampaignSectionsProps { id: string; step: number; editable: boolean; campaignType: string; onBusyChange: (busy: boolean) => void; onDirtyChange: (dirty: boolean) => void }

/** Coordina carga, guardado y cambios pendientes sin mezclarlo con el marcado del formulario. */
export function useCampaignSections({ id, step, editable, onBusyChange, onDirtyChange }: CampaignSectionsProps) {
  const [plan, setPlan] = useState<PlanInput | null>(null)
  const [budget, setBudget] = useState<BudgetInput | null>(null)
  const [funding, setFunding] = useState<FundingInput | null>(null)
  const [rewards, setRewards] = useState<RewardInput[] | null>(null)
  const [catalogs, setCatalogs] = useState<SectionCatalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [feedbackStep, setFeedbackStep] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [baseline, setBaseline] = useState<Record<string, string>>({})
  const [retry, setRetry] = useState(0)
  const active = useRef(false)
  const mounted = useRef(true)
  const dirty = editable && !loading && Object.keys(baseline).some(key => baseline[key] !== JSON.stringify({ plan, budget, funding, rewards }[key as 'plan' | 'budget' | 'funding' | 'rewards']))
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => { onBusyChange(loading || saving) }, [loading, saving, onBusyChange])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; onBusyChange(false); onDirtyChange(false) }
  }, [onBusyChange, onDirtyChange])
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([readPlan(id, controller.signal), readBudget(id, controller.signal), readFunding(id, controller.signal),
      readRewards(id, controller.signal), readSectionCatalogs(id, controller.signal)])
      .then(([nextPlan, nextBudget, nextFunding, nextRewards, nextCatalogs]) => {
        if (controller.signal.aborted) return
        setPlan(nextPlan); setBudget(nextBudget); setFunding(nextFunding); setRewards(nextRewards); setCatalogs(nextCatalogs); setLoading(false)
        setBaseline({ plan: JSON.stringify(nextPlan), budget: JSON.stringify(nextBudget), funding: JSON.stringify(nextFunding), rewards: JSON.stringify(nextRewards) })
      })
      .catch(() => { if (!controller.signal.aborted) { setError('No se pudieron cargar las secciones.'); setLoading(false) } })
    return () => controller.abort()
  }, [id, retry])

  async function persist(section: string, action: () => Promise<unknown>) {
    if (active.current || !editable) return
    active.current = true
    setSaving(true); onBusyChange(true); setFeedbackStep(step); setSaved(false); setError(''); setFields({})
    try {
      const result = await action()
      if (!mounted.current) return
      setBaseline(previous => ({ ...previous, [section]: JSON.stringify(result) })); setSaved(true)
    }
    catch (cause) {
      if (!mounted.current) return
      if (cause instanceof DraftFieldError) { setFields(cause.fields); setError('Revisa los campos señalados.') }
      else setError('No se confirmó el guardado. Conservamos tus datos para reintentar.')
    } finally { active.current = false; if (mounted.current) { setSaving(false); onBusyChange(false) } }
  }


  const savePlanning = () => plan && persist('plan', async () => { const next = await savePlan(id, plan); if (mounted.current) setPlan(next); return next })
  const saveBudgetSection = () => budget && persist('budget', async () => { const next = await saveBudget(id, budget); if (mounted.current) setBudget(next); return next })
  const saveFinancing = () => funding && persist('funding', async () => { const next = await saveFunding(id, funding); if (mounted.current) setFunding(next); return next })
  const saveRewardSection = () => rewards && persist('rewards', async () => { const next = await saveRewards(id, rewards); if (mounted.current) setRewards(next); return next })
  const retryLoad = () => { setLoading(true); setError(''); setRetry(value => value + 1) }
  return { plan, setPlan, budget, setBudget, funding, setFunding, rewards, setRewards, catalogs, loading, saving, saved, setSaved,
    feedbackStep, error, fields, retryLoad, savePlanning, saveBudgetSection, saveFinancing, saveRewardSection }
}
