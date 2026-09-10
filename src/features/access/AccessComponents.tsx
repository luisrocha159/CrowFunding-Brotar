import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FormField } from '../../shared/components/FormField'
import { Button } from '../../shared/components/Button'
import type { AccessOutcome } from '../../mocks/access/accessService'
import type { FieldErrors } from './validation'
import styles from './access.module.css'

export function AccessShell({ title, subtitle, intro, children, centered = false }: { title: string; subtitle: string; intro?: string; children: ReactNode; centered?: boolean }) {
  return <div className={centered ? styles.centered : styles.shell}>
    {!centered && <aside className={styles.intro}><div><span className={styles.introTag}>Una comunidad, muchas formas de contribuir</span><p className={styles.introTitle}>{intro}</p><p>Un mismo acceso para quienes descubren iniciativas, crean proyectos o representan a una organización.</p></div><div className={styles.introNote}><strong>Ideas que nos unen</strong>Descubre proyectos y conoce las comunidades que buscan transformar su entorno.</div></aside>}
    <div className={styles.body}><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p><p className={styles.notice}><strong>Modo demostración.</strong> Usa datos ficticios. No se crean cuentas, sesiones ni correos reales, y los formularios no envían ni guardan tus datos.</p>{children}</div>
  </div>
}

export function PasswordField({ id, label, name, value, onChange, error, help, disabled, newPassword = false }: { id: string; label: string; name: string; value: string; onChange: (value: string) => void; error?: string; help?: string; disabled?: boolean; newPassword?: boolean }) {
  const [visible, setVisible] = useState(false)
  return <div className={styles.password}><FormField id={id} label={label} name={name} value={value} onChange={event => onChange(event.target.value)} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} required error={error} help={help} disabled={disabled} />
    <button type="button" disabled={disabled} aria-controls={id} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
  </div>
}

export function ValidationSummary({ errors, prefix }: { errors: FieldErrors; prefix: string }) {
  const entries = Object.entries(errors).filter(([, error]) => error)
  if (!entries.length) return null
  return <div className={styles.summary} role="alert"><strong>Revisa los campos indicados.</strong><ul>{entries.map(([key, error]) => <li key={key}><button type="button" onClick={() => document.getElementById(`${prefix}-${key}`)?.focus()}>{error}</button></li>)}</ul></div>
}

export function AccessSuccess({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: 'nearest' }) }, [])
  return <section className={styles.success} ref={ref} tabIndex={-1} aria-label={title}><span className={styles.successMark} aria-hidden="true">✓</span><h2>{title}</h2>{children}</section>
}

export function AccessDemoControls({ options, value, onChange, onFill, disabled }: { options: readonly { value: AccessOutcome; label: string }[]; value: AccessOutcome; onChange: (value: AccessOutcome) => void; onFill: () => void; disabled: boolean }) {
  const id = useId()
  return <details className={styles.controls}><summary>Probar esta pantalla</summary><p>El resultado se elige aquí y aparece al enviar un formulario válido. No se comprueba ninguna cuenta real.</p><FormField as="select" id={id} label="Respuesta simulada" value={value} disabled={disabled} onChange={event => onChange(event.target.value as AccessOutcome)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</FormField><Button variant="secondary" onClick={onFill} disabled={disabled}>Usar datos de prueba</Button></details>
}
