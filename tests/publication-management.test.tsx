import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { PublicationManager } from '../src/features/campaign-progress/PublicationManager'
import { UpdateCards } from '../src/features/campaign-progress/UpdateCards'
import type { ProgressState, UpdateItem } from '../src/features/campaign-progress/progressClient'
const progress:ProgressState={revision:'p1',campaign:{id:'c1',title:'Campaña',status:'IN_EXECUTION'},editable:true,activities:[],milestones:[],indicators:[]}
const item:UpdateItem={id:'u1',title:'Actualización publicada',body:'Contenido público conservado con evidencia histórica.',milestoneId:null,publishedAt:'2026-01-01T12:00:00Z',revision:'r1',version:1,withdrawnAt:null,images:[],progress}
const noop=()=>{}
test('gestión publicada muestra confirmación separada y motivos privados',()=>{
 const html=renderToStaticMarkup(<PublicationManager id="c1" item={item} progress={progress} onDirty={noop} onSaved={noop} onClose={noop} />)
 assert.match(html,/Motivo privado/);assert.match(html,/Revisar cambio/);assert.match(html,/conserva el avance capturado/);assert.doesNotMatch(html,/Confirmar corrección/)
})
test('retiros y consulta no ofrecen controles para modificar la publicación',()=>{
 for(const [row,state] of [[{...item,withdrawnAt:'2026-01-02T12:00:00Z'},progress],[item,{...progress,editable:false}]] as const){
  const html=renderToStaticMarkup(<PublicationManager id="c1" item={row} progress={state} onDirty={noop} onSaved={noop} onClose={noop} />)
  assert.match(html,/Historial privado de versiones/);assert.doesNotMatch(html,/Contenido corregido|Motivo privado|Revisar cambio/)
 }
})
test('tarjetas públicas no muestran controles ni motivos de gestión',()=>{
 const html=renderToStaticMarkup(<UpdateCards items={[item]} />)
 assert.match(html,/Actualización publicada/);assert.doesNotMatch(html,/Gestionar publicación|Motivo privado|Editar borrador/)
 const privateHtml=renderToStaticMarkup(<UpdateCards items={[{...item,withdrawnAt:'2026-01-02T12:00:00Z'}]} onManage={noop} />)
 assert.match(privateHtml,/Retirada el/);assert.match(privateHtml,/Gestionar publicación e historial/)
})


test('S3-12: distingue sucesoras y originales sustituidas sin ofrecer otra corrección',()=>{
 const old={id:'00000000-0000-4000-8000-000000000001',title:'Original conservada',body:'Contenido original inmutable de ensayo.',milestoneId:null,publishedAt:'2026-10-01T12:00:00Z',images:[],progress:null,supersededById:'00000000-0000-4000-8000-000000000002'}
 const html=renderToStaticMarkup(<UpdateCards items={[old]} onManage={()=>{}}/>);
 assert.match(html,/Sustituida por una corrección/)
 assert.match(renderToStaticMarkup(<UpdateCards items={[{...old,supersededById:null,supersedesId:old.id}]} />),/Referencia de la publicación anterior/)
})


test('moderación: motivos obligatorios y auditor sin controles de escritura',async()=>{
 const {PublicationModerationCard}=await import('../src/features/campaign-progress/PublicationAdministrationPage')
 const item={id:'00000000-0000-4000-8000-000000000001',campaignId:'00000000-0000-4000-8000-000000000002',campaignTitle:'Proyecto Ñandú',title:'<b>Avance</b>',body:'Contenido conservado del avance de ensayo.',revision:'v1',publishedAt:'2026-10-01T12:00:00Z',withdrawnAt:null,supersededById:null}
 const html=renderToStaticMarkup(<PublicationModerationCard item={item} canModerate onChanged={()=>{}} />)
 assert.match(html,/&lt;b&gt;Avance&lt;\/b&gt;/);assert.match(html,/Motivo del retiro/);assert.match(html,/required/)
 assert.doesNotMatch(renderToStaticMarkup(<PublicationModerationCard item={item} canModerate={false} onChanged={()=>{}} />),/Confirmar retiro de la publicación/)
})
