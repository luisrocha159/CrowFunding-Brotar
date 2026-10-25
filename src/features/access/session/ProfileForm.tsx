import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/components/Button'
import { FormField } from '../../../shared/components/FormField'
import { PhoneFields } from '../../../shared/components/PhoneFields'
import { Message } from '../../../shared/components/Feedback'
import { readProfile, saveProfile, validateProfile, type Profile, type ProfileInput } from './profileClient'
import { notifySessionChanged, SessionError } from './sessionClient'
import styles from '../access.module.css'
import {useAccessPermissions} from './accessPermissions'

export function ProfileForm({ onExpired, onSaved }: { onExpired: () => void; onSaved: (profile: Profile) => void }) {
  const {access,error:accessError,refresh}=useAccessPermissions()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [values, setValues] = useState<ProfileInput>({ firstName: '', lastName: '', phoneCountryCode: '', phoneNumber: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'load-error' | 'save-error'>('loading')
  const [retry, setRetry] = useState(0)
  const saving = useRef<AbortController | null>(null)
  const callbacks = useRef({ onExpired, onSaved })
  useEffect(() => { callbacks.current = { onExpired, onSaved } }, [onExpired, onSaved])
  useEffect(() => {
    const controller = new AbortController()
    void readProfile(controller.signal).then(result => {
      if (!controller.signal.aborted) { setProfile(result); setValues(result); setStatus('ready') }
    }).catch(error => {
      if (controller.signal.aborted) return
      if (error instanceof SessionError && error.status === 401) callbacks.current.onExpired()
      else setStatus('load-error')
    })
    return () => { controller.abort(); saving.current?.abort() }
  }, [retry])
  function change(key: keyof ProfileInput, value: string) {
    setValues(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
    setStatus('ready')
  }
  if (status === 'loading') return <p role="status">Cargando perfil…</p>
  if (status === 'load-error' || !profile) return <><Message tone="error" title="No se pudo cargar el perfil">Revisa la conexión e inténtalo nuevamente.</Message><Button onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Reintentar perfil</Button></>
  if(accessError)return <><Message tone="error" title="No se pudieron comprobar tus permisos">Recarga los permisos antes de editar el perfil.</Message><Button onClick={refresh}>Reintentar permisos</Button></>
  if(!access)return <p role="status">Comprobando permisos del perfil…</p>
  if(access.readOnly)return <section><h3>Datos básicos</h3><p>Auditoría: perfil de solo lectura.</p><dl><dt>Nombre</dt><dd>{profile.firstName} {profile.lastName}</dd><dt>Correo</dt><dd>{profile.email}</dd><dt>Teléfono</dt><dd>{profile.phoneCountryCode} {profile.phoneNumber||'Sin teléfono'}</dd></dl></section>
  return <form className={styles.form} aria-label="Editar mi perfil" noValidate onSubmit={async event => {
    event.preventDefault()
    if (saving.current) return
    const next = validateProfile(values)
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) { document.getElementById(`profile-${first}`)?.focus(); return }
    const controller = new AbortController()
    saving.current = controller
    setStatus('saving')
    try {
      const result = await saveProfile(values, controller.signal)
      if (!controller.signal.aborted) { setProfile(result); setValues(result); setStatus('saved'); callbacks.current.onSaved(result); notifySessionChanged() }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof SessionError && error.status === 401) callbacks.current.onExpired()
        else setStatus('save-error')
      }
    } finally { if (saving.current === controller) saving.current = null }
  }}>
    <h3>Editar datos básicos</h3>
    <p>Actualiza tu nombre o teléfono. Tu correo y tus permisos se gestionan por separado.</p>
    {status === 'saved' && <p role="status">Perfil guardado correctamente en Brotar.</p>}
    {status === 'save-error' && <Message tone="error" title="No se confirmó el guardado">Tus cambios siguen en el formulario. Revisa los datos y la conexión antes de reintentar.</Message>}
    <fieldset className={styles.fields} disabled={status === 'saving'}>
      <div className={styles.row}><FormField id="profile-firstName" label="Nombre" autoComplete="given-name" value={values.firstName} required maxLength={120} error={errors.firstName} onChange={event => change('firstName', event.target.value)} /><FormField id="profile-lastName" label="Apellido" autoComplete="family-name" value={values.lastName} required maxLength={120} error={errors.lastName} onChange={event => change('lastName', event.target.value)} /></div>
      <PhoneFields idPrefix="profile" value={values} errors={errors} onChange={phone => {
        setValues(previous => ({ ...previous, ...phone })); setErrors(previous => ({ ...previous, phoneCountryCode: undefined, phoneNumber: undefined })); setStatus('ready')
      }} onBlur={() => setErrors(previous => ({ ...previous, phoneCountryCode: validateProfile(values).phoneCountryCode, phoneNumber: validateProfile(values).phoneNumber }))} />
      <p>Deja los dos campos vacíos para quitar el teléfono. Cambiarlo no lo verifica automáticamente.</p>
      <div className={styles.actions}><Button type="submit" loading={status === 'saving'} loadingLabel="Guardando perfil…">Guardar cambios</Button><Button type="button" variant="secondary" onClick={() => { setValues(profile); setErrors({}); setStatus('ready') }}>Descartar cambios</Button></div>
    </fieldset>
  </form>
}
