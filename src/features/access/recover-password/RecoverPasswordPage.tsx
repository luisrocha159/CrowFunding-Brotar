import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessDemoControls, AccessShell, AccessSuccess, ValidationSummary } from '../AccessComponents'
import { accessHref } from '../navigation'
import { demoValues, normalizeEmail, validateEmail, type FieldErrors } from '../validation'
import { useAccessRequest } from '../useAccessRequest'
import type { AccessOutcome } from '../../../mocks/access/accessService'
import styles from '../access.module.css'

export function RecoverPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [scenario, setScenario] = useState<AccessOutcome>('success')
  const request = useAccessRequest()
  useEffect(() => {
    if (request.status === 'error') document.getElementById('recover-response')?.focus()
  }, [request.status])
  return <AccessShell centered title="Recuperar contraseña" subtitle="En la versión conectada, solicitarías aquí un enlace para recuperar el acceso a tu cuenta.">
    {request.status === 'success' ? <AccessSuccess title="Solicitud simulada recibida"><p>El flujo de recuperación se completó. <strong>No se ha enviado ningún correo</strong> ni se ha cambiado una contraseña.</p><p>En la versión real se mostraría una confirmación sin revelar si una cuenta existe.</p><div className={styles.actions}><ButtonLink to={accessHref('/iniciar-sesion', params)}>Volver a iniciar sesión</ButtonLink><Button variant="secondary" onClick={() => { setEmail(''); setErrors({}); setScenario('success'); request.reset() }}>Probar otra solicitud</Button></div></AccessSuccess>
      : <>
        {request.status === 'error' && <div id="recover-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No pudimos procesar la solicitud">Ocurrió un error simulado. Conservamos el correo en el formulario para que puedas reintentar.</Message></div>}
        <form className={styles.form} noValidate aria-label="Formulario de recuperación" onSubmit={async event => {
          event.preventDefault()
          if (request.busy) return
          const error = validateEmail(email)
          setErrors(error ? { email: error } : {})
          if (error) { document.getElementById('recover-email')?.focus(); return }
          setEmail(normalizeEmail(email))
          const outcome = request.status === 'error' ? 'success' : scenario
          if (request.status === 'error') setScenario('success')
          await request.run(outcome)
        }}>
          <ValidationSummary prefix="recover" errors={errors} />
          <fieldset className={styles.fields} disabled={request.busy}><FormField id="recover-email" name="email" label="Correo electrónico" type="email" autoComplete="email" required value={email} error={errors.email} placeholder="nombre@example.com" onChange={event => { setEmail(event.target.value); setErrors({}); request.reset() }} /><Button type="submit" loading={request.busy} loadingLabel="Procesando solicitud…">{request.status === 'error' ? 'Reintentar solicitud' : 'Solicitar recuperación'}</Button></fieldset>
        </form>
        <Link className={styles.bottomLink} to={accessHref('/iniciar-sesion', params)}>Volver a iniciar sesión</Link>
        <AccessDemoControls value={scenario} disabled={request.busy} options={[{ value: 'success', label: 'Solicitud recibida' }, { value: 'error', label: 'Error de solicitud' }]} onChange={value => { setScenario(value); request.reset() }} onFill={() => { setEmail(demoValues.email); setErrors({}); setScenario('success'); request.reset() }} />
      </>}
  </AccessShell>
}
