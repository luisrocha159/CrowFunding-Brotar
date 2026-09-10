type PhasePlaceholderProps = { title: string; description: string }

/** Temporary scaffold: replace with the feature's real screen in later phases. */
export function PhasePlaceholder({ title, description }: PhasePlaceholderProps) {
  return <section><p className="eyebrow">Base de desarrollo · Fase 1</p><h1>{title}</h1><p className="lead">{description}</p><p className="notice">Ruta preparada. El diseño y las interacciones de esta pantalla se implementarán en las siguientes fases.</p></section>
}
