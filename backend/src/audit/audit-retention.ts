import type { DataSource } from 'typeorm'

/** Política del MVP, no plazo legal: 12 meses de detalle y estadísticas anónimas después. */
export const AUDIT_RETENTION_MONTHS = 12
const activeWork = `SELECT
  (SELECT count(*) FROM public.support_case WHERE status NOT IN ('RESOLVED','CLOSED'))::text AS support,
  (SELECT count(*) FROM public.dispute WHERE status NOT IN ('RESOLVED','CLOSED'))::text AS disputes,
  (SELECT count(*) FROM brotar_extension.demo_dispute WHERE financial_hold)::text AS disputeHolds,
  (SELECT count(*) FROM public.verification WHERE status IN ('PENDING','IN_REVIEW','REQUIRES_INFO'))::text AS verifications,
  (SELECT count(*) FROM public.payment WHERE status IN ('INITIATED','PENDING','DISPUTED'))::text AS payments,
  (SELECT count(*) FROM public.refund WHERE status IN ('REQUESTED','PROCESSING'))::text AS refunds,
  (SELECT count(*) FROM public.disbursement WHERE status IN ('PENDING','APPROVED','PROCESSING'))::text AS disbursements,
  (SELECT count(*) FROM public.reconciliation WHERE status<>'CLOSED')::text AS reconciliations,
  (SELECT count(*) FROM brotar_extension.demo_event WHERE processing IN ('RECEIVED','NEEDS_REVIEW'))::text AS demoReceipts,
  (SELECT count(*) FROM public.campaign WHERE status NOT IN ('CLOSED','CANCELLED','REJECTED'))::text AS campaigns`

/** Solo mantenimiento con conexión administrativa; jamás se inyecta en una ruta HTTP. */
export async function auditRetention(source: DataSource, apply = false) {
  return source.transaction(async manager => {
    if (apply) {
      // Fail-fast en vez de bloquear operaciones activas o esperar interbloqueos.
      await manager.query(`LOCK TABLE public.audit_log,public.campaign,public.support_case,public.dispute,
        public.payment,public.refund,public.disbursement,public.reconciliation,public.verification,brotar_extension.demo_dispute,brotar_extension.demo_event IN SHARE ROW EXCLUSIVE MODE NOWAIT`)
    }
    const [holds]: Record<string, string>[] = await manager.query(activeWork)
    const held = Object.values(holds!).some(count => BigInt(count)>0n)
    const [summary]: { cutoff: Date; eligible: string }[] = await manager.query(`SELECT now()-interval '12 months' AS cutoff,
      (SELECT count(*) FROM public.audit_log WHERE occurred_at<now()-interval '12 months')::text AS eligible`)
    const result = { mode: apply ? 'APPLY' : 'PLAN', retentionMonths: AUDIT_RETENTION_MONTHS,
      cutoff: summary!.cutoff.toISOString(), eligible: summary!.eligible, holds: holds!, held, processed: '0',
      archive: 'MONTH_ACTION_COUNT_ONLY', businessHistoryDeleted: false }
    if (!apply || held || summary!.eligible==='0') return result
    const [processed]: { n: string }[] = await manager.query(`WITH selected AS MATERIALIZED (
        SELECT id,occurred_at,action FROM public.audit_log WHERE occurred_at<now()-interval '12 months' ORDER BY id LIMIT 5000
      ), aggregated AS (
        INSERT INTO brotar_extension.audit_monthly(month_utc,action,event_count)
        SELECT date_trunc('month',occurred_at AT TIME ZONE 'UTC')::date,action,count(*) FROM selected GROUP BY 1,2
        ON CONFLICT(month_utc,action) DO UPDATE SET event_count=brotar_extension.audit_monthly.event_count+EXCLUDED.event_count
        RETURNING 1
      ), removed AS (
        DELETE FROM public.audit_log a USING selected s WHERE a.id=s.id RETURNING a.id
      ) SELECT count(*)::text AS n FROM removed`)
    return { ...result, processed: processed!.n }
  })
}
