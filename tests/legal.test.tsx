import {test} from 'node:test'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {LEGAL_DOCUMENTS,LEGAL_VERSION,LEGAL_PUBLISHED_AT} from '../backend/src/legal/domain/legal-v1-20261028'
import {legalPublicationFrom,legalStatusFrom,acceptLegal} from '../src/features/legal/legalClient'
import {LegalAcceptancePanel} from '../src/features/legal/LegalAcceptancePanel'
const publication={version:LEGAL_VERSION,mode:'DEMO',publishedAt:LEGAL_PUBLISHED_AT,hash:'a'.repeat(64),documents:LEGAL_DOCUMENTS}
test('condiciones: documentos completos/distintos y respuesta de error nunca se convierten en texto publicado',()=>{
 assert.equal(legalPublicationFrom(publication).documents.length,3)
 for(const change of [{hash:'mal'},{mode:'REAL'},{documents:[]},{documents:[LEGAL_DOCUMENTS[0],LEGAL_DOCUMENTS[0],LEGAL_DOCUMENTS[2]]}])assert.throws(()=>legalPublicationFrom({...publication,...change}))
})
test('condiciones: no se presenta aceptación sin recibo coincidente y fecha/huella válidas',()=>{
 assert.equal(legalStatusFrom({version:LEGAL_VERSION,accepted:false,history:[]}).accepted,false)
 assert.throws(()=>legalStatusFrom({version:LEGAL_VERSION,accepted:true,history:[]}))
 assert.throws(()=>legalStatusFrom({version:LEGAL_VERSION,accepted:false,history:[{version:LEGAL_VERSION,acceptedAt:LEGAL_PUBLISHED_AT,hash:'a'.repeat(64),source:'ACCOUNT'}]}))
})
test('condiciones: no envía aceptación falsa ni versión anterior',async()=>{
 await assert.rejects(acceptLegal(LEGAL_VERSION,false));await assert.rejects(acceptLegal('anterior',true))
})
test('condiciones: enlace y carga honestos, sin checkbox premarcado ni éxito anticipado',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><LegalAcceptancePanel/></MemoryRouter>)
 assert.match(html,/Consultando tu aceptación/);assert.match(html,/\/condiciones/);assert.doesNotMatch(html,/Aceptación registrada/)
})
