import type { GeneralInput, IndicatorInput, StoryInput } from './campaignsClient'

interface DraftReviewProps {
  general: GeneralInput | null
  story: StoryInput | null
  indicators: IndicatorInput[]
}

/** Presentación de datos ya guardados; no conoce HTTP ni puede publicar. */
export function DraftReview({ general, story, indicators }: DraftReviewProps) {
  return <section aria-label="Revisión del borrador">
    <h3>{general?.title}</h3><p>{general?.summary}</p>
    <p>{general?.location.locality}</p><h4>Historia e impacto esperado</h4>
    <p>{story?.problem}</p><p>{story?.solution}</p><p>{story?.beneficiaries}</p><p>{story?.expectedResults}</p>
    <ul>{indicators.map((item, index) => <li key={index}>{item.name}: meta {item.targetValue ?? 'sin definir'} {item.unit}</li>)}</ul>
    <p>Revisión de lo guardado. No publica ni envía a aprobación.</p>
  </section>
}
