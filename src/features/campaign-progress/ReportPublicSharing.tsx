import {useState} from 'react'
import {Link} from 'react-router-dom'
import {OperationForm} from '../campaign-lifecycle/OperationForm'
import {operationalRequest,OperationError} from '../campaign-lifecycle/cycleClient'
import type {PeriodicReport} from './accountabilityClient'
export function ReportPublicSharing({report,campaignId,administrative,allowed,onRefresh}:{report:PeriodicReport;campaignId:string;administrative:boolean;allowed:boolean;onRefresh:()=>void}){
 const[consent,setConsent]=useState(false),published=Boolean(report.publicPublishedAt),withdrawn=Boolean(report.publicWithdrawnAt)
 return <section><h3>Exposición pública del resumen</h3>{withdrawn?<p>Resumen retirado de la vista pública; se conserva el historial privado.</p>:published?<p>Resumen compartido públicamente. <Link to={`/campanas/${campaignId}/rendicion-publica`}>Consultar resumen</Link></p>:<p>Informe aprobado privado. Compartir incluye el texto de resultados y variaciones, totales, comparación presupuestaria e indicadores; revisa que no contengan datos personales. Los comprobantes y datos bancarios no se comparten.</p>}
 {allowed&&!withdrawn&&((!administrative&&!published)||(administrative&&published))&&<OperationForm title={administrative?'Retirar exposición pública':'Compartir resumen aprobado'} intent={`${report.id}:${consent}`} options={administrative?{WITHDRAW:'Retirar resumen de la vista pública'}:{PUBLISH:'Compartir resumen aprobado'}} onSave={async(input,signal)=>{
  if(!administrative&&!consent)throw new OperationError(400,'Confirma que revisaste el texto y autorizas compartir el resumen públicamente.')
  const path=administrative?`admin/accountability/${campaignId}/publications/${report.id}/withdraw`:`me/accountability/${campaignId}/publications`,body=administrative?{requestKey:input.requestKey,reason:input.reason,expectedVersion:1,confirmed:true}:{requestKey:input.requestKey,reason:input.reason,reportId:report.id,publishConsent:consent}
  const result=await operationalRequest(path,administrative?'PUT':'POST',body,signal)
  if(!result||typeof result!=='object'||!('reportId'in result)||result.reportId!==report.id||!('status'in result)||result.status!==(administrative?'WITHDRAWN':'PUBLISHED'))throw new OperationError(0,'No se confirmó el cambio. Actualiza antes de repetir.')
  if(!signal.aborted)onRefresh()
 }}>{!administrative&&<label><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Revisé los textos y autorizo que este resumen sea público.</label>}</OperationForm>}</section>
}
