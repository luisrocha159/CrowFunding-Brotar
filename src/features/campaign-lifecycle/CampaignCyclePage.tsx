import {useEffect,useState} from 'react'
import {Link,Navigate,useLocation,useParams,useSearchParams} from 'react-router-dom'
import {useAccessPermissions} from '../access/session/accessPermissions'
import {AdministrativeNavigation} from '../campaigns/AdministrativeNavigation'
import {Button} from '../../shared/components/Button'
import {cycleFrom,cyclePageFrom,cycleOptions,cycleLabels,operationalRequest,operationFailure,type CycleDetail,type CyclePage} from './cycleClient'
import {OperationForm} from './OperationForm'
import styles from './cycle.module.css'
import {CampaignCycleSummary,CampaignCloseChecklist,CampaignCycleHistory,CampaignCycleCard} from './CampaignCycleSummary'
import layout from '../campaigns/projects.module.css'
export function CampaignCyclePage({administrative=false}:{administrative?:boolean}){
 const{id}=useParams(),[params]=useSearchParams()
 return <CycleResults key={`${administrative}:${id}:${params}`} administrative={administrative}/>
}
function CycleResults({administrative}:{administrative:boolean}){
 const{id}=useParams(),[params,setParams]=useSearchParams(),location=useLocation(),permissions=useAccessPermissions(),page=Number(params.get('page')??'1'),[revision,setRevision]=useState(0),[data,setData]=useState<CycleDetail|CyclePage|null>(null),[error,setError]=useState(''),[anonymous,setAnonymous]=useState(false)
 const endpoint=`${administrative?'admin':'me'}/campaign-cycle`,base=administrative?'/administracion/ciclo-campanas':'/mis-campanas/ciclo'
 useEffect(()=>{const c=new AbortController();operationalRequest(`${endpoint}${id?`/${encodeURIComponent(id)}`:''}?page=${page}`,'GET',undefined,c.signal).then(v=>{if(!c.signal.aborted)setData(id?cycleFrom(v):cyclePageFrom(v))}).catch(e=>{if(!c.signal.aborted){if(e?.status===401)setAnonymous(true);setError(operationFailure(e))}});return()=>c.abort()},[endpoint,id,page,revision])
 if(anonymous)return <Navigate replace to={`/iniciar-sesion?continuar=${encodeURIComponent(location.pathname)}`}/>
 const detail=data&&'version'in data?data:null,list=data&&'items'in data?data:null
 const refresh=()=>{setData(null);setError('');permissions.refresh();setRevision(n=>n+1)}
 const content=<section className={`${styles.page} ${administrative?layout.content:''}`}><h1>Ciclo de campañas</h1><p className={styles.intro}>Consulta en qué etapa está cada campaña, cómo se distribuyen sus fondos y qué falta para completar su ciclo.</p><nav className={styles.actions}><Link to={base}>Todas las campañas autorizadas</Link><Link to="/mi-cuenta">Mi cuenta</Link><Button variant="secondary" onClick={refresh}>Actualizar estado y permisos</Button></nav>{error&&<p role="alert">{error}</p>}{!data&&!error&&<p role="status">Consultando ciclo…</p>}
 {list&&<><p>{list.total} campañas</p>{!list.items.length&&<p>No hay campañas disponibles en esta consulta.</p>}{list.items.map(c=><CampaignCycleCard key={c.id} campaign={c} administrative={administrative} base={base}/>)}<nav className={styles.actions} aria-label="Páginas de campañas"><Button disabled={page<=1} onClick={()=>{setData(null);setParams({page:String(page-1)})}}>Anterior</Button><span>Página {page}</span><Button disabled={page*20>=list.total} onClick={()=>{setData(null);setParams({page:String(page+1)})}}>Siguiente</Button></nav></>}
 {detail&&<><CampaignCycleSummary detail={detail} administrative={administrative}/>
 {detail.status!=='CLOSED'&&<CampaignCloseChecklist detail={detail}/>}
 {permissions.can(administrative?'campaign.lifecycle.manage':'campaign.manage.own')&&cycleOptions(detail,administrative).length>0&&<div className={styles.operation}><OperationForm key={`${detail.id}:${detail.version}`} title={administrative?'Administrar ciclo':'Solicitar cancelación'} options={Object.fromEntries(cycleOptions(detail,administrative).map(a=>[a,cycleLabels[a]!]))} onSave={async(input,signal)=>{const value=cycleFrom(await operationalRequest(`${endpoint}/${detail.id}/actions`,'POST',{...input,expectedVersion:detail.version},signal));if(!signal.aborted){setData(value);if(page!==1)setParams({page:'1'})}}}/></div>}
 <CampaignCycleHistory detail={detail} administrative={administrative}/><nav className={styles.actions} aria-label="Páginas del historial"><Button disabled={page<=1} onClick={()=>{setData(null);setParams({page:String(page-1)})}}>Anterior</Button><Button disabled={page*20>=detail.eventTotal} onClick={()=>{setData(null);setParams({page:String(page+1)})}}>Siguiente</Button></nav></>}
 </section>
 return administrative?<div className={layout.adminLayout}><AdministrativeNavigation/>{content}</div>:content
}
