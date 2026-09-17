import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AccessShell } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { createOrganization, myOrganizations, organizationTypes, validateOrganization, type Organization, type OrganizationInput, type OrganizationType } from './organizationsClient'
import styles from '../access/access.module.css'

const empty: OrganizationInput = { legalName:'', tradeName:'', organizationTypeId:'', contactEmail:'', contactPhone:'' }
const statusNames: Record<string,string> = { DRAFT:'Borrador', PENDING_VERIFICATION:'Pendiente de verificación', ACTIVE:'Activa', SUSPENDED:'Suspendida', CLOSED:'Cerrada' }
export function OrganizationsPage() {
  const [types,setTypes] = useState<OrganizationType[]>([])
  const [organizations,setOrganizations] = useState<Organization[]>([])
  const [state,setState] = useState<'loading'|'ready'|'error'|'anonymous'|'forbidden'>('loading')
  const [values,setValues] = useState<OrganizationInput>({...empty})
  const [errors,setErrors] = useState<Partial<Record<keyof OrganizationInput,string>>>({})
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState<'saved'|'invalid'|'busy'|'uncertain'|null>(null)
  const [retry,setRetry] = useState(0)
  const active = useRef<AbortController|null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([organizationTypes(controller.signal),myOrganizations(controller.signal)]).then(([catalog,list])=>{
      if (!controller.signal.aborted) { setTypes(catalog); setOrganizations(list); setState('ready') }
    }).catch(error=>{
      if (!controller.signal.aborted) setState(error instanceof SessionError && error.status===401 ? 'anonymous' : error instanceof SessionError && error.status===403 ? 'forbidden' : 'error')
    })
    return ()=>{ controller.abort(); active.current?.abort() }
  },[retry])
  function change(key:keyof OrganizationInput,value:string) { setValues(previous=>({...previous,[key]:value})); setErrors(previous=>({...previous,[key]:undefined})); setMessage(null) }
  if (state==='anonymous') return <Navigate to="/iniciar-sesion?continuar=%2Fmi-cuenta" replace />
  return <AccessShell centered title="Mis organizaciones" subtitle="Registra los datos iniciales de tu organización o empresa." notice={<><strong>Registro conectado.</strong> Se guarda un borrador vinculado a tu cuenta. No incluye verificación KYB, campañas ni permisos globales de creador o administrador.</>}>
    <ButtonLink to="/mi-cuenta" variant="secondary">Volver a mi cuenta</ButtonLink>
    {state==='loading' && <p role="status">Consultando organizaciones…</p>}
    {state==='forbidden' && <Message tone="error" title="Rol no disponible">Necesitas el rol Usuario registrado vigente. Consulta al equipo responsable.</Message>}
    {state==='error' && <><Message tone="error" title="No se pudieron consultar los datos">Comprueba la API y la base de datos. No se mostrará una lista vacía como si fuera una respuesta correcta.</Message><Button onClick={()=>{setState('loading');setRetry(value=>value+1)}}>Reintentar</Button></>}
    {state==='ready' && <>
      <section aria-label="Organizaciones vinculadas"><h2>Organizaciones vinculadas</h2>
        {organizations.length===0 ? <p>Todavía no tienes organizaciones registradas.</p> : <ul>{organizations.map(organization=><li key={organization.id}><h3>{organization.tradeName || organization.legalName}</h3><p>{organization.legalName} · {organization.typeName}</p><p>Estado: {statusNames[organization.status] ?? organization.status}</p><p>Vínculo: {organization.membershipRole==='OWNER' ? 'Titular del registro' : organization.membershipRole}</p><p>{organization.contactEmail}{organization.contactPhone ? ` · ${organization.contactPhone}` : ''}</p></li>)}</ul>}
      </section>
      <form className={styles.form} aria-label="Registrar organización" noValidate onSubmit={async event=>{
        event.preventDefault(); if(active.current) return
        const next=validateOrganization(values,types); setErrors(next)
        const first=Object.keys(next)[0]; if(first) { document.getElementById(`org-${first}`)?.focus(); return }
        const controller=new AbortController(); active.current=controller; setSaving(true); setMessage(null)
        try {
          const created=await createOrganization(values,controller.signal)
          if(!controller.signal.aborted) { setOrganizations(previous=>[created,...previous.filter(item=>item.id!==created.id)]);setValues({...empty});setMessage('saved') }
        } catch(error) {
          if(!controller.signal.aborted) {
            if(error instanceof SessionError && error.status===401) setState('anonymous')
            else if(error instanceof SessionError && error.status===403) setState('forbidden')
            else setMessage(error instanceof SessionError && error.status===400 ? 'invalid' : error instanceof SessionError && error.status===429 ? 'busy' : 'uncertain')
          }
        } finally { if(active.current===controller) active.current=null; if(!controller.signal.aborted) setSaving(false) }
      }}>
        <h2>Registrar organización</h2>
        {message==='saved' && <p role="status">Organización guardada como borrador y vinculada a tu cuenta.</p>}
        {message && message!=='saved' && <Message tone="error" title="No se confirmó el registro">{message==='invalid' ? 'Revisa los campos y que el tipo siga disponible.' : message==='busy' ? 'Demasiadas solicitudes. Espera un minuto.' : 'La solicitud pudo haberse guardado. Revisa el listado antes de reenviarla para evitar duplicados.'}</Message>}
        {message==='uncertain' && <Button type="button" variant="secondary" onClick={()=>{setState('loading');setRetry(value=>value+1)}}>Actualizar listado antes de reintentar</Button>}
        {!types.length && <p role="alert">No hay tipos de organización disponibles. Consulta al equipo responsable.</p>}
        <fieldset className={styles.fields} disabled={saving || !types.length}>
          <FormField id="org-legalName" label="Nombre legal" value={values.legalName} required maxLength={200} error={errors.legalName} onChange={event=>change('legalName',event.target.value)} />
          <FormField id="org-tradeName" label="Nombre comercial" value={values.tradeName} required maxLength={200} help="Si es igual al nombre legal, puedes repetirlo." error={errors.tradeName} onChange={event=>change('tradeName',event.target.value)} />
          <FormField as="select" id="org-organizationTypeId" label="Tipo de organización" value={values.organizationTypeId} required error={errors.organizationTypeId} onChange={event=>change('organizationTypeId',event.target.value)}><option value="">Selecciona un tipo</option>{types.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</FormField>
          <FormField id="org-contactEmail" label="Correo de contacto" type="email" value={values.contactEmail} required maxLength={254} error={errors.contactEmail} onChange={event=>change('contactEmail',event.target.value)} />
          <FormField id="org-contactPhone" label="Teléfono de contacto (opcional)" type="tel" value={values.contactPhone} maxLength={40} error={errors.contactPhone} onChange={event=>change('contactPhone',event.target.value)} />
          <Button type="submit" loading={saving} loadingLabel="Guardando organización…">Guardar organización</Button>
        </fieldset>
      </form>
    </>}
  </AccessShell>
}
