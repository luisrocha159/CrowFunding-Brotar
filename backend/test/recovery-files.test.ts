import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {recoverLocalFiles} from '../src/files/infrastructure/recovery'

test('S3-18: recuperar binarios exige SHA-256, tamaño, ruta cerrada y destino nuevo',()=>{
 const root=mkdtempSync(join(tmpdir(),'brotar-recovery-unit-')),source=join(root,'source'),target=join(root,'copy')
 const key='VERIFICATION_DOCUMENT/11111111-1111-4111-8111-111111111111.bin',content=Buffer.from('%PDF-1.4\nDEMO Ñandú')
 mkdirSync(join(source,'VERIFICATION_DOCUMENT'),{recursive:true});writeFileSync(join(source,key),content)
 const metadata={key,sha256:createHash('sha256').update(content).digest('hex'),bytes:String(content.length)}
 assert.equal(recoverLocalFiles([metadata],source,target).verifiedCount,1)
 assert.deepEqual(readFileSync(join(target,key)),content)
 assert.throws(()=>recoverLocalFiles([metadata],source,target),/EEXIST/)
 assert.throws(()=>recoverLocalFiles([{...metadata,key:'../secret'}],source,join(root,'bad-path')),/Metadatos/)
 assert.throws(()=>recoverLocalFiles([metadata],source,join(source,'copy')),/fuera del almacén/)
 writeFileSync(join(source,key),Buffer.alloc(content.length))
 assert.throws(()=>recoverLocalFiles([metadata],source,join(root,'bad-content')),/SHA-256/)
 assert.deepEqual(readFileSync(join(target,key)),content,'El fallo no reemplaza una copia anterior válida.')
})
