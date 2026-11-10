import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseEnv} from 'node:util'
import {spawn} from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const config=JSON.parse(readFileSync(resolve(root,'backend/private/review-installation.json'),'utf8'))
const mode=process.argv[2]
if(!['backend','frontend'].includes(mode))throw new Error('Uso: node scripts/start-review.mjs backend | frontend')
const backendEnv=parseEnv(readFileSync(resolve(root,'backend/.env'),'utf8'))
const childEnv={...process.env,...backendEnv,BACKEND_URL:`http://127.0.0.1:${config.apiPort}`}
for(const k of Object.keys(childEnv))if(k.startsWith('SMTP_'))delete childEnv[k]
const child=mode==='backend'?spawn(process.execPath,['--env-file=.env','dist/main.js'],{cwd:resolve(root,'backend'),stdio:'inherit',env:childEnv})
  :spawn('bun',['run','dev','--port',String(config.webPort)],{cwd:root,stdio:'inherit',env:childEnv})
child.on('error',()=>{console.error('No se pudo iniciar el servicio. Comprueba instalación y puertos.');process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'))
