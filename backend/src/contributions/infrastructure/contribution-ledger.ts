import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { decimal, LedgerConflict, LedgerInvalid, money, nextPaymentState, uuid, type IncomingState, type PaymentState } from '../domain/payment'

export interface PendingContribution {
  campaignId: string; rewardId: string | null; amount: string; currencyCode: string
  providerId: string; requestKey: string
}
/** Solo una futura integración de servidor verifica autenticidad. NUNCA es un DTO del navegador. */
export interface VerifiedPaymentEvent {
  providerId: string; eventId: string; paymentId: string; state: IncomingState
  amount: string; currencyCode: string; externalReference?: string; feeAmount?: string
}
export interface OwnContribution {
  id: string; reference: string; campaignId: string; amount: string; currencyCode: string
  status: string; paymentId: string; paymentStatus: PaymentState; expiresAt: string | null
  reservationExpired: boolean
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

/** Núcleo interno de S3-02. Sin checkout/webhook público ni conexión a un proveedor real. */
@Injectable()
export class ContributionLedger {
  constructor(private readonly database: DatabaseService) {}

  async own(userId: string, id: string): Promise<OwnContribution | null> {
    const [row]: (Omit<OwnContribution,'expiresAt'> & { expiresAt: Date | null })[] = await this.database.connection().query(`SELECT c.id,c.reference_code AS reference,
      c.campaign_id AS "campaignId",c.amount::text AS amount,trim(c.currency_code) AS "currencyCode",c.status,
      p.id AS "paymentId",p.status AS "paymentStatus",c.expires_at AS "expiresAt",
      COALESCE(c.status='PENDING' AND c.expires_at<=now(),false) AS "reservationExpired"
      FROM public.contribution c JOIN public.payment p ON p.contribution_id=c.id
      WHERE c.id=$1 AND c.user_id=$2 ORDER BY p.attempt_number DESC LIMIT 1`, [id,userId])
    return row ? { ...row,expiresAt: row.expiresAt?.toISOString() ?? null } : null
  }

  private async sandbox(manager: EntityManager, providerId: string) {
    const [provider] = await manager.query('SELECT id FROM public.payment_provider WHERE id=$1 AND is_active AND is_sandbox', [providerId])
    if (process.env.NODE_ENV === 'production' || !provider) throw new LedgerConflict('Solo ensayo sandbox interno; proveedor real todavía no habilitado.')
  }

  private async campaign(manager: EntityManager, id: string, rewardId: string | null) {
    // ponytail: serializa por campaña; separar por recompensa si el volumen medido lo exige.
    const [campaign] = await manager.query(`SELECT campaign_type,currency_code,min_contribution::text,
      status,deleted_at, (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) AS open
      FROM public.campaign WHERE id=$1 FOR UPDATE`, [id])
    if (!campaign || campaign.deleted_at || campaign.status !== 'PUBLISHED' || !campaign.open) throw new LedgerConflict('La campaña no admite aportes ahora.')
    if ((campaign.campaign_type === 'DONATION') !== (rewardId === null)) throw new LedgerInvalid('La recompensa no corresponde a la modalidad.')
    return campaign as { currency_code: string; min_contribution: string | null }
  }

  private async reward(manager: EntityManager, campaignId: string, rewardId: string | null, amount: bigint, excluding?: string) {
    if (!rewardId) return
    const [reward] = await manager.query(`SELECT min_amount::text,quantity_total FROM public.reward
      WHERE id=$1 AND campaign_id=$2 AND is_active FOR UPDATE`, [rewardId,campaignId])
    if (!reward || amount<money(reward.min_amount)) throw new LedgerConflict('Recompensa no disponible o aporte inferior al mínimo.')
    if (reward.quantity_total !== null) {
      const [used] = await manager.query(`SELECT count(*)::int AS n FROM public.contribution c
        WHERE c.reward_id=$1 AND ($2::uuid IS NULL OR c.id<>$2) AND (
          EXISTS(SELECT 1 FROM public.payment p WHERE p.contribution_id=c.id AND p.confirmed_at IS NOT NULL)
          OR (c.status='PENDING' AND c.expires_at>now()))`, [rewardId,excluding ?? null])
      if (used.n >= reward.quantity_total) throw new LedgerConflict('No quedan cupos de esta recompensa.')
    }
  }

  async start(userId: string, input: PendingContribution): Promise<OwnContribution> {
    for (const id of [userId,input.campaignId,input.providerId,...(input.rewardId ? [input.rewardId] : [])]) uuid(id)
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestKey)) throw new LedgerInvalid('La clave del intento debe ser UUID v4.')
    if (!/^[A-Z]{3}$/.test(input.currencyCode)) throw new LedgerInvalid('Moneda inválida.')
    const amount = decimal(money(input.amount))
    const key = digest(`contribution:${userId}:${input.requestKey.toLowerCase()}`)
    const hash = digest(JSON.stringify([input.campaignId,input.rewardId,amount,input.currencyCode,input.providerId]))
    const id = await this.database.connection().transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
      const [old] = await manager.query(`SELECT contribution_id,provider_payload->>'requestHash' AS hash
        FROM public.payment WHERE idempotency_key=$1`, [key])
      if (old) {
        if (old.hash !== hash) throw new LedgerConflict('La clave de reintento ya se usó con otros datos.')
        return old.contribution_id as string
      }
      const [user] = await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND u.deleted_at IS NULL
        AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=now())
        AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id
          AND r.code IN ('REGISTERED_USER','SPONSOR') AND ur.revoked_at IS NULL AND ur.granted_at<=now()
          AND (ur.expires_at IS NULL OR ur.expires_at>now()))`, [userId])
      if (!user) throw new LedgerConflict('Cuenta no disponible para el ensayo.')
      await this.sandbox(manager,input.providerId)
      const campaign = await this.campaign(manager,input.campaignId,input.rewardId)
      if (campaign.currency_code.trim() !== input.currencyCode ||
        (campaign.min_contribution !== null && money(amount)<money(campaign.min_contribution))) throw new LedgerInvalid('Moneda o mínimo de campaña inválidos.')
      await this.reward(manager,input.campaignId,input.rewardId,money(amount))
      const contributionId = randomUUID()
      await manager.query(`INSERT INTO public.contribution(id,campaign_id,user_id,reward_id,amount,currency_code,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,now()+interval '30 minutes')`, [contributionId,input.campaignId,userId,input.rewardId,amount,input.currencyCode])
      await manager.query(`INSERT INTO public.payment(contribution_id,provider_id,idempotency_key,amount,currency_code,expires_at,provider_payload)
        SELECT id,$2,$3,amount,currency_code,expires_at,jsonb_build_object('requestHash',$4::text)
        FROM public.contribution WHERE id=$1`, [contributionId,input.providerId,key,hash])
      return contributionId
    })
    return (await this.own(userId,id))!
  }

  /** Entrada de confianza de servidor para un proveedor futuro; no hay ruta HTTP que la invoque. */
  async applyVerifiedEvent(event: VerifiedPaymentEvent): Promise<{ status: PaymentState; replayed: boolean }> {
    uuid(event.providerId); uuid(event.paymentId)
    if (typeof event.eventId !== 'string' || !/^[\x21-\x7e]{1,200}$/.test(event.eventId) || !/^[A-Z]{3}$/.test(event.currencyCode)) throw new LedgerInvalid('Identificador de evento o moneda inválidos.')
    const amount = decimal(money(event.amount)), fee = decimal(money(event.feeAmount ?? '0',true))
    if (money(fee,true)>money(amount)) throw new LedgerInvalid('La comisión supera el aporte.')
    const reference = event.externalReference ?? null
    if (reference !== null && !/^[\x21-\x7e]{1,200}$/.test(reference)) throw new LedgerInvalid('Referencia externa inválida.')
    if (event.state === 'CONFIRMED' && reference === null) throw new LedgerInvalid('La confirmación requiere referencia externa.')
    const key = digest(`${event.providerId}:${event.eventId}`)
    const hash = digest(JSON.stringify([event.paymentId,event.state,amount,event.currencyCode,reference,fee]))
    try {
      return await this.database.connection().transaction(async manager => {
        await this.sandbox(manager,event.providerId)
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
        const [seen] = await manager.query(`SELECT e.payment_id,p.status,e.payload->>'hash' AS hash
          FROM public.payment_event e JOIN public.payment p ON p.id=e.payment_id WHERE e.provider_event_id=$1`, [key])
        if (seen) {
          if (seen.payment_id !== event.paymentId || seen.hash !== hash) throw new LedgerConflict('Evento repetido con datos diferentes.')
          return { status: seen.status as PaymentState, replayed: true }
        }
        const [target] = await manager.query(`SELECT c.id,c.campaign_id,c.reward_id FROM public.payment p
          JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND p.provider_id=$2`, [event.paymentId,event.providerId])
        if (!target) throw new LedgerConflict('Pago no disponible para ese proveedor.')
        await manager.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE', [target.campaign_id])
        const [payment] = await manager.query(`SELECT p.status,p.amount::text,trim(p.currency_code) AS currency,
          p.fee_amount::text AS fee,p.external_reference,c.status AS contribution_status,c.expires_at>now() AS reserved
          FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 FOR UPDATE OF p,c`, [event.paymentId])
        if (money(payment.amount)!==money(amount) || payment.currency !== event.currencyCode) throw new LedgerConflict('El evento no coincide con el importe y moneda originales.')
        const next = nextPaymentState(payment.status,event.state)
        if (next === 'CONFIRMED' && payment.status !== 'CONFIRMED') {
          if (payment.contribution_status !== 'PENDING' || !payment.reserved) throw new LedgerConflict('Reserva vencida o aporte terminal: requiere conciliación, no confirmar silenciosamente.')
          await this.campaign(manager,target.campaign_id,target.reward_id)
          await this.reward(manager,target.campaign_id,target.reward_id,money(amount),target.id)
        }
        if (payment.status === 'CONFIRMED' && event.state === 'CONFIRMED' &&
          (payment.external_reference !== reference || money(payment.fee,true)!==money(fee,true))) throw new LedgerConflict('La confirmación ya registrada tiene otra referencia o comisión.')
        if (next !== payment.status) {
          await manager.query(`UPDATE public.payment SET status=$2::payment_status,fee_amount=$3,external_reference=$4,
            confirmed_at=CASE WHEN $2::payment_status='CONFIRMED' THEN now() ELSE NULL END WHERE id=$1`,
          [event.paymentId,next,next === 'CONFIRMED' ? fee : '0.00',next === 'CONFIRMED' ? reference : null])
          if (next === 'CONFIRMED') await manager.query("UPDATE public.contribution SET status='CONFIRMED',confirmed_at=now() WHERE id=$1", [target.id])
          else if (next === 'FAILED' || next === 'EXPIRED') await manager.query(`UPDATE public.contribution SET status=$2::contribution_status,cancelled_at=CASE WHEN $2::contribution_status='CANCELLED' THEN now() ELSE NULL END WHERE id=$1`, [target.id,next === 'FAILED' ? 'CANCELLED' : 'EXPIRED'])
        }
        await manager.query(`INSERT INTO public.payment_event(payment_id,provider_event_id,event_type,previous_status,new_status,payload)
          VALUES($1,$2,'sandbox.verified',$3,$4,jsonb_build_object('hash',$5::text,'incomingStatus',$6::text))`,
        [event.paymentId,key,payment.status,next,hash,event.state])
        return { status: next, replayed: false }
      })
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new LedgerConflict('Referencia o confirmación ya utilizada. No se registró otro cobro.')
      throw error
    }
  }
}
