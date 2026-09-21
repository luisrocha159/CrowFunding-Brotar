import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { Draft, DraftInput, DraftRepository } from '../application/drafts'

const SELECT = `SELECT id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
  organization_id AS "organizationId", status, builder_step AS "builderStep", updated_at AS "updatedAt"
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
  private returning(actorId: string, sql: string, parameters: unknown[]): Promise<Draft> {
    return this.database.connection().transaction(async (manager) => {
      await manager.query('SELECT set_config($1, $2, true)', ['brotar.actor_id', actorId])
      // En UPDATE ... RETURNING el driver devuelve [filas, contador]; en INSERT, solo filas.
      const result: unknown = await manager.query(sql, parameters)
      const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Draft[]
      const draft = rows[0]
      if (!draft) throw new Error('No se pudo confirmar el borrador.')
      return draft
    })
  }

  create(creatorUserId: string, input: DraftInput): Promise<Draft> {
    // Identificador técnico como en organizaciones; el slug público se decide al publicar.
    const id = randomUUID()
    return this.returning(creatorUserId,
      `INSERT INTO public.campaign(id, slug, title, summary, campaign_type, category_id, organization_id, creator_user_id)
       VALUES($1, $2, $3, $4, $5::campaign_type, $6, $7, $8)
       RETURNING id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
                 organization_id AS "organizationId", status, builder_step AS "builderStep", updated_at AS "updatedAt"`,
      [id, `camp-${id}`, input.title, input.summary || null, input.campaignType,
        input.categoryId, input.organizationId, creatorUserId])
  }

  save(creatorUserId: string, id: string, input: DraftInput, builderStep: number): Promise<Draft> {
    // Datos y posición en una sola sentencia: no queda una posición sin sus datos.
    // El estado se reafirma en el WHERE para no editar una campaña que dejó de ser borrador.
    return this.returning(creatorUserId,
      `UPDATE public.campaign
          SET title = $3, summary = $4, campaign_type = $5::campaign_type, category_id = $6,
              organization_id = $7, builder_step = $8, updated_at = now()
        WHERE id = $2 AND creator_user_id = $1 AND status = 'DRAFT' AND deleted_at IS NULL
       RETURNING id, title, summary, campaign_type AS "campaignType", category_id AS "categoryId",
                 organization_id AS "organizationId", status, builder_step AS "builderStep", updated_at AS "updatedAt"`,
      [creatorUserId, id, input.title, input.summary || null, input.campaignType,
        input.categoryId, input.organizationId, builderStep])
  }
}
