import 'reflect-metadata'
import pg from 'pg'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseEnv} from 'node:util'
import {createHash,randomUUID} from 'node:crypto'
import {localConfiguration,verifyContainer} from './grant-local-admin.mjs'
import {REVIEW_VERSION,verifyReviewCopy} from '../../scripts/review-config.mjs'
import {buildReviewDataset} from '../review/scenarios.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),backend=resolve(root,'backend')
const appEnv=parseEnv(readFileSync(resolve(backend,'.env'),'utf8'))
const options=JSON.parse(readFileSync(resolve(backend,'private/review-installation.json'),'utf8'))
verifyReviewCopy(root,options)
if(appEnv.BROTAR_REVIEW_INSTALLATION!=='true'||appEnv.BROTAR_REVIEW_MAILBOX!=='true'||appEnv.DEMO_PAYMENTS_ENABLED!=='true')throw new Error('Solo se carga en una instalación dedicada de revisión con simulador y buzón privado.')
const admin=parseEnv(readFileSync(resolve(root,'infra/postgres-v2/.env'),'utf8')),config=localConfiguration(admin,appEnv)
if(!/^brotar-revision(?:-|$)/.test(config.project)||config.project!==options.project)throw new Error('El proyecto Docker no es el dedicado a revisión.')
const container=execFileSync('docker',['compose','-p',config.project,'--env-file',resolve(root,'infra/postgres-v2/.env'),'-f',resolve(root,'infra/postgres-v2/compose.yaml'),'ps','-q','postgres'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
verifyContainer(JSON.parse(execFileSync('docker',['inspect','--format','{{json .}}',container],{encoding:'utf8',stdio:['ignore','pipe','pipe']})),config)
const client=new pg.Client({host:'127.0.0.1',port:config.port,user:'postgres',password:admin.POSTGRES_PASSWORD,database:'brotar_db',connectionTimeoutMillis:5000})
const sql=async(text,args=[])=>{const r=await client.query(text,args);return r.rows}
let instance,manifest
try{
  await client.connect()
  const[lock]=await sql('SELECT pg_try_advisory_lock(912026,1109) AS locked')
  if(!lock.locked)throw new Error('Otra preparación está trabajando en esta base. Espera a que termine.')
  await sql('CREATE SCHEMA IF NOT EXISTS brotar_review')
  await sql(`CREATE TABLE IF NOT EXISTS brotar_review.dataset(name text PRIMARY KEY,version text NOT NULL,status text NOT NULL,manifest jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp())`)
  const[row]=await sql("SELECT * FROM brotar_review.dataset WHERE name='leaders'")
  if(row&&row.version!==REVIEW_VERSION)throw new Error('La base contiene otra versión de datos de revisión. No se sobrescriben sus avances.')
  if(row?.status==='COMPLETE'){
    manifest=row.manifest
    const ids=manifest.accounts.map(a=>a.id)
    const[users]=await sql('SELECT count(*)::int AS count FROM public.app_user WHERE id=ANY($1::uuid[]) AND email LIKE $2',[ids,'%@brotar.test'])
    if(users.count!==ids.length)throw new Error('Faltan cuentas de la preparación existente. No se restablecieron contraseñas ni roles.')
    const[f]=await sql(`SELECT count(*)::int AS count FROM public.file_asset WHERE uploaded_by=ANY($1::uuid[]) AND deleted_at IS NULL`,[ids])
    if(f.count&&!existsSync(resolve(backend,appEnv.FILE_STORAGE_DIR??'private/review-files')))throw new Error('Falta el almacén de archivos de esta copia; conserva también backend/private/review-files.')
    console.log('Datos de revisión ya preparados. Se conservan contraseñas, roles y progreso actual; no se duplicaron registros.')
  }else{
    if(!row){
      const[count]=await sql('SELECT (SELECT count(*) FROM public.app_user)+(SELECT count(*) FROM public.campaign) AS count')
      if(Number(count.count)!==0)throw new Error('La base ya contiene usuarios o campañas sin manifiesto de revisión. No se importan datos encima de una base de uso.')
      manifest={version:REVIEW_VERSION,id:randomUUID(),createdAt:new Date().toISOString(),options,accounts:[],scenarios:[],checkpoints:{},synthetic:true}
      await sql("INSERT INTO brotar_review.dataset(name,version,status,manifest) VALUES('leaders',$1,'BUILDING',$2::jsonb)",[REVIEW_VERSION,JSON.stringify(manifest)])
    }else{manifest=row.manifest;console.log('Retomando los pasos registrados de la preparación sintética incompleta.')}
    Object.assign(process.env,appEnv,{NODE_ENV:'test'})
    for(const key of Object.keys(process.env))if(key.startsWith('SMTP_'))delete process.env[key]
    const require=createRequire(import.meta.url),{NestFactory}=require('@nestjs/core')
    const{AppModule}=require('../dist/app.module.js'),{configureHttp}=require('../dist/shared/infrastructure/http/configure-http.js'),{readEnvironment}=require('../dist/config/environment.js')
    instance=await NestFactory.create(AppModule,{logger:false})
    configureHttp(instance,readEnvironment(process.env))
    let sequence=0
    // La importación en esta instancia privada usa IPs sintéticas; no modifica guardas de la aplicación de uso.
    instance.use((request,_response,next)=>{Object.defineProperty(request,'ip',{value:`review-import-${manifest.id}-${++sequence}`});next()})
    await instance.listen(0,'127.0.0.1')
    const base=await instance.getUrl()
    const checkpoint=async(name,operation)=>{
      if(Object.hasOwn(manifest.checkpoints,name))return manifest.checkpoints[name]
      const value=await operation()
      manifest.checkpoints[name]=value??true
      await sql("UPDATE brotar_review.dataset SET manifest=$1::jsonb,updated_at=clock_timestamp() WHERE name='leaders'",[JSON.stringify(manifest)])
      return value
    }
    const key=name=>{const b=createHash('sha256').update(manifest.id+':'+name).digest().subarray(0,16);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const s=b.toString('hex');return`${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`}
    // Docker Desktop puede ajustar su reloj hacia atrás al reanudar. Se espera, nunca se falsifican sellos.
    const waitForDatabaseClock=async()=>{
      let waited=false
      for(let attempt=0;attempt<120;attempt++){
        const [r]=await sql(`SELECT GREATEST(COALESCE((SELECT max(granted_at) FROM public.user_role),'-infinity'::timestamptz),COALESCE((SELECT max(created_at) FROM public.app_user),'-infinity'::timestamptz),COALESCE((SELECT max(GREATEST(started_at,assigned_at)) FROM public.campaign_review),'-infinity'::timestamptz),COALESCE((SELECT max(completed_at) FROM public.disbursement),'-infinity'::timestamptz))>clock_timestamp() AS future`)
        if(!r.future)return waited
        waited=true;await new Promise(resolve=>setTimeout(resolve,250))
      }
      throw new Error('El reloj de Docker sigue siendo anterior a los registros existentes. Sincroniza Docker Desktop y repite la preparación; se conservaron los avances.')
    }
    const api=async(path,user,body,method=body===undefined?'GET':'POST',clockRetry=false)=>{
      await waitForDatabaseClock()
      // Importación masiva de cuentas reservadas: reinicia solo su ventana de escritura sintética.
      if(user?.id&&manifest.accounts.some(a=>a.id===user.id))await sql('DELETE FROM brotar_extension.rate_bucket WHERE key_hash=ANY($1::text[])',[
        ['mvp-case-write','campaign-write:v1','demo-payments:v1'].map(scope=>createHash('sha256').update(scope+':account:'+user.id).digest('hex'))
      ])
      const response=await fetch(`${base}/api/${path}`,{method,signal:AbortSignal.timeout(20000),headers:{Connection:'close',Cookie:user?.cookie??'','Content-Type':'application/json','X-Brotar-Request':'1',Origin:options.origin},...(body===undefined?{}:{body:JSON.stringify(body)})})
      const text=await response.text();let data;try{data=text?JSON.parse(text):null}catch{data=null}
      if([500,403].includes(response.status)&&!clockRetry&&await waitForDatabaseClock())return api(path,user,body,method,true)
      if(!response.ok)throw new Error(`Preparación ${method} ${path}: HTTP ${response.status}. ${JSON.stringify(data?.message??'Operación no confirmada').slice(0,1200)}`)
      return{data,status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]}
    }
    await buildReviewDataset({root,backend,manifest,checkpoint,key,sql,api})
    await sql("UPDATE brotar_review.dataset SET status='COMPLETE',manifest=$1::jsonb,updated_at=clock_timestamp() WHERE name='leaders'",[JSON.stringify(manifest)])
    console.log(`Preparación completa: ${manifest.accounts.length} cuentas y ${manifest.scenarios.length} escenarios.`)
  }
  mkdirSync(resolve(backend,'private'),{recursive:true})
  writeFileSync(resolve(backend,'private/review-dataset.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600})
  console.log('Manifiesto y rutas locales: backend/private/review-dataset.json. Credenciales públicas de prueba: manual de revisión.')
}catch(error){console.error(error.message);process.exitCode=1}
finally{await instance?.close();await client.end()}
