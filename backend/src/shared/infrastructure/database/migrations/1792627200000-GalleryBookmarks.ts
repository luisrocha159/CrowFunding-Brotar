import type { MigrationInterface, QueryRunner } from 'typeorm'
export class GalleryBookmarks1792627200000 implements MigrationInterface {
  name = 'GalleryBookmarks1792627200000'
  async up(runner: QueryRunner) {
    await runner.query(`GRANT UPDATE ON public.file_attachment TO brotar_app;
      GRANT SELECT,INSERT,DELETE ON public.campaign_bookmark TO brotar_app;
      GRANT SELECT ON public.campaign_update TO brotar_app;
      CREATE INDEX campaign_bookmark_user_kind_created_idx ON public.campaign_bookmark(user_id,kind,created_at DESC,id DESC);
      CREATE INDEX file_attachment_gallery_idx ON public.file_attachment(campaign_id,display_order,id) WHERE attachment_role='GALLERY';`)
  }
  async down(): Promise<void> { throw new Error('La galería y el seguimiento no se revierte automáticamente: conservar favoritos y asociaciones históricas; preparar una migración revisada para revertir permisos o índices.') }
}
