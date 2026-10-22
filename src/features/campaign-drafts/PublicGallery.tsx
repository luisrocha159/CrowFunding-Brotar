import { useEffect, useState } from 'react'
import { Button } from '../../shared/components/Button'
import { readGallery, type PublicGalleryData } from './galleryClient'
import styles from './gallery.module.css'
export function PublicGallery({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<PublicGalleryData | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    readGallery(campaignId, controller.signal, true).then(value => { if (!controller.signal.aborted) { setData(value); setError(false) } }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [campaignId, attempt])
  return <section id="galeria" className={styles.section}><h2>Galería</h2>
    {error ? <><p role="alert">No pudimos cargar la galería.</p><Button onClick={() => { setError(false); setAttempt(value => value + 1) }}>Reintentar galería</Button></> : !data ? <p role="status">Cargando galería…</p> : <>
      {!data.images.length && !data.videoUrl && <p>Esta campaña todavía no publica imágenes adicionales.</p>}
      <div className={styles.grid}>{data.images.map(image => <figure className={styles.figure} key={image.fileId}><a href={`/api/files/public/${image.fileId}`} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar: ${image.caption}`}><img src={`/api/files/public/${image.fileId}`} alt={image.caption} loading="lazy" /></a><figcaption>{image.caption}</figcaption></figure>)}</div>
      {data.videoUrl && <a href={data.videoUrl} target="_blank" rel="noopener noreferrer">Ver vídeo en el proveedor externo ↗</a>}
    </>}
  </section>
}
