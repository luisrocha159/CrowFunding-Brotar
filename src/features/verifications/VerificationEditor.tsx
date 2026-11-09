import {LEGAL_VERSION} from '../legal/legalClient'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { Message } from '../../shared/components/Feedback'
import { uploadFile } from '../files/fileClient'
import { SessionError } from '../access/session/sessionClient'
import { saveVerification, VerificationInputError, verificationFieldLabel, verificationPolicyVersionLabel, verificationDocumentUrl, verificationStatus, type VerificationDetail } from './verificationsClient'
import { verificationSubmissionErrors } from '../../../backend/src/verifications/domain/verification'
import styles from './verifications.module.css'
const fileBase64 = (file: File) => new Promise<string>((resolve,reject) => { const reader=new FileReader();reader.onerror=reject;reader.onload=() => typeof reader.result==='string' ? resolve(reader.result.split(',')[1]??'') : reject(new Error('Archivo inválido'));reader.readAsDataURL(file) })
export function VerificationEditor({ detail, readOnly, onSaved, onReload }: { detail: VerificationDetail; readOnly: boolean; onSaved: (value: VerificationDetail) => void; onReload: () => void }) {
  const [fields,setFields] = useState(detail.policy ? Object.fromEntries(detail.policy.fields.map(field=>[field.key,detail.fields[field.key]??''])) : detail.fields); const [documents,setDocuments] = useState(detail.documents.filter(doc=>!detail.policy || detail.policy.documents.some(required=>required.documentTypeId===doc.documentTypeId)).map(doc => ({documentTypeId:doc.documentTypeId,fileId:doc.fileId,originalName:doc.originalName})))
  const [accepted,setAccepted] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState(''); const [saving,setSaving] = useState(false); const busy = useRef(false)
  const [fieldErrors,setFieldErrors] = useState<Record<string,string>>({})
  const policy=detail.policy; const editable=!readOnly && ['NOT_STARTED','REQUIRES_INFO'].includes(detail.status) && policy!==null
  async function upload(documentTypeId: string, file: File | undefined) {
    if (!file || busy.current || !editable) return
    if (file.size>5*1024*1024 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)) {setError('Usa PDF, PNG, JPG o WebP de hasta 5 MB.');return}
    busy.current=true;setSaving(true);setError('');setMessage('')
    try {const saved=await uploadFile({purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:file.name,mimeType:file.type,contentBase64:await fileBase64(file)});setDocuments(current=>[...current.filter(doc=>doc.documentTypeId!==documentTypeId),{documentTypeId,fileId:saved.id,originalName:saved.originalName}]);setFieldErrors(current=>({...current,[`document:${documentTypeId}`]:''}));setMessage('Archivo cargado de forma privada. Guarda el caso para vincularlo. No ha sido verificado.')}
    catch {setError('No se pudo cargar el archivo. Reintenta; los demás campos se conservan.')}
    finally {busy.current=false;setSaving(false)}
  }
  async function save(submit: boolean, event?: FormEvent) {
    event?.preventDefault();if (!policy || !editable || busy.current) return
    const input={policyVersion:policy.version,fields,documents:documents.map(({documentTypeId,fileId})=>({documentTypeId,fileId})),accepted}
    const errors=verificationSubmissionErrors(policy,input,submit)
    setFieldErrors(errors);setMessage('')
    if(Object.keys(errors).length){setError('Revisa los campos señalados. Tus cambios y archivos cargados se conservan.');return}
    busy.current=true;setSaving(true);setError('');setMessage('')
    try {const saved=await saveVerification(detail.id,detail.version,input,submit);onSaved(saved);setMessage(submit?'Caso enviado para revisión. La identidad sigue pendiente de decisión.':'Borrador guardado.')}
    catch(error) {
      if(error instanceof VerificationInputError){setFieldErrors(error.fields);setError(error.explanation)}
      else setError(error instanceof SessionError && error.status===409 ? 'El caso o los requisitos cambiaron. Recarga el estado antes de guardar de nuevo.' : error instanceof SessionError && error.status===403 ? 'Tu cuenta no tiene permiso para modificar este caso.' : error instanceof SessionError && error.status===401 ? 'Tu sesión venció. Inicia sesión de nuevo para continuar.' : 'No se confirmó el guardado. Tus cambios siguen aquí; comprueba el estado antes de repetir.')
    }
    finally {busy.current=false;setSaving(false)}
  }
  return <article className={styles.card}><h2>{detail.typeName}{detail.organizationName ? ` · ${detail.organizationName}` : ''}</h2><p><strong>{verificationStatus(detail.status)}</strong> · Referencia {detail.id}</p>
    {detail.resultNotes && <Message tone="info" title="Observaciones">{detail.resultNotes}</Message>}{detail.rejectionReason && <Message tone="error" title="Motivo de rechazo">{detail.rejectionReason}</Message>}
    {!policy && <p>Los requisitos y el aviso de tratamiento de datos están pendientes de aprobación. Puedes consultar el historial; la captura y el envío están deshabilitados.</p>}
    {policy && <details><summary>Privacidad y condiciones del expediente</summary><p className={styles.notice}>{policy.treatmentNotice}</p><p><a href={"/condiciones?version="+encodeURIComponent(LEGAL_VERSION)+"#IDENTITY"} target="_blank" rel="noopener noreferrer">Consultar condiciones y privacidad (otra pestaña)</a>.</p><details><summary>Información técnica de la política</summary><p>Versión de requisitos: {policy.version}</p></details></details>}
    {error && <Message tone="error" title="No se pudo completar la operación">{error} <button type="button" onClick={onReload}>Recargar caso</button></Message>}{message && <p role="status">{message}</p>}
    <form noValidate onSubmit={event=>void save(true,event)} className={styles.form}>
      {policy ? policy.fields.map(field=><FormField key={field.key} label={verificationFieldLabel(field.label)} value={fields[field.key]??''} maxLength={field.maxLength} required={field.required} disabled={!editable||saving} error={fieldErrors[field.key]} help={`Máximo ${field.maxLength} caracteres.`} onBlur={()=>setFieldErrors(current=>({...current,[field.key]:verificationSubmissionErrors(policy,{policyVersion:policy.version,fields,documents,accepted},true)[field.key]??''}))} onChange={event=>{setFields({...fields,[field.key]:event.target.value});setFieldErrors(current=>({...current,[field.key]:''}))}} />) : Object.entries(fields).map(([key,value])=><p key={key}>{key}: {value}</p>)}
      {policy?.documents.map(doc=><div key={doc.documentTypeId}><FormField label={verificationFieldLabel(doc.label)} type="file" required={doc.required} accept="application/pdf,image/png,image/jpeg,image/webp" disabled={!editable||saving} error={fieldErrors[`document:${doc.documentTypeId}`]} help={`${doc.required?'Requerido. ':''}Documento privado, hasta 5 MB.`} onChange={event=>void upload(doc.documentTypeId,event.target.files?.[0])} /><p>{documents.find(item=>item.documentTypeId===doc.documentTypeId)?.originalName ?? 'Sin archivo adjunto.'}</p></div>)}
      {editable && policy?.requiresAcceptance && <div className={styles.consent}><label className={styles.consentLabel}><input type="checkbox" checked={accepted} disabled={saving} required aria-invalid={Boolean(fieldErrors.accepted)} aria-describedby={fieldErrors.accepted?`verification-${detail.id}-acceptance-error`:undefined} onChange={event=>{setAccepted(event.target.checked);setFieldErrors(current=>({...current,accepted:''}))}} /><span>He leído las condiciones de privacidad y autorizo el tratamiento de mis datos y documentos para gestionar esta verificación. *</span></label><a href={"/condiciones?version="+encodeURIComponent(LEGAL_VERSION)+"#IDENTITY"} target="_blank" rel="noopener noreferrer">Leer condiciones de privacidad y verificación (otra pestaña)</a>{fieldErrors.accepted&&<p id={`verification-${detail.id}-acceptance-error`} role="alert">{fieldErrors.accepted}</p>}</div>}
      {editable && <><p className={styles.submissionHelp}>Para enviar el expediente, completa los campos obligatorios, adjunta los documentos requeridos y marca la autorización de tratamiento de datos.</p><div className={styles.actions}><Button type="button" variant="secondary" disabled={saving} onClick={()=>void save(false)}>Guardar borrador</Button><Button type="submit" disabled={saving||Boolean(policy?.requiresAcceptance&&!accepted)} loading={saving} loadingLabel="Procesando…">Enviar a revisión</Button></div></>}
    </form>
    <h3>Documentos guardados</h3>{detail.documents.length ? <ul>{detail.documents.map(doc=><li key={doc.fileId}><a href={verificationDocumentUrl(detail.id,doc.fileId)}>{verificationFieldLabel(doc.label)}: {doc.originalName}</a>{doc.reviewNotes && <p>{doc.reviewNotes}</p>}<span> · {doc.isValid===true?'Documento validado':doc.isValid===false?'Documento observado':'Validación pendiente'}</span></li>)}</ul>:<p>Sin documentos guardados en el caso.</p>}
    <details><summary>Estados y versiones anteriores</summary><ol>{detail.history.map((event,index)=><li key={`${event.at}-${index}`}>{verificationStatus(event.status)} · {new Date(event.at).toLocaleString()}{event.reason && ` · ${event.reason}`}</li>)}</ol>
      {detail.revisions.map(revision=><details key={revision.id}><summary>{revision.operation==='SUBMIT'?'Envío':revision.operation==='BEFORE_CHANGE'?'Antes del cambio':'Guardado'} · {new Date(revision.recordedAt).toLocaleString()}</summary><p>Requisitos: {verificationPolicyVersionLabel(revision.policyVersion)||'Versión anterior no registrada'}.</p>{revision.legalReceipt&&<p>Consentimiento: {revision.legalReceipt.version}. Recibo: <code>{revision.legalReceipt.id}</code>. SHA-256: <span style={{overflowWrap:'anywhere'}}>{revision.legalReceipt.hash}</span>.</p>}{Object.entries(revision.fields).map(([key,value])=><p key={key}>{key}: {value}</p>)}{revision.resultNotes && <p>{revision.resultNotes}</p>}{revision.rejectionReason && <p>{revision.rejectionReason}</p>}<ul>{revision.documents.map(doc=><li key={doc.fileId}><a href={verificationDocumentUrl(detail.id,doc.fileId)}>{doc.originalName}</a></li>)}</ul></details>)}
      {!detail.history.length&&!detail.revisions.length&&<p>No hay eventos anteriores registrados.</p>}
    </details>
  </article>
}
