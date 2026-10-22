import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/Feedback'
import type { Category } from './catalogClient'
import styles from './catalogs.module.css'
export function CategoryList({ categories, editable, busy, onEdit, onState }: {
  categories: Category[]; editable: boolean; busy: boolean; onEdit: (category: Category) => void; onState: (category: Category) => void
}) {
  if (!categories.length) return <EmptyState title="No hay categorías" description="El catálogo todavía no tiene registros. Un administrador puede añadir las categorías acordadas." />
  return <ul className={styles.list} aria-label="Categorías">
    {categories.map(category => <li key={category.id} className={styles.category}>
      <div className={styles.details}><div className={styles.title}><h3>{category.name}</h3><span className={styles.badge}>{category.isActive ? 'Activa' : 'Inactiva'}</span></div>
        <p>{category.slug} · Orden {category.displayOrder}</p>
        {category.description && <p className={styles.description}>{category.description}</p>}
        {category.parentId && <p>Superior: {categories.find(parent => parent.id === category.parentId)?.name ?? 'No disponible'}</p>}
      </div>
      {editable && <div className={styles.actions}><Button variant="secondary" disabled={busy} aria-label={`Editar ${category.name}`} onClick={() => onEdit(category)}>Editar</Button><Button variant="tertiary" disabled={busy} aria-label={`${category.isActive ? 'Desactivar' : 'Activar'} ${category.name}`} onClick={() => onState(category)}>{category.isActive ? 'Desactivar' : 'Activar'}</Button></div>}
    </li>)}
  </ul>
}
