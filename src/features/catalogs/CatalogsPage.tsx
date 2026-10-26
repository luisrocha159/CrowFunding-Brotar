import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { AdministrativeNavigation } from '../campaigns/AdministrativeNavigation'
import layout from '../campaigns/projects.module.css'
import { CategoryForm } from './CategoryForm'
import { CategoryList } from './CategoryList'
import type { Category } from './catalogClient'
import { useCatalogs } from './useCatalogs'
import styles from './catalogs.module.css'
import { SettingEditor } from './SettingEditor'

export function CatalogsPage() {
  const data = useCatalogs()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [stateTarget, setStateTarget] = useState<Category | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  if (data.anonymous) return <Navigate replace to="/iniciar-sesion?continuar=%2Fadministracion%2Fcatalogos" />
  const editable = data.access === 'edit' && data.loaded
  function closeEditor() { setEditing(null); setStateTarget(null); heading.current?.focus() }
  function reload() { closeEditor(); data.reload() }
  return <div className={layout.adminLayout}><AdministrativeNavigation /><section className={`${layout.content} ${styles.stack}`}>
    <header className={layout.heading}><div><h1 ref={heading} tabIndex={-1}>Catálogos y parámetros</h1><p>Categorías de campaña y parámetros de negocio acordados.</p></div></header>
    {data.access === 'checking' && <p role="status">Comprobando acceso y cargando catálogos…</p>}
    {data.access === 'forbidden' && <Message tone="warning" title="Acceso restringido">Se requiere ADMIN para administrar catálogos o AUDITOR para consultarlos.</Message>}
    {data.access !== 'checking' && !data.loaded && !data.error && (data.access === 'edit' || data.access === 'read') && <p role="status">Cargando categorías y parámetros…</p>}
    {data.error && <div className={styles.stack}><Message tone="error" title="Operación no completada">{data.error}</Message><div><Button variant="secondary" disabled={data.busy} onClick={reload}>Actualizar catálogo y permisos</Button></div></div>}
    {data.notice && <Message tone="success" title="Cambio confirmado">{data.notice}</Message>}
    {data.loaded && <>
      {data.access === 'read' && <Message title="Modo de consulta">Auditor puede consultar el catálogo. Sus permisos de lectura prevalecen aunque también tenga ADMIN.</Message>}
      <div className={styles.actions}>{editable && <Button disabled={data.busy || Boolean(editing) || Boolean(stateTarget)} onClick={() => setEditing('new')}>Nueva categoría</Button>}<Button variant="secondary" disabled={data.busy} onClick={reload}>Actualizar</Button></div>
      {editing && editable && <CategoryForm key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? undefined : editing} categories={data.categories} busy={data.busy}
        onCancel={closeEditor} onSave={async input => { const saved = await data.save(editing === 'new' ? null : editing.id, input); if (saved) closeEditor(); return saved }} />}
      {stateTarget && editable && <section className={styles.confirmation} aria-label="Confirmar cambio de estado">
        <h2>{stateTarget.isActive ? 'Desactivar' : 'Activar'} {stateTarget.name}</h2>
        <p>{stateTarget.isActive ? 'La categoría dejará de estar disponible para nuevas selecciones. Si tiene campañas o subcategorías activas, el cambio será rechazado.' : 'La categoría volverá a estar disponible. Su categoría superior debe estar activa.'}</p>
        <div className={styles.actions}><Button autoFocus loading={data.busy} onClick={() => { void data.state(stateTarget).then(saved => { if (saved) closeEditor() }) }}>Confirmar {stateTarget.isActive ? 'desactivación' : 'activación'}</Button><Button variant="secondary" disabled={data.busy} onClick={closeEditor}>Cancelar</Button></div>
      </section>}
      <CategoryList categories={data.categories} editable={editable} busy={data.busy || Boolean(editing) || Boolean(stateTarget)} onEdit={setEditing} onState={setStateTarget} />
      <section className={styles.settings}><h2>Parámetros acordados</h2>
        {data.settings.length === 0 ? <p>No hay parámetros de negocio aprobados para administrar. Las decisiones sobre categorías, reglas, límites y vistas siguen pendientes en D02 y D10. Los costos requieren además D04.</p>
          : <div>{data.settings.map(setting => <SettingEditor key={`${setting.key}:${setting.updatedAt}`} setting={setting} editable={editable} onSaved={reload} />)}</div>}
      </section>
    </>}
  </section></div>
}
