import { useSearchParams } from 'react-router-dom'
import { DEMO_NOTICE } from '../../mocks/projects/projects'
import { Button } from '../../shared/components/Button'
import styles from './public.module.css'

export function DemoNotice() {
  return <p className={styles.demoNotice}><strong>Prototipo de demostración.</strong> {DEMO_NOTICE}</p>
}

export function DemoStates() {
  const [params, setParams] = useSearchParams()
  return <details className={styles.demoControls}><summary>Probar estados de la muestra</summary>
    <p>Estos controles solo cambian los datos simulados de esta página.</p>
    <div className={styles.actions}>{[['normal', 'Contenido normal'], ['carga', 'Carga lenta'], ['vacio', 'Sin contenido'], ['error', 'Error de carga']].map(([value, label]) => <Button key={value} variant="secondary" aria-pressed={(params.get('estado') ?? 'normal') === value} onClick={() => {
      const next = new URLSearchParams(params)
      if (value === 'normal') next.delete('estado')
      else next.set('estado', value!)
      setParams(next, { preventScrollReset: true })
    }}>{label}</Button>)}</div>
  </details>
}
