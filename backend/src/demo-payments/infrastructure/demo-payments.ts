import { Injectable, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { ContributionLedger } from '../../contributions/infrastructure/contribution-ledger'
import { LedgerConflict, type IncomingState, type PaymentState, uuid } from '../../contributions/domain/payment'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { recordAudit, setAuditActor } from '../../shared/infrastructure/database/audit'
import { isDemoEnabled, DEMO_LABEL, DEMO_PROVIDER, digest, requestKey } from '../domain/demo'

export function assertDemoEnabled(): void {
  if (!isDemoEnabled(process.env)) throw new NotFoundException('Simulador DEMO no habilitado.')
}

export async function lockDemo(manager: EntityManager): Promise<void> {
  // Un único simulador local: serialización explícita, sin colas ni infraestructura externa.
  await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('demo-settlement:v1',0))")
}
export async function demoProvider(manager: EntityManager): Promise<string> {
  assertDemoEnabled()
  const [provider]=await manager.query(`SELECT id FROM public.payment_provider WHERE code=$1 AND is_sandbox AND is_active AND config->>'mode'='DEMO'`,[DEMO_PROVIDER])
  if (!provider) throw new LedgerConflict('Ejecuta las migraciones: proveedor DEMO no disponible.')
  return provider.id as string
}

export interface CheckoutInput { campaignId: string; rewardId?: string|null; amount: string; currencyCode: string; requestKey: string; demoConsent: true }
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
      p.amount::text AS amount,trim(p.currency_code) AS "currencyCode",p.status,p.attempt_number AS attempt,
      p.expires_at AS "expiresAt",p.expires_at<=now() AS expired FROM public.payment p
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

  async simulate(userId: string,paymentId: string,outcome: IncomingState,key: string) {
    assertDemoEnabled();uuid(paymentId);requestKey(key)
    paymentId=paymentId.toLowerCase()
    if (!['PENDING','CONFIRMED','FAILED','EXPIRED'].includes(outcome)) throw new LedgerConflict('Resultado de ensayo no permitido.')
    return this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager)
      const [target]=await manager.query(`SELECT p.amount::text,trim(p.currency_code) AS currency,p.status FROM public.payment p
        JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND c.user_id=$2 AND p.provider_id=$3`,[paymentId,userId,providerId])
      if (!target) throw new NotFoundException('Intento no disponible.')
      const idempotency=digest(`demo-event:${userId}:${key.toLowerCase()}`)
      const hash=digest(JSON.stringify([paymentId,outcome]))
      const [old]=await manager.query('SELECT id,request_hash,processing,reason_code FROM brotar_extension.demo_event WHERE request_key=$1',[idempotency])
      if (old) {
        if (old.request_hash!==hash) throw new LedgerConflict('Esta clave ya se usó con otros datos.')
        return {mode:'DEMO',label:DEMO_LABEL,eventId:old.id,paymentId,status:target.status as PaymentState,observedStatus:outcome,processing:old.processing,reasonCode:old.reason_code,replayed:true}
      }
      const reference=`DEMO-${paymentId}`
      const [receipt]=await manager.query(`INSERT INTO brotar_extension.demo_event(request_key,request_hash,actor_id,payment_id,observed_status,
        amount,currency_code,external_reference,processing) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'RECEIVED') RETURNING id`,
      [idempotency,hash,userId,paymentId,outcome,target.amount,target.currency,reference])
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
      await setAuditActor(manager,userId)
      await recordAudit(manager,userId,'CREATE','demo_event',receipt.id)
      return {mode:'DEMO',label:DEMO_LABEL,eventId:receipt.id as string,paymentId,status,observedStatus:outcome,processing,reasonCode,replayed:false}
    })
  }
}
