import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuditResults } from '../src/features/audit/AuditPage'
import { auditPageFrom, auditQuery, emptyAuditFilters, type AuditPage } from '../src/features/audit/auditClient'
const id='11111111-1111-4111-8111-111111111111'
const page:AuditPage={source:'AUDIT',items:[{id:'9007199254740993',actorId:id,actorRole:'CREATOR',action:'UPDATE',entity:'campaign',entityId:id,
  occurredAt:'2026-10-19T00:00:00.000Z',result:'APPLIED',fromStatus:null,toStatus:null}],nextCursor:null}
test('S3-15 cliente: bigint como cadena, fuente, estados y marcadores estrictos; no convertir fallos en vacío',()=>{
  assert.deepEqual(auditPageFrom(page,'AUDIT'),page)
  for (const value of [null,{}, {...page,source:'STATUS'}, {...page,nextCursor:'0'}, {...page,items:[page.items[0],page.items[0]]},
    {...page,items:[{...page.items[0],id:Number('9007199254740993')}]},{...page,items:[{...page.items[0],result:['APPLIED']}]},
    {...page,items:[{...page.items[0],actorRole:'correo@example.invalid'}]},{...page,items:[{...page.items[0],action:'EXECUTE'}]}]) assert.throws(()=>auditPageFrom(value,'AUDIT'))
  assert.equal(auditQuery({...emptyAuditFilters,entityId:id},'9007199254740993'),`source=AUDIT&entityId=${id}&cursor=9007199254740993`)
})
test('S3-15 interfaz: diferencia ambos historiales, no inventa actor ni resultado para registros antiguos',()=>{
  const legacy:AuditPage={source:'STATUS',items:[{...page.items[0]!,actorId:null,actorRole:null,action:'STATUS_CHANGE',result:'RECORDED',fromStatus:'DRAFT',toStatus:'IN_REVIEW'}],nextCursor:null}
  const html=renderToStaticMarkup(<AuditResults page={legacy} />)
  for (const text of ['status_history','No registrado; no se atribuye a una persona','Cambio registrado','DRAFT','IN_REVIEW']) assert.ok(html.includes(text),text)
  assert.equal(html.includes('Acción aplicada'),false)
  assert.ok(renderToStaticMarkup(<AuditResults page={{...page,items:[{...page.items[0]!,result:'UNSPECIFIED'}]}} />).includes('No especificado en el registro original'))
})
