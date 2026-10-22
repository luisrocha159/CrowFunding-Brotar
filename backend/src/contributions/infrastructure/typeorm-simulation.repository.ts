import { ForbiddenException, Injectable } from '@nestjs/common'
import { BASIC_ACCESS_STATUSES } from '../../auth/domain/basic-access'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { InvalidSimulation, SimulationConflict, SimulationUnavailable, simulationTransition, validateSimulationSelection, normalizeSimulationAmount, type SimulationInput, type SupportOptions, type SupportSimulation } from '../application/support-simulation'

type SimulationRow = Omit<SupportSimulation, 'createdAt' | 'updatedAt' | 'reference' | 'mode'> & { createdAt: Date; updatedAt: Date; requestId: string }
const columns = `id,campaign_id AS "campaignId",campaign_title AS "campaignTitle",reward_id AS "rewardId",reward_title AS "rewardTitle",amount::text,currency_code AS currency,method,state,version,attempts,created_at AS "createdAt",updated_at AS "updatedAt",request_id AS "requestId"`
function simulationFrom(row: SimulationRow): SupportSimulation {
  return { id: row.id, reference: `SIM-${row.id}`, mode: 'SIMULATION', campaignId: row.campaignId, campaignTitle: row.campaignTitle, rewardId: row.rewardId, rewardTitle: row.rewardTitle,
    amount: row.amount, currency: row.currency, method: row.method, state: row.state, version: row.version, attempts: row.attempts, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
}
@Injectable()
export class TypeormSimulationRepository {
  constructor(private readonly database: DatabaseService) {}
  private async authorizeWrite(manager: EntityManager, userId: string) {
    const roles = await manager.query(`SELECT r.code FROM public.app_user u JOIN public.user_role ur ON ur.user_id=u.id JOIN public.role r ON r.id=ur.role_id
      WHERE u.id=$1 AND u.status::text=ANY($2::text[]) AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
      AND ur.granted_at<=clock_timestamp() AND ur.revoked_at IS NULL AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())`, [userId, BASIC_ACCESS_STATUSES]) as { code: string }[]
    if (!roles.some(role => role.code === 'REGISTERED_USER') || roles.some(role => role.code === 'AUDITOR')) throw new ForbiddenException('Tu cuenta ya no permite modificar simulaciones.')
  }
  async options(userId: string, campaignId: string) {
    // La sesión se exige en el controlador; el catálogo de campaña mostrado es público.
    void userId
    return this.database.connection().transaction('REPEATABLE READ', manager => this.readOptions(manager, campaignId))
  }
  private async readOptions(manager: EntityManager, campaignId: string, lock = false): Promise<SupportOptions> {
    const rows = await manager.query(`SELECT id AS "campaignId",title,campaign_type AS "campaignType",currency_code AS currency,min_contribution::text AS minimum,
      (status='PUBLISHED' AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at<=now() AND ends_at>now()) AS eligible,
      CASE WHEN status<>'PUBLISHED' THEN 'La campaña no está abierta para apoyo.' WHEN starts_at IS NULL OR ends_at IS NULL THEN 'El período de apoyo no está definido.'
        WHEN starts_at>now() THEN 'El período de apoyo todavía no comenzó.' WHEN ends_at<=now() THEN 'El período de apoyo terminó.' ELSE NULL END AS "unavailableReason"
      FROM public.campaign WHERE id=$1 AND deleted_at IS NULL AND published_at IS NOT NULL AND status IN ('PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED') ${lock ? 'FOR SHARE' : ''}`, [campaignId]) as Omit<SupportOptions, 'rewards'>[]
    if (!rows[0]) throw new SimulationUnavailable()
    const rewards = await manager.query(`SELECT r.id,r.title,r.min_amount::text AS minimum,v.quantity_available AS available FROM public.reward r
      JOIN public.v_reward_availability v ON v.reward_id=r.id WHERE r.campaign_id=$1 AND r.is_active ORDER BY r.display_order,r.id ${lock ? 'FOR SHARE OF r' : ''}`, [campaignId]) as SupportOptions['rewards']
    return { ...rows[0], rewards: rows[0].campaignType === 'DONATION' ? [] : rewards }
  }
  async list(userId: string) {
    const rows = await this.database.connection().query(`SELECT ${columns} FROM brotar_extension.support_simulation WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20`, [userId]) as SimulationRow[]
    return { items: rows.map(simulationFrom) }
  }
  async detail(userId: string, id: string) {
    const rows = await this.database.connection().query(`SELECT ${columns} FROM brotar_extension.support_simulation WHERE user_id=$1 AND id=$2`, [userId, id]) as SimulationRow[]
    if (!rows[0]) throw new SimulationUnavailable()
    return simulationFrom(rows[0])
  }
  async create(userId: string, input: SimulationInput) {
    if (!['TEST_CARD', 'TEST_QR'].includes(input.method)) throw new InvalidSimulation()
    return this.database.connection().transaction(async manager => {
      // Serializa el reintento por cuenta: misma clave y selección devuelven siempre el mismo ensayo.
      await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE', [userId])
      const previous = await manager.query(`SELECT ${columns} FROM brotar_extension.support_simulation WHERE user_id=$1 AND request_id=$2`, [userId, input.requestId]) as SimulationRow[]
      if (previous[0]) {
        await this.authorizeWrite(manager, userId)
        const row = previous[0]
        if (row.campaignId !== input.campaignId || row.rewardId !== input.rewardId || row.method !== input.method || row.amount !== normalizeSimulationAmount(input.amount)) throw new SimulationConflict()
        return simulationFrom(row)
      }
      const options = await this.readOptions(manager, input.campaignId, true)
      const selection = validateSimulationSelection(options, input)
      await this.authorizeWrite(manager, userId)
      const rows = await manager.query(`INSERT INTO brotar_extension.support_simulation(user_id,request_id,campaign_id,campaign_title,reward_id,reward_title,amount,currency_code,method)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${columns}`, [userId, input.requestId, input.campaignId, options.title, input.rewardId, selection.reward?.title ?? null, selection.amount, options.currency, input.method]) as SimulationRow[]
      return simulationFrom(rows[0]!)
    })
  }
  async transition(userId: string, id: string, input: { expectedVersion: number; state: string }) {
    return this.database.connection().transaction(async manager => {
      // Mismo orden que create y la administración de roles: cuenta, ensayo, campaña.
      await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE', [userId])
      const rows = await manager.query(`SELECT ${columns} FROM brotar_extension.support_simulation WHERE user_id=$1 AND id=$2 FOR UPDATE`, [userId, id]) as SimulationRow[]
      const current = rows[0]
      if (!current) throw new SimulationUnavailable()
      const next = simulationTransition(current, input)
      if (next.state === 'CONFIRMED' || next.state === 'INITIATED') validateSimulationSelection(await this.readOptions(manager, current.campaignId, true), { amount: current.amount, rewardId: current.rewardId })
      await this.authorizeWrite(manager, userId)
      const [updated] = await manager.query(`UPDATE brotar_extension.support_simulation SET state=$3,version=$4,attempts=$5,updated_at=clock_timestamp()
        WHERE user_id=$1 AND id=$2 RETURNING ${columns}`, [userId, id, next.state, next.version, next.attempts]) as [SimulationRow[], number]
      return simulationFrom(updated[0]!)
    })
  }
}
