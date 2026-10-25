import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { Message } from '../../shared/components/Feedback'
import { SessionError } from '../../shared/api/sessionError'
import { uploadCoverImage } from './coverDraftClient'
import { readGallery, saveGallery, validateGallery, type Gallery } from './galleryClient'
import styles from './gallery.module.css'

interface Resource { key: string; fileId: string; caption: string; file: File | null; error: string }
function Preview({ resource }: { resource: Resource }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = resource.file ? URL.createObjectURL(resource.file) : `/api/files/public/${resource.fileId}`
    if (ref.current) ref.current.src = url
    return () => { if (resource.file) URL.revokeObjectURL(url) }
  }, [resource.file, resource.fileId])
  return <img ref={ref} alt={resource.caption || 'Vista previa de la imagen seleccionada'} />
}
export function GalleryEditor({ campaignId, onDirtyChange, onBusyChange }: { campaignId: string; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [revision, setRevision] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error' | 'saved'>('loading')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [conflict, setConflict] = useState<Gallery | null>(null)
  const active = useRef<AbortController | null>(null)
  const dirty = useRef(false)
  const blocker = useBlocker(() => dirty.current || active.current !== null)
  const navigationWarning = useRef<HTMLDivElement>(null)
  useEffect(() => { if (blocker.state === 'blocked') navigationWarning.current?.focus() }, [blocker.state])
  useEffect(() => {
    const controller = new AbortController()
    readGallery(campaignId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setResources(data.images.map(image => ({ ...image, key: image.fileId, file: null, error: '' })))
      setVideoUrl(data.videoUrl ?? ''); setRevision(data.revision); setStatus('ready')
    }).catch(() => { if (!controller.signal.aborted) { setMessage('No pudimos cargar la galería. Reintenta.'); setStatus('error') } })
    return () => { controller.abort(); active.current?.abort(); onBusyChange(false); onDirtyChange(false) }
  }, [campaignId, attempt, onBusyChange, onDirtyChange])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  function changed() { dirty.current = true; onDirtyChange(true); setMessage(''); setStatus('ready') }
  function update(key: string, patch: Partial<Resource>) { setResources(items => items.map(item => item.key === key ? { ...item, ...patch } : item)); changed() }
  function move(index: number, delta: number) {
    setResources(items => { const next = [...items]; [next[index], next[index + delta]] = [next[index + delta]!, next[index]!]; return next }); changed()
  }
  async function save() {
    if (active.current) return
    const input = { images: resources.map(item => ({ fileId: item.file ? item.key : item.fileId, caption: item.caption })), videoUrl }
    const invalid = validateGallery(input)
    if (invalid) { setMessage(invalid); return }
    const controller = new AbortController(); active.current = controller; setStatus('saving'); onBusyChange(true); setMessage('')
    const uploaded = [...resources]
    try {
      let failed = false
      for (const [index, item] of uploaded.entries()) {
        if (!item.file) continue
        try {
          const result = await uploadCoverImage(item.file, controller.signal)
          uploaded[index] = { ...item, fileId: result.id, file: null, error: '' }
        } catch {
          failed = true
          uploaded[index] = { ...item, error: 'No se pudo cargar. Usa PNG, JPG o WebP hasta 2 MB y reintenta.' }
        }
        if (controller.signal.aborted) return
        setResources([...uploaded])
      }
      if (failed) { setMessage('Conservamos las imágenes y los textos. Reintenta las cargas pendientes.'); setStatus('ready'); return }
      const saved = await saveGallery(campaignId, { revision, videoUrl, images: uploaded.map(({ fileId, caption }) => ({ fileId, caption })) }, controller.signal)
      if (controller.signal.aborted) return
      setRevision(saved.revision); setVideoUrl(saved.videoUrl ?? ''); setConflict(null); setStatus('saved'); dirty.current = false; onDirtyChange(false)
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof SessionError && error.status === 409) {
        setMessage('La campaña cambió. Conservamos tu edición; compara la versión guardada antes de reemplazarla.')
        try { const current = await readGallery(campaignId, controller.signal); if (!controller.signal.aborted) setConflict(current) } catch { /* El reintento conserva la revisión original. */ }
      } else setMessage('No pudimos guardar la galería. Conservamos los cambios para reintentar; comprueba tu sesión y el estado del borrador.')
      setStatus('ready')
    } finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) onBusyChange(false) }
  }
  return <section className={styles.section} aria-label="Galería de la campaña">
    <h2>Galería y vídeo</h2><p>Hasta 20 imágenes públicas PNG, JPG o WebP de 2 MB cada una. Describe cada imagen y elige su orden.</p>
    {status === 'loading' && <p role="status">Cargando galería…</p>}
    {status === 'saved' && <p role="status">Galería guardada.</p>}
    {message && <div role="alert"><Message tone="error" title="Revisa la galería">{message}</Message></div>}
    {blocker.state === 'blocked' && <div role="alertdialog" aria-labelledby="gallery-navigation-title" tabIndex={-1} ref={navigationWarning}>
      <h3 id="gallery-navigation-title">Hay cambios de galería sin guardar</h3><p>Puedes seguir editando y guardar antes de salir. Salir descarta los cambios que todavía no se guardaron.</p>
      <div className={styles.actions}><Button onClick={() => blocker.reset()}>Seguir editando la galería</Button><Button variant="secondary" disabled={status === 'saving'} onClick={() => blocker.proceed()}>Salir sin guardar la galería</Button></div>
    </div>}
    {!revision && status === 'error' && <Button onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>Reintentar carga</Button>}
    {revision && <fieldset disabled={status === 'saving'}>
      <div className={styles.grid}>{resources.map((item, index) => <article className={styles.card} key={item.key}>
        <h3>Imagen {index + 1}</h3><Preview resource={item} />
        <label htmlFor={`gallery-caption-${item.key}`}>Descripción de imagen {index + 1}</label><textarea id={`gallery-caption-${item.key}`} value={item.caption} maxLength={300} onChange={event => update(item.key, { caption: event.target.value })} />
        <label>Reemplazar imagen {index + 1}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) update(item.key, { file, error: '' }) }} /></label>
        {item.error && <p role="alert" className={styles.error}>{item.error}</p>}
        <div className={styles.actions}><Button variant="secondary" aria-label={`Subir imagen ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</Button><Button variant="secondary" aria-label={`Bajar imagen ${index + 1}`} disabled={index === resources.length - 1} onClick={() => move(index, 1)}>↓</Button><Button variant="tertiary" onClick={() => { setResources(items => items.filter(resource => resource.key !== item.key)); changed() }}>Quitar imagen {index + 1}</Button></div>
      </article>)}</div>
      <label>Añadir imágenes<input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={resources.length >= 20} onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = ''
        if (files.length + resources.length > 20) { setMessage('Puedes añadir hasta 20 imágenes.'); return }
        setResources(items => [...items, ...files.map(file => ({ key: crypto.randomUUID(), fileId: '', caption: '', file, error: '' }))]); changed()
      }} /></label>
      <label>Vídeo (opcional)<input className={styles.video} type="url" value={videoUrl} placeholder="https://www.youtube.com/watch?v=…" onChange={event => { setVideoUrl(event.target.value); changed() }} /></label><p>Enlace HTTPS de YouTube o Vimeo. Se abrirá en el proveedor externo.</p>
      {conflict && <aside><h3>Versión guardada en otra pestaña</h3><ol>{conflict.images.map(image => <li key={image.fileId}>{image.caption}</li>)}</ol><p>{conflict.videoUrl || 'Sin vídeo'}</p><Button variant="secondary" onClick={() => { setRevision(conflict.revision); setConflict(null); setMessage('Versión revisada. Guarda para reemplazarla con tu edición.'); }}>Usar mi edición sobre esta versión</Button></aside>}
      <Button loading={status === 'saving'} loadingLabel="Guardando galería…" disabled={Boolean(conflict)} onClick={() => { void save() }}>Guardar galería</Button>
    </fieldset>}
  </section>
}
