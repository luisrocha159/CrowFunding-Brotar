import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { FormField } from '../../shared/components/FormField'
import { AccessShell } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { myRoles, organizationTypes, type OrganizationType } from '../organizations/organizationsClient'
import { managedOrganizations, myVerifications, payoutAccounts, startVerification, verificationDetail, verificationStatus, verificationTypes, type ManagedOrganization, type PayoutSummary, type VerificationDetail, type VerificationSummary, type VerificationType } from './verificationsClient'
import { VerificationEditor } from './VerificationEditor'
import { OrganizationManager } from './OrganizationManager'
import styles from './verifications.module.css'
export function VerificationPage() {
  const [status,setStatus]=useState<'loading'|'ready'|'error'|'anonymous'>('loading');const [retry,setRetry]=useState(0)
  const [cases,setCases]=useState<VerificationSummary[]>([]);const [types,setTypes]=useState<VerificationType[]>([]);const [organizations,setOrganizations]=useState<ManagedOrganization[]>([])
  const [orgTypes,setOrgTypes]=useState<OrganizationType[]>([]);const [payouts,setPayouts]=useState<PayoutSummary[]>([]);const [readOnly,setReadOnly]=useState(true)
  const [selectedType,setSelectedType]=useState('');const [selectedOrg,setSelectedOrg]=useState('');const [detail,setDetail]=useState<VerificationDetail|null>(null)
  const [busy,setBusy]=useState(false);const busyRef=useRef(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const sequence=useRef(0)
  useEffect(()=>{const controller=new AbortController();void Promise.all([myVerifications(controller.signal),verificationTypes(controller.signal),managedOrganizations(controller.signal),organizationTypes(controller.signal),payoutAccounts(controller.signal),myRoles(controller.signal)]).then(([cases,types,organizations,orgTypes,payouts,roles])=>{
    if(controller.signal.aborted)return;setCases(cases);setTypes(types);setOrganizations(organizations);setOrgTypes(orgTypes);setPayouts(payouts);setReadOnly(roles.some(role=>role.code==='AUDITOR'));setStatus('ready')
  }).catch(error=>{if(!controller.signal.aborted)setStatus(error instanceof SessionError&&error.status===401?'anonymous':'error')});return()=>controller.abort()},[retry])
  function saved(value: VerificationDetail){setNotice('Información del caso actualizada.');setDetail(value);setCases(current=>[value,...current.filter(item=>item.id!==value.id)])}
  async function open(id: string){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setDetail(null);const current=++sequence.current;try{const result=await verificationDetail(id);if(current===sequence.current)setDetail(result)}catch{setError('No se pudo consultar el caso. Reintenta desde la lista.')}finally{busyRef.current=false;setBusy(false)}}
  async function start(){if(busyRef.current||readOnly||!selectedType)return;busyRef.current=true;setBusy(true);setError('');try{saved(await startVerification(selectedType,selectedOrg||null))}catch(error){setError(error instanceof SessionError&&error.status===409?'Los requisitos aprobados no están disponibles o cambiaron. Recarga la página.':'No se pudo iniciar el caso. Comprueba el tipo y tu representación vigente.')}finally{busyRef.current=false;setBusy(false)}}
  if(status==='anonymous')return <Navigate to="/iniciar-sesion?continuar=%2Fmi-verificacion" replace />
  const chosenType=types.find(type=>type.id===selectedType)
  return <AccessShell title="Identidad y organizaciones" subtitle="Consulta tus verificaciones privadas, observaciones y datos institucionales." centered notice={<><strong>Información privada.</strong> Los documentos solo se solicitan cuando existen requisitos y avisos aprobados. Cargar o enviar información no verifica la identidad.</>}>
    <p><ButtonLink variant="secondary" to="/mi-cuenta">Mi cuenta y datos personales</ButtonLink></p>
    {status==='loading'&&<p role="status">Consultando datos privados…</p>}
    {status==='error'&&<><Message tone="error" title="Información no disponible">No pudimos comprobar tus datos y permisos.</Message><Button onClick={()=>{setStatus('loading');setRetry(value=>value+1)}}>Reintentar</Button></>}
    {status==='ready'&&<div className={styles.page}>
      {notice&&<p role="status">{notice}</p>}{readOnly&&<p>Tu rol auditor permite consultar. Las modificaciones están deshabilitadas.</p>}
      <section className={styles.card}><h2>Mis verificaciones</h2><p>La carga de documentos y el envío no acreditan identidad. La decisión corresponde al equipo autorizado.</p>
        {cases.length?<ul className={styles.list}>{cases.map(item=><li key={item.id}><span>{item.typeName}{item.organizationName?` · ${item.organizationName}`:''}<br/><strong>{verificationStatus(item.status)}</strong></span><Button variant="secondary" disabled={busy} onClick={()=>void open(item.id)}>Consultar caso</Button></li>)}</ul>:<p>No tienes casos registrados.</p>}
        {error&&<Message tone="error" title="Operación sin confirmar">{error}</Message>}{busy&&<p role="status">Consultando o guardando el caso…</p>}
        {!types.some(type=>type.policy)&&<Message tone="info" title="Recepción pendiente de habilitación">Aún no hay requisitos y avisos de tratamiento de datos aprobados para iniciar KYC o KYB. No se solicita documentación personal hasta que estén disponibles.</Message>}
        {!readOnly&&types.some(type=>type.policy)&&<form className={styles.form} onSubmit={event=>{event.preventDefault();void start()}}>
          <FormField as="select" label="Tipo de verificación" required value={selectedType} disabled={busy} onChange={event=>{setSelectedType(event.target.value);setSelectedOrg('')}}><option value="">Selecciona un tipo</option>{types.filter(type=>type.policy).map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</FormField>
          {chosenType?.appliesTo==='ORGANIZATION'&&<FormField as="select" label="Organización representada" required value={selectedOrg} disabled={busy} onChange={event=>setSelectedOrg(event.target.value)}><option value="">Selecciona una organización</option>{organizations.filter(org=>['OWNER','LEGAL_REPRESENTATIVE','ADMIN'].includes(org.membershipRole)).map(org=><option key={org.id} value={org.id}>{org.legalName}</option>)}</FormField>}
          <Button type="submit" disabled={busy||!chosenType?.policy||(chosenType.appliesTo==='ORGANIZATION'&&!selectedOrg)}>Iniciar o continuar caso</Button>
        </form>}
      </section>
      {detail&&<VerificationEditor key={`${detail.id}:${detail.version}`} detail={detail} readOnly={readOnly} onSaved={saved} onReload={()=>void open(detail.id)} />}
      <section><h2>Datos de mis organizaciones</h2><p>La edición básica está disponible según tu membresía vigente y el estado del registro. La administración de miembros y representación requiere las reglas pendientes de definición.</p>{organizations.length?organizations.map(org=><OrganizationManager key={`${org.id}:${org.version}`} organization={org} types={orgTypes} readOnly={readOnly} onSaved={value=>{setOrganizations(current=>current.map(item=>item.id===value.id?value:item));setNotice('Datos de la organización guardados.')}} />):<p>No tienes organizaciones vinculadas.</p>}<ButtonLink variant="secondary" to="/mis-organizaciones">Registrar una organización</ButtonLink></section>
      <section className={styles.card}><h2>Cuentas destino registradas</h2><p>Consulta privada de cuentas existentes. El registro y los cambios de cuenta requieren la política de datos y el flujo de validación de destino.</p>{payouts.length?<ul>{payouts.map(account=><li key={account.id}>{account.accountHolderName} · {account.bankName??'Entidad sin registrar'} · {account.last4?`terminación ${account.last4}`:'sin terminación registrada'} · {account.currency} · {account.status}{account.status!=='VERIFIED'&&<p>Esta cuenta no consta como verificada.</p>}</li>)}</ul>:<p>No hay cuentas destino registradas.</p>}</section>
    </div>}
  </AccessShell>
}
