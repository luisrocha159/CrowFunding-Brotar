import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseEnv} from 'node:util'
import {createHash} from 'node:crypto'
import pg from 'pg'
import {verifyReviewCopy} from '../../scripts/review-config.mjs'

// Comprobación inicial del paquete. Solo crea sesiones; no avanza los escenarios.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),backend=resolve(root,'backend')
const config=JSON.parse(readFileSync(resolve(backend,'private/review-installation.json'),'utf8'))
verifyReviewCopy(root,config)
const env=parseEnv(readFileSync(resolve(backend,'.env'),'utf8'))
assert.equal(env.BROTAR_REVIEW_INSTALLATION,'true')
const admin=parseEnv(readFileSync(resolve(root,'infra/postgres-v2/.env'),'utf8'))
assert.equal(admin.BROTAR_COMPOSE_PROJECT,config.project)
assert.match(config.project,/^brotar-revision(?:-|$)/)
const manifest=JSON.parse(readFileSync(resolve(backend,'private/review-dataset.json'),'utf8'))
const client=new pg.Client({host:'127.0.0.1',port:config.dbPort,user:'postgres',password:admin.POSTGRES_PASSWORD,database:'brotar_db'})
const base=`http://127.0.0.1:${config.apiPort}/api`,sessions={}
let checks=0
function ok(value,message){assert.ok(value,message);checks++}
async function request(path,cookie='',body){
 const r=await fetch(base+'/'+path,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(20000),headers:{Cookie:cookie,Origin:config.origin,'X-Brotar-Request':'1','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
 return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}
}
try{
 await client.connect()
 ok((await request('health/ready')).status===200,'API y base listas')
 const migrations=await client.query('SELECT count(*)::int AS n FROM brotar_migration.schema_migration_brotar')
 ok(migrations.rows[0].n===43,'43 migraciones')
 ok(manifest.accounts.length===18&&manifest.scenarios.length===20,'18 cuentas y 20 escenarios')
 for(const a of manifest.accounts){
  const login=await request('auth/login','',{email:a.email,password:a.password})
  if(a.user==='restringido'){ok(login.status===403,'Cuenta restringida denegada');continue}
  ok(login.status===200,`Acceso ${a.user}`);sessions[a.user]=login.cookie
  const me=await request('auth/me',login.cookie)
  ok(me.status===200&&me.data.id===a.id,`Sesión ${a.user}`)
  const roles=await request('access/roles',login.cookie)
  const expected=['REGISTERED_USER',...a.roles].sort()
  ok(JSON.stringify(roles.data.roles.map(r=>r.code).sort())===JSON.stringify(expected),`Roles exactos ${a.user}`)
 }
 const categories=await request('catalogs/categories',sessions.creador)
 ok(categories.status===200&&categories.data.length===5,'Cinco categorías utilizables')
 for(const c of manifest.scenarios){
  const {rows:[r]}=await client.query('SELECT status,slug FROM public.campaign WHERE id=$1',[c.id])
  ok(r.status===c.initialState&&r.slug===c.slug,`Estado inicial ${c.code}`)
  const response=await request('campaigns/public/'+c.slug)
  ok(response.status===(['DRAFT','IN_REVIEW','APPROVED','CHANGES_REQUESTED'].includes(r.status)?404:200),`Visibilidad ${c.code}`)
 }
 const files=await client.query('SELECT storage_key,checksum,size_bytes FROM public.file_asset WHERE deleted_at IS NULL')
 for(const f of files.rows){
  const buffer=readFileSync(resolve(backend,env.FILE_STORAGE_DIR,f.storage_key))
  ok(buffer.length===Number(f.size_bytes)&&createHash('sha256').update(buffer).digest('hex')===f.checksum,'Adjunto íntegro')
 }
 for(const [path,user,status]of [['admin/campaigns/review','revisor',200],['admin/finance/payments','finanzas',200],['admin/support-cases','soporte',200],['admin/audit','auditor',200],['admin/campaigns/review','usuario',403]]){
  const response=await request(path,sessions[user]);ok(response.status===status,`${user} ${path}: ${response.status}`)
 }
 const permissions=await request('access/permissions',sessions.auditorcombinado)
 ok(permissions.status===200&&permissions.data.readOnly===true,'AUDITOR combinado sigue solo lectura')
 const blocked=manifest.scenarios.find(c=>c.code==='REV-18')
 const publication=await request('admin/campaigns/'+blocked.id+'/publish',sessions.administrador,{confirmed:true,expectedRound:1})
 ok(publication.status===409&&publication.data.code==='PUBLICATION_REQUIREMENTS','Publicación explica identidad pendiente')
 const monthly=await request('me/accountability/'+manifest.scenarios.find(c=>c.code==='REV-20').id,sessions.creador)
 ok(monthly.status===200&&monthly.data.reports.some(r=>r.status==='SUBMITTED'&&r.fundsSpent==='300.00'),'Rendición mensual lista con evidencia')
 console.log(`Paquete verificado: ${checks} comprobaciones; ${files.rowCount} archivos íntegros; 18 cuentas; 20 escenarios. No se avanzaron los recorridos.`)
}finally{await client.end()}
