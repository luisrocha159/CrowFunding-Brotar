import type {SupportEvidence} from './supportClient'
import styles from './support.module.css'

export function SupportAttachments({caseId,files,staff=false}:{caseId:string;files:SupportEvidence[];staff?:boolean}){
  if(!files.length)return null
  return <div className={styles.attachments}><h4>Archivos adjuntos</h4><ul>{files.map(file=><li key={file.fileId}>
    <a href={`/api/${staff?'admin':'me'}/support-cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(file.fileId)}`} target="_blank" rel="noreferrer">Descargar {file.name}</a>
    <span className={styles.meta}> · {file.mimeType==='application/pdf'?'PDF':'Imagen'} · Privado</span>
  </li>)}</ul></div>
}
