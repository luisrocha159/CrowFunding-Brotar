import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {reviewOptions,verifyReviewCopy,setEnvValues} from '../../scripts/review-config.mjs'

test('instalación de revisión: exige nombre dedicado y puertos distintos y válidos',()=>{
  assert.equal(reviewOptions([]).project,'brotar-revision')
  assert.equal(reviewOptions(['--web-port=5197']).origin,'http://127.0.0.1:5197')
  for(const args of [['--project=brotar-provisional-v2'],['--db-port=3000'],['--api-port=abc'],['--web-port=80'],['--otro=1'],['--project=x & echo peligro']])assert.throws(()=>reviewOptions(args))
})
test('instalación de revisión: no sobrescribe una copia ordinaria ni cambia el destino de una revisión',async()=>{
  const root=await mkdtemp(join(tmpdir(),'brotar-review-copy-'))
  try{
    await mkdir(join(root,'backend'),{recursive:true});await writeFile(join(root,'backend/.env'),'CONSERVAR_BACKEND=true\n')
    assert.throws(()=>verifyReviewCopy(root,reviewOptions([])),/otra carpeta/);assert.equal(await readFile(join(root,'backend/.env'),'utf8'),'CONSERVAR_BACKEND=true\n');await rm(join(root,'backend/.env'))
    await writeFile(join(root,'.env'),'CONSERVAR_FRONTEND=true\n');assert.throws(()=>verifyReviewCopy(root,reviewOptions([])),/otra carpeta/);await rm(join(root,'.env'))
    await mkdir(join(root,'infra/postgres-v2'),{recursive:true});await writeFile(join(root,'infra/postgres-v2/.env'),'NO_MODIFICAR=true\n')
    assert.throws(()=>verifyReviewCopy(root,reviewOptions([])),/otra carpeta/)
    assert.equal(await readFile(join(root,'infra/postgres-v2/.env'),'utf8'),'NO_MODIFICAR=true\n')
    await mkdir(join(root,'backend/private'),{recursive:true});await writeFile(join(root,'backend/private/review-installation.json'),JSON.stringify(reviewOptions([])))
    assert.throws(()=>verifyReviewCopy(root,reviewOptions(['--db-port=15500'])),/mismos puertos/)
  }finally{await rm(root,{recursive:true,force:true})}
})
test('configuración: actualiza claves explícitas sin duplicarlas ni borrar otras variables privadas',()=>{
  const text=setEnvValues('DB_PASSWORD=privada\r\nPORT=3000\r\nPORT=3000\r\nSMTP_FROM=privado@example.invalid\r\n',{PORT:3021,BROTAR_REVIEW_MAILBOX:'true'})
  assert.equal((text.match(/^PORT=/gm)??[]).length,1);assert.match(text,/PORT=3021/);assert.match(text,/DB_PASSWORD=privada/);assert.match(text,/SMTP_FROM=privado@example.invalid/)
})
test('credenciales sintéticas: cubren los nueve roles y todas cumplen la longitud del registro',async()=>{
  const accounts=JSON.parse(await readFile(new URL('../review/accounts.json',import.meta.url),'utf8'))
  assert.equal(accounts.length,18);assert.equal(new Set(accounts.map(a=>a.user)).size,accounts.length)
  const roles=new Set(['REGISTERED_USER',...accounts.flatMap(a=>a.roles)])
  assert.deepEqual([...roles].sort(),['ADMIN','AUDITOR','COMPLIANCE','CREATOR','FINANCE','REGISTERED_USER','REVIEWER','SPONSOR','SUPPORT'].sort())
  for(const account of accounts){assert.match(account.user,/^[a-z]{5,40}$/);assert.ok((account.user+'1234567890').length>=15)}
})
