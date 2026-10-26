import {test} from 'node:test'
import assert from 'node:assert/strict'
import {contactError,deliveryLabel} from '../src/features/access/session/contactClient'
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
