import {execFileSync} from 'node:child_process'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {reviewOptions,verifyReviewCopy,setEnvValues} from './review-config.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),backend=resolve(root,'backend')
const options=reviewOptions(process.argv.slice(2))
verifyReviewCopy(root,options)
const environment={...process.env,BROTAR_COMPOSE_PROJECT:options.project,BROTAR_DB_PORT:String(options.dbPort)}
for(const key of Object.keys(environment))if(key.startsWith('SMTP_'))delete environment[key]
function command(command,args=[],cwd=root){
  if(process.platform==='win32'&&['bun','corepack'].includes(command)){
    const text=[command,...args].join(' ')
    execFileSync('cmd.exe',['/d','/s','/c',text],{cwd,env:environment,stdio:'inherit'})
  }else execFileSync(command,args,{cwd,env:environment,stdio:'inherit'})
}
function script(name,args=[]){command(process.execPath,[`scripts/${name}`,...args],backend)}
try{
  if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Usa Node.js 24 compatible con el README.')
  command('docker',['info','--format','Motor Docker {{.ServerVersion}}'])
  console.log('1/6 Instalando dependencias de frontend y backend con sus lockfiles.')
  command('bun',['install','--frozen-lockfile'])
  command('corepack',['pnpm','install','--frozen-lockfile'],backend)
  command('corepack',['pnpm','run','build'],backend)
  const metadata=resolve(backend,'private/review-installation.json')
  mkdirSync(dirname(metadata),{recursive:true})
  if(!existsSync(metadata))writeFileSync(metadata,JSON.stringify(options,null,2)+'\n',{flag:'wx'})
  const fresh=!existsSync(resolve(root,'infra/postgres-v2/.env'))
  console.log('2/6 Preparando la base Docker dedicada; no se usa la base personal.')
  if(fresh)script('adopt-provisional-v2.mjs',['install','../infra/postgres-v2/official-schema.sql'])
  command('docker',['compose','-p',options.project,'--env-file','infra/postgres-v2/.env','-f','infra/postgres-v2/compose.yaml','up','-d','--wait'])
  console.log('3/6 Aplicando migraciones, categorías y permisos.')
  script('migrate.mjs',['up']);script('prepare-sprint2.mjs');script('verify-provisional-v2.mjs')
  if(fresh||!existsSync(resolve(backend,'.env')))script('adopt-provisional-v2.mjs',['activate'])
  console.log('4/6 Configurando ejecución local y buzón privado de revisión.')
  const file=resolve(backend,'.env')
  writeFileSync(file,setEnvValues(readFileSync(file,'utf8'),{NODE_ENV:'development',HOST:'127.0.0.1',PORT:options.apiPort,CORS_ORIGINS:options.origin,PUBLIC_WEB_ORIGIN:options.origin,DEMO_PAYMENTS_ENABLED:'true',CAMPAIGN_ADMIN_PUBLICATION_ENABLED:'true',PASSWORD_RESET_LOCAL_FILE:'false',FILE_STORAGE_DIR:'private/review-files',BROTAR_REVIEW_INSTALLATION:'true',BROTAR_REVIEW_MAILBOX:'true',BROTAR_REVIEW_MAIL_DIR:'private/review-mail'}),{mode:0o600})
  const frontEnv=resolve(root,'.env')
  writeFileSync(frontEnv,setEnvValues(existsSync(frontEnv)?readFileSync(frontEnv,'utf8'):'',{BACKEND_URL:`http://127.0.0.1:${options.apiPort}`}))
  console.log('5/6 Cargando las cuentas y escenarios sintéticos.')
  command(process.execPath,['--env-file=.env','scripts/seed-review.mjs'],backend)
  console.log('6/6 Preparación completada. La repetición conserva los datos y los avances.')
  console.log(`Abre dos terminales en ${root}:\nnode scripts/start-review.mjs backend\nnode scripts/start-review.mjs frontend\nInterfaz: ${options.origin}\nManual: docs/revision-lideres/Manual_Revision_Brotar.md`)
}catch(error){console.error('Preparación detenida: '+(error.status?'un comando no terminó correctamente. Conserva la salida anterior y no continúes con pasos posteriores.':error.message));process.exitCode=1}
