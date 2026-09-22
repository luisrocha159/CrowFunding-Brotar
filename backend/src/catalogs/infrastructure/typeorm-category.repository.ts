import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { Category, CategoryInput, CategoryRepository, CategoryUsage, SettingRepository } from '../application/categories'

const SELECT = `SELECT id, slug, name, description, display_order AS "displayOrder",
  parent_id AS "parentId", is_active AS "isActive" FROM public.category`

@Injectable()
export class TypeormCategoryRepository implements CategoryRepository {
  constructor(private readonly database: DatabaseService) {}

  list(includeInactive: boolean): Promise<Category[]> {
    // El catálogo público solo ve lo activo; la administración puede ver todo.
    return this.database.connection().query(
      `${SELECT} ${includeInactive ? '' : 'WHERE is_active = true'} ORDER BY display_order, name`)
  }

  private async one(sql: string, parameters: unknown[]): Promise<Category | null> {
    const rows: Category[] = await this.database.connection().query(sql, parameters)
    return rows[0] ?? null
  }

  find(id: string): Promise<Category | null> { return this.one(`${SELECT} WHERE id = $1`, [id]) }
  findBySlug(slug: string): Promise<Category | null> { return this.one(`${SELECT} WHERE slug = $1`, [slug]) }

  async usage(id: string): Promise<CategoryUsage> {
    const rows: { campaigns: string; activeChildren: string }[] = await this.database.connection().query(
      `SELECT (SELECT count(*) FROM public.campaign WHERE category_id = $1)::text AS "campaigns",
              (SELECT count(*) FROM public.category WHERE parent_id = $1 AND is_active = true)::text AS "activeChildren"`,
      [id])
    return { campaigns: Number(rows[0]?.campaigns ?? 0), activeChildren: Number(rows[0]?.activeChildren ?? 0) }
  }

  private async returning(sql: string, parameters: unknown[]): Promise<Category> {
    const result: unknown = await this.database.connection().query(sql, parameters)
    const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Category[]
    const category = rows[0]
    if (!category) throw new Error('No se pudo confirmar la operación sobre la categoría.')
    return category
  }

  create(input: CategoryInput): Promise<Category> {
    return this.returning(
      `INSERT INTO public.category(slug, name, description, display_order, parent_id)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [input.slug, input.name, input.description || null, input.displayOrder, input.parentId])
  }

  update(id: string, input: CategoryInput): Promise<Category> {
    return this.returning(
      `UPDATE public.category SET slug = $2, name = $3, description = $4,
              display_order = $5, parent_id = $6, updated_at = now()
       WHERE id = $1
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [id, input.slug, input.name, input.description || null, input.displayOrder, input.parentId])
  }

  setActive(id: string, isActive: boolean): Promise<Category> {
    return this.returning(
      `UPDATE public.category SET is_active = $2, updated_at = now() WHERE id = $1
       RETURNING id, slug, name, description, display_order AS "displayOrder",
                 parent_id AS "parentId", is_active AS "isActive"`,
      [id, isActive])
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
    // updated_by deja constancia de quién modificó el parámetro (BG-55 CA 2).
    const rows: { key: string; value: unknown; updatedBy: string | null; updatedAt: Date }[] =
      await this.database.connection().query(
        `INSERT INTO public.system_setting(key, value, updated_by, updated_at)
         VALUES($1, $2::jsonb, $3, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by, updated_at = now()
         RETURNING key, value, updated_by AS "updatedBy", updated_at AS "updatedAt"`,
        [key, JSON.stringify(value), updatedBy])
    const written = rows[0]
    if (!written) throw new Error('No se pudo confirmar el parámetro.')
    return written
  }
}
