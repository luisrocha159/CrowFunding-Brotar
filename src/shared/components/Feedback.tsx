import type { ReactNode } from 'react'
import styles from './ui.module.css'

export function Message({ tone = 'info', title, children }: { tone?: 'info' | 'success' | 'error' | 'warning'; title: string; children?: ReactNode }) {
  return <div className={`${styles.message} ${styles[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span aria-hidden="true">{tone === 'success' ? '✓' : tone === 'error' || tone === 'warning' ? '!' : 'i'}</span>
    <div><strong>{title}</strong>{children && <p>{children}</p>}</div>
  </div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className={styles.state}><span className={styles.stateIcon} aria-hidden="true">—</span><h3>{title}</h3><p>{description}</p>{action}</section>
}

export function ErrorState({ title = 'No pudimos cargar la información', action }: { title?: string; action?: ReactNode }) {
  return <section className={styles.state} aria-live="polite"><span className={styles.stateIcon} aria-hidden="true">!</span><h3>{title}</h3><p>Intenta nuevamente en unos momentos.</p>{action}</section>
}

export function ProjectCardSkeleton() {
  return <div className={styles.card} role="status" aria-label="Cargando proyecto" aria-busy="true">
    <div className={`${styles.skeleton} ${styles.skeletonImage}`} aria-hidden="true" />
    <div className={styles.skeletonBody} aria-hidden="true">
      <div className={`${styles.skeleton} ${styles.short}`} /><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={`${styles.skeleton} ${styles.short}`} />
    </div>
  </div>
}
