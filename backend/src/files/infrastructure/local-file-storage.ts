import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Injectable } from '@nestjs/common'
import type { FileDownload, FileStorage, FileUploadInput, StoredFile } from '../application/files'

type Manifest = { files: StoredFile[] }

function storageRoot(): string {
  return process.env.FILE_STORAGE_DIR ?? join(process.cwd(), 'private', 'files')
}

@Injectable()
export class LocalFileStorage implements FileStorage {
  private readonly root = storageRoot()
  private readonly manifestPath = join(this.root, 'manifest.json')

  private async manifest(): Promise<Manifest> {
    try { return JSON.parse(await readFile(this.manifestPath, 'utf8')) as Manifest }
    catch { return { files: [] } }
  }

  private async writeManifest(manifest: Manifest): Promise<void> {
    await mkdir(dirname(this.manifestPath), { recursive: true })
    await writeFile(this.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' })
  }

  private path(file: StoredFile): string {
    return join(this.root, file.visibility.toLowerCase(), `${file.id}.bin`)
  }

  private async cleanupTemp(path: string): Promise<void> {
    try { await rm(path, { force: true }) } catch {}
  }

  async save(ownerUserId: string, input: FileUploadInput, content: Buffer): Promise<StoredFile> {
    const id = randomUUID()
    const file: StoredFile = {
      id, ownerUserId, visibility: input.visibility, purpose: input.purpose,
      originalName: input.originalName.trim(), mimeType: input.mimeType, sizeBytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
      createdAt: new Date().toISOString()
    }
    const target = this.path(file)
    const temp = join(this.root, 'tmp', `${id}.upload`)
    try {
      await mkdir(dirname(temp), { recursive: true })
      await mkdir(dirname(target), { recursive: true })
      await writeFile(temp, content, { flag: 'wx' })
      await rename(temp, target)
      const manifest = await this.manifest()
      manifest.files.push(file)
      await this.writeManifest(manifest)
      return file
    } catch (error) {
      await this.cleanupTemp(temp)
      await this.cleanupTemp(target)
      throw error
    }
  }

  async read(id: string): Promise<FileDownload | null> {
    const manifest = await this.manifest()
    const file = manifest.files.find(item => item.id === id)
    if (!file) return null
    try { return { file, content: await readFile(this.path(file)) } }
    catch { return null }
  }

  async delete(id: string, ownerUserId: string): Promise<boolean> {
    const manifest = await this.manifest()
    const index = manifest.files.findIndex(item => item.id === id && item.ownerUserId === ownerUserId)
    if (index < 0) return false
    const [file] = manifest.files.splice(index, 1)
    await this.writeManifest(manifest)
    if (file) await this.cleanupTemp(this.path(file))
    return true
  }
}
