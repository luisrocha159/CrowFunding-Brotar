import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessDemoControls, AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref, publicContinuation } from '../navigation'
import { demoValues, normalizeEmail, validateLogin, type FieldErrors } from '../validation'
import { useAccessRequest } from '../useAccessRequest'
import type { AccessOutcome } from '../../../mocks/access/accessService'
import styles from '../access.module.css'

export function LoginPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [scenario, setScenario] = useState<AccessOutcome>('success')
  const request = useAccessRequest()
  useEffect(() => {
    if (request.status === 'incorrect' || request.status === 'error') document.getElementById('login-response')?.focus()
  }, [request.status])
  const continuation = publicContinuation(params.get('continuar'))
  function reset() { setEmail(''); setPassword(''); setErrors({}); setScenario('success'); request.reset() }

  return <AccessShell title="Iniciar sesión" subtitle="Ingresa con tu correo y contraseña para recorrer el acceso de Brotar." intro="Sigue haciendo crecer las causas que te importan">
    {request.status === 'success' ? <AccessSuccess title="Acceso simulado exitoso"><p>Completaste el flujo de acceso. No se ha abierto una sesión real ni se han guardado tus credenciales.</p><p>Las zonas privadas y los pagos están fuera de esta entrega. Puedes volver al contenido público para continuar la muestra.</p><div className={styles.actions}><ButtonLink to={continuation}>{continuation.startsWith('/proyectos/') ? 'Volver al proyecto' : 'Continuar recorrido público'}</ButtonLink><Button variant="secondary" onClick={reset}>Probar otra vez</Button></div></AccessSuccess>
      : <>
        {(request.status === 'incorrect' || request.status === 'error') && <div id="login-response" tabIndex={-1} className={styles.response}><Message tone="error" title={request.status === 'incorrect' ? 'No pudimos iniciar sesión' : 'No se pudo procesar el acceso'}>{request.status === 'incorrect' ? 'El correo o la contraseña no coinciden en el escenario simulado. Prueba nuevamente con datos ficticios.' : 'Ocurrió un error de prueba. Vuelve a intentarlo o elige una respuesta correcta en los controles de la muestra.'}</Message></div>}
        <form className={styles.form} noValidate aria-label="Formulario de inicio de sesión" onSubmit={async event => {
          event.preventDefault()
          if (request.busy) return
          const next = validateLogin({ email, password })
          setErrors(next)
          const first = (['email', 'password'] as const).find(key => next[key])
          if (first) { document.getElementById(`login-${first}`)?.focus(); return }
          setEmail(normalizeEmail(email))
          const result = await request.run(scenario)
          if (result) setPassword('')
        }}>
          <ValidationSummary prefix="login" errors={errors} />
          <fieldset className={styles.fields} disabled={request.busy}>
            <FormField id="login-email" label="Correo electrónico" name="email" type="email" autoComplete="username" required value={email} error={errors.email} placeholder="nombre@example.com" onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined })); request.reset() }} />
            <PasswordField id="login-password" label="Contraseña" name="password" value={password} error={errors.password} disabled={request.busy} onChange={value => { setPassword(value); setErrors(current => ({ ...current, password: undefined })); request.reset() }} />
            <Button type="submit" loading={request.busy} loadingLabel="Verificando…">Iniciar sesión</Button>
          </fieldset>
          <Link className={styles.forgot} to={accessHref('/recuperar-contrasena', params)}>¿Olvidaste tu contraseña?</Link>
        </form>
        <div className={styles.divider}>¿Todavía no tienes cuenta?</div><ButtonLink className={styles.wide} variant="secondary" to={accessHref('/registro', params)}>Crear una cuenta</ButtonLink>
        <AccessDemoControls value={scenario} disabled={request.busy} options={[{ value: 'success', label: 'Acceso correcto' }, { value: 'incorrect', label: 'Credenciales incorrectas' }, { value: 'error', label: 'Error de solicitud' }]} onChange={value => { setScenario(value); request.reset(); setErrors({}) }} onFill={() => { setEmail(demoValues.email); setPassword(demoValues.password); setScenario('success'); setErrors({}); request.reset() }} />
      </>}
  </AccessShell>
}
