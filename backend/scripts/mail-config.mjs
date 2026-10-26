import {readFile,writeFile,realpath} from 'node:fs/promises'
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path'
import {parseEnv} from 'node:util'
import {fileURLToPath} from 'node:url'

// Transfiere exclusivamente correo: nunca credenciales de PostgreSQL, sesiones o archivos privados.
const keys=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_FROM','SMTP_PASSWORD','PUBLIC_WEB_ORIGIN','PASSWORD_RESET_LOCAL_FILE']
const backend=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(backend,'..')
async function main(){
 const [action,path,...rest]=process.argv.slice(2)
 if(action==='--help'){console.log('node scripts/mail-config.mjs --export <archivo PRIVADO fuera del repositorio> | --import <archivo privado recibido>. Nunca imprime claves ni las recibe por argumentos. Exportar/importar es explícito; no se descarga nada desde Git.');return}
 if(!['--export','--import'].includes(action)||!path||rest.length)throw new Error()
 const destination=resolve(path),local=resolve(backend,'.env')
 if(action==='--export'){
  const parent=await realpath(dirname(destination)),inside=relative(repo,parent)
  if(!isAbsolute(inside)&&inside!=='..'&&!inside.startsWith('..'+sep))throw new Error()
 }
 const input=parseEnv(await readFile(action==='--export'?local:destination,'utf8'))
 const {smtpRecoveryConfig}=await import('../dist/auth/infrastructure/smtp-recovery-delivery.js')
 const selected=Object.fromEntries(keys.map(key=>[key,input[key]??'']))
 if(!smtpRecoveryConfig({...selected,NODE_ENV:'development'})||selected.PASSWORD_RESET_LOCAL_FILE!=='false')throw new Error()
 // JSON strings son valores dotenv entre comillas; la clave Gmail no contiene saltos de línea.
 const block=keys.map(key=>`${key}=${JSON.stringify(selected[key])}`).join('\n')+'\n'
 if(action==='--export')await writeFile(destination,'# PRIVADO: contiene una contraseña de aplicación. No subir a Git ni Trello.\n'+block,{flag:'wx',mode:0o600})
 else{
  const current=await readFile(local,'utf8')
  const clean=current.split(/\r?\n/).filter(line=>!keys.some(key=>new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line))).join('\n')
  await writeFile(local,clean.trimEnd()+'\n\n# Correo importado desde archivo privado autorizado\n'+block,{mode:0o600})
 }
 console.log(action==='--export'?'Archivo privado de correo creado fuera del repositorio. Compártelo únicamente por un canal privado; no se incluye en el push.':'Correo importado al .env local sin copiar la configuración de base de datos. Reinicia backend y ejecuta check-mail.mjs.')
}
try{await main()}catch{console.error('No se transfirió la configuración. Compila backend; revisa ruta, permisos y configuración válida. La exportación exige destino nuevo fuera del repositorio; la importación exige un .env local ya preparado. No se muestran datos privados.');process.exitCode=1}
