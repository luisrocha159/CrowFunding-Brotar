import {test} from 'node:test'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
import {RewardChoices} from '../src/features/contributions/RewardChoices'
const options={campaignId:'c',title:'Campaña',campaignType:'REWARD' as const,currency:'BOB',minimum:null,eligible:true,unavailableReason:null,rewards:[{id:'r',title:'Semillas <privado>',minimum:'50.00',available:2}]}
test('tarjetas accesibles: opción sin recompensa, estados explícitos, radios nativos y texto escapado',()=>{
 const low=renderToStaticMarkup(<RewardChoices options={options} amount="20" value="" disabled={false} onChange={()=>{}}/>)
 assert.match(low,/Aportar sin recompensa/);assert.match(low,/Faltan 30.00 BOB/);assert.match(low,/type="radio"/);assert.match(low,/Semillas &lt;privado&gt;/);assert.doesNotMatch(low,/<select|<privado>/)
 const presale=renderToStaticMarkup(<RewardChoices options={{...options,campaignType:'PRESALE'}} amount="50" value="r" disabled={false} onChange={()=>{}}/>)
 assert.doesNotMatch(presale,/Aportar sin recompensa/);assert.match(presale,/La preventa requiere elegir un producto/)
 assert.equal(renderToStaticMarkup(<RewardChoices options={{...options,campaignType:'DONATION'}} amount="50" value="" disabled={false} onChange={()=>{}}/>),'')
})
