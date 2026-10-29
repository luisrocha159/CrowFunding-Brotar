import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {invitationListFrom} from '../src/features/verifications/organizationInvitationsClient'
import {InvitationCard} from '../src/features/verifications/OrganizationInvitationsPage'
const row={id:randomUUID(),organizationId:randomUUID(),organizationName:'<script>Organización</script>',targetUserId:randomUUID(),invitedBy:randomUUID(),role:'ADMIN',version:1,reason:'Colaboración en organización de prueba.',createdAt:'2026-10-28 12:00:00+00',expiresAt:'2026-11-04 12:00:00+00',resolvedAt:null,status:'PENDING',expired:false,allowedActions:['ACCEPT','DECLINE'],events:[]}
test('invitaciones UI: contrato, confirmación y motivo obligatorios; sin acceso prematuro',()=>{
 const data=invitationListFrom({items:[row],total:1,page:1,pageSize:20}),html=renderToStaticMarkup(<InvitationCard invitation={data.items[0]!} save={async()=>{}}/>)
 assert.match(html,/Aceptar invitación/);assert.match(html,/Rechazar invitación/);assert.match(html,/no concede acceso/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));assert.match(html,/minLength="20"/i);assert.match(html,/type="checkbox"/)
 const readonly=renderToStaticMarkup(<InvitationCard invitation={{...data.items[0]!,allowedActions:[]}} save={async()=>{}}/>);assert.ok(!readonly.includes('<form'))
 for(const patch of [{role:'OWNER'},{status:'AUTO_APPROVED'},{version:0},{allowedActions:['APPROVE']},{expiresAt:'ayer'}])assert.throws(()=>invitationListFrom({items:[{...row,...patch}],total:1,page:1,pageSize:20}))
})
