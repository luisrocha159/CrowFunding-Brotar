import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {PartyUserEditor} from '../src/features/verifications/PartyUserEditor'
import {MembershipManager} from '../src/features/verifications/MembershipManager'
import {parseMembershipDetail,parseUserPartyDetail,validateMembershipChange,validateUserPartyChange,type UserPartyDetail} from '../src/features/verifications/partyClient'
const id='3cfd2859-d51b-4de0-aad2-e581e7ce1643',reason='Cambio administrativo de prueba explícito.'
test('membresías: valida cuenta, rol, motivo y confirmación explícita',()=>{
 const input={action:'ADD' as const,userId:id,role:'MEMBER',reason,confirmed:true}
 assert.deepEqual(validateMembershipChange(input),{})
 for(const change of [{userId:'correo@example.invalid'},{role:'SUPER_ADMIN'},{reason:'corto'},{confirmed:false}])assert.ok(Object.keys(validateMembershipChange({...input,...change})).length)
 assert.throws(()=>parseMembershipDetail({id,name:'Org',status:'DRAFT',version:'0',actorRole:'OWNER',members:[{id}],history:[]}))
})
test('personas: valida campos permitidos y rechaza contactos ejecutables',()=>{
 const input={firstName:'Nombre',lastName:'Apellido',displayName:'',city:'',websiteUrl:'https://example.invalid',reason,confirmed:true}
 assert.deepEqual(validateUserPartyChange(input),{})
 for(const change of [{city:'La Paz\u0000oculta'},{displayName:'<b>Alias</b>'},{city:'!!!!'},{firstName:' '},{firstName:'12345'},{lastName:'<b>Apellido</b>'},{reason:'!!!!!!!!!!!!'},{reason:'Motivo\u0001con control'},{lastName:'a'.repeat(121)},{websiteUrl:'javascript:alert(1)'},{websiteUrl:'https://user:password@example.invalid'},{reason:'corto'},{confirmed:false}])assert.ok(Object.keys(validateUserPartyChange({...input,...change})).length)
 assert.throws(()=>parseUserPartyDetail({...input,id,email:'test@example.invalid',status:'ACTIVE',version:'0',canManage:true,history:[]}))
})
test('administración privada: escapes y solo lectura para auditor, motivos y recarga accesibles',()=>{
 const detail:UserPartyDetail={id,email:'test@example.invalid',status:'ACTIVE',version:'0',firstName:'<script>privado</script>',lastName:'Apellido',displayName:'',city:'',websiteUrl:'',canManage:false,canRestore:false,history:[]}
 const html=renderToStaticMarkup(<PartyUserEditor detail={detail} onSaved={()=>{}} onReload={()=>{}}/>)
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/Guardar cambio de cuenta/);assert.match(html,/Recargar datos de la cuenta/);assert.match(html,/disabled/)
 assert.match(renderToStaticMarkup(<MembershipManager organizationId={id} readOnly/>),/Consultar membresías/)
})

test('membresías: selector de vigentes y páginas independientes no dependen de205 vínculos históricos',async()=>{
 const {CurrentMemberSelect,MembershipPagination}=await import('../src/features/verifications/MembershipManager')
 const old={id,userId:id,name:'DEMO Miembro antiguo',role:'MEMBER',joinedAt:'2025-01-01T00:00:00Z',leftAt:null,current:true}
 const detail=parseMembershipDetail({id,name:'DEMO Organización',status:'DRAFT',version:'1',actorRole:'OWNER',members:[],currentMembers:[old],totalMembers:228,totalCurrentMembers:23,currentPage:2,memberPage:1,pageSize:20,history:[]})
 assert.equal(detail.currentMembers[0]!.userId,id);assert.equal(detail.members.length,0);assert.equal(detail.currentPage,2);assert.equal(detail.memberPage,1)
 const selector=renderToStaticMarkup(<CurrentMemberSelect members={detail.currentMembers} value={id} disabled={false} onChange={()=>{}}/>),paging=renderToStaticMarkup(<MembershipPagination label="Páginas de miembros vigentes" page={2} total={23} busy={false} onPage={()=>{}}/>)
 assert.match(selector,/DEMO Miembro antiguo/);assert.match(selector,new RegExp(`value="${id}"`));assert.match(paging,/Página 2/);assert.match(paging,/Páginas de miembros vigentes/)
 for(const patch of [{currentPage:0},{memberPage:1.5},{totalCurrentMembers:-1},{currentMembers:Array.from({length:21},()=>old)}])assert.throws(()=>parseMembershipDetail({...detail,...patch}))
})
