import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import { FileInUse, type FileDownload, type FileStorage, type FileUploadInput, type StoredFile } from '../application/files'

// Binarios locales, metadatos/propiedad en file_asset de la base oficial.
@Injectable()
export class TypeormFileStorage implements FileStorage {
  private readonly root = process.env.FILE_STORAGE_DIR ?? join(process.cwd(), 'private', 'files')
  constructor(private readonly database: DatabaseService) {}

  async save(ownerUserId: string, input: FileUploadInput, content: Buffer): Promise<StoredFile> {
    const id = randomUUID()
    const key = `${input.purpose}/${id}.bin`
    const target = join(this.root, key)
    const temp = `${target}.upload`
    const file: StoredFile = { id, ownerUserId, visibility: input.visibility, purpose: input.purpose,
      originalName: input.originalName.trim(), mimeType: input.mimeType, sizeBytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex'), createdAt: new Date().toISOString() }
    try {
      await mkdir(dirname(target), { recursive: true })
      await writeFile(temp, content, { flag: 'wx' })
      await rename(temp, target)
      await this.database.connection().query(`INSERT INTO public.file_asset
        (id,storage_key,file_name,mime_type,size_bytes,checksum,scope,uploaded_by,uploaded_at)
        VALUES($1,$2,$3,$4,$5,$6,$7::file_scope,$8,$9)`,
      [id,key,file.originalName,file.mimeType,file.sizeBytes,file.sha256,file.visibility,ownerUserId,file.createdAt])
      return file
    } catch (error) {
      await Promise.all([rm(temp, { force: true }), rm(target, { force: true })]).catch(() => undefined)
      throw error
    }
  }

  async read(id: string): Promise<FileDownload | null> {
    const rows = await this.database.connection().query(`SELECT id,storage_key AS key,uploaded_by AS "ownerUserId",
      scope AS visibility,file_name AS "originalName",mime_type AS "mimeType",size_bytes::float8 AS "sizeBytes",
      checksum AS sha256,uploaded_at AS "createdAt" FROM public.file_asset WHERE id=$1 AND deleted_at IS NULL`, [id]) as (Omit<StoredFile, 'purpose' | 'createdAt'> & { key: string; createdAt: Date })[]
    const row = rows[0]
    if (!row || !/^(PROFILE_AVATAR|ORGANIZATION_DOCUMENT|CAMPAIGN_PUBLIC_IMAGE)\/[a-f0-9-]{36}\.bin$/.test(row.key)) return null
    try {
      const { key, createdAt, ...metadata } = row
      return { file: { ...metadata, createdAt: createdAt.toISOString(), purpose: key.split('/')[0] as StoredFile['purpose'] }, content: await readFile(join(this.root, key)) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  async delete(id: string, ownerUserId: string): Promise<boolean> {
    // Bloquea eliminación mientras una campaña o un adjunto utilice el archivo.
    return this.database.connection().transaction(async manager => {
      const rows: { id: string }[] = await manager.query('SELECT id FROM public.file_asset WHERE id=$1 AND uploaded_by=$2 AND deleted_at IS NULL FOR UPDATE', [id, ownerUserId])
      if (!rows.length) return false
      const used: { used: boolean }[] = await manager.query(`SELECT
        EXISTS(SELECT 1 FROM public.campaign WHERE cover_file_id=$1) OR
        EXISTS(SELECT 1 FROM public.file_attachment WHERE file_id=$1) OR
        EXISTS(SELECT 1 FROM public.user_profile WHERE avatar_file_id=$1) AS used`, [id])
      if (used[0]?.used) throw new FileInUse()
      // Baja lógica: no inventa un plazo de retención ni elimina evidencias de forma irreversible.
      await manager.query('UPDATE public.file_asset SET deleted_at=now() WHERE id=$1', [id])
      return true
    })
  }
}
