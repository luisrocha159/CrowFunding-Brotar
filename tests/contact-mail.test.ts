import {test} from 'node:test'
import assert from 'node:assert/strict'
import {contactError,deliveryLabel,contactStatusFrom,contactNoticesFrom,readNotice} from '../src/features/access/session/contactClient'
import {SessionError} from '../src/shared/api/sessionError'
test('avisos: aceptación SMTP no se presenta como recepción; fallos, cuota y permisos son explícitos',()=>{
 assert.match(deliveryLabel.SMTP_ACCEPTED,/Aceptado por el servidor/)
 assert.doesNotMatch(deliveryLabel.SMTP_ACCEPTED,/recibido/)
 assert.match(deliveryLabel.FAILED,/No se pudo/)
 assert.match(contactError(new SessionError(429)),/cinco enlaces por hora/)
 assert.match(contactError(new SessionError(400)),/venció/)
 assert.match(contactError(new SessionError(403)),/lectura/)
 assert.match(contactError(new SessionError(503)),/canal de correo/)
})

const stamp='2026-10-29T12:00:00.000Z'
const status={email:'qa@example.invalid',verifiedAt:stamp,phoneVerifiedAt:null,emailNotifications:true,channelAvailable:true,phoneChannelAvailable:false}
const notification={id:'00000000-0000-4000-8000-000000000001',title:'Cambio en tu campaña',body:'Consulta Brotar.',createdAt:stamp,readAt:null,delivery:'QUEUED',attempts:0}

test('contactos: rechaza datos incompletos, fechas inválidas y canales SMS inventados',()=>{
 assert.deepEqual(contactStatusFrom(status),status)
 for(const value of [null,[],{}, {...status,email:'invalido'}, {...status,verifiedAt:'ayer'}, {...status,phoneVerifiedAt:0}, {...status,phoneChannelAvailable:true}, {...status,channelAvailable:'true'}])assert.throws(()=>contactStatusFrom(value),SessionError)
})

test('avisos: valida titular por UUID, fechas, resultados e intentos sin convertir fallos en bandeja vacía',()=>{
 assert.deepEqual(contactNoticesFrom([notification]),[notification]);assert.deepEqual(contactNoticesFrom([]),[])
 for(const patch of [{id:'otro'},{createdAt:'ayer'},{readAt:10},{delivery:'DELIVERED'},{attempts:-1},{attempts:1.5},{attempts:4},{title:null}])assert.throws(()=>contactNoticesFrom([{...notification,...patch}]),SessionError)
 for(const value of [null,{},[null]])assert.throws(()=>contactNoticesFrom(value),SessionError)
})

test('marcar leído: no afirma éxito si el servidor no confirmó la actualización propia',async()=>{
 const reply=(value:unknown)=>(async()=>Response.json(value)) as typeof fetch
 await readNotice(notification.id,reply({updated:true}))
 for(const value of [null,{}, {updated:false}, {updated:'true'}])await assert.rejects(()=>readNotice(notification.id,reply(value)),SessionError)
})
