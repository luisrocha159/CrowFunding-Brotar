import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseEnv} from 'node:util'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),backend=resolve(root,'backend')
const email=process.argv[2]?.toLowerCase()
if(!/^[-a-z0-9._+]+@brotar\.test$/.test(email??''))throw new Error('Uso desde la raíz: node scripts/review-mailbox.mjs correo@brotar.test')
const env=parseEnv(readFileSync(resolve(backend,'.env'),'utf8'))
if(env.BROTAR_REVIEW_INSTALLATION!=='true'||env.BROTAR_REVIEW_MAILBOX!=='true'||env.NODE_ENV!=='development')throw new Error('Solo está disponible en una instalación local dedicada de revisión.')
const directory=resolve(backend,'private/review-mail')
const messages=existsSync(directory)?readdirSync(directory).filter(n=>/^\d+-[a-f0-9-]+\.txt$/.test(n)).sort().reverse().map(n=>readFileSync(resolve(directory,n),'utf8')).filter(t=>t.includes('Para: '+email+'\n')):[]
if(!messages.length)console.log('No hay mensajes para esta cuenta. Solicita el enlace desde Brotar y vuelve a ejecutar el comando.')
else console.log(messages.slice(0,5).join('\n------------------------------\n'))
