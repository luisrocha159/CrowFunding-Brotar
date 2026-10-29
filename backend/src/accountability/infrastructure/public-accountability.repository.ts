import {assertPublicConsent} from '../domain/publication'
import {ConflictException,Injectable,NotFoundException} from '@nestjs/common'

import {DatabaseService} from '../../shared/infrastructure/database/database.service'

import {transactionAccess} from '../../roles/infrastructure/transaction-access'

import {ownerAccess,type CampaignSubject} from '../../campaign-lifecycle/infrastructure/eligibility'

import {assertDemoEnabled,lockDemo} from '../../demo-payments/infrastructure/demo-payments'

import {digest,reason,requestKey} from '../../demo-payments/domain/demo'

import {LedgerInvalid,uuid} from '../../contributions/domain/payment'

import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'

import {randomUUID} from 'node:crypto'

import type {EntityManager} from 'typeorm'

interface PublicationInput {requestKey:string;reason:string;publishConsent?:boolean;confirmed?:boolean;expectedVersion?:number}

@Injectable()

export class PublicAccountabilityRepository {

 constructor(private readonly database:DatabaseService){}

 async list(id:string,page:number){uuid(id);return this.database.connection().transaction('REPEATABLE READ',async m=>{

  const [c]=await m.query(`SELECT id FROM public.campaign WHERE id=$1 AND published_at IS NOT NULL AND deleted_at IS NULL AND status IN ('PUBLISHED','IN_EXECUTION','CLOSED','CANCELLED','FUNDING_ENDED')`,[id]);if(!c)throw new NotFoundException('Campaña no disponible.')

  const [count]=await m.query('SELECT count(*)::int AS total FROM brotar_extension.accountability_publication WHERE campaign_id=$1 AND withdrawn_at IS NULL',[id])

  const rows=await m.query('SELECT snapshot,published_at::text AS "publishedAt" FROM brotar_extension.accountability_publication WHERE campaign_id=$1 AND withdrawn_at IS NULL ORDER BY published_at DESC,report_id LIMIT 20 OFFSET $2',[id,(page-1)*20])

  return{items:rows.map((row:{snapshot:object;publishedAt:string})=>({...row.snapshot,publishedAt:row.publishedAt})),total:count.total,page,pageSize:20}

 })}

 private async subject(m:EntityManager,id:string):Promise<CampaignSubject>{const[c]=await m.query(`SELECT id,status,creator_user_id,organization_id,currency_code FROM public.campaign WHERE id=$1 AND deleted_at IS NULL AND published_at IS NOT NULL FOR UPDATE`,[id]);if(!c)throw new NotFoundException('Campaña no disponible.');return c}

 async change(actor:string,id:string,reportId:string,input:PublicationInput,withdraw=false){

  assertDemoEnabled();uuid(id);uuid(reportId);requestKey(input.requestKey);const why=reason(input.reason)

  if(!withdraw)assertPublicConsent(input.publishConsent)
  if(withdraw&&(input.confirmed!==true||input.expectedVersion!==1))throw new LedgerInvalid('Confirma expresamente la exposición pública o el retiro de la versión vigente.')

  const key=digest(`accountability-public:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([id,reportId,withdraw,why,input.expectedVersion??null]))

  return this.database.connection().transaction(async m=>{

   await lockDemo(m);const c=await this.subject(m,id),access=()=>withdraw?transactionAccess(m,actor,'campaign.lifecycle.manage'):ownerAccess(m,actor,c);await access()

   const [old]=await m.query('SELECT report_id,request_hash FROM brotar_extension.accountability_publication_event WHERE request_key=$1',[key]);if(old){if(old.report_id!==reportId||old.request_hash!==hash)throw new ConflictException('La clave pertenece a otra operación.');return{reportId,status:withdraw?'WITHDRAWN':'PUBLISHED'}}

   const [r]=await m.query(`SELECT r.id,r.is_final AS "isFinal",r.status,r.period_label AS "periodLabel",r.period_start::text AS "periodStart",r.period_end::text AS "periodEnd",r.narrative,r.variance_explanation AS "varianceExplanation",r.funds_received::text AS "fundsReceived",r.funds_spent::text AS "fundsSpent",r.balance::text AS balance,trim(r.currency_code) AS currency FROM public.accountability_report r WHERE r.id=$1 AND r.campaign_id=$2 FOR SHARE OF r`,[reportId,id]);if(!r)throw new NotFoundException('Informe no disponible.')

   const [pub]=await m.query('SELECT version,withdrawn_at FROM brotar_extension.accountability_publication WHERE report_id=$1 FOR UPDATE',[reportId])

   if(withdraw){if(!pub||pub.withdrawn_at||pub.version!==input.expectedVersion)throw new ConflictException('El resumen no está publicado o ya se retiró.')}

   else{

    if(!['APPROVED','PUBLISHED'].includes(r.status))throw new ConflictException('Solo se comparte un informe aprobado de forma independiente.')

    const [current]=await m.query(`SELECT EXISTS(SELECT 1 FROM brotar_extension.accountability_document WHERE campaign_id=$2 AND current_report_id=$1) OR EXISTS(SELECT 1 FROM brotar_extension.campaign_final_report WHERE campaign_id=$2 AND report_id=$1) AS valid`,[reportId,id]);if(!current.valid)throw new ConflictException('Comparte el documento vigente, no una revisión histórica.')

    if(pub)throw new ConflictException('Ese resumen ya se compartió o retiró; conserva su historial.')

   }

   // Freeze only the explicitly public projection. Files, destinations, people and review reasons are excluded.

   let snapshot:object|null=null

   if(!withdraw){

    const comparison=await m.query(`WITH planned AS(SELECT expense_category_id,sum(planned_amount) AS amount FROM public.budget_item WHERE campaign_id=$1 GROUP BY expense_category_id),spent AS(SELECT expense_category_id,sum(spent_amount) AS amount FROM public.accountability_expense WHERE report_id=$2 GROUP BY expense_category_id) SELECT cat.name AS category,COALESCE(p.amount,0)::numeric(18,2)::text AS planned,COALESCE(s.amount,0)::numeric(18,2)::text AS spent FROM planned p FULL JOIN spent s ON s.expense_category_id=p.expense_category_id JOIN public.expense_category cat ON cat.id=COALESCE(p.expense_category_id,s.expense_category_id) ORDER BY cat.name,cat.id`,[id,reportId])

    const indicators=await m.query(`SELECT name,unit,target_value::text AS expected,achieved_value::text AS achieved FROM public.campaign_impact_indicator WHERE campaign_id=$1 ORDER BY display_order,id`,[id])

    snapshot={reportId:r.id,isFinal:r.isFinal,periodLabel:r.periodLabel,periodStart:r.periodStart,periodEnd:r.periodEnd,narrative:r.narrative,varianceExplanation:r.varianceExplanation,fundsReceived:r.fundsReceived,fundsSpent:r.fundsSpent,balance:r.balance,currency:r.currency,comparison,indicators}

   }

   await access();await setAuditActor(m,actor)

   if(withdraw)await m.query('UPDATE brotar_extension.accountability_publication SET withdrawn_by=$2,withdrawn_at=clock_timestamp(),version=2 WHERE report_id=$1',[reportId,actor])

   else await m.query('INSERT INTO brotar_extension.accountability_publication(report_id,campaign_id,snapshot,published_by) VALUES($1,$2,$3::jsonb,$4)',[reportId,id,JSON.stringify(snapshot),actor])

   await access()

   await m.query('INSERT INTO brotar_extension.accountability_publication_event(id,report_id,actor_id,action,reason,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),reportId,actor,withdraw?'WITHDRAW':'PUBLISH',why,key,hash])

   await recordAudit(m,actor,'UPDATE','accountability_report',reportId)

   return{reportId,status:withdraw?'WITHDRAWN':'PUBLISHED'}

  })

 }

}

