import { Injectable, PayloadTooLargeException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { reportCsv, ReportInvalid, validatePeriod, type ReportFilters } from '../domain/report'

export interface PaymentOperation {
  kind: 'PAYMENT'; id: string; contributionId: string; reference: string; campaignId: string; campaignTitle: string
  sponsorId: string; createdAt: string; status: string; contributionStatus: string; currencyCode: string
  amount: string; feeAmount: string; netAmount: string; refundedAmount: string; sandbox: boolean
}
export interface OperationTotal { currencyCode: string; status: string; count: string; amount: string; feeAmount: string; netAmount: string; refundedAmount: string }
export interface OperationsReport { items: PaymentOperation[]; totals: OperationTotal[]; nextCursor: string | null }
type OperationRow = Omit<PaymentOperation,'createdAt'> & { createdAt: Date }
const relation=`FROM public.payment p JOIN public.contribution c ON c.id=p.contribution_id
  JOIN public.campaign campaign ON campaign.id=c.campaign_id JOIN public.payment_provider provider ON provider.id=p.provider_id
  LEFT JOIN LATERAL (SELECT COALESCE(sum(r.amount),0) AS amount FROM public.refund r
    WHERE r.payment_id=p.id AND r.status='REFUNDED') refunded ON true`
const projection=`SELECT 'PAYMENT' AS kind,p.id,c.id AS "contributionId",c.reference_code AS reference,
  c.campaign_id AS "campaignId",campaign.title AS "campaignTitle",c.user_id AS "sponsorId",p.created_at AS "createdAt",
  p.status,c.status AS "contributionStatus",trim(p.currency_code) AS "currencyCode",p.amount::text AS amount,
  p.fee_amount::text AS "feeAmount",p.net_amount::text AS "netAmount",refunded.amount::numeric(16,2)::text AS "refundedAmount",
  provider.is_sandbox AS sandbox ${relation}`
const where=`WHERE ($1::uuid IS NULL OR c.campaign_id=$1) AND ($2::text IS NULL OR p.status::text=$2)
  AND ($3::date IS NULL OR p.created_at>=($3::date::timestamp AT TIME ZONE 'UTC'))
  AND ($4::date IS NULL OR p.created_at<(($4::date+1)::timestamp AT TIME ZONE 'UTC'))`
const parameters=(filters: ReportFilters)=>[filters.campaignId ?? null,filters.status ?? null,filters.from ?? null,filters.to ?? null]
const item=(row: OperationRow): PaymentOperation=>({...row,createdAt:row.createdAt.toISOString()})

@Injectable()
export class FinancialOperations {
  constructor(private readonly database: DatabaseService) {}
  private async rows(manager: EntityManager, filters: ReportFilters, limit: number, cursor?: string) {
    return manager.query(`${projection} ${where} AND ($5::uuid IS NULL OR (p.created_at,p.id)<
      (SELECT created_at,id FROM public.payment WHERE id=$5)) ORDER BY p.created_at DESC,p.id DESC LIMIT $6`,
    [...parameters(filters),cursor ?? null,limit]) as Promise<OperationRow[]>
  }
  async list(filters: ReportFilters, limit: number, cursor?: string): Promise<OperationsReport> {
    validatePeriod(filters)
    // Página y totales pertenecen a la misma instantánea; los importes se agregan en numeric, no en JS.
    return this.database.connection().transaction('REPEATABLE READ',async manager=>{
      await manager.query('SET TRANSACTION READ ONLY')
      if (cursor && !(await manager.query('SELECT id FROM public.payment WHERE id=$1',[cursor])).length) throw new ReportInvalid('Marcador no disponible. Vuelve a cargar la primera página.')
      const rows=await this.rows(manager,filters,limit+1,cursor)
      const totals: OperationTotal[]=await manager.query(`SELECT trim(p.currency_code) AS "currencyCode",p.status,
        count(*)::text AS count,sum(p.amount)::text AS amount,sum(p.fee_amount)::text AS "feeAmount",
        sum(p.net_amount)::text AS "netAmount",sum(refunded.amount)::numeric(24,2)::text AS "refundedAmount"
        ${relation} ${where} GROUP BY p.currency_code,p.status ORDER BY p.currency_code,p.status`,parameters(filters))
      const items=rows.slice(0,limit).map(item)
      return {items,totals,nextCursor:rows.length>limit ? items.at(-1)!.id : null}
    })
  }
  async export(filters: ReportFilters): Promise<string> {
    validatePeriod(filters)
    return this.database.connection().transaction('REPEATABLE READ',async manager=>{
      await manager.query('SET TRANSACTION READ ONLY')
      const rows=await this.rows(manager,filters,5001)
      if (rows.length>5000) throw new PayloadTooLargeException('El reporte supera 5000 pagos. Acota las fechas o la campaña; no se exportó una lista incompleta.')
      return reportCsv([
        ['tipo','pago_id','aporte_id','referencia_aporte','campana_id','campana','patrocinador_id','fecha_utc','estado_pago',
          'estado_aporte','moneda','importe','comision','neto_intento','devolucion_completada','proveedor_sandbox'],
        ...rows.map(row=>{ const value=item(row); return [value.kind,value.id,value.contributionId,value.reference,value.campaignId,
          value.campaignTitle,value.sponsorId,value.createdAt,value.status,value.contributionStatus,value.currencyCode,
          value.amount,value.feeAmount,value.netAmount,value.refundedAmount,value.sandbox] })
      ])
    })
  }
}
