import { allowsDeactivation, isSelfReference, isValidSlug, normalizeCategory, type Category, type CategoryInput } from '../domain/category'
import { isAgreedSetting, isValidSettingKey } from '../domain/setting'
export type { Category, CategoryInput } from '../domain/category'

export class CategoryInvalid extends Error {}
export class CategoryNotFound extends Error {}
export class CategorySlugTaken extends Error {}
export class CategoryParentUnavailable extends Error {}
/** Referencias existentes protegidas: la categoría está en uso. */
export class CategoryInUse extends Error {}
/** El parámetro no está entre los acordados; ver D02 y D10. */
export class SettingNotAgreed extends Error {}

export interface CategoryUsage { campaigns: number; activeChildren: number }

export interface CategoryRepository {
  list(includeInactive: boolean): Promise<Category[]>
  find(id: string): Promise<Category | null>
  findBySlug(slug: string): Promise<Category | null>
  usage(id: string): Promise<CategoryUsage>
  create(input: CategoryInput): Promise<Category>
  update(id: string, input: CategoryInput): Promise<Category>
  setActive(id: string, isActive: boolean): Promise<Category>
}

export interface SettingRepository {
  read(key: string): Promise<{ key: string; value: unknown; updatedBy: string | null; updatedAt: Date } | null>
  write(key: string, value: unknown, updatedBy: string): Promise<{ key: string; value: unknown; updatedBy: string | null; updatedAt: Date }>
}

export class Categories {
  constructor(private readonly repository: CategoryRepository) {}

  list(includeInactive = false): Promise<Category[]> {
    return this.repository.list(includeInactive)
  }

  async find(id: string): Promise<Category> {
    const category = await this.repository.find(id)
    if (!category) throw new CategoryNotFound()
    return category
  }

  private async validate(input: CategoryInput, id: string | null): Promise<CategoryInput> {
    const normalized = normalizeCategory(input)
    if (!isValidSlug(normalized.slug)) throw new CategoryInvalid()
    if (normalized.name.length === 0 || normalized.name.length > 120) throw new CategoryInvalid()
    if (!Number.isInteger(normalized.displayOrder) || normalized.displayOrder < 0 || normalized.displayOrder > 32767) {
      throw new CategoryInvalid()
    }
    if (id !== null && isSelfReference(id, normalized.parentId)) throw new CategoryInvalid()

    const existing = await this.repository.findBySlug(normalized.slug)
    if (existing && existing.id !== id) throw new CategorySlugTaken()

    // El padre debe existir y estar activo: no se cuelga un catálogo de una rama retirada.
    if (normalized.parentId !== null) {
      const parent = await this.repository.find(normalized.parentId)
      if (!parent || !parent.isActive) throw new CategoryParentUnavailable()
    }
    return normalized
  }

  async create(input: CategoryInput): Promise<Category> {
    return this.repository.create(await this.validate(input, null))
  }

  async update(id: string, input: CategoryInput): Promise<Category> {
    await this.find(id)
    return this.repository.update(id, await this.validate(input, id))
  }

  /** Reactivar es seguro; desactivar exige que nada la esté usando. */
  async setActive(id: string, isActive: boolean): Promise<Category> {
    await this.find(id)
    if (!isActive) {
      const usage = await this.repository.usage(id)
      if (!allowsDeactivation(usage.campaigns, usage.activeChildren)) throw new CategoryInUse()
    }
    return this.repository.setActive(id, isActive)
  }
}

/**
 * Parámetros de negocio. Solo claves acordadas, registrando quién modifica (BG-55 CA 2).
 * Mientras AGREED_SETTINGS esté vacía toda escritura se rechaza; poblarla depende de D02 y D10.
 */
export class Settings {
  constructor(private readonly repository: SettingRepository) {}

  private check(key: string): void {
    if (!isValidSettingKey(key) || !isAgreedSetting(key)) throw new SettingNotAgreed()
  }

  async read(key: string) {
    this.check(key)
    return this.repository.read(key)
  }

  async write(key: string, value: unknown, updatedBy: string) {
    this.check(key)
    return this.repository.write(key, value, updatedBy)
  }
}
