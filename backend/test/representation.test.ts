import 'reflect-metadata'
import {strict as assert} from 'node:assert'
import {test} from 'node:test'
import {validate} from 'class-validator'
// HTTP integration asserts transitions/authorization; these checks focus on the public DTO contract.
import {RepresentationProposalDto,RepresentationActionDto} from '../src/verifications/infrastructure/representation.controller'
test('formal representation requires explicit confirmation, UUID target and optimistic version',async()=>{
 const proposal=Object.assign(new RepresentationProposalDto(),{kind:'OWNERSHIP',targetUserId:'bad',expectedVersion:'0',confirmed:false,reason:'short'})
 assert.ok((await validate(proposal)).length>=3)
 Object.assign(proposal,{targetUserId:'3cfd2859-d51b-4de0-aad2-e581e7ce1643',confirmed:true,reason:'Consentimiento explícito de prueba.'})
 assert.deepEqual(await validate(proposal),[])
 const action=Object.assign(new RepresentationActionDto(),{action:'APPROVE',expectedVersion:1,confirmed:true,reason:proposal.reason})
 Object.assign(action,{expectedVersion:'1'});assert.ok((await validate(action)).length>0)
 Object.assign(action,{expectedVersion:1});assert.deepEqual(await validate(action),[])
 action.expectedVersion=0;assert.ok((await validate(action)).length>0)
})

test('publication preserves representation conflict as HTTP409 instead of translating to invalid input',async()=>{
 const {ConflictException}=await import('@nestjs/common')
 const {TypeormAdministrativeRepository}=await import('../src/campaigns/infrastructure/typeorm-administrative.repository')
 const old=process.env.DEMO_PAYMENTS_ENABLED;process.env.DEMO_PAYMENTS_ENABLED='true'
 const m={query:async(sql:string)=>{
  if(sql.includes('SELECT status FROM public.campaign'))return[{status:'APPROVED'}]
  if(sql.includes('FROM public.campaign_review'))return[{id:'round',round:1,decision:'APPROVED'}]
  if(sql.includes('SELECT id,creator_user_id,organization_id'))return[{id:'campaign',creator_user_id:'owner',organization_id:'org',currency_code:'BOB',status:'APPROVED'}]
  if(sql.includes('FROM public.organization_member'))return[]
  if(sql.includes('FROM brotar_extension.representation_request'))return[{id:'pending'}]
  if(sql.includes('FROM public.organization')||sql.includes('FROM public.app_user'))return[{id:'allowed'}]
  throw new Error(`Unexpected query: ${sql}`)
 }}
 const database={connection:()=>({transaction:async(fn:(manager:typeof m)=>unknown)=>fn(m)})} as unknown as import('../src/shared/infrastructure/database/database.service').DatabaseService
 const submission={snapshot:async()=>({campaignType:'DONATION',title:'demo',summary:'demo',categoryId:'category',coverFileId:'cover',countryCode:'BO',locality:'La Paz',problem:'problem',solution:'solution',beneficiaries:'people',expectedResults:'result',indicatorCount:1,activityCount:1,budgetCount:1,goalAmount:10,currencyCode:'BOB',durationDays:10,fundingModel:'ALL_OR_NOTHING',rewardCount:0})} as unknown as import('../src/campaigns/infrastructure/typeorm-submission.repository').TypeormSubmissionRepository
 const repo=new TypeormAdministrativeRepository(database,{} as never,{} as never,{} as never,submission)
 try{await assert.rejects(repo.publish('reviewer','campaign',1),ConflictException)}finally{if(old===undefined)delete process.env.DEMO_PAYMENTS_ENABLED;else process.env.DEMO_PAYMENTS_ENABLED=old}
})
