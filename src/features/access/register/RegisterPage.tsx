import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { PhoneFields } from '../../../shared/components/PhoneFields'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell, AccessSuccess, PasswordField, ValidationSummary } from '../AccessComponents'
import { accessHref, publicContinuation } from '../navigation'
import { passwordLengthGuidance, profileLabels, REGISTRATION_PASSWORD_HELP, RegistrationError, registerAccount, validateRegistration, type AccessProfile, type RegistrationErrors, type RegistrationFailure, type RegistrationValues } from './registration'
import styles from '../access.module.css'
import { checkEmailAvailability } from './registration'
import { normalizeEmail, validateEmail } from '../validation'

const initialValues: RegistrationValues = { firstName: '', lastName: '', email: '', password: '', confirmation: '', phoneCountryCode: '', phoneNumber: '', profile: 'usuario', terms: false }
const profileHelp: Record<AccessProfile, string> = {
  usuario: 'Cuenta básica para explorar proyectos, gestionar tus datos y acceder a funciones privadas habilitadas.',
  creador: 'Punto de partida para preparar una propuesta; no publica campañas ni concede permisos de creador automáticamente.',
  organizacion: 'Permite registrar una organización en borrador desde tu cuenta; no realiza verificación KYB ni activa a la empresa.'
}
const messages: Record<RegistrationFailure, string> = {
  invalid: 'Revisa los campos. El servidor no aceptó los datos enviados.',
  conflict: 'No se puede crear una cuenta con estos datos. El correo puede estar registrado; no se modificó la cuenta existente.',
  unavailable: 'El servicio no está disponible. Comprueba que la API y PostgreSQL estén iniciados y vuelve a intentarlo.',
  busy: 'Se alcanzó el límite de solicitudes. Espera un minuto antes de volver a intentar.',
  unknown: 'No recibimos una confirmación válida. La cuenta podría haberse guardado; comprueba el estado antes de repetir. No se simulará un resultado correcto.'
}
export function RegisterPage() {
  const [params] = useSearchParams()
  const selectedProfile = params.get('perfil')
  const initialProfile: AccessProfile = selectedProfile && Object.hasOwn(profileLabels, selectedProfile) ? selectedProfile as AccessProfile : 'usuario'
  const [values, setValues] = useState<RegistrationValues>({ ...initialValues, profile: initialProfile })
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | RegistrationFailure>('idle')
  const active = useRef<AbortController | null>(null)
  const emailCheck = useRef<AbortController | null>(null)
  const [checkedEmail, setCheckedEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unavailable'>('idle')
  const busy = status === 'loading'
  const passwordGuidance = passwordLengthGuidance(values.password)
  useEffect(() => () => { active.current?.abort(); active.current = null; emailCheck.current?.abort() }, [])
  useEffect(() => {
    if (status === 'idle' || status === 'loading' || status === 'success') return
    const first = (Object.keys(errors) as (keyof RegistrationValues)[]).find(key => errors[key])
    document.getElementById(first ? `register-${first}` : 'register-response')?.focus()
  }, [status, errors])
  function change<K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) {
    if (key === 'email') { emailCheck.current?.abort(); setEmailStatus('idle'); setCheckedEmail('') }
    setValues(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    setStatus('idle')
  }
  async function verifyEmail() {
    validateField('email')
    if (validateEmail(values.email)) return false
    const email = normalizeEmail(values.email)
    if (email === checkedEmail && emailStatus === 'available') return true
    if (email === checkedEmail && emailStatus === 'taken') {
      setErrors(current => ({ ...current, email: 'Este correo ya está registrado. Inicia sesión o recupera tu acceso.' }))
      return false
    }
    emailCheck.current?.abort()
    const controller = new AbortController()
    emailCheck.current = controller
    setEmailStatus('checking')
    try {
      const available = await checkEmailAvailability(email, controller.signal)
      if (controller.signal.aborted) return false
      setCheckedEmail(email); setEmailStatus(available ? 'available' : 'taken')
      setErrors(current => ({ ...current, email: available ? undefined : 'Este correo ya está registrado. Inicia sesión o recupera tu acceso.' }))
      return available
    } catch (error) {
      if (!controller.signal.aborted) { setEmailStatus('unavailable'); setErrors(current => ({ ...current, email: error instanceof RegistrationError && error.kind === 'busy' ? 'Demasiadas comprobaciones. Espera un minuto antes de volver a intentar.' : 'No pudimos comprobar el correo. Reintenta la comprobación antes de registrar.' })) }
      return false
    }
  }
  function validateField(key: keyof RegistrationValues) {
    const next = validateRegistration(values)
    setErrors(current => ({ ...current, [key]: next[key] }))
  }
  function validatePhone() {
    const next = validateRegistration(values)
    setErrors(current => ({ ...current, phoneCountryCode: next.phoneCountryCode, phoneNumber: next.phoneNumber }))
  }
  return <AccessShell title="Crea tu cuenta" subtitle="Registra tus datos en la base de pruebas de Brotar." intro="Convierte una idea en el comienzo de algo mejor"
    notice={<><strong>Registro conectado.</strong> Estos datos sí se envían a la API y se guardan en PostgreSQL. Usa datos ficticios y una contraseña exclusiva de prueba. Puedes iniciar sesión después del registro, aunque tu cuenta siga pendiente de verificación.</>}>
    {status === 'success' ? <AccessSuccess title="Cuenta guardada en Brotar">
      <p>El usuario y su perfil se guardaron correctamente. Estado: <strong>pendiente de verificación</strong>.</p>
      <p>Ya puedes iniciar sesión, completar tu perfil y registrar una organización en borrador. Tu cuenta conserva el rol básico Usuario registrado; esto no verifica tu correo o identidad ni concede permisos de creador, patrocinador o administrador. No se envió ningún correo ni se inició una sesión automáticamente.</p>
      <div className={styles.actions}><ButtonLink to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</ButtonLink><ButtonLink variant="secondary" to={publicContinuation(params.get('continuar'))}>Volver al recorrido público</ButtonLink><Button variant="secondary" onClick={() => { setValues({ ...initialValues, profile: initialProfile }); setErrors({}); setStatus('idle'); setEmailStatus('idle'); setCheckedEmail('') }}>Registrar otra cuenta de prueba</Button></div>
    </AccessSuccess> : <>
      {status !== 'idle' && status !== 'loading' && <div id="register-response" tabIndex={-1} className={styles.response}><Message tone="error" title="No se completó la confirmación del registro">{messages[status]}</Message></div>}
      <form noValidate className={styles.form} aria-label="Formulario de registro" onSubmit={async event => {
        event.preventDefault()
        if (active.current) return
        const next = validateRegistration(values)
        setErrors(next)
        const first = (Object.keys(next) as (keyof RegistrationValues)[])[0]
        if (first) { document.getElementById(`register-${first}`)?.focus(); return }
        if (!await verifyEmail()) { document.getElementById('register-email')?.focus(); return }
        if (active.current) return
        const controller = new AbortController()
        active.current = controller
        setStatus('loading')
        try {
          await registerAccount(values, controller.signal)
          if (!controller.signal.aborted) { setStatus('success'); setValues({ ...initialValues, profile: initialProfile }) }
        } catch (error) {
          if (!controller.signal.aborted) {
            setStatus(error instanceof RegistrationError ? error.kind : 'unknown')
            if (error instanceof RegistrationError) setErrors(current => ({ ...current, ...error.fields }))
            if (error instanceof RegistrationError && error.kind === 'conflict') { setEmailStatus('idle'); setCheckedEmail('') }
            setValues(current => ({ ...current, password: '', confirmation: '' }))
          }
        } finally { if (active.current === controller) active.current = null }
      }}>
        <ValidationSummary prefix="register" errors={errors} />
        <fieldset className={styles.fields} disabled={busy}>
          <p>Los campos marcados con * son obligatorios.</p>
          <FormField id="register-email" label="Correo electrónico" name="email" type="email" autoComplete="email" required maxLength={254} value={values.email} error={errors.email} placeholder="nombre@example.com" onBlur={() => { void verifyEmail() }} onChange={event => change('email', event.target.value)} />
          <p className={styles.emailStatus} role="status">{emailStatus === 'checking' ? 'Comprobando correo en la base de datos…' : emailStatus === 'available' ? 'Correo disponible. Esto no verifica la propiedad del correo.' : emailStatus === 'taken' ? 'Este correo ya tiene una cuenta.' : emailStatus === 'unavailable' ? 'La comprobación no está disponible; vuelve a intentarlo.' : 'Al salir del campo comprobaremos el formato y si el correo está disponible.'}</p>
          {emailStatus === 'unavailable' && <Button variant="secondary" onClick={() => { void verifyEmail() }}>Reintentar comprobación del correo</Button>}
          <p>Esta etapa crea una cuenta básica. Desde tu cuenta podrás completar tu perfil y registrar una organización en borrador, sin obtener permisos adicionales automáticamente.</p>
          <fieldset id="register-profile" className={styles.fields} tabIndex={-1}>
            <legend className={styles.legend}>Orientación inicial (no asigna roles ni se guarda)</legend>
            <div className={styles.profiles}>
              {(Object.entries(profileLabels) as [AccessProfile, string][]).map(([profile, label]) => <label key={profile}>
                <input type="radio" id={`register-profile-${profile}`} name="profile" value={profile} checked={values.profile === profile} aria-describedby="register-profile-help" onChange={() => change('profile', profile)} />
                <span>{label}</span>
              </label>)}
            </div>
            <p id="register-profile-help" className={styles.helperText}>{profileHelp[values.profile]}</p>
            {errors.profile && <p className={styles.fieldError}>{errors.profile}</p>}
          </fieldset>
          <div className={styles.row}><FormField id="register-firstName" label="Nombre" name="firstName" autoComplete="given-name" required value={values.firstName} error={errors.firstName} onBlur={() => validateField('firstName')} onChange={event => change('firstName', event.target.value)} /><FormField id="register-lastName" label="Apellido" name="lastName" autoComplete="family-name" required value={values.lastName} error={errors.lastName} onBlur={() => validateField('lastName')} onChange={event => change('lastName', event.target.value)} /></div>
          <PhoneFields idPrefix="register" value={values} errors={errors} onBlur={validatePhone} onChange={phone => {
            setValues(current => ({ ...current, ...phone })); setErrors(current => ({ ...current, phoneCountryCode: undefined, phoneNumber: undefined })); setStatus('idle')
          }} />
          <PasswordField id="register-password" label="Contraseña" name="password" newPassword value={values.password} error={errors.password} help={REGISTRATION_PASSWORD_HELP} disabled={busy} maxLength={128} onBlur={() => validateField('password')} onChange={value => change('password', value)} />
          <div className={styles.passwordGuidance} role="status"><progress value={Math.min(passwordGuidance.count, 15)} max={15} aria-label="Avance hacia la longitud mínima de la contraseña" /><span>{passwordGuidance.message}</span></div>
          <PasswordField id="register-confirmation" label="Confirmar contraseña" name="confirmation" newPassword value={values.confirmation} error={errors.confirmation} disabled={busy} maxLength={128} onBlur={() => validateField('confirmation')} onChange={value => change('confirmation', value)} />
          <div><label className={styles.checkbox}><input id="register-terms" type="checkbox" name="terms" checked={values.terms} required aria-invalid={!!errors.terms} aria-describedby="terms-help" onChange={event => change('terms', event.target.checked)} /><span>Entiendo que mis datos básicos se guardarán en la base de pruebas. La orientación elegida solo muestra ayuda y no se guarda. *</span></label>{errors.terms && <p className={styles.fieldError}>{errors.terms}</p>}<p id="terms-help">El texto legal definitivo sigue pendiente. Esta confirmación de prueba no se registra como aceptación de términos legales, verificación KYC/KYB ni autorización para publicar campañas o procesar pagos.</p></div>
          <Button type="submit" disabled={emailStatus === 'checking'} loading={busy} loadingLabel="Guardando cuenta…">Crear cuenta</Button>
        </fieldset>
      </form>
      <p className={styles.bottomLink}>¿Ya tienes una cuenta? <Link to={accessHref('/iniciar-sesion', params)}>Iniciar sesión</Link></p>
    </>}
  </AccessShell>
}
