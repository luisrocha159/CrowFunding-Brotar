import { useEffect, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { failureText, readUpdatePage, type UpdateItem } from './progressClient'
import styles from './progress.module.css'
export function UpdateCards({ items, onEdit, onManage }: { items: UpdateItem[]; onEdit?: (item: UpdateItem) => void; onManage?: (item: UpdateItem) => void }) {
  return <div className={styles.page}>{items.map(item => <article className={styles.card} key={item.id}><h3>{item.title}</h3>{item.supersededById&&<p>Sustituida por una corrección · referencia {item.supersededById}</p>}{item.supersedesId&&<details><summary>Referencia de la publicación anterior</summary><p>{item.supersedesId}</p></details>}<p>{item.withdrawnAt ? `Retirada el ${new Date(item.withdrawnAt).toLocaleString('es-BO')}` : item.publishedAt ? `Publicado el ${new Date(item.publishedAt).toLocaleString('es-BO')}` : 'Borrador de texto · imágenes públicas'}</p><p className={styles.body}>{item.body}</p>
    <div className={styles.images}>{item.images.map(image => <figure key={image.fileId}><a href={`/api/files/public/${encodeURIComponent(image.fileId)}`} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={`/api/files/public/${encodeURIComponent(image.fileId)}`} alt={image.caption} /></a><figcaption>{image.caption}</figcaption></figure>)}</div>
    {item.progress && <details><summary>Avances incluidos en esta publicación</summary><p>Registro del creador a la fecha de publicación.</p><ul>{[...item.progress.activities, ...item.progress.milestones].map(row => <li key={row.id}>{row.name}: {row.progressPercent}% · {row.responsibleName || 'Sin responsable'} · {row.actualEndOn ? `Fin real ${row.actualEndOn}` : 'Sin fecha de fin real'}</li>)}</ul><ul>{item.progress.indicators.map(row => <li key={row.id}>{row.name}: {row.achievedValue ?? 'Sin resultado registrado'} {row.unit} · Meta {row.targetValue ?? 'Sin definir'}</li>)}</ul></details>}
    {item.publishedAt && onManage && <Button variant="secondary" onClick={() => onManage(item)}>Gestionar publicación e historial</Button>}
    {!item.publishedAt && onEdit && <Button variant="secondary" onClick={() => onEdit(item)}>Editar borrador</Button>}
  </article>)}</div>
}
export function PublicUpdates({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0)
  const [items, setItems] = useState<UpdateItem[] | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0)
  useEffect(() => { const c = new AbortController(); readUpdatePage(campaignId, true, page, c.signal).then(value => { if (!c.signal.aborted) { setItems(value.items); setTotal(value.total); setError('') } }).catch(e => { if (!c.signal.aborted) setError(failureText(e)) }); return () => c.abort() }, [campaignId, retry, page])
  return <section id="avances" className={styles.page}><h2>Avances del proyecto</h2>{error && <><p role="alert">{error}</p><Button variant="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar avances</Button></>}{!items && !error && <p role="status">Cargando avances…</p>}{items && (items.length ? <UpdateCards items={items} /> : <p>El creador todavía no publicó avances.</p>)}<nav className={styles.actions} aria-label="Paginación de avances"><Button variant="secondary" disabled={page===1} onClick={() => setPage(p=>p-1)}>Anterior</Button><span>Página {page} de {Math.max(1,Math.ceil(total/20))}</span><Button variant="secondary" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Siguiente</Button></nav></section>
}
