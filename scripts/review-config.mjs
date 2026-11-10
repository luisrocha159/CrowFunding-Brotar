import {existsSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {parseEnv} from 'node:util'

export const REVIEW_VERSION='brotar-review-2026-11-09-v1'
export function reviewOptions(args){
  const values={project:'brotar-revision',dbPort:15460,apiPort:3000,webPort:5173}
  const known={'project':'project','db-port':'dbPort','api-port':'apiPort','web-port':'webPort'}
  for(const arg of args){
    const match=/^--([a-z-]+)=(.+)$/.exec(arg)
    if(!match||!known[match[1]])throw new Error('Opciones: --project=brotar-revision --db-port=15460 --api-port=3000 --web-port=5173')
    const key=known[match[1]]
    values[key]=key==='project'?match[2]:Number(match[2])
  }
  if(!/^brotar-revision(?:-[a-z0-9][a-z0-9-]*)?$/.test(values.project))throw new Error('El proyecto debe ser una instalación dedicada brotar-revision o brotar-revision-NOMBRE.')
  for(const name of ['dbPort','apiPort','webPort'])if(!Number.isInteger(values[name])||values[name]<1024||values[name]>65535)throw new Error('Puertos de revisión inválidos.')
  if(new Set([values.dbPort,values.apiPort,values.webPort]).size!==3)throw new Error('Los tres servicios requieren puertos diferentes.')
  return {...values,version:REVIEW_VERSION,origin:`http://127.0.0.1:${values.webPort}`}
}
export function verifyReviewCopy(root,options){
  const configFile=resolve(root,'backend/private/review-installation.json')
  const infra=resolve(root,'infra/postgres-v2/.env')
  if(!existsSync(configFile)&&[infra,resolve(root,'backend/.env'),resolve(root,'.env')].some(file=>existsSync(file)))throw new Error('Esta copia ya tiene configuración ordinaria. Clona DEV en otra carpeta para preparar revisión; no se sobrescribió tu configuración.')
  if(existsSync(configFile)){
    const current=JSON.parse(readFileSync(configFile,'utf8'))
    for(const key of ['project','dbPort','apiPort','webPort'])if(current[key]!==options[key])throw new Error('Usa los mismos puertos y proyecto de esta instalación de revisión. No se cambió su configuración.')
    if(existsSync(infra)){
      const admin=parseEnv(readFileSync(infra,'utf8'))
      if(admin.BROTAR_COMPOSE_PROJECT!==options.project||Number(admin.POSTGRES_PORT)!==options.dbPort)throw new Error('La configuración Docker no coincide con la instalación de revisión.')
    }
  }
}
export function setEnvValues(fileText,values){
  const lines=fileText.replace(/\r/g,'').split('\n').filter(line=>!Object.keys(values).some(key=>new RegExp(`^\\s*${key}\\s*=`).test(line)))
  return lines.join('\n').replace(/\n*$/,'\n')+Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n'
}
