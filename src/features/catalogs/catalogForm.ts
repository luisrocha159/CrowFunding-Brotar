import { SessionError } from '../../shared/api/sessionError'
import type { Category, CategoryInput } from './catalogClient'
export interface CategoryDraft { slug: string; name: string; description: string; displayOrder: string; parentId: string }
export type CategoryErrors = Partial<Record<keyof CategoryDraft, string>>
export function catalogAccess(roles: readonly string[]): 'edit' | 'read' | 'forbidden' {
  return roles.includes('AUDITOR') ? 'read' : roles.includes('ADMIN') ? 'edit' : 'forbidden'
}
export function availableParents(categories: readonly Category[], id?: string): Category[] {
  const excluded = new Set<string>(id ? [id] : [])
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories) {
      if (category.parentId && excluded.has(category.parentId) && !excluded.has(category.id)) { excluded.add(category.id); changed = true }
    }
  }
  return categories.filter(category => category.isActive && !excluded.has(category.id))
}
export function categoryInput(draft: CategoryDraft, categories: readonly Category[], id?: string): { input: CategoryInput; errors: CategoryErrors } {
  const input = { slug: draft.slug.trim().toLowerCase(), name: draft.name.trim(), description: draft.description.trim(), displayOrder: Number(draft.displayOrder), parentId: draft.parentId || null }
  const errors: CategoryErrors = {}
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 120) errors.slug = 'Usa letras minúsculas sin acentos, números y guiones, hasta 120 caracteres.'
  if (!input.name || input.name.length > 120 || input.name.includes('\0')) errors.name = 'Escribe un nombre de hasta 120 caracteres.'
  if (input.description.length > 2000 || input.description.includes('\0')) errors.description = 'La descripción admite hasta 2000 caracteres.'
  if (!draft.displayOrder.trim() || !Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 32767) errors.displayOrder = 'Usa un número entero entre 0 y 32767.'
  if (input.parentId && !availableParents(categories, id).some(category => category.id === input.parentId)) errors.parentId = 'Selecciona una categoría superior activa que no forme un ciclo.'
  return { input, errors }
}
export function catalogError(cause: unknown, operation: 'load' | 'save' | 'state'): string {
  const status = cause instanceof SessionError ? cause.status : 0
  if (status === 403) return 'Tu cuenta ya no permite esta operación. Actualiza los permisos; Auditor conserva solo lectura.'
  if (status === 404) return 'La categoría ya no está disponible. Actualiza el catálogo.'
  if (status === 409) return operation === 'state' ? 'No se cambió el estado: comprueba las campañas y subcategorías activas que usan esta categoría.' : 'El identificador ya está en uso. Elige otro o actualiza el catálogo.'
  if (status === 400) return 'Revisa los campos y la categoría superior. No se admiten referencias retiradas ni ciclos.'
  return operation === 'load' ? 'No se pudo consultar el catálogo. Comprueba la conexión y vuelve a intentarlo.' : 'No se confirmó el cambio. Actualiza el catálogo para comprobar si se guardó antes de repetir.'
}
