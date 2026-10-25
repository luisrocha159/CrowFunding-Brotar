import { Inject, Injectable, Logger, ServiceUnavailableException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { DataSource } from 'typeorm'
import {ACCESS_POLICY} from '../../../roles/domain/access-policy'
import { createDataSource } from './data-source'
import type { DatabaseConfig } from './database.config'

export const DATABASE_CONFIG = Symbol('DATABASE_CONFIG')

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private readonly source: DataSource | null

  constructor(@Inject(DATABASE_CONFIG) config: DatabaseConfig) {
    this.source = config.enabled ? createDataSource(config) : null
  }

  async onModuleInit(): Promise<void> {
    if (!this.source) return
    try { await this.source.initialize() }
    catch { this.logger.warn('PostgreSQL no disponible. Revisa configuración y restauración; readiness devuelve 503.') }
  }

  async isReady(): Promise<boolean> {
    if (!this.source?.isInitialized) return false
    try {
      // Una conexión a una base vacía no significa que la entrega esté preparada.
      const rows: { ready: boolean }[] = await this.source.query(`
        SELECT to_regclass('public.app_user') IS NOT NULL
          AND to_regclass('public.user_profile') IS NOT NULL
          AND to_regclass('public.role') IS NOT NULL
          AND to_regclass('public.organization') IS NOT NULL
          AND to_regclass('brotar_extension.campaign_identity') IS NOT NULL
          AND to_regclass('brotar_extension.stage_claim') IS NOT NULL
          AND to_regclass('brotar_extension.request_idempotency') IS NOT NULL
          AND to_regclass('brotar_extension.rate_bucket') IS NOT NULL
          AND to_regclass('public.brotar_payment_provider_reference_uq') IS NOT NULL
          AND has_table_privilege(current_user,'public.refund','SELECT')
          AND has_table_privilege(current_user,'public.audit_log','SELECT,INSERT')
          AND NOT has_table_privilege(current_user,'public.audit_log','UPDATE')
          AND NOT has_table_privilege(current_user,'public.audit_log','DELETE')
          AND to_regclass('brotar_extension.audit_monthly') IS NOT NULL
          AND to_regclass('brotar_extension.email_challenge') IS NOT NULL
          AND to_regclass('brotar_extension.mail_delivery') IS NOT NULL
          AND to_regclass('brotar_extension.notification_source') IS NOT NULL
          AND has_column_privilege(current_user,'public.app_user','email_verified_at','UPDATE')
          AND to_regclass('brotar_extension.demo_event') IS NOT NULL
          AND to_regclass('brotar_extension.demo_compensation') IS NOT NULL
          AND to_regclass('brotar_extension.demo_reconciliation') IS NOT NULL
          AND to_regclass('brotar_extension.demo_reconciliation_item') IS NOT NULL
          AND to_regclass('brotar_extension.demo_refund') IS NOT NULL
          AND to_regclass('brotar_extension.demo_refund_event') IS NOT NULL
          AND to_regclass('brotar_extension.demo_dispute') IS NOT NULL
          AND to_regclass('brotar_extension.demo_dispute_event') IS NOT NULL
          AND to_regclass('brotar_extension.demo_dispute_message') IS NOT NULL
          AND to_regclass('brotar_extension.campaign_cycle_event') IS NOT NULL
          AND to_regclass('brotar_extension.campaign_final_report') IS NOT NULL
          AND to_regclass('brotar_extension.campaign_reward_evidence') IS NOT NULL
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='campaign.closure.review')
          AND to_regclass('brotar_extension.demo_destination') IS NOT NULL
          AND to_regclass('brotar_extension.demo_disbursement_event') IS NOT NULL
          AND has_column_privilege(current_user,'public.disbursement','status','UPDATE')
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='campaign.lifecycle.manage')
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='verification.read')
          AND has_column_privilege(current_user,'public.verification','status','UPDATE')
          AND has_column_privilege(current_user,'public.refund','status','UPDATE')
          AND has_column_privilege(current_user,'public.dispute','status','UPDATE')
          AND NOT has_table_privilege(current_user,'brotar_extension.demo_refund_event','UPDATE')
          AND NOT has_table_privilege(current_user,'brotar_extension.demo_dispute_event','DELETE')
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='contribution.write.own')
          AND has_column_privilege(current_user,'public.user_role','revoked_at','UPDATE')
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='roles.manage')
          AND EXISTS(SELECT 1 FROM public.permission WHERE code='campaign.review.decide') AS ready
      `)
      if(rows[0]?.ready!==true)return false
      // Cada permiso declarado debe existir con todas sus concesiones necesarias. No basta conectar.
      const matrix=Object.entries(ACCESS_POLICY).flatMap(([code,rule])=>rule.roles.map(role=>({code,role})))
      const [policy]:{ready:boolean}[]=await this.source.query(`SELECT NOT EXISTS(
        SELECT 1 FROM jsonb_to_recordset($1::jsonb) expected(code text,role text)
        WHERE NOT EXISTS(SELECT 1 FROM public.permission p JOIN public.role_permission rp ON rp.permission_id=p.id JOIN public.role r ON r.id=rp.role_id
          WHERE p.code=expected.code AND r.code=expected.role)) AS ready`,[JSON.stringify(matrix)])
      return policy?.ready===true
    } catch { return false }
  }

  connection(): DataSource {
    if (!this.source?.isInitialized) throw new ServiceUnavailableException()
    return this.source
  }

  async onModuleDestroy(): Promise<void> {
    if (this.source?.isInitialized) await this.source.destroy()
  }
}
