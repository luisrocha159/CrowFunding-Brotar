import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {smtpRecoveryConfig,smtpRecoveryTransport} from '../src/auth/infrastructure/smtp-recovery-delivery'

const env={SMTP_HOST:'smtp.gmail.com',SMTP_PORT:'587',SMTP_USER:'demo@gmail.com',SMTP_FROM:'demo@gmail.com',SMTP_PASSWORD:'abcd efgh ijkl mnop',PUBLIC_WEB_ORIGIN:'http://127.0.0.1:5173',NODE_ENV:'development'}
test('Gmail: clave agrupada, remitente autorizado y origen del enlace sin alterar otras contraseñas',()=>{
 assert.equal(smtpRecoveryConfig(env)?.password,'abcdefghijklmnop')
 assert.equal(smtpRecoveryConfig({...env,SMTP_PASSWORD:'incompleta'}),null)
 assert.equal(smtpRecoveryConfig({...env,SMTP_PASSWORD:''}),null)
 assert.equal(smtpRecoveryConfig({...env,SMTP_FROM:'otra@gmail.com'}),null)
 assert.equal(smtpRecoveryConfig({...env,PUBLIC_WEB_ORIGIN:'http://127.0.0.1:5173/?token=secret'}),null)
 assert.equal(smtpRecoveryConfig({...env,SMTP_HOST:'smtp.example.invalid',SMTP_PASSWORD:' keep spaces '})?.password,' keep spaces ')
})
test('SMTP: diagnóstico y envío comparten TLS obligatorio, certificados y ausencia de logs',()=>{
 for(const port of ['465','587']){
  const config=smtpRecoveryConfig({...env,SMTP_PORT:port})!,transport=smtpRecoveryTransport(config)
  const options=transport.options as{secure:boolean;requireTLS:boolean;tls:{rejectUnauthorized:boolean};logger:boolean;debug:boolean;disableFileAccess:boolean;disableUrlAccess:boolean}
  assert.equal(options.secure,port==='465');assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true)
  assert.equal(options.logger,false);assert.equal(options.debug,false);assert.equal(options.disableFileAccess,true);assert.equal(options.disableUrlAccess,true)
  transport.close()
 }
})
test('CLI correo: ayuda sin red ni destinatarios arbitrarios o claves en argumentos',()=>{
 const text=execFileSync(process.execPath,['scripts/check-mail.mjs','--help'],{encoding:'utf8'})
 assert.match(text,/sin enviar mensajes/);assert.match(text,/solo a SMTP_USER/)
 assert.throws(()=>execFileSync(process.execPath,['scripts/check-mail.mjs','--to=another@example.invalid'],{stdio:'pipe'}),(error:unknown)=>{
  const result=error as{status:number;stderr:Buffer};assert.equal(result.status,2)
  assert.equal(result.stderr.toString().includes('another@example.invalid'),false);return true
 })
})

test('traslado de correo: ayuda sin revelar secretos y exportación dentro del repositorio rechazada',()=>{
 const help=execFileSync(process.execPath,['scripts/mail-config.mjs','--help'],{encoding:'utf8'})
 assert.match(help,/fuera del repositorio/)
 assert.throws(()=>execFileSync(process.execPath,['scripts/mail-config.mjs','--export','private/forbidden-mail.env'],{stdio:'pipe'}),(error:unknown)=>{assert.equal((error as {status:number}).status,1);return true})
})
