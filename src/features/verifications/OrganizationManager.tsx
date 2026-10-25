import { useRef, useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../access/session/sessionClient'
import { validateOrganization, type OrganizationInput, type OrganizationType } from '../organizations/organizationsClient'
import { saveOrganization, type ManagedOrganization } from './verificationsClient'
import styles from './verifications.module.css'
export function OrganizationManager({ organization, types, readOnly, onSaved }: { organization: ManagedOrganization; types: OrganizationType[]; readOnly: boolean; onSaved: (value: ManagedOrganization) => void }) {
  const [input,setInput] = useState<OrganizationInput>({legalName:organization.legalName,tradeName:organization.tradeName,organizationTypeId:organization.organizationTypeId,contactEmail:organization.contactEmail,contactPhone:organization.contactPhone})
  const [errors,setErrors] = useState<Partial<Record<keyof OrganizationInput,string>>>({})
  const [error,setError] = useState(''); const [saved,setSaved] = useState(false); const [saving,setSaving] = useState(false); const busy = useRef(false)
  const disabled = readOnly || !organization.canEdit || saving
  async function submit(event: FormEvent) {
    event.preventDefault(); if (disabled || busy.current) return
    const found = validateOrganization(input,types); setErrors(found); if (Object.keys(found).length) return
    busy.current=true;setSaving(true);setSaved(false);setError('')
    try { onSaved(await saveOrganization(organization.id,organization.version,input));setSaved(true) }
    catch(error) { setError(error instanceof SessionError && error.status===409 ? 'Los datos o el estado cambiaron. Recarga antes de guardar.' : 'No se pudieron guardar los cambios. Tus datos permanecen en el formulario.') }
    finally { busy.current=false;setSaving(false) }
  }
  return <details className={styles.card}><summary>{organization.legalName} · {organization.typeName}</summary>
    <p>Vínculo vigente: {organization.membershipRole}. Estado: {organization.status}. Estos datos no acreditan representación ni verificación institucional.</p>
    {!organization.canEdit && <p>La edición está restringida por tu membresía o por el estado de la organización y su verificación.</p>}
    {error && <Message tone="error" title="Cambios sin confirmar">{error}</Message>}{saved && <p role="status">Datos guardados.</p>}
    <form onSubmit={submit} className={styles.form}>
      {(['legalName','tradeName','contactEmail','contactPhone'] as const).map(key => <FormField key={key} label={{legalName:'Nombre legal',tradeName:'Nombre comercial',contactEmail:'Correo de contacto',contactPhone:'Teléfono de contacto'}[key]} value={input[key]} disabled={disabled} required={key!=='contactPhone'} type={key==='contactEmail'?'email':'text'} maxLength={key==='contactEmail'?254:key==='contactPhone'?40:200} error={errors[key]} onChange={event => {setInput({...input,[key]:event.target.value});setSaved(false)}} />)}
      <FormField as="select" label="Tipo de organización" required disabled={disabled} value={input.organizationTypeId} error={errors.organizationTypeId} onChange={event => setInput({...input,organizationTypeId:event.target.value})}>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</FormField>
      {!readOnly && organization.canEdit && <Button type="submit" loading={saving} loadingLabel="Guardando…">Guardar datos</Button>}
    </form>
  </details>
}
