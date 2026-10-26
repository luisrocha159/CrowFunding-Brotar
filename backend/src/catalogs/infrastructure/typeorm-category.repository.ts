import { ForbiddenException, Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import {transactionAccess} from '../../roles/infrastructure/transaction-access'
import {setAuditActor} from '../../shared/infrastructure/database/audit'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { CategorySlugTaken, type Category, type CategoryInput, type CategoryRepository, type CategoryUsage, type SettingRepository } from '../application/categories'

const SELECT = `SELECT id, slug, name, description, display_order AS "displayOrder",
  parent_id AS "parentId", is_active AS "isActive" FROM public.category`

@Injectable()
export class TypeormCategoryRepository implements CategoryRepository {
  private manager?: EntityManager
  constructor(private readonly database: DatabaseService) {}

  private connection() { return this.manager ?? this.database.connection() }

  transaction<T>(operation: (repository: CategoryRepository) => Promise<T>, protectCampaigns = false): Promise<T> {
    return this.database.connection().transaction(async manager => {
      // Serializa cambios del árbol: validar y escribir observan las mismas referencias.
      await manager.query('LOCK TABLE public.category IN SHARE ROW EXCLUSIVE MODE')
      if (protectCampaigns) await manager.query('LOCK TABLE public.campaign IN SHARE MODE')
      const repository = new TypeormCategoryRepository(this.database)
      repository.manager = manager
      return operation(repository)
    })
  }

  private async audit(actorId: string, action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE', previous: Category | null, current: Category): Promise<void> {
    await transactionAccess(this.manager!,actorId,'catalog.manage')
    await setAuditActor(this.manager!,actorId)
    await this.connection().query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,entity_id,old_values,new_values)
      VALUES($1,'ADMIN',$2::audit_action,'category',$3,$4::jsonb,$5::jsonb || jsonb_build_object('source','APPLICATION','result','APPLIED'))`,
    [actorId, action, current.id, previous ? JSON.stringify(previous) : null, JSON.stringify(current)])
  }

  list(includeInactive: boolean): Promise<Category[]> {
    // El catálogo público solo ve lo activo; la administración puede ver todo.
    return this.connection().query(
      `${SELECT} ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY display_order, name`)
  }

  private async one(sql: string, parameters: unknown[]): Promise<Category | null> {
    const rows: Category[] = await this.connection().query(sql, parameters)
    return rows[0] ?? null
  }

  find(id: string): Promise<Category | null> { return this.one(`${SELECT} WHERE id = $1`, [id]) }
  findBySlug(slug: string): Promise<Category | null> { return this.one(`${SELECT} WHERE slug = $1`, [slug]) }

  async usage(id: string): Promise<CategoryUsage> {
    const rows: { campaigns: string; activeChildren: string }[] = await this.connection().query(
      `SELECT (SELECT count(*) FROM public.campaign WHERE category_id = $1)::text AS "campaigns",
              (SELECT count(*) FROM public.category WHERE parent_id = $1 AND is_active = true)::text AS "activeChildren"`,
      [id])
    return { campaigns: Number(rows[0]?.campaigns ?? 0), activeChildren: Number(rows[0]?.activeChildren ?? 0) }
  }

  private async returning(sql: string, parameters: unknown[]): Promise<Category> {
    let result: unknown
    try { result = await this.connection().query(sql, parameters) }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new CategorySlugTaken()
      throw error
    }
    const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Category[]
    const category = rows[0]
    if (!category) throw new Error('No se pudo confirmar la operación sobre la categoría.')
    return category
  }

  async create(input: CategoryInput, actorId: string): Promise<Category> {
    if (!this.manager) return this.transaction(repository => repository.create(input, actorId))
    const category = await this.returning(
      `INSERT INTO public.category(slug, name, description, display_order, parent_id)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [input.slug, input.name, input.description || null, input.displayOrder, input.parentId])
    await this.audit(actorId, 'CREATE', null, category)
    return category
  }

  async update(id: string, input: CategoryInput, actorId: string): Promise<Category> {
    if (!this.manager) return this.transaction(repository => repository.update(id, input, actorId))
    const previous = await this.find(id)
    const category = await this.returning(
      `UPDATE public.category SET slug = $2, name = $3, description = $4,
              display_order = $5, parent_id = $6, updated_at = now()
       WHERE id = $1
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [id, input.slug, input.name, input.description || null, input.displayOrder, input.parentId])
    await this.audit(actorId, 'UPDATE', previous, category)
    return category
  }

  async setActive(id: string, isActive: boolean, actorId: string): Promise<Category> {
    if (!this.manager) return this.transaction(repository => repository.setActive(id, isActive, actorId), !isActive)
    const previous = await this.find(id)
    const category = await this.returning(
      `UPDATE public.category SET is_active = $2, updated_at = now() WHERE id = $1
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [id, isActive])
    await this.audit(actorId, 'STATUS_CHANGE', previous, category)
    return category
  }
}

@Injectable()
export class TypeormSettingRepository implements SettingRepository {
  constructor(private readonly database: DatabaseService) {}

  async read(key: string) {
    const rows: { key: string; value: unknown; updatedBy: string | null; updatedAt: Date }[] =
      await this.database.connection().query(
        `SELECT key, value, updated_by AS "updatedBy", updated_at AS "updatedAt"
         FROM public.system_setting WHERE key = $1`, [key])
    return rows[0] ?? null
  }

  async write(key: string, value: unknown, updatedBy: string) {
    return this.database.connection().transaction(async manager=>{
    const [actor]=await manager.query(`SELECT u.id FROM public.app_user u WHERE u.id=$1 AND u.deleted_at IS NULL
      AND u.status IN ('ACTIVE','PENDING_VERIFICATION') AND (u.locked_until IS NULL OR u.locked_until<=clock_timestamp())
      AND EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id JOIN public.role_permission rp ON rp.role_id=r.id JOIN public.permission p ON p.id=rp.permission_id
        WHERE ur.user_id=u.id AND r.code='ADMIN' AND p.code='catalog.manage' AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp()))
      AND NOT EXISTS(SELECT 1 FROM public.user_role ur JOIN public.role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='AUDITOR' AND ur.revoked_at IS NULL AND ur.granted_at<=clock_timestamp() AND (ur.expires_at IS NULL OR ur.expires_at>clock_timestamp())) FOR SHARE OF u`,[updatedBy])
    if(!actor)throw new ForbiddenException('La administración vigente debe confirmar el cambio.')
    await manager.query('SELECT set_config($1,$2,true)',['brotar.actor_id',updatedBy])
    const rows: { key: string; value: unknown; updatedBy: string | null; updatedAt: Date }[] =
      await manager.query(
        `INSERT INTO public.system_setting(key, value, updated_by, updated_at)
         VALUES($1, $2::jsonb, $3, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by, updated_at = now()
         RETURNING key, value, updated_by AS "updatedBy", updated_at AS "updatedAt"`,
        [key, JSON.stringify(value), updatedBy])
    const written = rows[0]
    if (!written) throw new Error('No se pudo confirmar el parámetro.')
    await transactionAccess(manager,updatedBy,'catalog.manage')
    await manager.query(`INSERT INTO public.audit_log(actor_user_id,actor_role,action,entity_name,new_values) VALUES($1,'ADMIN','UPDATE','system_setting',jsonb_build_object('key',$2::text,'result','APPLIED','source','APPLICATION'))`,[updatedBy,key])
    return written
    })
  }
}
