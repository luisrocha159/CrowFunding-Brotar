import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref } from '../navigation'
import { RecoveryError, requestPasswordRecovery, resetPassword, RESET_PASSWORD_HELP, validateRecoveryEmail, validateReset, type RecoveryFailure, type ResetErrors, type ResetValues } from './passwordRecoveryClient'
import styles from '../access.module.css'

const requestMessages: Record<RecoveryFailure, string> = {
  invalid: 'Revisa el correo ingresado.',
  busy: 'Se alcanzó el límite de solicitudes. Espera un minuto antes de volver a intentar.',
  expired: 'El enlace de recuperación no está disponible o ya venció.',
  unavailable: 'El servicio no está disponible. Comprueba que la API y PostgreSQL estén iniciados.',
  unknown: 'No pudimos confirmar la solicitud. Intenta nuevamente sin asumir que se envió un correo.'
}
const resetMessages: Record<RecoveryFailure, string> = {
  ...requestMessages,
  invalid: 'Revisa la nueva contraseña.',
  unknown: 'No pudimos cambiar la contraseña. Solicita un enlace nuevo si el problema continúa.'
}
const initialReset = (token: string): ResetValues => ({ token, password: '', confirmation: '' })

export function RecoverPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  return token ? <ResetPassword key={token} token={token} params={params} /> : <RequestRecovery params={params} />
}

function RequestRecovery({ params }: { params: URLSearchParams }) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ResetErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | RecoveryFailure>('idle')
  const [resetPath, setResetPath] = useState<string | undefined>()
  const active = useRef<AbortController | null>(null)
  const busy = status === 'loading'
  useEffect(() => () => { active.current?.abort(); active.current = null }, [])
  useEffect(() => {
    if (status !== 'idle' && status !== 'loading' && status !== 'success') document.getElementById('recover-response')?.focus()
  }, [status])
  if (status === 'success') return <AccessShell centered title="Solicitud recibida" subtitle="Si el correo corresponde a una cuenta habilitada, se generó un enlace de recuperación."
    notice={<><strong>Solicitud procesada.</strong> Consulta el canal configurado por el equipo: correo autorizado o buzón privado de pruebas locales. Un buzón local no envía correos externos.</>}>
    <AccessSuccess title="Revisa el canal autorizado">
      <p>Por seguridad, esta pantalla no revela si la cuenta existe. No se afirma ningún envío cuando no hay remitente de correo configurado.</p>
      {resetPath && <p>Entorno local: usa el enlace de recuperación generado para completar la prueba de caducidad y uso único.</p>}
      <div className={styles.actions}>{resetPath && <ButtonLink to={resetPath}>Abrir enlace local</ButtonLink>}<ButtonLink variant="secondary" to={accessHref('/iniciar-sesion', params)}>Volver a iniciar sesión</ButtonLink><Button variant="secondary" onClick={() => { setEmail(''); setErrors({}); setResetPath(undefined); setStatus('idle') }}>Solicitar otro enlace</Button></div>
    </AccessSuccess>
  </AccessShell>
  return <AccessShell centered title="Recuperar contraseña" subtitle="Solicita un enlace de recuperación con caducidad y uso único."
    notice={<><strong>Recuperación conectada.</strong> La solicitud se registra con token seguro. La respuesta no confirma si el correo existe ni simula envíos.</>}>
    {status !== 'idle' && status !== 'loading' && <div id="recover-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No pudimos procesar la solicitud">{requestMessages[status]}</Message></div>}
    <form className={styles.form} noValidate aria-label="Formulario de recuperación" onSubmit={async event => {
      event.preventDefault()
      if (active.current) return
      const next = validateRecoveryEmail(email)
      setErrors(next)
      if (next.email) { document.getElementById('recover-email')?.focus(); return }
      const controller = new AbortController()
      active.current = controller
      setStatus('loading')
      try {
        const result = await requestPasswordRecovery(email, controller.signal)
        if (!controller.signal.aborted) { setEmail(email.trim().toLowerCase()); setResetPath(result.resetPath); setStatus('success') }
      } catch (error) {
        if (!controller.signal.aborted) setStatus(error instanceof RecoveryError ? error.kind : 'unknown')
      } finally { if (active.current === controller) active.current = null }
    }}>
      <ValidationSummary prefix="recover" errors={errors} />
      <fieldset className={styles.fields} disabled={busy}>
        <FormField id="recover-email" name="email" label="Correo electrónico" type="email" autoComplete="email" required value={email} error={errors.email} placeholder="nombre@example.com" onChange={event => { setEmail(event.target.value); setErrors({}); setStatus('idle') }} />
        <Button type="submit" loading={busy} loadingLabel="Procesando solicitud…">Solicitar recuperación</Button>
      </fieldset>
    </form>
    <Link className={styles.bottomLink} to={accessHref('/iniciar-sesion', params)}>Volver a iniciar sesión</Link>
  </AccessShell>
}

function ResetPassword({ token, params }: { token: string; params: URLSearchParams }) {
  const [values, setValues] = useState<ResetValues>(initialReset(token))
  const [errors, setErrors] = useState<ResetErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | RecoveryFailure>('idle')
  const active = useRef<AbortController | null>(null)
  const busy = status === 'loading'
  useEffect(() => () => { active.current?.abort(); active.current = null }, [])
  useEffect(() => {
    if (status !== 'idle' && status !== 'loading' && status !== 'success') document.getElementById('reset-response')?.focus()
  }, [status])
  function change<K extends keyof ResetValues>(key: K, value: ResetValues[K]) {
    setValues(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    setStatus('idle')
  }
  if (status === 'success') return <AccessShell centered title="Contraseña actualizada" subtitle="El enlace de recuperación quedó consumido.">
    <AccessSuccess title="Ya puedes iniciar sesión">
      <p>La contraseña se cambió correctamente. El enlace utilizado no puede volver a usarse.</p>
      <div className={styles.actions}><ButtonLink to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</ButtonLink></div>
    </AccessSuccess>
  </AccessShell>
  return <AccessShell centered title="Crear nueva contraseña" subtitle="El enlace debe estar vigente y solo puede usarse una vez."
    notice={<><strong>Restablecimiento conectado.</strong> La nueva contraseña se guarda protegida; el token se consume y las sesiones abiertas se revocan.</>}>
    {status !== 'idle' && status !== 'loading' && <div id="reset-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No pudimos cambiar la contraseña">{resetMessages[status]}</Message></div>}
    <form className={styles.form} noValidate aria-label="Restablecer contraseña" onSubmit={async event => {
      event.preventDefault()
      if (active.current) return
      const next = validateReset(values)
      setErrors(next)
      const first = (['token', 'password', 'confirmation'] as const).find(key => next[key])
      if (first) { document.getElementById(first === 'token' ? 'reset-response' : `reset-${first}`)?.focus(); return }
      const controller = new AbortController()
      active.current = controller
      setStatus('loading')
      try {
        await resetPassword(values, controller.signal)
        if (!controller.signal.aborted) { setValues(initialReset(token)); setStatus('success') }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus(error instanceof RecoveryError ? error.kind : 'unknown')
          setValues(current => ({ ...current, password: '', confirmation: '' }))
        }
      } finally { if (active.current === controller) active.current = null }
    }}>
      <ValidationSummary prefix="reset" errors={errors} />
      {errors.token && <div id="reset-response" tabIndex={-1} className={styles.response}><Message tone="error" title="Enlace no válido">{errors.token}</Message></div>}
      <fieldset className={styles.fields} disabled={busy || !!errors.token}>
        <PasswordField id="reset-password" label="Nueva contraseña" name="password" newPassword value={values.password} error={errors.password} help={RESET_PASSWORD_HELP} disabled={busy} onChange={value => change('password', value)} />
        <PasswordField id="reset-confirmation" label="Confirmar nueva contraseña" name="confirmation" newPassword value={values.confirmation} error={errors.confirmation} disabled={busy} onChange={value => change('confirmation', value)} />
        <Button type="submit" loading={busy} loadingLabel="Guardando contraseña…">Cambiar contraseña</Button>
      </fieldset>
    </form>
    <Link className={styles.bottomLink} to="/recuperar-contrasena">Solicitar otro enlace</Link>
  </AccessShell>
}
