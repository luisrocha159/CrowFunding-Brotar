export interface CategoryInput {
  slug: string
  name: string
  description: string
  displayOrder: number
  parentId: string | null
}

export interface Category extends Omit<CategoryInput, 'description'> {
  id: string
  description: string | null
  isActive: boolean
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeCategory(input: CategoryInput): CategoryInput {
  return {
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    description: input.description.trim(),
    displayOrder: input.displayOrder,
    parentId: input.parentId
  }
}

export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug) && slug.length <= 120
}

/**
 * Una categoría no puede ser su propio ascendiente. El esquema permite jerarquía
 * con parent_id y sin esta comprobación un ciclo dejaría el árbol irrecuperable.
 */
export function isSelfReference(id: string, parentId: string | null): boolean {
  return parentId !== null && parentId === id
}

/**
 * Referencias existentes protegidas (BG-55 CA 1): una categoría en uso por campañas
 * no se desactiva. Desactivarla dejaría campañas apuntando a un catálogo inválido.
 */
export function allowsDeactivation(campaignsUsingIt: number, childrenActive: number): boolean {
  return campaignsUsingIt === 0 && childrenActive === 0
}
