import type { ReactNode } from 'react'
import styles from './ui.module.css'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info' }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
