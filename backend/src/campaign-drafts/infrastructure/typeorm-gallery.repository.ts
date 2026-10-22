import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { GalleryConflict, GalleryUnavailable, type Gallery, type GalleryImage, type GalleryRepository } from '../application/gallery'

// Revisión del agregado multimedia: guardar portada u otra sección no invalida la galería.
const revisionSql = `md5(COALESCE(c.video_url,'') || ':' || COALESCE((SELECT
  jsonb_agg(jsonb_build_array(a.id,a.file_id,a.caption,a.display_order) ORDER BY a.display_order,a.id)::text
  FROM public.file_attachment a WHERE a.campaign_id=c.id AND a.attachment_role='GALLERY'),'[]'))`

@Injectable()
export class TypeormGalleryRepository implements GalleryRepository {
  constructor(private readonly database: DatabaseService) {}
  private async images(manager: EntityManager, id: string): Promise<GalleryImage[]> {
    return manager.query(`SELECT a.file_id AS "fileId", COALESCE(a.caption,'') AS caption
      FROM public.file_attachment a JOIN public.file_asset f ON f.id=a.file_id
      WHERE a.campaign_id=$1 AND a.attachment_role='GALLERY' AND f.deleted_at IS NULL
        AND f.scope='PUBLIC' AND f.storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%'
      ORDER BY a.display_order,a.id`, [id])
  }
  async readOwn(userId: string, id: string): Promise<Gallery> {
    // Una sola instantánea evita entregar revisión e imágenes de versiones distintas.
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows = await manager.query(`SELECT ${revisionSql} AS revision, c.video_url AS "videoUrl"
        FROM public.campaign c WHERE c.id=$1 AND c.creator_user_id=$2 AND c.deleted_at IS NULL`, [id, userId]) as Gallery[]
      if (!rows[0]) throw new GalleryUnavailable()
      return { ...rows[0], images: await this.images(manager, id) }
    })
  }
  async readPublic(id: string): Promise<Omit<Gallery, 'revision'>> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows = await manager.query(`SELECT video_url AS "videoUrl" FROM public.campaign
        WHERE id=$1 AND status='PUBLISHED' AND deleted_at IS NULL`, [id]) as { videoUrl: string | null }[]
      if (!rows[0]) throw new GalleryUnavailable()
      return { videoUrl: rows[0].videoUrl, images: await this.images(manager, id) }
    })
  }
  async save(userId: string, id: string, gallery: Gallery): Promise<Gallery> {
    return this.database.connection().transaction(async manager => {
      const rows = await manager.query(`SELECT c.id FROM public.campaign c
        WHERE c.id=$1 AND c.creator_user_id=$2 AND c.status IN ('DRAFT','CHANGES_REQUESTED') AND c.deleted_at IS NULL FOR UPDATE`, [id, userId]) as { id: string }[]
      if (!rows[0]) throw new GalleryUnavailable()
      // Leer tras adquirir el bloqueo: ve lo confirmado mientras esta escritura esperaba.
      const current = await manager.query(`SELECT ${revisionSql} AS revision FROM public.campaign c WHERE c.id=$1`, [id]) as { revision: string }[]
      if (current[0]!.revision !== gallery.revision) throw new GalleryConflict()
      if (gallery.images.length) {
        const files = await manager.query(`SELECT id FROM public.file_asset WHERE id=ANY($1::uuid[])
          AND uploaded_by=$2 AND scope='PUBLIC' AND storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%'
          AND deleted_at IS NULL ORDER BY id FOR UPDATE`, [gallery.images.map(image => image.fileId), userId]) as unknown[]
        if (files.length !== gallery.images.length) throw new GalleryUnavailable()
      }
      await manager.query('SELECT set_config($1,$2,true)', ['brotar.actor_id', userId])
      await manager.query(`UPDATE public.file_attachment SET attachment_role='GALLERY_ARCHIVED'
        WHERE campaign_id=$1 AND attachment_role='GALLERY'`, [id])
      for (const [index, image] of gallery.images.entries()) await manager.query(`
        INSERT INTO public.file_attachment(file_id,campaign_id,attachment_role,caption,display_order)
        VALUES($1,$2,'GALLERY',$3,$4)`, [image.fileId, id, image.caption, index])
      await manager.query('UPDATE public.campaign SET video_url=$2,updated_at=clock_timestamp() WHERE id=$1', [id, gallery.videoUrl])
      const updated = await manager.query(`SELECT ${revisionSql} AS revision FROM public.campaign c WHERE c.id=$1`, [id]) as { revision: string }[]
      return { ...gallery, revision: updated[0]!.revision }
    })
  }
}
