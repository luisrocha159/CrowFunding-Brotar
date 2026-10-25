import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve,relative,isAbsolute} from 'node:path'

export interface RecoveryFile {key:string;sha256:string;bytes:string}
/** Los metadatos proceden de la copia restaurada. No copia rutas arbitrarias ni reutiliza un destino. */
export function recoverLocalFiles(records:RecoveryFile[],sourceRoot:string,destinationRoot:string){
 const source=resolve(sourceRoot),destination=resolve(destinationRoot),within=relative(source,destination)
 if(!within || (!within.startsWith('..')&&!isAbsolute(within)))throw new Error('La recuperación debe quedar fuera del almacén original.')
 for(const file of records)if(!/^(PROFILE_AVATAR|ORGANIZATION_DOCUMENT|CAMPAIGN_PUBLIC_IMAGE|VERIFICATION_DOCUMENT|SUPPORT_EVIDENCE|CLOSURE_EVIDENCE)\/[a-f0-9-]{36}\.bin$/.test(file.key)
  || !/^[a-f0-9]{64}$/.test(file.sha256)||!/^\d+$/.test(file.bytes)||BigInt(file.bytes)>5242880n)throw new Error('Metadatos de archivo no recuperables; revisar el almacén sin declarar éxito.')
 mkdirSync(destination,{mode:0o700})
 let totalBytes=0n
 const manifest=createHash('sha256')
 for(const file of records){
  const path=join(source,file.key)
  if(BigInt(statSync(path).size)!==BigInt(file.bytes))throw new Error('Falta un archivo íntegro para recuperar los datos.')
  const content=readFileSync(path)
  if(createHash('sha256').update(content).digest('hex')!==file.sha256)throw new Error('El archivo original no coincide con su SHA-256 persistido.')
  const target=join(destination,file.key);mkdirSync(dirname(target),{recursive:true,mode:0o700});writeFileSync(target,content,{flag:'wx',mode:0o600})
  const copy=readFileSync(target)
  if(createHash('sha256').update(copy).digest('hex')!==file.sha256)throw new Error('La copia del archivo no supera la verificación de integridad.')
  totalBytes+=BigInt(copy.length);manifest.update(file.key+' '+file.sha256+'\n')
 }
 return{verifiedCount:records.length,totalBytes:totalBytes.toString(),manifestSha256:manifest.digest('hex')}
}
