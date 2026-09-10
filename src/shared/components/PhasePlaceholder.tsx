type PhasePlaceholderProps = { title: string; description: string }

/** Temporary scaffold: replace with the feature's real screen in later phases. */
export function PhasePlaceholder({ title, description }: PhasePlaceholderProps) {
  return <section><p className="eyebrow">Brotar · Pantalla en preparación</p><h1>{title}</h1><p className="lead">{description}</p><p className="notice">La identidad visual compartida está preparada. El contenido y las interacciones de esta pantalla se implementarán en las siguientes fases.</p></section>
}
