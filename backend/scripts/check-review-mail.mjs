import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {parseEnv} from 'node:util'
import {createRequire} from 'node:module'
import {verifyReviewCopy} from '../../scripts/review-config.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),backend=resolve(root,'backend')
const config=JSON.parse(readFileSync(resolve(backend,'private/review-installation.json'),'utf8'))
verifyReviewCopy(root,config)
const env=parseEnv(readFileSync(resolve(backend,'.env'),'utf8'))
assert.equal(env.BROTAR_REVIEW_INSTALLATION,'true');assert.equal(env.BROTAR_REVIEW_MAILBOX,'true')
const require=createRequire(import.meta.url),{LEGAL_VERSION}=require('../dist/legal/domain/legal-v2-20261109.js')
const email=`qa-correo-${randomUUID()}@brotar.test`,password='Correo inicial de revision 123456',replacement='Correo renovado de revision 123456 Ñ'
const base=`http://127.0.0.1:${config.apiPort}/api`
let checks=0
async function call(path,body,cookie='',status=200){
 const response=await fetch(base+'/'+path,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(20000),headers:{Cookie:cookie,Origin:config.origin,'X-Brotar-Request':'1','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
 assert.equal(response.status,status,`${path}: ${response.status}`);checks++
 return response.headers.get('set-cookie')?.split(';')[0]
}
function token(kind){
 const dir=resolve(backend,env.BROTAR_REVIEW_MAIL_DIR)
 const messages=readdirSync(dir).filter(n=>n.endsWith('.txt')).sort().reverse().map(n=>readFileSync(resolve(dir,n),'utf8'))
 const message=messages.find(t=>t.includes('Para: '+email)&&t.includes(kind))
 const value=message?.match(/token=([a-f0-9]{64})/)?.[1]
 assert.ok(value,'Mensaje privado con enlace temporal');checks++;return value
}
await call('auth/register',{email,password,firstName:'Revisión',lastName:'Correo',legalVersion:LEGAL_VERSION,demoConsent:true},'',201)
const cookie=await call('auth/login',{email,password})
await call('contacts/email/request',{},cookie,201)
const verification=token('/verificar-correo#')
await call('contacts/email/confirm',{token:verification},cookie,201)
await call('contacts/email/confirm',{token:verification},cookie,400)
await call('auth/password/recovery',{email},'',202)
const reset=token('/recuperar-contrasena?')
// Da margen al ajuste de reloj de Docker Desktop observado en esta computadora.
await new Promise(resolve=>setTimeout(resolve,8000))
await call('auth/password/reset',{token:reset,password:replacement},'',204)
await call('auth/password/reset',{token:reset,password:replacement},'',401)
await call('auth/me',undefined,cookie,401)
await call('auth/login',{email,password},'',401)
await call('auth/login',{email,password:replacement})
console.log(`Correo local verificado: ${checks} comprobaciones; tokens de un solo uso y sesiones revocadas. Cuenta técnica creada: ${email}. No se envió correo externo ni se cambiaron cuentas precargadas.`)
