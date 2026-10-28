import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { SessionError } from '../../shared/api/sessionError'
import { uploadFile } from '../files/fileClient'
import { validateUpdate } from '../../../backend/src/campaign-progress/domain/progress'
import { failureText, readUpdate, readUpdatePage, saveUpdate, type ProgressState, type UpdateInput, type UpdateItem } from './progressClient'
import { UpdateCards } from './UpdateCards'
import { PublicationManager } from './PublicationManager'
import styles from './progress.module.css'
const blank = (): UpdateInput => ({ revision: null, title: '', body: '', milestoneId: null, images: [], publish: false })
export function UpdatesEditor({ id, progress, progressDirty, onDirty }: { id: string; progress: ProgressState; progressDirty: boolean; onDirty: (dirty: boolean) => void }) {
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0)
  const [items, setItems] = useState<UpdateItem[] | null>(null); const [input, setInput] = useState(blank); const [updateId, setUpdateId] = useState<string>(() => crypto.randomUUID()); const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [confirm, setConfirm] = useState(false); const [retry, setRetry] = useState(0)
  const [managed,setManaged]=useState<UpdateItem|null>(null),[publicationDirty,setPublicationDirty]=useState(false)
  const [recover, setRecover] = useState(false)
  useEffect(() => { onDirty(dirty||publicationDirty) }, [dirty, publicationDirty, onDirty])
  useEffect(() => { const c = new AbortController(); readUpdatePage(id, false, page, c.signal).then(value => { if (!c.signal.aborted) { setItems(value.items); setTotal(value.total) } }).catch(e => { if (!c.signal.aborted) setError(failureText(e)) }); return () => c.abort() }, [id, retry, page])
  function change(patch: Partial<UpdateInput>) { setInput(value => ({ ...value, ...patch })); setDirty(true); setNotice(''); setConfirm(false) }
  async function reloadSaved() {
    if (lock.current) return
    lock.current=true; setBusy(true); setError('')
    try {
      const saved=await readUpdate(id,updateId)
      if (saved.publishedAt) {setInput(blank());setUpdateId(crypto.randomUUID());setNotice('Esta novedad ya se publicó. Su contenido está en el historial.')}
      else {setInput({revision:saved.revision!,title:saved.title,body:saved.body,milestoneId:saved.milestoneId,images:saved.images,publish:false});setNotice('Versión guardada recuperada.')}
      setDirty(false);setRecover(false);setRetry(v=>v+1)
    } catch(e) {
      if(e instanceof SessionError && e.status===404 && input.revision===null){setInput(blank());setUpdateId(crypto.randomUUID());setDirty(false);setRecover(false);setNotice('No había un borrador guardado. Puedes empezar una novedad.')}
      else setError(failureText(e))
    } finally {lock.current=false;setBusy(false)}
  }
  async function save(publish: boolean) {
    if (lock.current) return
    const errors = Object.values(validateUpdate({ ...input, publish })); if (errors.length) { setError(errors.join(' ')); return }
    lock.current = true; setBusy(true); setError('')
    try { const saved = await saveUpdate(id, updateId, { ...input, publish }); setItems(current => [saved, ...(current ?? []).filter(i => i.id !== saved.id)]); setInput(publish ? blank() : { ...input, revision: saved.revision! }); if (publish) setUpdateId(crypto.randomUUID()); setDirty(false); setConfirm(false); setPage(1); setRetry(v => v+1); setNotice(publish ? 'Novedad publicada. Incluye los últimos avances guardados.' : 'Borrador de novedad guardado.') } catch (e) { setError(failureText(e)) } finally { lock.current = false; setBusy(false) }
  }
  async function attach(file: File) {
    if (lock.current || input.images.length >= 10) return
    if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Usa PNG, JPG o WebP de hasta 2 MB.'); return }
    lock.current = true; setBusy(true); setError('')
    try { const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]!); reader.onerror = reject; reader.readAsDataURL(file) }); const saved = await uploadFile({ visibility: 'PUBLIC', purpose: 'CAMPAIGN_PUBLIC_IMAGE', originalName: file.name, mimeType: file.type, contentBase64 }); change({ images: [...input.images, { fileId: saved.id, caption: file.name }] }) } catch (e) { setError(failureText(e)) } finally { lock.current = false; setBusy(false) }
  }
  return <section className={styles.page}><h2>Novedades del proyecto</h2><p>Una publicación comparte su texto, imágenes y los avances guardados (incluidos responsables y resultados). Evita información privada. Las imágenes son públicas desde el momento de cargarlas, incluso mientras el texto sea un borrador. Las publicaciones conservan su versión histórica.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {managed && <PublicationManager key={managed.id} id={id} item={managed} progress={progress} onDirty={setPublicationDirty} onClose={()=>setManaged(null)} onSaved={()=>{setManaged(null);setRetry(v=>v+1);setNotice('Cambio de publicación registrado.')}} />}
    {progress.editable && !managed && <div className={styles.card}><fieldset disabled={busy} aria-label="Editar novedad"><legend>{input.revision ? 'Editar borrador' : 'Nueva novedad'}</legend>
      <Button variant="tertiary" disabled={dirty || busy} onClick={() => { setInput(blank()); setUpdateId(crypto.randomUUID()); setConfirm(false); setError('') }}>Empezar otra novedad</Button>
      <label>Título de la novedad<input value={input.title} maxLength={200} onChange={e => change({ title: e.target.value })} /></label>
      <label htmlFor="update-body">Descripción del avance</label><textarea id="update-body" value={input.body} maxLength={10000} onChange={e => change({ body: e.target.value })} />
      <label htmlFor="update-milestone">Hito relacionado</label><select id="update-milestone" value={input.milestoneId ?? ''} onChange={e => change({ milestoneId: e.target.value || null })}><option value="">Avance general</option>{progress.milestones.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
      <label>Añadir evidencia pública (imagen, hasta 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={input.images.length >= 10} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void attach(file) }} /></label>
      {input.images.map((image, index) => <div key={image.fileId}><label>Descripción de evidencia {index + 1}<input maxLength={300} value={image.caption} onChange={e => change({ images: input.images.map((row, i) => i === index ? { ...row, caption: e.target.value } : row) })} /></label><Button variant="tertiary" onClick={() => change({ images: input.images.filter((_, i) => i !== index) })}>Quitar evidencia {index + 1}</Button></div>)}
      <div className={styles.actions}><Button loading={busy} onClick={() => { void save(false) }}>Guardar borrador de novedad</Button><Button disabled={progressDirty || !items} variant="secondary" onClick={() => setConfirm(true)}>Revisar publicación</Button><Button variant="tertiary" onClick={() => setRecover(true)}>Recuperar versión guardada</Button></div>
      {recover && <section role="alertdialog" aria-label="Recuperar novedad"><h3>Recuperar versión guardada</h3><p>Se reemplazarán los campos de esta novedad por los guardados en el servidor. Si aún no existe un borrador guardado, se limpiarán los campos. Puedes cancelar para conservarlos.</p><div className={styles.actions}><Button onClick={() => {void reloadSaved()}}>Confirmar recuperación</Button><Button variant="secondary" onClick={() => setRecover(false)}>Conservar mis cambios</Button></div></section>}
      {progressDirty && <p>Guarda los avances antes de publicar una novedad.</p>}
      {confirm && <section role="alertdialog" aria-label="Confirmar publicación"><h3>Publicar esta novedad</h3><p>El texto y los resultados pasarán a ser públicos. Las imágenes ya son públicas desde su carga. Se incluirán los últimos avances guardados y no podrán editarse desde este formulario.</p><div className={styles.actions}><Button onClick={() => { void save(true) }}>Confirmar publicación</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Seguir editando</Button></div></section>}
    </fieldset></div>}
    {!items && !error && <p role="status">Cargando novedades…</p>}{!items && error && <Button onClick={() => setRetry(v => v + 1)}>Reintentar novedades</Button>}
    {items && <><h3>Historial ({total})</h3>{!items.length && <p>Todavía no hay novedades.</p>}<UpdateCards items={items} onManage={item=>{if(dirty||busy||publicationDirty){setError('Guarda o descarta los cambios actuales antes de abrir otra publicación.');return};setManaged(item)}} onEdit={progress.editable ? item => { if (dirty || busy) { setError('Guarda la novedad actual antes de abrir otra.'); return }; setUpdateId(item.id); setInput({ revision: item.revision!, title: item.title, body: item.body, milestoneId: item.milestoneId, images: item.images, publish: false }); setConfirm(false); setError(''); setNotice('Borrador cargado para editar.') } : undefined} /><nav className={styles.actions} aria-label="Paginación de novedades"><Button variant="secondary" disabled={page===1 || dirty || busy || publicationDirty} onClick={() => setPage(p=>p-1)}>Anterior</Button><span>Página {page} de {Math.max(1,Math.ceil(total/20))}</span><Button variant="secondary" disabled={page*20>=total || dirty || busy || publicationDirty} onClick={() => setPage(p=>p+1)}>Siguiente</Button></nav></>}
  </section>
}
