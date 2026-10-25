import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { LedgerConflict, LedgerInvalid, money, uuid } from '../../contributions/domain/payment'
import { ContributionLedger } from '../../contributions/infrastructure/contribution-ledger'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { recordAudit, setAuditActor } from '../../shared/infrastructure/database/audit'
import { compareSettlement, DEMO_LABEL, digest, reason, reconciliationPeriod, requestKey, settlementTotal, type SettlementRecord } from '../domain/demo'
import { assertDemoEnabled, demoProvider, lockDemo } from './demo-payments'

/** Rol vivo dentro de la transacción; ADMIN y AUDITOR no equivalen a FINANCE. */
async function financeActor(manager: EntityManager,actor: string) {
  // Mismo orden que la administración de responsabilidades: cuenta antes de concesión.
  await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR SHARE',[actor])
  const [allowed]=await manager.query(`SELECT ur.id FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id
    JOIN public.app_user u ON u.id=ur.user_id WHERE ur.user_id=$1 AND r.code='FINANCE' AND ur.revoked_at IS NULL
    AND ur.granted_at<=now() AND (ur.expires_at IS NULL OR ur.expires_at>now()) AND u.deleted_at IS NULL
    AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=now())
    AND EXISTS(SELECT 1 FROM public.role_permission rp JOIN public.permission p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.code='finance.operate')
    AND NOT EXISTS(SELECT 1 FROM public.user_role ar JOIN public.role rr ON rr.id=ar.role_id WHERE ar.user_id=u.id AND rr.code='AUDITOR'
      AND ar.revoked_at IS NULL AND ar.granted_at<=now() AND (ar.expires_at IS NULL OR ar.expires_at>now())) FOR SHARE OF ur`,[actor])
  if (!allowed) throw new ForbiddenException('Esta operación DEMO requiere Finanzas vigente y no ser auditor.')
}

@Injectable()
export class DemoReconciliation {
  constructor(private readonly database: DatabaseService,private readonly ledger: ContributionLedger) {}

  async currencies() {
    assertDemoEnabled()
    // Incluye monedas inactivas: una operación histórica sigue siendo conciliable.
    return this.database.connection().query('SELECT trim(code) AS code,name FROM public.currency ORDER BY code')
  }

  async pending(input: {from: string;to: string;currencyCode: string;limit: number;cursor?: string}) {
    assertDemoEnabled();reconciliationPeriod(input.from,input.to,input.currencyCode)
    if (!Number.isInteger(input.limit) || input.limit<1 || input.limit>50) throw new LedgerInvalid('Página entre 1 y 50.')
    if (input.cursor) uuid(input.cursor)
    const manager=this.database.connection().manager,providerId=await demoProvider(manager)
    if (!(await manager.query('SELECT code FROM public.currency WHERE code=$1',[input.currencyCode])).length) throw new LedgerInvalid('Moneda inexistente en el catálogo.')
    // El marcador puede haber dejado de estar pendiente entre páginas; conserva su posición.
    if (input.cursor && !(await manager.query('SELECT id FROM public.payment WHERE id=$1 AND provider_id=$2 AND currency_code=$3',[input.cursor,providerId,input.currencyCode])).length) throw new LedgerConflict('Marcador de pendientes no disponible.')
    const rows=await manager.query(`SELECT p.id,p.contribution_id AS "contributionId",c.reference_code AS reference,
      c.campaign_id AS "campaignId",camp.title AS "campaignTitle",p.amount::text,trim(p.currency_code) AS "currencyCode",
      p.status,p.created_at AS "createdAt",p.expires_at AS "expiresAt",COALESCE(p.expires_at<=now(),false) AS expired,
      EXISTS(SELECT 1 FROM brotar_extension.demo_event e WHERE e.payment_id=p.id AND e.processing IN ('NEEDS_REVIEW','RECEIVED')) AS "needsReview"
      FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id JOIN public.campaign camp ON camp.id=c.campaign_id
      WHERE p.provider_id=$1 AND p.currency_code=$2
      AND p.created_at>=($3::date::timestamp AT TIME ZONE 'UTC') AND p.created_at<((($4::date+1)::timestamp) AT TIME ZONE 'UTC')
      AND (p.status IN ('INITIATED','PENDING') OR EXISTS(SELECT 1 FROM brotar_extension.demo_event e WHERE e.payment_id=p.id AND e.processing IN ('NEEDS_REVIEW','RECEIVED')))
      AND ($5::uuid IS NULL OR (p.created_at,p.id)<(SELECT created_at,id FROM public.payment WHERE id=$5))
      ORDER BY p.created_at DESC,p.id DESC LIMIT $6`,[providerId,input.currencyCode,input.from,input.to,input.cursor ?? null,input.limit+1])
    return {mode:'DEMO',label:DEMO_LABEL,items:rows.slice(0,input.limit),nextCursor:rows.length>input.limit?rows[input.limit-1].id:null}
  }

  private async records(manager: EntityManager,providerId: string,currency: string,period?: {from: string;to: string},reference?: string) {
    const args=[providerId,currency,period?.from ?? null,period?.to ?? null,reference ?? null]
    const internal: SettlementRecord[]=await manager.query(`SELECT id AS "paymentId",external_reference AS reference,amount::text FROM public.payment
      WHERE provider_id=$1 AND currency_code=$2 AND confirmed_at IS NOT NULL
      AND ($3::date IS NULL OR confirmed_at>=($3::date::timestamp AT TIME ZONE 'UTC') AND confirmed_at<((($4::date+1)::timestamp) AT TIME ZONE 'UTC'))
      AND ($5::text IS NULL OR external_reference=$5) ORDER BY id LIMIT 1001`,args)
    // Primera observación por transacción, no la fecha de cada repetición de su aviso.
    const observed: SettlementRecord[]=await manager.query(`SELECT e.payment_id AS "paymentId",e.external_reference AS reference,e.amount::text
      FROM brotar_extension.demo_event e JOIN public.payment p ON p.id=e.payment_id WHERE p.provider_id=$1 AND e.currency_code=$2
      AND e.observed_status='CONFIRMED' AND ($5::text IS NULL OR e.external_reference=$5)
      GROUP BY e.payment_id,e.external_reference,e.amount HAVING ($3::date IS NULL OR min(e.recorded_at)>=($3::date::timestamp AT TIME ZONE 'UTC') AND min(e.recorded_at)<((($4::date+1)::timestamp) AT TIME ZONE 'UTC'))
      ORDER BY e.payment_id,e.external_reference,e.amount LIMIT 1001`,args)
    if (internal.length>1000 || observed.length>1000) throw new LedgerConflict('Demasiadas transacciones en el lote. Divide el período.')
    return {internal,observed}
  }

  async create(actor: string,input: {from: string;to: string;currencyCode: string;requestKey: string}) {
    assertDemoEnabled();requestKey(input.requestKey);reconciliationPeriod(input.from,input.to,input.currencyCode)
    const id=await this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager);await financeActor(manager,actor)
      if (!(await manager.query('SELECT code FROM public.currency WHERE code=$1',[input.currencyCode])).length) throw new LedgerInvalid('Moneda inexistente en el catálogo.')
      const key=digest(`demo-reconciliation:${actor}:${input.requestKey.toLowerCase()}`),hash=digest(JSON.stringify([input.from,input.to,input.currencyCode]))
      const [old]=await manager.query('SELECT reconciliation_id,request_hash FROM brotar_extension.demo_reconciliation WHERE request_key=$1',[key])
      if (old) {
        if (old.request_hash!==hash) throw new LedgerConflict('La clave del lote ya identifica otro período o moneda.')
        return old.reconciliation_id as string
      }
      const {internal,observed}=await this.records(manager,providerId,input.currencyCode,input)
      const items=compareSettlement(internal,observed)
      const [batch]=await manager.query(`INSERT INTO public.reconciliation(provider_id,period_start,period_end,total_internal,total_provider,created_by,notes)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[providerId,input.from,input.to,
      settlementTotal(items.map(x=>x.internalAmount)),settlementTotal(items.map(x=>x.providerAmount)),actor,DEMO_LABEL])
      await manager.query(`INSERT INTO brotar_extension.demo_reconciliation(reconciliation_id,currency_code,request_key,request_hash) VALUES($1,$2,$3,$4)`,[batch.id,input.currencyCode,key,hash])
      for (const item of items) {
        const [row]=await manager.query(`INSERT INTO public.reconciliation_item(reconciliation_id,payment_id,external_reference,internal_amount,provider_amount,status)
          VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[batch.id,item.paymentId,item.reference,item.internalAmount,item.providerAmount,item.classification])
        await manager.query('INSERT INTO brotar_extension.demo_reconciliation_item(item_id,original_status) VALUES($1,$2)',[row.id,item.classification])
      }
      await setAuditActor(manager,actor);await recordAudit(manager,actor,'CREATE','reconciliation',batch.id)
      return batch.id as string
    })
    return this.detail(id)
  }

  async list(limit=25,cursor?: string) {
    assertDemoEnabled()
    if (!Number.isInteger(limit) || limit<1 || limit>50) throw new LedgerConflict('Página entre 1 y 50.')
    if (cursor) uuid(cursor)
    const manager=this.database.connection().manager,providerId=await demoProvider(manager)
    if (cursor && !(await manager.query(`SELECT r.id FROM public.reconciliation r JOIN brotar_extension.demo_reconciliation d ON d.reconciliation_id=r.id WHERE r.id=$1 AND r.provider_id=$2`,[cursor,providerId])).length) throw new LedgerConflict('Marcador de conciliación no disponible.')
    const rows=await manager.query(`SELECT r.id,r.period_start::text AS "from",r.period_end::text AS "to",r.status,trim(d.currency_code) AS "currencyCode",
      r.total_internal::text AS "totalInternal",r.total_provider::text AS "totalProvider",r.difference::text,r.created_at AS "createdAt"
      FROM public.reconciliation r JOIN brotar_extension.demo_reconciliation d ON d.reconciliation_id=r.id WHERE r.provider_id=$1
      AND ($2::uuid IS NULL OR (r.created_at,r.id)<(SELECT created_at,id FROM public.reconciliation WHERE id=$2))
      ORDER BY r.created_at DESC,r.id DESC LIMIT $3`,[providerId,cursor ?? null,limit+1])
    return {mode:'DEMO',label:DEMO_LABEL,items:rows.slice(0,limit),nextCursor:rows.length>limit?rows[limit-1].id:null}
  }

  async detail(id: string) {
    assertDemoEnabled();uuid(id)
    const manager=this.database.connection().manager,providerId=await demoProvider(manager)
    const [batch]=await manager.query(`SELECT r.id,r.period_start::text AS "from",r.period_end::text AS "to",r.status,trim(d.currency_code) AS "currencyCode",
      r.total_internal::text AS "totalInternal",r.total_provider::text AS "totalProvider",r.difference::text,d.snapshot_at AS "snapshotAt",
      r.created_by AS "createdBy",r.closed_by AS "closedBy",r.closed_at AS "closedAt"
      FROM public.reconciliation r JOIN brotar_extension.demo_reconciliation d ON d.reconciliation_id=r.id WHERE r.id=$1 AND r.provider_id=$2`,[id,providerId])
    if (!batch) throw new NotFoundException('Conciliación DEMO no disponible.')
    const items=await manager.query(`SELECT i.id,i.payment_id AS "paymentId",i.external_reference AS reference,i.status,d.original_status AS "originalStatus",
      i.internal_amount::text AS "internalAmount",i.provider_amount::text AS "providerAmount",d.resolution,d.reason,i.resolved_by AS "resolvedBy",i.resolved_at AS "resolvedAt",
      ctb.reference_code AS "internalReference",p.status AS "internalStatus",
      c.amount::text AS "compensationAmount" FROM public.reconciliation_item i JOIN brotar_extension.demo_reconciliation_item d ON d.item_id=i.id
      LEFT JOIN brotar_extension.demo_compensation c ON c.payment_id=i.payment_id AND c.external_reference=i.external_reference
      LEFT JOIN public.payment p ON p.id=i.payment_id LEFT JOIN public.contribution ctb ON ctb.id=p.contribution_id
      WHERE i.reconciliation_id=$1 ORDER BY i.id`,[id])
    return {mode:'DEMO',label:DEMO_LABEL,...batch,items}
  }

  private async current(manager: EntityManager,providerId: string,currency: string,reference: string) {
    const {internal,observed}=await this.records(manager,providerId,currency,undefined,reference)
    return compareSettlement(internal,observed)[0]
  }

  private async compensated(manager: EntityManager,item: ReturnType<typeof compareSettlement>[number]|undefined,currency: string) {
    if (!item || item.classification!=='MISSING_INTERNAL' || !item.paymentId) return false
    const [row]=await manager.query(`SELECT payment_id FROM brotar_extension.demo_compensation WHERE payment_id=$1
      AND external_reference=$2 AND currency_code=$3 AND amount=$4`,[item.paymentId,item.reference,currency,item.providerAmount])
    return Boolean(row)
  }

  async resolve(actor: string,batchId: string,itemId: string,action: 'RECHECK'|'COMPENSATE_DEMO',explanation: string) {
    assertDemoEnabled();uuid(batchId);uuid(itemId);const note=reason(explanation)
    if (!['RECHECK','COMPENSATE_DEMO'].includes(action)) throw new LedgerConflict('Resolución no admitida.')
    await this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager);await financeActor(manager,actor)
      const [row]=await manager.query(`SELECT r.status AS batch_status,i.id,i.status,i.external_reference,trim(d.currency_code) AS currency,
        s.resolution,s.reason FROM public.reconciliation r JOIN brotar_extension.demo_reconciliation d ON d.reconciliation_id=r.id
        JOIN public.reconciliation_item i ON i.reconciliation_id=r.id JOIN brotar_extension.demo_reconciliation_item s ON s.item_id=i.id
        WHERE r.id=$1 AND i.id=$2 AND r.provider_id=$3 FOR UPDATE OF r,i`,[batchId,itemId,providerId])
      if (!row) throw new NotFoundException('Ítem DEMO no disponible.')
      if (row.batch_status==='CLOSED') throw new LedgerConflict('El lote cerrado es inmutable; crea otro lote.')
      if (row.status==='RESOLVED') {
        if (row.resolution!==action || row.reason!==note) throw new LedgerConflict('Ya existe otra resolución; no se sobrescribe.')
        return
      }
      const current=await this.current(manager,providerId,row.currency,row.external_reference)
      if (action==='COMPENSATE_DEMO') {
        if (!current || current.classification!=='MISSING_INTERNAL' || !current.paymentId) throw new LedgerConflict('Solo se compensa un recibo DEMO inequívoco sin confirmación interna. No se fuerza el cuadre.')
        const [target]=await manager.query(`SELECT c.campaign_id,c.user_id FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id WHERE p.id=$1`,[current.paymentId])
        if (!target || target.user_id===actor) throw new ForbiddenException('Otra persona de Finanzas debe resolver su propio aporte.')
        await manager.query('SELECT id FROM public.campaign WHERE id=$1 FOR UPDATE',[target.campaign_id])
        const [payment]=await manager.query('SELECT amount::text,confirmed_at,trim(currency_code) AS currency FROM public.payment WHERE id=$1 FOR UPDATE',[current.paymentId])
        if (payment.confirmed_at || payment.currency!==row.currency || money(payment.amount)!==money(current.providerAmount) || current.reference!==`DEMO-${current.paymentId}`) throw new LedgerConflict('Recibo ambiguo o distinto del intento. Mantén la incidencia abierta.')
        const [event]=await manager.query(`SELECT id FROM brotar_extension.demo_event WHERE payment_id=$1 AND observed_status='CONFIRMED'
          AND external_reference=$2 ORDER BY recorded_at,id LIMIT 1`,[current.paymentId,current.reference])
        await manager.query(`INSERT INTO brotar_extension.demo_compensation(payment_id,event_id,external_reference,amount,currency_code,reason,actor_id)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(payment_id) DO NOTHING`,[current.paymentId,event.id,current.reference,current.providerAmount,row.currency,note,actor])
        if (!await this.compensated(manager,current,row.currency)) throw new LedgerConflict('Existe otra compensación incompatible; requiere investigar, no sobrescribir.')
        await manager.query(`UPDATE brotar_extension.demo_event SET processing='COMPENSATED',reason_code='FINANCE_DEMO_COMPENSATION',processed_at=now()
          WHERE payment_id=$1 AND observed_status='CONFIRMED' AND external_reference=$2`,[current.paymentId,current.reference])
      } else if (current?.classification!=='MATCHED' && !await this.compensated(manager,current,row.currency)) {
        throw new LedgerConflict('La evidencia actual aún no cuadra. No se permite resolver solo reconociendo la diferencia.')
      } else if (current?.classification==='MATCHED') {
        await manager.query(`UPDATE brotar_extension.demo_event SET processing='RECONCILED',reason_code='FINANCE_RECHECK',processed_at=now()
          WHERE payment_id=$1 AND external_reference=$2 AND processing='NEEDS_REVIEW' AND observed_status='CONFIRMED'`,[current.paymentId,current.reference])
      }
      await manager.query("UPDATE public.reconciliation_item SET status='RESOLVED',resolved_by=$2,resolved_at=now() WHERE id=$1",[itemId,actor])
      await manager.query('UPDATE brotar_extension.demo_reconciliation_item SET resolution=$2,reason=$3 WHERE item_id=$1',[itemId,action,note])
      await setAuditActor(manager,actor);await recordAudit(manager,actor,'STATUS_CHANGE','reconciliation_item',itemId)
    })
    return this.detail(batchId)
  }

  async close(actor: string,id: string) {
    assertDemoEnabled();uuid(id)
    await this.database.connection().transaction(async manager=>{
      const providerId=await demoProvider(manager)
      await lockDemo(manager);await financeActor(manager,actor)
      const [batch]=await manager.query(`SELECT r.status,trim(d.currency_code) AS currency FROM public.reconciliation r
        JOIN brotar_extension.demo_reconciliation d ON d.reconciliation_id=r.id WHERE r.id=$1 AND r.provider_id=$2 FOR UPDATE OF r`,[id,providerId])
      if (!batch) throw new NotFoundException('Lote DEMO no disponible.')
      if (batch.status==='CLOSED') return
      const items=await manager.query('SELECT status,external_reference FROM public.reconciliation_item WHERE reconciliation_id=$1',[id])
      for (const item of items) {
        if (!['MATCHED','RESOLVED'].includes(item.status)) throw new LedgerConflict('Hay diferencias sin resolver; no se cierra el lote.')
        const current=await this.current(manager,providerId,batch.currency,item.external_reference)
        if (current?.classification!=='MATCHED' && !await this.compensated(manager,current,batch.currency)) throw new LedgerConflict('La evidencia cambió desde la revisión. Abre un lote nuevo; no se fuerza el cierre.')
      }
      await setAuditActor(manager,actor)
      await manager.query("UPDATE public.reconciliation SET status='CLOSED',closed_by=$2,closed_at=now() WHERE id=$1",[id,actor])
      await recordAudit(manager,actor,'STATUS_CHANGE','reconciliation',id)
    })
    return this.detail(id)
  }

  async expire(actor: string,limit: number) {
    assertDemoEnabled()
    const providerId=await this.database.connection().transaction(async manager=>{await financeActor(manager,actor);return demoProvider(manager)})
    return {mode:'DEMO',label:DEMO_LABEL,expired:await this.ledger.expireDue(limit,providerId)}
  }
}
