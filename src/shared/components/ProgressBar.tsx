import styles from './ui.module.css'

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percentage = Number.isFinite(value) ? Math.max(0, value) : 0
  return <progress className={styles.progress} max={100} value={Math.min(100, percentage)} aria-label={label} aria-valuetext={`${Math.round(percentage)} % de la meta`} />
}
