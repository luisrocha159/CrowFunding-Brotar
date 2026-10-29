import { useState } from 'react'
import { Button } from '../../shared/components/Button'
import { FormField } from '../../shared/components/FormField'
import { availableParents, categoryInput, type CategoryDraft, type CategoryErrors } from './catalogForm'
import type { Category, CategoryInput } from './catalogClient'
import styles from './catalogs.module.css'
export function CategoryForm({ category, categories, busy, onSave, onCancel }: {
  category?: Category; categories: Category[]; busy: boolean; onSave: (input: CategoryInput) => Promise<boolean>; onCancel: () => void
}) {
  const [draft, setDraft] = useState<CategoryDraft>({ slug: category?.slug ?? '', name: category?.name ?? '', description: category?.description ?? '', displayOrder: String(category?.displayOrder ?? 0), parentId: category?.parentId ?? '' })
  const [errors, setErrors] = useState<CategoryErrors>({})
  function set(key: keyof CategoryDraft, value: string) { setDraft(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })) }
  return <form className={styles.form} noValidate onSubmit={event => {
    event.preventDefault()
    if (busy) return
    const result = categoryInput(draft, categories, category?.id); setErrors(result.errors)
    if (Object.keys(result.errors).length) {
      // Follow the visible form order, not the order used by the validator.
      Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[name]'))
        .find(field => result.errors[field.getAttribute('name') as keyof CategoryErrors])?.focus()
      return
    }
    void onSave(result.input)
  }}>
    <h2>{category ? `Editar ${category.name}` : 'Nueva categoría'}</h2>
    <fieldset disabled={busy} className={styles.fields}>
      <FormField name="name" label="Nombre" required maxLength={120} autoFocus value={draft.name} error={errors.name} onChange={event => set('name', event.target.value)} />
      <FormField name="slug" label="Identificador" required maxLength={120} value={draft.slug} error={errors.slug} help="Letras sin acentos, números y guiones. Debe ser único." onChange={event => set('slug', event.target.value)} />
      <FormField name="description" label="Descripción" as="textarea" maxLength={2000} value={draft.description} error={errors.description} onChange={event => set('description', event.target.value)} />
      <div className={styles.formRow}>
        <FormField name="displayOrder" label="Orden" type="number" required min={0} max={32767} step={1} value={draft.displayOrder} error={errors.displayOrder} onChange={event => set('displayOrder', event.target.value)} />
        <FormField name="parentId" label="Categoría superior" as="select" value={draft.parentId} error={errors.parentId} onChange={event => set('parentId', event.target.value)}>
          <option value="">Sin categoría superior</option>
          {availableParents(categories, category?.id).map(parent => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
        </FormField>
      </div>
    </fieldset>
    <div className={styles.actions}><Button type="submit" loading={busy} loadingLabel="Guardando…">Guardar categoría</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
  </form>
}
