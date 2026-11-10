import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {reviewMailboxConfig,writeReviewMessage} from '../src/shared/infrastructure/http/review-mailbox'

const env={NODE_ENV:'development',HOST:'127.0.0.1',DATABASE_ENABLED:'true',DB_HOST:'127.0.0.1',PUBLIC_WEB_ORIGIN:'http://127.0.0.1:5173',BROTAR_REVIEW_INSTALLATION:'true',BROTAR_REVIEW_MAILBOX:'true'}
test('buzón de revisión: solo opt-in local y nunca producción ni exposición remota',()=>{
  assert.ok(reviewMailboxConfig(env))
  for(const patch of [{NODE_ENV:'production'},{HOST:'0.0.0.0'},{DB_HOST:'remote.invalid'},{BROTAR_REVIEW_INSTALLATION:'false'},{BROTAR_REVIEW_MAILBOX:'false'},{PUBLIC_WEB_ORIGIN:'https://remote.invalid'},{PUBLIC_WEB_ORIGIN:'http://127.0.0.1:5173/ruta'}])assert.equal(reviewMailboxConfig({...env,...patch}),null)
})
test('buzón de revisión: entrega privada a dominios sintéticos sin SMTP ni destinatarios reales',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'brotar-review-mail-'))
  try{
    const local={...env,BROTAR_REVIEW_MAIL_DIR:directory}
    await writeReviewMessage(local,'usuario@brotar.test','Verificar correo','Enlace privado de uso único.')
    const files=await readdir(directory);assert.equal(files.length,1)
    const text=await readFile(join(directory,files[0]!),'utf8');assert.match(text,/NO SE ENVIÓ CORREO EXTERNO/);assert.match(text,/Para: usuario@brotar.test/)
    await assert.rejects(()=>writeReviewMessage(local,'persona@gmail.com','Asunto','No enviar'))
    await assert.rejects(()=>writeReviewMessage(local,'usuario@brotar.test','Asunto\r\nBcc: otra','No enviar'))
    assert.equal((await readdir(directory)).length,1)
  }finally{await rm(directory,{recursive:true,force:true})}
})
