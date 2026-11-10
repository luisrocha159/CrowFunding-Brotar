import {mkdir,writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'

/** Transporte explícito para instalaciones locales sintéticas; nunca envía por la red. */
export function reviewMailboxConfig(env:NodeJS.ProcessEnv){
  if(env.BROTAR_REVIEW_MAILBOX!=='true'||env.BROTAR_REVIEW_INSTALLATION!=='true'
    ||!['development','test'].includes(env.NODE_ENV??'development')
    ||!['127.0.0.1','localhost','::1'].includes(env.HOST??'127.0.0.1')
    ||env.DATABASE_ENABLED!=='true'||!['127.0.0.1','localhost','::1'].includes(env.DB_HOST??''))return null
  try{
    const url=new URL(env.PUBLIC_WEB_ORIGIN??'')
    if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)
      ||url.origin!==env.PUBLIC_WEB_ORIGIN)return null
    return {origin:url.origin,directory:resolve(env.BROTAR_REVIEW_MAIL_DIR??'private/review-mail')}
  }catch{return null}
}
export async function writeReviewMessage(env:NodeJS.ProcessEnv,to:string,subject:string,text:string){
  const config=reviewMailboxConfig(env)
  if(!config||!/^[-a-z0-9._+]+@brotar\.test$/i.test(to)||/[\r\n]/.test(subject))throw new Error('Buzón de revisión no disponible para este destinatario.')
  await mkdir(config.directory,{recursive:true,mode:0o700})
  const content=`BUZÓN LOCAL DE REVISIÓN - NO SE ENVIÓ CORREO EXTERNO\nPara: ${to}\nAsunto: ${subject}\nFecha: ${new Date().toISOString()}\n\n${text}\n`
  const file=resolve(config.directory,`${Date.now()}-${randomUUID()}.txt`)
  await writeFile(file,content,{encoding:'utf8',flag:'wx',mode:0o600})
}
