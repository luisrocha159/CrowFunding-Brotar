import { createHash, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { Draft, DraftInput, DraftRepository } from '../application/drafts'
import { DraftNotEditable, DraftRetryConflict } from '../application/drafts'
import { recordAudit } from '../../shared/infrastructure/database/audit'

const SELECT = `SELECT id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
  organization_id AS "organizationId", funding_model AS "fundingModel", status, builder_step AS "builderStep", updated_at AS "updatedAt"
  FROM public.campaign`

// La propiedad va en el WHERE de cada consulta: un borrador ajeno no se llega a leer.
const OWNED = `WHERE creator_user_id = $1 AND deleted_at IS NULL`

@Injectable()
export class TypeormDraftRepository implements DraftRepository {
  constructor(private readonly database: DatabaseService) {}

  listOwn(creatorUserId: string): Promise<Draft[]> {
    return this.database.connection().query(
      `${SELECT} ${OWNED} ORDER BY updated_at DESC, id`, [creatorUserId])
  }

  async findOwn(creatorUserId: string, id: string): Promise<Draft | null> {
    const rows: Draft[] = await this.database.connection().query(
      `${SELECT} ${OWNED} AND id = $2`, [creatorUserId, id])
    return rows[0] ?? null
  }

  async categoryIsActive(categoryId: string): Promise<boolean> {
    const rows: { id: string }[] = await this.database.connection().query(
      'SELECT id FROM public.category WHERE id = $1 AND is_active = true', [categoryId])
    return rows.length > 0
  }

  /**
   * El trigger campaign_log_status registra el alta y cada cambio de estado en
   * status_history, y toma el autor de brotar_current_actor(), que lee el ajuste
   * brotar.actor_id. Se declara dentro de la misma transacción para que el historial
   * conserve quién actuó; sin esto changed_by quedaría en nulo.
   */
  private returning(actorId: string, input: DraftInput, campaignId: string | null, sql: string, parameters: unknown[], requestKey?: string): Promise<Draft> {
    return this.database.connection().transaction(async (manager) => {
      const requestHash = createHash('sha256').update(JSON.stringify([input.title,input.summary,input.campaignType,input.categoryId,input.organizationId])).digest('hex')
      if (requestKey) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`draft:${actorId}:${requestKey}`])
        const [previous] = await manager.query('SELECT request_hash,campaign_id FROM brotar_extension.request_idempotency WHERE actor_id=$1 AND request_key=$2', [actorId, requestKey])
        if (previous) {
          if (previous.request_hash !== requestHash) throw new DraftRetryConflict()
          const [existing] = await manager.query(`${SELECT} ${OWNED} AND id=$2`, [actorId, previous.campaign_id])
          if (!existing) throw new DraftRetryConflict()
          return existing as Draft
        }
      }
      if (campaignId !== null) {
        const rows: unknown[] = await manager.query("SELECT id FROM public.campaign WHERE creator_user_id=$1 AND id=$2 AND deleted_at IS NULL AND status IN ('DRAFT','CHANGES_REQUESTED') AND campaign_type=$3::campaign_type FOR UPDATE", [actorId, campaignId, input.campaignType])
        if (!rows.length) throw new DraftNotEditable()
      }
      await manager.query('SELECT set_config($1, $2, true)', ['brotar.actor_id', actorId])
      // En UPDATE ... RETURNING el driver devuelve [filas, contador]; en INSERT, solo filas.
      const result: unknown = await manager.query(sql, parameters)
      const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Draft[]
      const draft = rows[0]
      if (!draft) throw new Error('No se pudo confirmar el borrador.')
      await recordAudit(manager,actorId,campaignId===null?'CREATE':'UPDATE','campaign',draft.id)
      if (requestKey) await manager.query('INSERT INTO brotar_extension.request_idempotency(actor_id,request_key,request_hash,campaign_id) VALUES($1,$2,$3,$4)', [actorId, requestKey, requestHash, draft.id])
      return draft
    })
  }

  create(creatorUserId: string, input: DraftInput, requestKey?: string): Promise<Draft> {
    // UUID y slug estable independientes del nombre; títulos repetidos son válidos.
    const id = randomUUID()
    return this.returning(creatorUserId, input, null,
      `INSERT INTO public.campaign(id, slug, title, summary, campaign_type, category_id, organization_id, creator_user_id)
       VALUES($1, $2, $3, $4, $5::campaign_type, $6, $7, $8)
       RETURNING id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
                 organization_id AS "organizationId", status, builder_step AS "builderStep", updated_at AS "updatedAt"`,
      [id, `camp-${id}`, input.title, input.summary || null, input.campaignType,
        input.categoryId, input.organizationId, creatorUserId], requestKey)
  }

  save(creatorUserId: string, id: string, input: DraftInput, builderStep: number): Promise<Draft> {
    // Datos y posición en una sola sentencia: no queda una posición sin sus datos.
    // El estado se reafirma en el WHERE para no editar una campaña que dejó de ser borrador.
    return this.returning(creatorUserId, input, id,
      `UPDATE public.campaign
          SET title = $3, summary = $4, campaign_type = $5::campaign_type, category_id = $6,
              organization_id = $7, builder_step = $8, updated_at = now()
        WHERE id = $2 AND creator_user_id = $1 AND status IN ('DRAFT','CHANGES_REQUESTED') AND deleted_at IS NULL AND campaign_type=$5::campaign_type
       RETURNING id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
                 organization_id AS "organizationId", status, builder_step AS "builderStep", updated_at AS "updatedAt"`,
      [creatorUserId, id, input.title, input.summary || null, input.campaignType,
        input.categoryId, input.organizationId, builderStep])
  }
}
