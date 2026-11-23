import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { ContributionLedger } from '../../contributions/infrastructure/contribution-ledger'
import { LedgerConflict, LedgerInvalid, type IncomingState, type PaymentState, uuid } from '../../contributions/domain/payment'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { recordAudit, setAuditActor } from '../../shared/infrastructure/database/audit'
import { isDemoEnabled, DEMO_LABEL, DEMO_PROVIDER, digest, requestKey } from '../domain/demo'

export function assertDemoEnabled(): void {
  if (!isDemoEnabled(process.env)) throw new NotFoundException('Simulador de prueba no habilitado.')
}

export async function lockDemo(manager: EntityManager): Promise<void> {
  // Un único simulador local: serialización explícita, sin colas ni infraestructura externa.
  await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('demo-settlement:v1',0))")
}
export async function demoProvider(manager: EntityManager): Promise<string> {
  assertDemoEnabled()
  const [provider]=await manager.query(`SELECT id FROM public.payment_provider WHERE code=$1 AND is_sandbox AND is_active AND config->>'mode'='DEMO'`,[DEMO_PROVIDER])
  if (!provider) throw new LedgerConflict('Ejecuta las migraciones: proveedor de prueba no disponible.')
  return provider.id as string
}

export interface CheckoutInput { campaignId: string; rewardId?: string|null; amount: string; currencyCode: string; requestKey: string; demoConsent: true; method?: 'TEST_QR'|'TEST_CARD' }
@Injectable()
export class DemoPayments {
  constructor(private readonly database: DatabaseService,private readonly ledger: ContributionLedger) {}

  async checkout(userId: string,input: CheckoutInput) {
    assertDemoEnabled()
    if (input.demoConsent!==true) throw new LedgerConflict('Confirma que este aporte no utiliza dinero real.')
    const providerId=await demoProvider(this.database.connection().manager)
    const contribution=await this.ledger.start(userId,{...input,rewardId:input.rewardId ?? null,providerId})
    return {mode:'DEMO',label:DEMO_LABEL,contribution,ticket:await this.ticket(userId,contribution.paymentId)}
  }

  async ticket(userId: string,paymentId: string) {
    assertDemoEnabled();uuid(userId);uuid(paymentId)
    paymentId=paymentId.toLowerCase()
    const providerId=await demoProvider(this.database.connection().manager)
    const [row]=await this.database.connection().query(`SELECT p.id AS "paymentId",c.id AS "contributionId",c.reference_code AS reference,
      p.amount::text AS amount,trim(p.currency_code) AS "currencyCode",
      CASE WHEN p.status IN ('INITIATED','PENDING') AND LEAST(p.expires_at,c.expires_at)<=clock_timestamp()
        THEN 'EXPIRED' ELSE p.status::text END AS status,p.attempt_number AS attempt,
      p.expires_at AS "expiresAt",COALESCE(p.status IN ('INITIATED','PENDING') AND LEAST(p.expires_at,c.expires_at)<=clock_timestamp(),false) OR p.status='EXPIRED' AS expired,
      CASE WHEN p.provider_payload->>'method' IN ('TEST_QR','TEST_CARD') THEN p.provider_payload->>'method' ELSE NULL END AS method FROM public.payment p
      JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[paymentId,userId,providerId])
    if (!row) throw new NotFoundException('Intento no disponible.')
    return {...row,mode:'DEMO',label:DEMO_LABEL,qrPayload:`BROTAR-DEMO:${paymentId}`,payable:false}
  }

  async retry(userId: string,contributionId: string,key: string,consent: true) {
    assertDemoEnabled();uuid(contributionId);requestKey(key)
    if (consent!==true) throw new LedgerConflict('Confirma que este reintento no utiliza dinero real.')
    const providerId=await demoProvider(this.database.connection().manager)
    const [target]=await this.database.connection().query(`SELECT c.id FROM public.contribution c JOIN public.payment p ON p.contribution_id=c.id
      WHERE c.id=$1 AND c.user_id=$2 AND p.provider_id=$3
      AND NOT EXISTS(SELECT 1 FROM public.payment other WHERE other.contribution_id=c.id AND other.provider_id<>$3)`,[contributionId,userId,providerId])
    if (!target) throw new NotFoundException('Aporte no disponible.')
    const contribution=await this.ledger.retry(userId,contributionId,key,true)
    return {mode:'DEMO',label:DEMO_LABEL,contribution,ticket:await this.ticket(userId,contribution.paymentId!)}
  }

  async confirmPayment(actor:string,paymentId:string,key:string,evidenceReference:string) {
    assertDemoEnabled();uuid(paymentId);requestKey(key)
    const evidence=evidenceReference.trim()
    if(evidence.length<5 || evidence.length>120 || /\p{Cc}/u.test(evidence)) throw new LedgerInvalid('Ingresa una referencia de constancia de 5 a 120 caracteres.')
    paymentId=paymentId.toLowerCase()
    return this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager)
      await transactionAccess(manager,actor,'finance.operate')
      const [target]=await manager.query(`SELECT c.id,c.user_id AS sponsor,cam.creator_user_id AS creator FROM public.payment p
        JOIN public.contribution c ON c.id=p.contribution_id JOIN public.campaign cam ON cam.id=c.campaign_id
        WHERE p.id=$1 AND p.provider_id=$2 FOR UPDATE OF cam`,[paymentId,providerId])
      if(!target)throw new NotFoundException('Intento no disponible.')
      if(actor===target.sponsor || actor===target.creator)throw new ForbiddenException('La confirmación requiere una cuenta de Finanzas independiente.')
      const [payment]=await manager.query(`SELECT p.status,LEAST(p.expires_at,c.expires_at)<=clock_timestamp() AS expired
        FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 FOR UPDATE OF p,c`,[paymentId])
      await transactionAccess(manager,actor,'finance.operate')
      if(payment.status==='CONFIRMED'||payment.status==='EXPIRED')return {paymentId,status:payment.status as PaymentState}
      if(!['INITIATED','PENDING'].includes(payment.status))throw new LedgerConflict('Este intento ya no admite confirmación.')
      if(payment.expired){
        await this.ledger.expireLocked(manager,target.id)
        return {paymentId,status:'EXPIRED'}
      }
      const event=await this.record(manager,providerId,target.sponsor,paymentId,'CONFIRMED',key,actor)
      if(event.processing!=='APPLIED')throw new LedgerConflict('La reserva cambió. Consulta el estado del aporte.')
      await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,description,new_values)
        VALUES($1,'FINANCE','STATUS_CHANGE','payment',$2,'Confirmación manual de aporte',
        jsonb_build_object('source','FINANCE_CONFIRMATION','evidenceReference',$3::text,'eventId',$4::text))`,[actor,paymentId,evidence,event.eventId])
      return {paymentId,status:'CONFIRMED'}
    })
  }

  async simulate(userId: string,paymentId: string,outcome: IncomingState,key: string) {
    assertDemoEnabled();uuid(paymentId);requestKey(key)
    paymentId=paymentId.toLowerCase()
    if (!['PENDING','CONFIRMED','FAILED','EXPIRED'].includes(outcome)) throw new LedgerConflict('Resultado de ensayo no permitido.')
    return this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager)
      return this.record(manager,providerId,userId,paymentId,outcome,key)
    })
  }

  private async record(manager: EntityManager,providerId: string,userId: string,paymentId: string,outcome: IncomingState,key: string,actorId=userId) {
    const [target]=await manager.query(`SELECT p.amount::text,trim(p.currency_code) AS currency,p.status FROM public.payment p
      JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[paymentId,userId,providerId])
    if (!target) throw new NotFoundException('Intento no disponible.')
    const idempotency=digest(`demo-event:${actorId}:${key.toLowerCase()}`)
    const hash=digest(JSON.stringify([paymentId,outcome]))
    const [old]=await manager.query('SELECT id,request_hash,processing,reason_code FROM brotar_extension.demo_event WHERE request_key=$1',[idempotency])
    if (old) {
      if (old.request_hash!==hash) throw new LedgerConflict('Esta clave ya se usó con otros datos.')
      return {mode:'DEMO',label:DEMO_LABEL,eventId:old.id,paymentId,status:target.status as PaymentState,observedStatus:outcome,processing:old.processing,reasonCode:old.reason_code,replayed:true}
    }
    const reference=`DEMO-${paymentId}`
    const [receipt]=await manager.query(`INSERT INTO brotar_extension.demo_event(request_key,request_hash,actor_id,payment_id,observed_status,
      amount,currency_code,external_reference,processing) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'RECEIVED') RETURNING id`,
    [idempotency,hash,actorId,paymentId,outcome,target.amount,target.currency,reference])
    // Se conserva el recibo incluso si la transición financiera se rechaza. No ocultar errores de BD desconocidos.
    await manager.query('SAVEPOINT demo_apply')
    let status: PaymentState=target.status,processing='APPLIED',reasonCode: string|null=null
    try {
      status=(await this.ledger.applyVerifiedEvent({providerId,paymentId,eventId:`demo:${receipt.id}`,state:outcome,
        amount:target.amount,currencyCode:target.currency,externalReference:reference,feeAmount:'0'},manager)).status
    } catch (error) {
      if (!(error instanceof LedgerConflict)) throw error
      await manager.query('ROLLBACK TO SAVEPOINT demo_apply')
      processing=outcome==='CONFIRMED'?'NEEDS_REVIEW':'APPLIED'
      reasonCode=outcome==='CONFIRMED'?'LEDGER_CONFLICT':'TERMINAL_NOTICE_IGNORED'
      if (outcome==='CONFIRMED' && (await manager.query('SELECT payment_id FROM brotar_extension.demo_compensation WHERE payment_id=$1',[paymentId])).length) {
        processing='COMPENSATED';reasonCode='ALREADY_COMPENSATED'
      }
    }
    await manager.query('RELEASE SAVEPOINT demo_apply')
    await manager.query(`UPDATE brotar_extension.demo_event SET processing=$2,reason_code=$3,processed_at=now() WHERE id=$1`,[receipt.id,processing,reasonCode])
    await setAuditActor(manager,actorId)
    await recordAudit(manager,actorId,'CREATE','demo_event',receipt.id)
    return {mode:'DEMO',label:DEMO_LABEL,eventId:receipt.id as string,paymentId,status,observedStatus:outcome,processing,reasonCode,replayed:false}
  }
}
