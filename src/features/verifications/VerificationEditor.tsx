import {LEGAL_VERSION} from '../legal/legalClient'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { uploadFile } from '../files/fileClient'
import { SessionError } from '../access/session/sessionClient'
import { saveVerification, verificationDocumentUrl, verificationStatus, type VerificationDetail } from './verificationsClient'
import styles from './verifications.module.css'
const fileBase64 = (file: File) => new Promise<string>((resolve,reject) => { const reader=new FileReader();reader.onerror=reject;reader.onload=() => typeof reader.result==='string' ? resolve(reader.result.split(',')[1]??'') : reject(new Error('Archivo inválido'));reader.readAsDataURL(file) })
export function VerificationEditor({ detail, readOnly, onSaved, onReload }: { detail: VerificationDetail; readOnly: boolean; onSaved: (value: VerificationDetail) => void; onReload: () => void }) {
  const [fields,setFields] = useState(detail.policy ? Object.fromEntries(detail.policy.fields.map(field=>[field.key,detail.fields[field.key]??''])) : detail.fields); const [documents,setDocuments] = useState(detail.documents.filter(doc=>!detail.policy || detail.policy.documents.some(required=>required.documentTypeId===doc.documentTypeId)).map(doc => ({documentTypeId:doc.documentTypeId,fileId:doc.fileId,originalName:doc.originalName})))
  const [accepted,setAccepted] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState(''); const [saving,setSaving] = useState(false); const busy = useRef(false)
  const policy=detail.policy; const editable=!readOnly && ['NOT_STARTED','REQUIRES_INFO'].includes(detail.status) && policy!==null
  async function upload(documentTypeId: string, file: File | undefined) {
    if (!file || busy.current || !editable) return
    if (file.size>5*1024*1024 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)) {setError('Usa PDF, PNG, JPG o WebP de hasta 5 MB.');return}
    busy.current=true;setSaving(true);setError('');setMessage('')
    try {const saved=await uploadFile({purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:file.name,mimeType:file.type,contentBase64:await fileBase64(file)});setDocuments(current=>[...current.filter(doc=>doc.documentTypeId!==documentTypeId),{documentTypeId,fileId:saved.id,originalName:saved.originalName}]);setMessage('Archivo cargado de forma privada. Guarda el caso para vincularlo. No ha sido verificado.')}
    catch {setError('No se pudo cargar el archivo. Reintenta; los demás campos se conservan.')}
    finally {busy.current=false;setSaving(false)}
  }
  async function save(submit: boolean, event?: FormEvent) {
    event?.preventDefault();if (!policy || !editable || busy.current) return
    busy.current=true;setSaving(true);setError('');setMessage('')
    try {const saved=await saveVerification(detail.id,detail.version,{policyVersion:policy.version,fields,documents:documents.map(({documentTypeId,fileId})=>({documentTypeId,fileId})),accepted},submit);onSaved(saved);setMessage(submit?'Caso enviado para revisión. La identidad sigue pendiente de decisión.':'Borrador guardado.')}
    catch(error) {setError(error instanceof SessionError && error.status===409 ? 'El caso o los requisitos cambiaron. Recarga el estado antes de guardar de nuevo.' : 'No se confirmó el guardado. Revisa los requisitos y reintenta; tus cambios siguen aquí.')}
    finally {busy.current=false;setSaving(false)}
  }
  return <article className={styles.card}><h2>{detail.typeName}{detail.organizationName ? ` · ${detail.organizationName}` : ''}</h2><p><strong>{verificationStatus(detail.status)}</strong> · Referencia {detail.id}</p>
    {detail.resultNotes && <Message tone="info" title="Observaciones">{detail.resultNotes}</Message>}{detail.rejectionReason && <Message tone="error" title="Motivo de rechazo">{detail.rejectionReason}</Message>}
    {!policy && <p>Los requisitos y el aviso de tratamiento de datos están pendientes de aprobación. Puedes consultar el historial; la captura y el envío están deshabilitados.</p>}
    {policy && <><p className={styles.notice}>{policy.treatmentNotice}</p><p>Requisitos: versión {policy.version}. <a href={"/condiciones?version="+encodeURIComponent(LEGAL_VERSION)+"#IDENTITY"} target="_blank" rel="noopener noreferrer">Consultar reglas provisionales de identidad y privacidad (otra pestaña)</a>.</p></>}
    {error && <Message tone="error" title="Operación sin confirmar">{error} <button type="button" onClick={onReload}>Recargar caso</button></Message>}{message && <p role="status">{message}</p>}
    <form onSubmit={event=>void save(true,event)} className={styles.form}>
      {policy ? policy.fields.map(field=><FormField key={field.key} label={field.label} value={fields[field.key]??''} maxLength={field.maxLength} required={field.required} disabled={!editable||saving} onChange={event=>setFields({...fields,[field.key]:event.target.value})} />) : Object.entries(fields).map(([key,value])=><p key={key}>{key}: {value}</p>)}
      {policy?.documents.map(doc=><div key={doc.documentTypeId}><FormField label={doc.label} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={!editable||saving} help={`${doc.required?'Requerido. ':''}Documento privado, hasta 5 MB.`} onChange={event=>void upload(doc.documentTypeId,event.target.files?.[0])} /><p>{documents.find(item=>item.documentTypeId===doc.documentTypeId)?.originalName ?? 'Sin archivo adjunto.'}</p></div>)}
      {editable && policy?.requiresAcceptance && <label><input type="checkbox" checked={accepted} disabled={saving} required onChange={event=>setAccepted(event.target.checked)} /> Confirmo el tratamiento de este expediente según la política {policy.version} y las reglas de identidad del acuerdo {LEGAL_VERSION}.</label>}
      {editable && <div className={styles.actions}><Button type="button" variant="secondary" disabled={saving} onClick={()=>void save(false)}>Guardar borrador</Button><Button type="submit" loading={saving} loadingLabel="Procesando…">Enviar a revisión</Button></div>}
    </form>
    <h3>Documentos guardados</h3>{detail.documents.length ? <ul>{detail.documents.map(doc=><li key={doc.fileId}><a href={verificationDocumentUrl(detail.id,doc.fileId)}>{doc.label}: {doc.originalName}</a>{doc.reviewNotes && <p>{doc.reviewNotes}</p>}<span> · {doc.isValid===true?'Documento validado':doc.isValid===false?'Documento observado':'Validación pendiente'}</span></li>)}</ul>:<p>Sin documentos guardados en el caso.</p>}
    <details><summary>Estados y versiones anteriores</summary><ol>{detail.history.map((event,index)=><li key={`${event.at}-${index}`}>{verificationStatus(event.status)} · {new Date(event.at).toLocaleString()}{event.reason && ` · ${event.reason}`}</li>)}</ol>
      {detail.revisions.map(revision=><details key={revision.id}><summary>{revision.operation==='SUBMIT'?'Envío':revision.operation==='BEFORE_CHANGE'?'Antes del cambio':'Guardado'} · {new Date(revision.recordedAt).toLocaleString()}</summary><p>Requisitos: {revision.policyVersion||'Versión anterior no registrada'}.</p>{revision.legalReceipt&&<p>Consentimiento: {revision.legalReceipt.version}. Recibo: <code>{revision.legalReceipt.id}</code>. SHA-256: <span style={{overflowWrap:'anywhere'}}>{revision.legalReceipt.hash}</span>.</p>}{Object.entries(revision.fields).map(([key,value])=><p key={key}>{key}: {value}</p>)}{revision.resultNotes && <p>{revision.resultNotes}</p>}{revision.rejectionReason && <p>{revision.rejectionReason}</p>}<ul>{revision.documents.map(doc=><li key={doc.fileId}><a href={verificationDocumentUrl(detail.id,doc.fileId)}>{doc.originalName}</a></li>)}</ul></details>)}
      {!detail.history.length&&!detail.revisions.length&&<p>No hay eventos anteriores registrados.</p>}
    </details>
  </article>
}
