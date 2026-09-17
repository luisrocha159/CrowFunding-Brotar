import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref, publicContinuation } from '../navigation'
import { validateLogin, type FieldErrors } from '../validation'
import { currentUser, login, SessionError } from '../session/sessionClient'
import styles from '../access.module.css'

export function LoginPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => { active.current?.abort(); active.current = null }, [])
  useEffect(() => { if (status === 'error') document.getElementById('login-response')?.focus() }, [status])
  const busy = status === 'loading'
  return <AccessShell title="Iniciar sesión" subtitle="Accede con el correo y la contraseña de tu cuenta." intro="Sigue haciendo crecer las causas que te importan"
    notice={<><strong>Acceso conectado.</strong> Puedes entrar con tu cuenta recién registrada para gestionar tu perfil y organizaciones en borrador. Iniciar sesión no verifica tu correo ni tu identidad. Usa únicamente cuentas y contraseñas de prueba.</>}>
    {status === 'success' ? <AccessSuccess title="Sesión iniciada">
      <p>La sesión fue confirmada por el servidor. Puedes consultar tus datos y cerrar sesión desde Mi cuenta.</p>
      <div className={styles.actions}><ButtonLink to="/mi-cuenta">Ir a mi cuenta</ButtonLink><ButtonLink variant="secondary" to={publicContinuation(params.get('continuar'))}>Continuar recorrido público</ButtonLink></div>
    </AccessSuccess> : <>
      {status === 'error' && <div id="login-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No pudimos confirmar el acceso">{message}</Message></div>}
      <form className={styles.form} noValidate aria-label="Formulario de inicio de sesión" onSubmit={async event => {
        event.preventDefault()
        if (active.current) return
        const next = validateLogin({ email, password })
        if (Array.from(password).length > 128) next.password = 'Usa hasta 128 caracteres.'
        setErrors(next)
        const first = (['email', 'password'] as const).find(key => next[key])
        if (first) { document.getElementById(`login-${first}`)?.focus(); return }
        const controller = new AbortController(); active.current = controller; setStatus('loading')
        try {
          await login(email, password, controller.signal)
          await currentUser(controller.signal)
          if (!controller.signal.aborted) { setStatus('success'); setPassword('') }
        } catch (error) {
          if (!controller.signal.aborted) {
            const code = error instanceof SessionError ? error.status : 0
            setMessage(code === 401 ? 'El correo o la contraseña no son correctos, o no se pudo mantener la sesión.'
              : code === 403 ? 'La cuenta está suspendida, cerrada o bloqueada temporalmente. Si el bloqueo es temporal, espera antes de volver a intentarlo.'
              : code === 429 ? 'Demasiados intentos. Espera un minuto antes de volver a intentar.'
              : 'No se pudo confirmar la sesión. Comprueba la conexión con el servidor e inténtalo nuevamente.')
            setPassword(''); setStatus('error')
          }
        } finally { if (active.current === controller) active.current = null }
      }}>
        <ValidationSummary prefix="login" errors={errors} />
        <fieldset className={styles.fields} disabled={busy}>
          <FormField id="login-email" label="Correo electrónico" name="email" type="email" autoComplete="username" required value={email} error={errors.email} placeholder="nombre@example.com" onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined })); setStatus('idle') }} />
          <PasswordField id="login-password" label="Contraseña" name="password" value={password} error={errors.password} disabled={busy} onChange={value => { setPassword(value); setErrors(current => ({ ...current, password: undefined })); setStatus('idle') }} />
          <Button type="submit" loading={busy} loadingLabel="Verificando…">Iniciar sesión</Button>
        </fieldset>
        <Link className={styles.forgot} to={accessHref('/recuperar-contrasena', params)}>Ver recuperación de acceso (todavía simulada)</Link>
      </form>
      <div className={styles.divider}>¿Todavía no tienes cuenta?</div><ButtonLink className={styles.wide} variant="secondary" to={accessHref('/registro', params)}>Crear una cuenta</ButtonLink>
      <p><Link to="/mi-cuenta">Comprobar mi sesión actual</Link></p>
    </>}
  </AccessShell>
}
