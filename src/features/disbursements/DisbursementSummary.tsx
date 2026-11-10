import {AccountIdentity} from '../../shared/components/AccountIdentity'
import {Link} from 'react-router-dom'
import {totalMoney,totalDecimal} from '../../../backend/src/contributions/domain/payment'
import type {DisbursementContact,DisbursementDetail} from './disbursementClient'
import styles from './disbursement.module.css'

const progress=['Solicitud registrada','Autorización','Procesamiento','Finalización']
const states:Record<string,{label:string;title:string;description:string}>={
 PENDING:{label:'Pendiente de autorización',title:'El importe está reservado; todavía no se ha entregado.',description:'Finanzas debe revisar y autorizar la solicitud. Después podrá iniciar el procesamiento y confirmar su finalización.'},
 APPROVED:{label:'Autorizado',title:'La solicitud fue autorizada y espera procesamiento.',description:'Finanzas puede iniciar el procesamiento cuando se cumpla la fecha programada. La autorización aún no confirma la entrega.'},
 PROCESSING:{label:'En procesamiento',title:'Falta confirmar el resultado de la operación.',description:'Finanzas debe completar el desembolso o registrar un fallo. Mientras tanto, el importe no consta como entregado.'},
 COMPLETED:{label:'Completado',title:'El desembolso quedó completado en el sistema.',description:'Consulta la fecha, la referencia y el historial de la operación. La rendición y el cierre de la campaña se gestionan por separado.'},
 FAILED:{label:'Rechazado o fallido',title:'Esta solicitud no terminó con una entrega confirmada.',description:'Consulta el motivo registrado antes de preparar otra solicitud. No se presenta el importe como desembolsado.'}
}
const moneyLabel=(value:string,currency:string)=>{const[whole,fraction='00']=value.split('.');return `${BigInt(whole!).toLocaleString('es-BO')},${fraction.padEnd(2,'0')} ${currency}`}
const dateLabel=(value:string)=>new Date(value).toLocaleString('es-BO',{timeZone:'America/La_Paz'})
function Person({contact,id,empty}:{contact:DisbursementContact|null|undefined;id:string|null;empty:string}){
 return <span className={styles.person}><strong>{id?(contact?.name||contact?.email||'Cuenta registrada'):empty}</strong>{id&&contact?.name&&contact.email&&<span>{contact.email}</span>}</span>
}
export function DisbursementSummary({detail:d,administrative}:{detail:DisbursementDetail;administrative:boolean}){
 const state=states[d.status]!,step=['PENDING','APPROVED','PROCESSING','COMPLETED'].indexOf(d.status)
 const explanation=d.status==='APPROVED'&&!d.scheduledFor?'Finanzas puede iniciar el procesamiento. La autorización todavía no confirma la entrega.':state.description
 const costs=totalDecimal(totalMoney(d.platformFee)+totalMoney(d.providerFee)+totalMoney(d.otherCosts))
 const holder=d.destinationHolder.replace(/^(?:DEMO|PRUEBA)\s+/u,'')
 return <article className={styles.summary} aria-labelledby="disbursement-title">
  <header className={styles.heading}><div><p className={styles.eyebrow}>Solicitud {d.number}</p><h2 id="disbursement-title">{d.campaignTitle}</h2></div><span className={`${styles.badge} ${d.status==='FAILED'?styles.failed:''}`}>{state.label}</span></header>
  <ol className={styles.progress} aria-label="Etapas del desembolso">{progress.map((label,i)=><li key={label} className={step>i||step===3?styles.done:step===i?styles.current:''} aria-current={step===i?'step':undefined}><span aria-hidden="true">{i+1}</span><strong>{label}</strong></li>)}</ol>
  <div className={`${styles.explanation} ${d.status==='FAILED'?styles.failureExplanation:''}`}><strong>{state.title}</strong><p>{explanation}</p>{d.failureMessage&&<p><strong>Motivo registrado:</strong> {d.failureMessage}</p>}</div>
  <dl className={styles.amounts}><div><dt>Importe solicitado</dt><dd>{moneyLabel(d.amount,d.currencyCode)}<small>Bruto de esta solicitud.</small></dd></div><div><dt>Costos de la operación</dt><dd>{moneyLabel(costs,d.currencyCode)}<small>Plataforma, proveedor y otros costos.</small></dd></div><div className={styles.netAmount}><dt>{d.status==='COMPLETED'?'Importe entregado':d.status==='FAILED'?'Importe previsto':'Importe a entregar'}</dt><dd>{moneyLabel(d.netAmount,d.currencyCode)}<small>{d.status==='FAILED'?'Cifra original de la solicitud; no entregada.':'Neto después de descontar los costos.'}</small></dd></div></dl>
  <details className={styles.costs}><summary>Ver desglose de costos</summary><dl><div><dt>Plataforma</dt><dd>{moneyLabel(d.platformFee,d.currencyCode)}</dd></div><div><dt>Proveedor</dt><dd>{moneyLabel(d.providerFee,d.currencyCode)}</dd></div><div><dt>Otros</dt><dd>{moneyLabel(d.otherCosts,d.currencyCode)}</dd></div></dl></details>
  <div className={styles.informationGrid}><section><h3>Destino del desembolso</h3><dl className={styles.facts}><div><dt>Titular</dt><dd>{holder}</dd></div><div><dt>Programación</dt><dd>{d.scheduledFor?new Date(d.scheduledFor+'T12:00:00-04:00').toLocaleDateString('es-BO',{timeZone:'America/La_Paz'}):'Sin fecha programada'}</dd></div></dl><p className={styles.help}>Destino interno registrado en esta solicitud. No es una cuenta bancaria.</p></section>
   <section><h3>Responsables</h3><dl className={styles.facts}><div><dt>Solicitante</dt><dd><Person contact={d.requestedByContact} id={d.requestedBy} empty="Sin solicitante"/></dd></div><div><dt>Autorización</dt><dd><Person contact={d.authorizedByContact} id={d.authorizedBy} empty="Pendiente de Finanzas"/></dd></div><div><dt>Ejecución</dt><dd><Person contact={d.executedByContact} id={d.executedBy} empty="Sin ejecución registrada"/></dd></div></dl></section></div>
  <section className={styles.reason}><h3>Motivo de la solicitud</h3><p>{d.reason}</p></section>
  <details className={styles.technical}><summary>Fechas, referencias y datos técnicos</summary><dl className={styles.facts}><div><dt>Creación</dt><dd>{dateLabel(d.createdAt)}</dd></div>{d.authorizedAt&&<div><dt>Autorización</dt><dd>{dateLabel(d.authorizedAt)}</dd></div>}{d.processedAt&&<div><dt>Inicio de procesamiento</dt><dd>{dateLabel(d.processedAt)}</dd></div>}{d.completedAt&&<div><dt>Finalización</dt><dd>{dateLabel(d.completedAt)}</dd></div>}{d.externalReference&&<div><dt>Referencia de operación</dt><dd>{d.externalReference}</dd></div>}<div><dt>Identificador de solicitud</dt><dd><code>{d.id}</code></dd></div><div><dt>Referencia interna del destino</dt><dd>{d.destinationHolder} · {d.destinationReference}</dd></div><div><dt>Identificador del solicitante</dt><dd><code>{d.requestedBy}</code></dd></div>{d.authorizedBy&&<div><dt>Identificador de quien autorizó</dt><dd><code>{d.authorizedBy}</code></dd></div>}{d.executedBy&&<div><dt>Identificador de quien ejecutó</dt><dd><code>{d.executedBy}</code></dd></div>}</dl></details>
  <Link className={styles.back} to={administrative?`/administracion/desembolsos?campana=${d.campaignId}`:`/mis-proyectos/${d.campaignId}/desembolsos`}>Ver destino y solicitudes de esta campaña <span aria-hidden="true">→</span></Link>
 </article>
}

export function DisbursementHistory({detail:d}:{detail:DisbursementDetail}){
 const actions:Record<string,string>={REQUEST:'Solicitud registrada',AUTHORIZE:'Desembolso autorizado',REJECT:'Solicitud rechazada',PROCESS_DEMO:'Procesamiento iniciado',COMPLETE_DEMO:'Desembolso completado',FAIL_DEMO:'Fallo registrado'}
 return <section className={styles.summary} aria-labelledby="disbursement-history"><header className={styles.historyHeader}><h2 id="disbursement-history">Historial del desembolso</h2><p>Las decisiones y los cambios de estado de esta solicitud.</p></header>{d.events.length?<ol className={styles.timeline}>{d.events.map(e=>{
  const contact=e.actorContact??(e.actorId===d.requestedBy?d.requestedByContact:e.actorId===d.authorizedBy?d.authorizedByContact:e.actorId===d.executedBy?d.executedByContact:null)
  return <li key={e.id}><h3>{actions[e.action]??'Cambio de estado'}</h3><time dateTime={e.at}>{dateLabel(e.at)}</time><p>{e.reason}</p>{e.actorId&&<><AccountIdentity contact={contact} empty="Cuenta no disponible"/><details><summary>Identificador del responsable</summary><code>{e.actorId}</code></details></>}</li>
 })}</ol>:<p className={styles.help}>No hay eventos registrados en esta consulta.</p>}</section>
}
