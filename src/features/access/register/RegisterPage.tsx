import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref, publicContinuation } from '../navigation'
import { REGISTRATION_PASSWORD_HELP, RegistrationError, registerAccount, validateRegistration, type RegistrationErrors, type RegistrationFailure, type RegistrationValues } from './registration'
import styles from '../access.module.css'

const initialValues: RegistrationValues = { firstName: '', lastName: '', email: '', password: '', confirmation: '', phoneCountryCode: '', phoneNumber: '', terms: false }
const messages: Record<RegistrationFailure, string> = {
  invalid: 'Revisa los campos. El servidor no aceptó los datos enviados.',
  conflict: 'No se puede crear una cuenta con estos datos. El correo puede estar registrado; no se modificó la cuenta existente.',
  unavailable: 'El servicio no está disponible. Comprueba que la API y PostgreSQL estén iniciados y vuelve a intentarlo.',
  busy: 'Se alcanzó el límite de solicitudes. Espera un minuto antes de volver a intentar.',
  unknown: 'No recibimos una confirmación válida. La cuenta podría haberse guardado; comprueba el estado antes de repetir. No se simulará un resultado correcto.'
}
export function RegisterPage() {
  const [params] = useSearchParams()
  const [values, setValues] = useState<RegistrationValues>({ ...initialValues })
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | RegistrationFailure>('idle')
  const active = useRef<AbortController | null>(null)
  const busy = status === 'loading'
  useEffect(() => () => { active.current?.abort(); active.current = null }, [])
  useEffect(() => {
    if (status !== 'idle' && status !== 'loading' && status !== 'success') document.getElementById('register-response')?.focus()
  }, [status])
  function change<K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) {
    setValues(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    setStatus('idle')
  }
  return <AccessShell title="Crea tu cuenta" subtitle="Registra tus datos en la base de pruebas de Brotar." intro="Convierte una idea en el comienzo de algo mejor"
    notice={<><strong>Registro conectado.</strong> Estos datos sí se envían a la API y se guardan en PostgreSQL. Usa datos ficticios y una contraseña exclusiva de prueba. Puedes iniciar sesión después del registro, aunque tu cuenta siga pendiente de verificación.</>}>
    {status === 'success' ? <AccessSuccess title="Cuenta guardada en Brotar">
      <p>El usuario y su perfil se guardaron correctamente. Estado: <strong>pendiente de verificación</strong>.</p>
      <p>Ya puedes iniciar sesión, completar tu perfil y registrar una organización en borrador. Tu cuenta conserva el rol básico Usuario registrado; esto no verifica tu correo o identidad ni concede permisos de creador, patrocinador o administrador. No se envió ningún correo ni se inició una sesión automáticamente.</p>
      <div className={styles.actions}><ButtonLink to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</ButtonLink><ButtonLink variant="secondary" to={publicContinuation(params.get('continuar'))}>Volver al recorrido público</ButtonLink><Button variant="secondary" onClick={() => { setValues({ ...initialValues }); setErrors({}); setStatus('idle') }}>Registrar otra cuenta de prueba</Button></div>
    </AccessSuccess> : <>
      {status !== 'idle' && status !== 'loading' && <div id="register-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No se completó la confirmación del registro">{messages[status]}</Message></div>}
      <form noValidate className={styles.form} aria-label="Formulario de registro" onSubmit={async event => {
        event.preventDefault()
        if (active.current) return
        const next = validateRegistration(values)
        setErrors(next)
        const first = (Object.keys(next) as (keyof RegistrationValues)[])[0]
        if (first) { document.getElementById(`register-${first}`)?.focus(); return }
        const controller = new AbortController()
        active.current = controller
        setStatus('loading')
        try {
          await registerAccount(values, controller.signal)
          if (!controller.signal.aborted) { setStatus('success'); setValues({ ...initialValues }) }
        } catch (error) {
          if (!controller.signal.aborted) {
            setStatus(error instanceof RegistrationError ? error.kind : 'unknown')
            setValues(current => ({ ...current, password: '', confirmation: '' }))
          }
        } finally { if (active.current === controller) active.current = null }
      }}>
        <ValidationSummary prefix="register" errors={errors} />
        <fieldset className={styles.fields} disabled={busy}>
          <p>Esta etapa crea una cuenta básica. Desde tu cuenta podrás completar tu perfil y registrar una organización en borrador, sin obtener permisos adicionales automáticamente.</p>
          <div className={styles.row}><FormField id="register-firstName" label="Nombre" name="firstName" autoComplete="given-name" required value={values.firstName} error={errors.firstName} onChange={event => change('firstName', event.target.value)} /><FormField id="register-lastName" label="Apellido" name="lastName" autoComplete="family-name" required value={values.lastName} error={errors.lastName} onChange={event => change('lastName', event.target.value)} /></div>
          <FormField id="register-email" label="Correo electrónico" name="email" type="email" autoComplete="email" required value={values.email} error={errors.email} placeholder="nombre@example.com" onChange={event => change('email', event.target.value)} />
          <div className={styles.row}><FormField id="register-phoneCountryCode" label="Prefijo telefónico (opcional)" name="phoneCountryCode" autoComplete="tel-country-code" placeholder="+591" value={values.phoneCountryCode} error={errors.phoneCountryCode} onChange={event => change('phoneCountryCode', event.target.value)} /><FormField id="register-phoneNumber" label="Teléfono (opcional)" name="phoneNumber" autoComplete="tel-national" type="tel" value={values.phoneNumber} error={errors.phoneNumber} onChange={event => change('phoneNumber', event.target.value)} /></div>
          <PasswordField id="register-password" label="Contraseña" name="password" newPassword value={values.password} error={errors.password} help={REGISTRATION_PASSWORD_HELP} disabled={busy} onChange={value => change('password', value)} />
          <PasswordField id="register-confirmation" label="Confirmar contraseña" name="confirmation" newPassword value={values.confirmation} error={errors.confirmation} disabled={busy} onChange={value => change('confirmation', value)} />
          <div><label className={styles.checkbox}><input id="register-terms" type="checkbox" name="terms" checked={values.terms} required aria-invalid={!!errors.terms} aria-describedby="terms-help" onChange={event => change('terms', event.target.checked)} /><span>Entiendo que estos datos se guardarán en la base de pruebas.</span></label>{errors.terms && <p className={styles.fieldError}>{errors.terms}</p>}<p id="terms-help">El texto legal definitivo sigue pendiente. Esta confirmación de prueba no se registra como aceptación de términos legales.</p></div>
          <Button type="submit" loading={busy} loadingLabel="Guardando cuenta…">Crear cuenta</Button>
        </fieldset>
      </form>
      <p className={styles.bottomLink}>¿Ya tienes una cuenta? <Link to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</Link></p>
    </>}
  </AccessShell>
}
