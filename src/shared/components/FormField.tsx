import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import styles from './ui.module.css'

type FieldBase = { label: string; help?: string; error?: string }
type FieldProps = FieldBase & (
  | ({ as?: 'input' } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: 'select'; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>)
  | ({ as: 'textarea' } & TextareaHTMLAttributes<HTMLTextAreaElement>)
)

export function FormField(props: FieldProps) {
  const generatedId = useId()
  const { label, help, error, id = generatedId, ...control } = props
  const description = [control['aria-describedby'], help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const accessibility = { id, 'aria-invalid': error ? true : control['aria-invalid'], 'aria-describedby': description }
  let input: ReactNode
  if (control.as === 'select') {
    const { as: kind, className = '', ...rest } = control
    input = <select {...rest} {...accessibility} data-control={kind} className={`${styles.input} ${className}`} />
  } else if (control.as === 'textarea') {
    const { as: kind, className = '', ...rest } = control
    input = <textarea {...rest} {...accessibility} data-control={kind} className={`${styles.input} ${styles.textarea} ${className}`} />
  } else {
    const { as: kind, className = '', ...rest } = control
    input = <input {...rest} {...accessibility} data-control={kind ?? 'input'} className={`${styles.input} ${className}`} />
  }
  return <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>{label}{control.required && ' *'}</label>
    {input}
    {help && <p className={styles.help} id={`${id}-help`}>{help}</p>}
    {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
  </div>
}
