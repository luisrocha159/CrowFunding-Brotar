import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessDemoControls, AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref, publicContinuation } from '../navigation'
import { DEMO_PASSWORD_HELP, demoValues, normalizeEmail, profileLabels, readProfile, validateRegister, type FieldErrors, type RegisterValues } from '../validation'
import { useAccessRequest } from '../useAccessRequest'
import type { AccessOutcome } from '../../../mocks/access/accessService'
import styles from '../access.module.css'

const initialValues: RegisterValues = { firstName: '', lastName: '', email: '', password: '', confirmation: '', terms: false }
export function RegisterPage() {
  const [params, setParams] = useSearchParams()
  const profile = readProfile(params.get('perfil'))
  const [values, setValues] = useState<RegisterValues>({ ...initialValues })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [scenario, setScenario] = useState<AccessOutcome>('success')
  const request = useAccessRequest()
  useEffect(() => {
    if (request.status === 'exists') document.getElementById('register-email')?.focus()
    if (request.status === 'error') document.getElementById('register-response')?.focus()
  }, [request.status])
  function change<K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) {
    setValues(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    request.reset()
  }
  function reset() { setValues({ ...initialValues }); setErrors({}); setScenario('success'); request.reset() }
  return <AccessShell title="Crea tu cuenta" subtitle="Elige cómo quieres participar y completa tus datos de prueba." intro="Convierte una idea en el comienzo de algo mejor">
    {request.status === 'success' ? <AccessSuccess title="Registro simulado completado"><p>La confirmación corresponde al perfil <strong>{profileLabels[profile]}</strong>. No se creó una cuenta real ni se envió un correo de bienvenida.</p><p>{profile === 'usuario' ? 'Puedes continuar explorando las iniciativas de la muestra.' : 'El editor de campañas y los paneles privados son puntos de conexión futuros; no se implementan en esta entrega.'}</p><div className={styles.actions}><ButtonLink to={accessHref('/iniciar-sesion', params)}>Ir a iniciar sesión</ButtonLink><ButtonLink variant="secondary" to={publicContinuation(params.get('continuar'))}>Volver al recorrido público</ButtonLink><Button variant="tertiary" onClick={reset}>Probar otro registro</Button></div></AccessSuccess>
      : <>
        {request.status === 'exists' && <div className={styles.response}><Message tone="error" title="El correo ya está registrado">Este es el escenario de cuenta existente de la muestra. <Link to={accessHref('/iniciar-sesion', params)}>Ir a iniciar sesión</Link>.</Message></div>}
        {request.status === 'error' && <div id="register-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No se pudo completar el registro">No se guardó ninguna información. Prueba de nuevo con una respuesta correcta en los controles de la muestra.</Message></div>}
        <form noValidate className={styles.form} aria-label="Formulario de registro" onSubmit={async event => {
          event.preventDefault()
          if (request.busy) return
          const next = validateRegister(values, profile)
          setErrors(next)
          const first = (['firstName', 'lastName', 'email', 'password', 'confirmation', 'terms', 'profile'] as const).find(key => next[key])
          if (first) { document.getElementById(`register-${first}`)?.focus(); return }
          setValues(current => ({ ...current, email: normalizeEmail(current.email), firstName: current.firstName.trim(), lastName: current.lastName.trim() }))
          const result = await request.run(scenario)
          if (!result) return
          setValues(current => ({ ...current, password: '', confirmation: '' }))
          if (result === 'exists') setErrors({ email: 'Este correo ya está registrado en el escenario simulado.' })
        }}>
          <ValidationSummary prefix="register" errors={errors} />
          <fieldset className={styles.fields} disabled={request.busy}>
            <fieldset className={styles.fields}><legend className={styles.legend}>Tipo de perfil</legend><div className={styles.profiles}>{Object.entries(profileLabels).map(([value, label]) => <label key={value}><input id={value === 'usuario' ? 'register-profile' : undefined} type="radio" name="profile" value={value} checked={profile === value} onChange={() => { const next = new URLSearchParams(params); next.set('perfil', value); setParams(next, { replace: true, preventScrollReset: true }); request.reset() }} />{label}</label>)}</div></fieldset>
            <div className={styles.row}><FormField id="register-firstName" label="Nombre" name="firstName" autoComplete="given-name" required value={values.firstName} error={errors.firstName} onChange={event => change('firstName', event.target.value)} /><FormField id="register-lastName" label="Apellido" name="lastName" autoComplete="family-name" required value={values.lastName} error={errors.lastName} onChange={event => change('lastName', event.target.value)} /></div>
            <FormField id="register-email" label="Correo electrónico" name="email" type="email" autoComplete="email" required value={values.email} error={errors.email} placeholder="nombre@example.com" onChange={event => change('email', event.target.value)} />
            <PasswordField id="register-password" label="Contraseña" name="password" newPassword value={values.password} error={errors.password} help={DEMO_PASSWORD_HELP} disabled={request.busy} onChange={value => change('password', value)} />
            <PasswordField id="register-confirmation" label="Confirmar contraseña" name="confirmation" newPassword value={values.confirmation} error={errors.confirmation} disabled={request.busy} onChange={value => change('confirmation', value)} />
            <div><label className={styles.checkbox}><input id="register-terms" type="checkbox" name="terms" checked={values.terms} required aria-invalid={!!errors.terms} aria-describedby={errors.terms ? 'terms-help terms-error' : 'terms-help'} onChange={event => change('terms', event.target.checked)} /><span>Acepto los términos y condiciones de la muestra.</span></label>{errors.terms && <p id="terms-error" className={styles.fieldError}>{errors.terms}</p>}<details className={styles.terms}><summary>Leer condiciones de la demostración</summary><p id="terms-help">Esta casilla permite probar el paso de aceptación. El texto legal definitivo de Brotar está pendiente de entrega. Aquí solo se representa el formulario: no se crea una cuenta, no se envían datos y no debes ingresar información sensible.</p></details></div>
            <Button type="submit" loading={request.busy} loadingLabel="Procesando registro…">Crear cuenta</Button>
          </fieldset>
        </form>
        <p className={styles.bottomLink}>¿Ya tienes cuenta? <Link to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</Link></p>
        <AccessDemoControls value={scenario} disabled={request.busy} options={[{ value: 'success', label: 'Registro correcto' }, { value: 'exists', label: 'Correo ya registrado' }, { value: 'error', label: 'Error de solicitud' }]} onChange={value => { setScenario(value); setErrors({}); request.reset() }} onFill={() => { setValues({ ...demoValues }); setScenario('success'); setErrors({}); request.reset() }} />
      </>}
  </AccessShell>
}
