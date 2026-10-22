import { allowsDeactivation, isSelfReference, isValidSlug, normalizeCategory, type Category, type CategoryInput } from '../domain/category'
import { AGREED_SETTINGS, isAgreedSetting, isValidSettingKey } from '../domain/setting'
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
  transaction<T>(operation: (repository: CategoryRepository) => Promise<T>, protectCampaigns?: boolean): Promise<T>
  list(includeInactive: boolean): Promise<Category[]>
  find(id: string): Promise<Category | null>
  findBySlug(slug: string): Promise<Category | null>
  usage(id: string): Promise<CategoryUsage>
  create(input: CategoryInput, actorId: string): Promise<Category>
  update(id: string, input: CategoryInput, actorId: string): Promise<Category>
  setActive(id: string, isActive: boolean, actorId: string): Promise<Category>
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
    if (normalized.description.length > 2000 || normalized.description.includes('\0') || normalized.name.includes('\0')) throw new CategoryInvalid()
    if (normalized.name.length === 0 || normalized.name.length > 120) throw new CategoryInvalid()
    if (!Number.isInteger(normalized.displayOrder) || normalized.displayOrder < 0 || normalized.displayOrder > 32767) {
      throw new CategoryInvalid()
    }
    if (id !== null && isSelfReference(id, normalized.parentId)) throw new CategoryInvalid()

    const existing = await this.repository.findBySlug(normalized.slug)
    if (existing && existing.id !== id) throw new CategorySlugTaken()

    // El padre debe existir y estar activo: no se cuelga un catálogo de una rama retirada.
    if (normalized.parentId !== null) {
      await this.validateParent(normalized.parentId, id)
    }
    return normalized
  }

  private async validateParent(parentId: string, id: string | null): Promise<void> {
    const visited = new Set<string>(id ? [id] : [])
    let next: string | null = parentId
    while (next) {
      if (visited.has(next)) throw new CategoryInvalid()
      visited.add(next)
      const parent = await this.repository.find(next)
      if (!parent || !parent.isActive) throw new CategoryParentUnavailable()
      next = parent.parentId
    }
  }

  async create(input: CategoryInput, actorId: string): Promise<Category> {
    return this.repository.transaction(async repository => repository.create(await new Categories(repository).validate(input, null), actorId))
  }

  async update(id: string, input: CategoryInput, actorId: string): Promise<Category> {
    return this.repository.transaction(async repository => {
      const categories = new Categories(repository)
      await categories.find(id)
      return repository.update(id, await categories.validate(input, id), actorId)
    })
  }

  async setActive(id: string, isActive: boolean, actorId: string): Promise<Category> {
    return this.repository.transaction(async repository => {
      const categories = new Categories(repository)
      const current = await categories.find(id)
      if (isActive && current.parentId) await categories.validateParent(current.parentId, id)
      if (!isActive) {
        const usage = await repository.usage(id)
        if (!allowsDeactivation(usage.campaigns, usage.activeChildren)) throw new CategoryInUse()
      }
      return repository.setActive(id, isActive, actorId)
    }, !isActive)
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

  async list() {
    return Promise.all(AGREED_SETTINGS.map(async key => await this.repository.read(key) ?? { key, value: null, updatedBy: null, updatedAt: null }))
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
