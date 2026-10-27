import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { AccessShell } from '../access/AccessComponents'
import { SessionError } from '../access/session/sessionClient'
import { readJson, requestApi } from '../../shared/api/request'
import styles from './verifications.module.css'
import {RepresentationRequests} from './RepresentationRequests'
import {PartyUserEditor} from './PartyUserEditor'
import { parseUserPartyDetail,type UserPartyDetail,parsePartyPage, type PartyPage } from './partyClient'
interface Representation {id:string;name:string;status:string;members:{id:string;name:string;role:string;joinedAt:string;leftAt:string|null;current:boolean}[]}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
function representation(value:unknown):Representation{
  if(!object(value)||!['id','name','status'].every(key=>typeof value[key]==='string')||!Array.isArray(value.members)||!value.members.every(member=>object(member)&&['id','name','role','joinedAt'].every(key=>typeof member[key]==='string')&&(member.leftAt===null||typeof member.leftAt==='string')&&typeof member.current==='boolean'))throw new SessionError(0)
  return value as unknown as Representation
}
export function PartyAdministrationPage(){
  const [notice,setNotice]=useState('');const [userDetail,setUserDetail]=useState<UserPartyDetail|null>(null);const [kind,setKind]=useState('USER');const [query,setQuery]=useState('');const [search,setSearch]=useState({kind:'USER',query:'',page:1,retry:0});const [data,setData]=useState<PartyPage|null>(null);const [error,setError]=useState('');const [status,setStatus]=useState<'loading'|'ready'|'anonymous'|'forbidden'|'error'>('loading');const [detail,setDetail]=useState<Representation|null>(null);const [loadingDetail,setLoadingDetail]=useState(false);const busy=useRef(false)
  useEffect(()=>{const controller=new AbortController();const params=new URLSearchParams({kind:search.kind,query:search.query,page:String(search.page)});void requestApi(`/api/administration/parties?${params}`,{signal:controller.signal}).then(readJson).then(parsePartyPage).then(result=>{if(!controller.signal.aborted){setData(result);setStatus('ready')}}).catch(error=>{if(!controller.signal.aborted)setStatus(error instanceof SessionError&&error.status===401?'anonymous':error instanceof SessionError&&error.status===403?'forbidden':'error')});return()=>controller.abort()},[search])
  const apply=(event:FormEvent)=>{event.preventDefault();setStatus('loading');setData(null);setDetail(null);setUserDetail(null);setSearch({kind,query,page:1,retry:search.retry+1})}
  async function openUser(id:string){if(busy.current)return;busy.current=true;setLoadingDetail(true);setError('');setNotice('');setUserDetail(null);setDetail(null);try{setUserDetail(parseUserPartyDetail(await readJson(await requestApi(`/api/administration/parties/users/${id}`))))}catch{setError('No se pudieron consultar los datos de la cuenta. Reintenta desde el listado.')}finally{busy.current=false;setLoadingDetail(false)}}
  async function open(id:string){if(busy.current)return;busy.current=true;setLoadingDetail(true);setError('');setDetail(null);setUserDetail(null);try{setDetail(representation(await readJson(await requestApi(`/api/administration/parties/organizations/${id}`))))}catch{setError('No se pudo consultar la representación. Reintenta desde el listado.')}finally{busy.current=false;setLoadingDetail(false)}}
  if(status==='anonymous')return <Navigate to="/iniciar-sesion?continuar=%2Fadministracion%2Fpersonas" replace/>
  return <AccessShell title="Personas y organizaciones" subtitle="Consulta administrativa de datos básicos y vínculos institucionales." centered notice={<><strong>Consulta autorizada.</strong> Los datos se consultan con tus permisos vigentes. Los documentos privados de verificación se gestionan por separado.</>}>
    <ButtonLink variant="secondary" to="/mi-cuenta">Mi cuenta</ButtonLink>
    {status==='forbidden'?<Message tone="error" title="Acceso restringido">Se requiere un rol vigente de administración o auditoría.</Message>:<>
      <RepresentationRequests administrative/>
      <p>Esta consulta separa los datos básicos de los documentos privados de verificación. Las ediciones y restricciones DEMO requieren motivo, confirmación y permisos vigentes. Los cambios conservan su historial.</p>
      <form onSubmit={apply} className={styles.form}><FormField as="select" label="Consultar" value={kind} onChange={event=>setKind(event.target.value)}><option value="USER">Personas</option><option value="ORGANIZATION">Organizaciones</option></FormField><FormField label="Buscar por nombre o correo de persona" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)}/><Button type="submit" disabled={status==='loading'}>Buscar</Button></form>
      {status==='loading'&&<p role="status">Consultando datos autorizados…</p>}{status==='error'&&<><Message tone="error" title="Consulta no disponible">No se pudo cargar la información.</Message><Button onClick={()=>{setStatus('loading');setSearch({...search,retry:search.retry+1})}}>Reintentar</Button></>}
      {data&&status==='ready'&&<><ul className={styles.list}>{data.items.map(item=><li key={item.id} className={styles.card}><div><strong>{item.name}</strong><p>{item.contact}</p><p>{item.status} · {item.detail}</p></div>{item.kind==='USER'&&<Button variant="secondary" disabled={loadingDetail} onClick={()=>void openUser(item.id)}>Consultar y gestionar cuenta</Button>}{item.kind==='ORGANIZATION'&&<Button variant="secondary" disabled={loadingDetail} onClick={()=>void open(item.id)}>Ver representación</Button>}</li>)}</ul>{!data.items.length&&<p>No hay resultados con estos criterios.</p>}<div className={styles.actions}><Button disabled={search.page===1} variant="secondary" onClick={()=>{setStatus('loading');setSearch({...search,page:search.page-1})}}>Anterior</Button><span>Página {data.page}</span><Button disabled={!data.hasMore} variant="secondary" onClick={()=>{setStatus('loading');setSearch({...search,page:search.page+1})}}>Siguiente</Button></div></>}
      {notice&&<p role="status">{notice}</p>}{loadingDetail&&<p role="status">Consultando vínculos…</p>}{error&&<Message tone="error" title="Detalle no disponible">{error}</Message>}
      {userDetail&&<PartyUserEditor key={`${userDetail.id}:${userDetail.version}`} detail={userDetail} onSaved={value=>{setNotice('Cambio de cuenta registrado con historial. Las sesiones revocadas requieren un nuevo inicio de sesión.');setUserDetail(value);setData(current=>current?{...current,items:current.items.map(item=>item.id===value.id?{...item,name:`${value.firstName} ${value.lastName}`,status:value.status}:item)}:current)}} onReload={()=>void openUser(userDetail.id)}/>}
      {detail&&<section className={styles.card}><h2>{detail.name}</h2><p>Vínculos registrados (hasta 200, más recientes primero).</p>{detail.members.length?<ul>{detail.members.map(member=><li key={member.id}>{member.name} · {member.role} · {member.current?'Vigente':'No vigente'}<p>Desde {new Date(member.joinedAt).toLocaleDateString()}{member.leftAt?` hasta ${new Date(member.leftAt).toLocaleDateString()}`:''}</p></li>)}</ul>:<p>No hay miembros registrados.</p>}</section>}
    </>}
  </AccessShell>
}
