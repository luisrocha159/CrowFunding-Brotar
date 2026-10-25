import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { recordAudit, setAuditActor } from '../../shared/infrastructure/database/audit'
import { decimal, LedgerConflict, LedgerInvalid, money, nextPaymentState, uuid, type IncomingState, type PaymentState } from '../domain/payment'

export interface PendingContribution {
  campaignId: string; rewardId: string | null; amount: string; currencyCode: string
  providerId: string; requestKey: string; demoConsent?: true
}
/** Solo una futura integración de servidor verifica autenticidad. NUNCA es un DTO del navegador. */
export interface VerifiedPaymentEvent {
  providerId: string; eventId: string; paymentId: string; state: IncomingState
  amount: string; currencyCode: string; externalReference?: string; feeAmount?: string
}
export interface OwnContribution {
  id: string; reference: string; campaignId: string; amount: string; currencyCode: string
  status: string; paymentId: string | null; paymentStatus: PaymentState | null; createdAt: string; expiresAt: string | null
  reservationExpired: boolean
}
export interface ContributionPage { items: OwnContribution[]; nextCursor: string | null }
type ContributionRow = Omit<OwnContribution,'createdAt' | 'expiresAt'> & { createdAt: Date; expiresAt: Date | null }
const ownProjection = `SELECT c.id,c.reference_code AS reference,
  c.campaign_id AS "campaignId",c.amount::text AS amount,trim(c.currency_code) AS "currencyCode",c.status,
  p.id AS "paymentId",p.status AS "paymentStatus",c.created_at AS "createdAt",c.expires_at AS "expiresAt",
  COALESCE(c.status='PENDING' AND c.expires_at<=now(),false) AS "reservationExpired"
  FROM public.contribution c LEFT JOIN LATERAL (
    SELECT id,status FROM public.payment WHERE contribution_id=c.id ORDER BY attempt_number DESC LIMIT 1
  ) p ON true`
const ownItem = (row: ContributionRow): OwnContribution => ({ ...row,createdAt:row.createdAt.toISOString(),expiresAt:row.expiresAt?.toISOString() ?? null })
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

/** Núcleo S3-02 reutilizado por el adaptador DEMO; sin conexión a un proveedor real. */
@Injectable()
export class ContributionLedger {
  constructor(private readonly database: DatabaseService) {}

  async own(userId: string, id: string): Promise<OwnContribution | null> {
    const [row]: ContributionRow[] = await this.database.connection().query(`${ownProjection} WHERE c.id=$1 AND c.user_id=$2`, [id,userId])
    return row ? ownItem(row) : null
  }

  async listOwn(userId: string, limit = 20, cursor?: string): Promise<ContributionPage> {
    uuid(userId)
    if (!Number.isInteger(limit) || limit<1 || limit>50) throw new LedgerInvalid('El tamaño de página debe estar entre 1 y 50.')
    if (cursor !== undefined) uuid(cursor)
    const source = this.database.connection()
    // El marcador es de este usuario; un UUID ajeno e inexistente producen el mismo error.
    if (cursor !== undefined && !(await source.query('SELECT id FROM public.contribution WHERE id=$1 AND user_id=$2',[cursor,userId])).length) {
      throw new LedgerInvalid('Marcador de página no disponible. Vuelve a cargar la primera página.')
    }
    // La comparación ocurre en PostgreSQL: conserva microsegundos y desempata por UUID, sin OFFSET.
    const rows: ContributionRow[] = await source.query(`${ownProjection} WHERE c.user_id=$1 AND
      ($2::uuid IS NULL OR (c.created_at,c.id)<(SELECT created_at,id FROM public.contribution WHERE id=$2 AND user_id=$1))
      ORDER BY c.created_at DESC,c.id DESC LIMIT $3`,[userId,cursor ?? null,limit+1])
    const items = rows.slice(0,limit).map(ownItem)
    return { items,nextCursor:rows.length>limit ? items.at(-1)!.id : null }
  }

  private async sandbox(manager: EntityManager, providerId: string) {
    const [provider] = await manager.query('SELECT id FROM public.payment_provider WHERE id=$1 AND is_active AND is_sandbox', [providerId])
    if (process.env.NODE_ENV === 'production' || !provider) throw new LedgerConflict('Solo ensayo sandbox interno; proveedor real todavía no habilitado.')
  }

  private async campaign(manager: EntityManager, id: string, rewardId: string | null) {
    // ponytail: serializa por campaña; separar por recompensa si el volumen medido lo exige.
    const [campaign] = await manager.query(`SELECT campaign_type,currency_code,min_contribution::text,
      status,deleted_at, (starts_at IS NULL OR starts_at<=clock_timestamp()) AND (ends_at IS NULL OR ends_at>clock_timestamp())
       AND NOT EXISTS(SELECT 1 FROM brotar_extension.campaign_cycle x WHERE x.campaign_id=$1 AND x.cancel_requested_by IS NOT NULL) AS open
      FROM public.campaign WHERE id=$1 FOR UPDATE`, [id])
    if (!campaign || campaign.deleted_at || campaign.status !== 'PUBLISHED' || !campaign.open) throw new LedgerConflict('La campaña no admite aportes ahora.')
    if ((campaign.campaign_type === 'DONATION') !== (rewardId === null)) throw new LedgerInvalid('La recompensa no corresponde a la modalidad.')
    return campaign as { currency_code: string; min_contribution: string | null }
  }

  private async contributor(manager: EntityManager, userId: string) {
    const [user] = await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND u.deleted_at IS NULL
      AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=now())
      AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id
        AND r.code IN ('REGISTERED_USER','SPONSOR') AND ur.revoked_at IS NULL AND ur.granted_at<=now()
        AND (ur.expires_at IS NULL OR ur.expires_at>now()))
      AND NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id
        AND r.code='AUDITOR' AND ur.revoked_at IS NULL AND ur.granted_at<=now() AND (ur.expires_at IS NULL OR ur.expires_at>now()))`, [userId])
    if (!user) throw new LedgerConflict('Cuenta no disponible para el ensayo.')
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

  async start(userId: string, input: PendingContribution): Promise<OwnContribution & { paymentId: string; paymentStatus: PaymentState }> {
    for (const id of [userId,input.campaignId,input.providerId,...(input.rewardId ? [input.rewardId] : [])]) uuid(id)
    userId=userId.toLowerCase()
    input={...input,campaignId:input.campaignId.toLowerCase(),providerId:input.providerId.toLowerCase(),rewardId:input.rewardId?.toLowerCase() ?? null}
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestKey)) throw new LedgerInvalid('La clave del intento debe ser UUID v4.')
    if (!/^[A-Z]{3}$/.test(input.currencyCode)) throw new LedgerInvalid('Moneda inválida.')
    const amount = decimal(money(input.amount))
    const key = digest(`contribution:${userId}:${input.requestKey.toLowerCase()}`)
    const fields=[input.campaignId,input.rewardId,amount,input.currencyCode,input.providerId]
    // Conservar hashes de intentos internos previos; consentimiento DEMO explícito tiene otra huella.
    const hash = digest(JSON.stringify(input.demoConsent===true?[...fields,true]:fields))
    const id = await this.database.connection().transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
      const [old] = await manager.query(`SELECT contribution_id,provider_payload->>'requestHash' AS hash
        FROM public.payment WHERE idempotency_key=$1`, [key])
      if (old) {
        if (old.hash !== hash) throw new LedgerConflict('La clave de reintento ya se usó con otros datos.')
        return old.contribution_id as string
      }
      await this.contributor(manager,userId)
      await this.sandbox(manager,input.providerId)
      const campaign = await this.campaign(manager,input.campaignId,input.rewardId)
      if (campaign.currency_code.trim() !== input.currencyCode ||
        (campaign.min_contribution !== null && money(amount)<money(campaign.min_contribution))) throw new LedgerInvalid('Moneda o mínimo de campaña inválidos.')
      await this.reward(manager,input.campaignId,input.rewardId,money(amount))
      const contributionId = randomUUID()
      await setAuditActor(manager,userId)
      await manager.query(`INSERT INTO public.contribution(id,campaign_id,user_id,reward_id,amount,currency_code,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,LEAST(now()+interval '30 minutes',(SELECT ends_at FROM public.campaign WHERE id=$2)))`, [contributionId,input.campaignId,userId,input.rewardId,amount,input.currencyCode])
      await manager.query(`INSERT INTO public.payment(contribution_id,provider_id,idempotency_key,amount,currency_code,expires_at,provider_payload)
        SELECT id,$2,$3,amount,currency_code,expires_at,jsonb_build_object('requestHash',$4::text,'mode','DEMO','demoConsent',$5::boolean)
        FROM public.contribution WHERE id=$1`, [contributionId,input.providerId,key,hash,input.demoConsent ?? false])
      await recordAudit(manager,userId,'CREATE','contribution',contributionId)
      return contributionId
    })
    const item = await this.own(userId,id)
    if (!item?.paymentId || !item.paymentStatus) throw new LedgerConflict('No se pudo recuperar el intento registrado. Consulta el aporte antes de repetir.')
    return { ...item,paymentId:item.paymentId,paymentStatus:item.paymentStatus }
  }

  /** Con campaña bloqueada primero: cierra reservas, no interpreta una fecha como cobro. */
  async expireLocked(manager: EntityManager, id: string): Promise<boolean> {
    const [row] = await manager.query(`SELECT id FROM public.contribution WHERE id=$1 AND status='PENDING' AND expires_at<=now()
      AND NOT EXISTS(SELECT 1 FROM public.payment WHERE contribution_id=$1 AND confirmed_at IS NOT NULL) FOR UPDATE`, [id])
    if (!row) return false
    const payments: { id: string; status: PaymentState }[] = await manager.query(`SELECT id,status FROM public.payment
      WHERE contribution_id=$1 AND status IN ('INITIATED','PENDING') ORDER BY attempt_number FOR UPDATE`, [id])
    await setAuditActor(manager,null)
    for (const payment of payments) {
      await manager.query("UPDATE public.payment SET status='EXPIRED' WHERE id=$1", [payment.id])
      await manager.query(`INSERT INTO public.payment_event(payment_id,provider_event_id,event_type,previous_status,new_status,payload)
        VALUES($1,$2,'demo.reservation_expired',$3,'EXPIRED','{"mode":"DEMO","source":"RESERVATION_TIMEOUT"}')`, [payment.id,digest(`expiry:${payment.id}`),payment.status])
      await recordAudit(manager,null,'STATUS_CHANGE','payment',payment.id)
    }
    await manager.query("UPDATE public.contribution SET status='EXPIRED' WHERE id=$1", [id])
    await recordAudit(manager,null,'STATUS_CHANGE','contribution',id)
    return true
  }

  /** Mantenimiento interno acotado; no hay endpoint público ni temporizador oculto. */
  async expireDue(limit = 100, providerId?: string): Promise<number> {
    if (process.env.NODE_ENV === 'production') throw new LedgerConflict('Mantenimiento DEMO no disponible en producción.')
    if (!Number.isInteger(limit) || limit<1 || limit>500) throw new LedgerInvalid('Lote de expiración entre 1 y 500.')
    if (providerId !== undefined) uuid(providerId)
    const source = this.database.connection()
    const rows: { id: string; campaign_id: string }[] = await source.query(`SELECT c.id,c.campaign_id FROM public.contribution c
      WHERE c.status='PENDING' AND c.expires_at<=now() AND EXISTS(SELECT 1 FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id
        WHERE p.contribution_id=c.id AND pp.is_sandbox AND ($2::uuid IS NULL OR p.provider_id=$2))
      AND NOT EXISTS(SELECT 1 FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id
        WHERE p.contribution_id=c.id AND (NOT pp.is_sandbox OR ($2::uuid IS NOT NULL AND p.provider_id<>$2)))
      ORDER BY c.expires_at,c.id LIMIT $1`, [limit,providerId ?? null])
    let expired = 0
    for (const row of rows) expired += await source.transaction(async manager => {
      await manager.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE', [row.campaign_id])
      return (await this.expireLocked(manager,row.id)) ? 1 : 0
    })
    return expired
  }

  /** Nuevo intento del mismo aporte. El intento anterior nunca se recicla ni se borra. */
  async retry(userId: string, id: string, requestKey: string, demoConsent?: true): Promise<OwnContribution> {
    uuid(userId); uuid(id)
    userId=userId.toLowerCase();id=id.toLowerCase()
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestKey)) throw new LedgerInvalid('La clave del intento debe ser UUID v4.')
    const key = digest(`retry:${userId}:${requestKey.toLowerCase()}`)
    await this.database.connection().transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
      await this.contributor(manager,userId)
      const [target] = await manager.query('SELECT campaign_id,reward_id FROM public.contribution WHERE id=$1 AND user_id=$2', [id,userId])
      if (!target) throw new LedgerConflict('Aporte no disponible para reintentar.')
      await manager.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE', [target.campaign_id])
      const [old] = await manager.query('SELECT contribution_id FROM public.payment WHERE idempotency_key=$1', [key])
      if (old) {
        if (old.contribution_id !== id) throw new LedgerConflict('La clave ya identifica otro aporte.')
        return
      }
      await this.expireLocked(manager,id)
      const [contribution] = await manager.query('SELECT status,amount::text,trim(currency_code) AS currency FROM public.contribution WHERE id=$1 FOR UPDATE', [id])
      const [payment] = await manager.query('SELECT provider_id,status,attempt_number FROM public.payment WHERE contribution_id=$1 ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE', [id])
      if (!payment || !['CANCELLED','EXPIRED'].includes(contribution.status) || !['FAILED','EXPIRED'].includes(payment.status)
        || payment.attempt_number>=32767 || (await manager.query(`SELECT p.id FROM public.payment p JOIN public.payment_provider pp ON pp.id=p.provider_id
          WHERE p.contribution_id=$1 AND (p.confirmed_at IS NOT NULL OR p.status IN ('INITIATED','PENDING') OR NOT pp.is_sandbox)`, [id])).length) throw new LedgerConflict('Solo un aporte fallido o vencido sin cobro confirmado ni otro intento abierto admite reintento DEMO.')
      await this.sandbox(manager,payment.provider_id)
      const campaign = await this.campaign(manager,target.campaign_id,target.reward_id)
      if (campaign.currency_code.trim()!==contribution.currency || (campaign.min_contribution!==null && money(contribution.amount)<money(campaign.min_contribution))) throw new LedgerConflict('El aporte ya no satisface la moneda o mínimo vigente de campaña.')
      await this.reward(manager,target.campaign_id,target.reward_id,money(contribution.amount),id)
      await setAuditActor(manager,userId)
      await manager.query(`UPDATE public.contribution SET status='PENDING',cancelled_at=NULL,
        expires_at=LEAST(now()+interval '30 minutes',(SELECT ends_at FROM public.campaign WHERE id=$2)) WHERE id=$1`, [id,target.campaign_id])
      await manager.query(`INSERT INTO public.payment(contribution_id,provider_id,idempotency_key,amount,currency_code,expires_at,attempt_number,provider_payload)
        SELECT id,$2,$3,amount,currency_code,expires_at,$4,jsonb_build_object('mode','DEMO','source','RETRY','demoConsent',$5::boolean)
        FROM public.contribution WHERE id=$1`, [id,payment.provider_id,key,payment.attempt_number+1,demoConsent ?? false])
      await recordAudit(manager,userId,'STATUS_CHANGE','contribution',id)
    })
    const item = await this.own(userId,id)
    if (!item) throw new LedgerConflict('No se pudo recuperar el aporte. Consulta su estado antes de repetir.')
    return item
  }

  /** Solo servidor: un simulador DEMO puede incluir recibo y aplicación en la misma transacción. */
  async applyVerifiedEvent(event: VerifiedPaymentEvent, transaction?: EntityManager): Promise<{ status: PaymentState; replayed: boolean }> {
    uuid(event.providerId); uuid(event.paymentId)
    event={...event,providerId:event.providerId.toLowerCase(),paymentId:event.paymentId.toLowerCase()}
    if (typeof event.eventId !== 'string' || !/^[\x21-\x7e]{1,200}$/.test(event.eventId) || !/^[A-Z]{3}$/.test(event.currencyCode)) throw new LedgerInvalid('Identificador de evento o moneda inválidos.')
    const amount = decimal(money(event.amount)), fee = decimal(money(event.feeAmount ?? '0',true))
    if (money(fee,true)>money(amount)) throw new LedgerInvalid('La comisión supera el aporte.')
    const reference = event.externalReference ?? null
    if (reference !== null && !/^[\x21-\x7e]{1,200}$/.test(reference)) throw new LedgerInvalid('Referencia externa inválida.')
    if (event.state === 'CONFIRMED' && reference === null) throw new LedgerInvalid('La confirmación requiere referencia externa.')
    const key = digest(`${event.providerId}:${event.eventId}`)
    const hash = digest(JSON.stringify([event.paymentId,event.state,amount,event.currencyCode,reference,fee]))
    try {
      const apply = async (manager: EntityManager) => {
        await this.sandbox(manager,event.providerId)
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
        const [seen] = await manager.query(`SELECT e.payment_id,p.status,e.payload->>'hash' AS hash
          FROM public.payment_event e JOIN public.payment p ON p.id=e.payment_id WHERE e.provider_event_id=$1`, [key])
        if (seen) {
          if (seen.payment_id !== event.paymentId || seen.hash !== hash) throw new LedgerConflict('Evento repetido con datos diferentes.')
          return { status: seen.status as PaymentState, replayed: true }
        }
        // El evento es de una integración interna, no una sesión humana ni el patrocinador.
        await setAuditActor(manager,null)
        const [target] = await manager.query(`SELECT c.id,c.campaign_id,c.reward_id FROM public.payment p
          JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 AND p.provider_id=$2`, [event.paymentId,event.providerId])
        if (!target) throw new LedgerConflict('Pago no disponible para ese proveedor.')
        await manager.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE', [target.campaign_id])
        const [payment] = await manager.query(`SELECT p.status,p.amount::text,trim(p.currency_code) AS currency,
          p.fee_amount::text AS fee,p.external_reference,p.confirmed_at,c.status AS contribution_status,c.expires_at>now() AS reserved
          FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1 FOR UPDATE OF p,c`, [event.paymentId])
        if (money(payment.amount)!==money(amount) || payment.currency !== event.currencyCode) throw new LedgerConflict('El evento no coincide con el importe y moneda originales.')
        const next = nextPaymentState(payment.status,event.state)
        if (next === 'CONFIRMED' && payment.status !== 'CONFIRMED') {
          if ((await manager.query('SELECT payment_id FROM brotar_extension.demo_compensation WHERE payment_id=$1',[event.paymentId])).length) throw new LedgerConflict('El recibo DEMO ya fue compensado: no se puede confirmar.')
          if (payment.contribution_status !== 'PENDING' || !payment.reserved) throw new LedgerConflict('Reserva vencida o aporte terminal: requiere conciliación, no confirmar silenciosamente.')
          await this.campaign(manager,target.campaign_id,target.reward_id)
          await this.reward(manager,target.campaign_id,target.reward_id,money(amount),target.id)
        }
        if (payment.confirmed_at && event.state === 'CONFIRMED' &&
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
        await recordAudit(manager,null,'PAYMENT_EVENT','payment',event.paymentId)
        return { status: next, replayed: false }
      }
      return await (transaction ? apply(transaction) : this.database.connection().transaction(apply))
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new LedgerConflict('Referencia o confirmación ya utilizada. No se registró otro cobro.')
      throw error
    }
  }
}
