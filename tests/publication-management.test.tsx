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
