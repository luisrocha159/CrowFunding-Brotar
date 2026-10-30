import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtemp,readFile,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createServer} from 'node:net'

test('PostgreSQL nuevo: healthy espera TCP final aunque el servidor temporal acepte sockets durante init', {timeout:150000},async()=>{
 assert.equal(process.env.ALLOW_DB_TEST_WRITES,'true');assert.notEqual(process.env.NODE_ENV,'production')
 const root=await mkdtemp(join(tmpdir(),'brotar-qa-startup-')),project='brotar-qa-startup-'+randomUUID(),container=project+'-postgres-1'
 const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 const address=server.address();assert.ok(address&&typeof address!=='string');const port=address.port
 await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
 await writeFile(join(root,'compose.yaml'),await readFile(resolve('../infra/postgres-v2/compose.yaml')))
 await writeFile(join(root,'.env'),`BROTAR_COMPOSE_PROJECT=${project}\nPOSTGRES_PORT=${port}\nPOSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\n`,{mode:0o600})
 await writeFile(join(root,'slow-init.sql'),'SELECT pg_sleep(8);\n')
 const bind=join(root,'slow-init.sql').replaceAll('\\','/')+':/docker-entrypoint-initdb.d/slow-init.sql:ro'
 await writeFile(join(root,'override.yaml'),`services:\n  postgres:\n    volumes:\n      - ${JSON.stringify(bind)}\n`)
 const compose=['compose','--env-file',join(root,'.env'),'-f',join(root,'compose.yaml'),'-f',join(root,'override.yaml')]
 try{
  execFileSync('docker',[...compose,'up','-d','--wait','--wait-timeout','100'],{timeout:125000,stdio:'pipe'})
  assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8'}).trim(),project)
  // pg_isready without -h can succeed against the Unix-only initialization server.
  const ready=execFileSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','brotar_db'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
  assert.match(ready,/accepting connections/)
 }finally{
  // Keep its disposable volume/config; release this test's container/network, never another project.
  let actual=''
  try{actual=execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}catch{/* Creation may have failed before a container existed. */}
  if(actual){assert.equal(actual,project);execFileSync('docker',[...compose,'down'],{timeout:30000,stdio:'pipe'})}
 }
})
