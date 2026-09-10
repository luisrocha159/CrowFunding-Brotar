import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import styles from './ui.module.css'

type Variant = 'primary' | 'secondary' | 'tertiary'
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
  loadingLabel?: string
}

export function Button({ variant = 'primary', loading = false, loadingLabel = 'Procesando…', children, className = '', disabled, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={`${styles.button} ${styles[variant]} ${className}`} disabled={disabled || loading} aria-busy={loading}>
    {loading && <span className={styles.spinner} aria-hidden="true" />}
    {loading ? loadingLabel : children}
  </button>
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link {...props} className={`${styles.button} ${styles[variant]} ${className}`} />
}
