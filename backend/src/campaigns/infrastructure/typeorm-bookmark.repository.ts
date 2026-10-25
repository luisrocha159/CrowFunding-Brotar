import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import {transactionRegisteredAccess} from '../../roles/infrastructure/transaction-access'
import {recordAudit,setAuditActor} from '../../shared/infrastructure/database/audit'
import { BookmarkUnavailable, type BookmarkItem, type BookmarkKind, type BookmarkPage, type BookmarkRepository, type BookmarkState, type FollowedUpdate } from '../application/bookmarks'

const publicHistory = "c.deleted_at IS NULL AND (c.status='PUBLISHED' OR (c.published_at IS NOT NULL AND c.status IN ('FUNDING_ENDED','IN_EXECUTION','CLOSED','CANCELLED')))"
@Injectable()
export class TypeormBookmarkRepository implements BookmarkRepository {
  constructor(private readonly database: DatabaseService) {}
  private async readState(manager: EntityManager, userId: string, id: string): Promise<BookmarkState> {
    const rows = await manager.query(`SELECT kind FROM public.campaign_bookmark WHERE user_id=$1 AND campaign_id=$2`, [userId, id]) as { kind: BookmarkKind }[]
    return { favorite: rows.some(row => row.kind === 'FAVORITE'), following: rows.some(row => row.kind === 'FOLLOW') }
  }
  async state(userId: string, id: string) {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const rows = await manager.query(`SELECT c.id FROM public.campaign c WHERE c.id=$2 AND
        ((${publicHistory}) OR EXISTS(SELECT 1 FROM public.campaign_bookmark b WHERE b.campaign_id=c.id AND b.user_id=$1))`, [userId, id]) as unknown[]
      if (!rows.length) throw new BookmarkUnavailable()
      return this.readState(manager, userId, id)
    })
  }
  async set(userId: string, id: string, kind: BookmarkKind, active: boolean) {
    return this.database.connection().transaction(async manager => {
      // Bloqueo compartido por todos los tipos: dos pestañas conservan ambas elecciones.
      await manager.query('SELECT id FROM public.app_user WHERE id=$1 FOR UPDATE', [userId])
      await transactionRegisteredAccess(manager,userId)
      let changedId:string|undefined
      if (active) {
        const rows = await manager.query(`SELECT id FROM public.campaign WHERE id=$1
          AND status='PUBLISHED' AND deleted_at IS NULL FOR SHARE`, [id]) as unknown[]
        if (!rows.length) {
          const existing = await this.readState(manager, userId, id)
          if (kind === 'FAVORITE' ? !existing.favorite : !existing.following) throw new BookmarkUnavailable()
          return existing
        }
        const inserted:{id:string}[]=await manager.query(`INSERT INTO public.campaign_bookmark(user_id,campaign_id,kind)
          VALUES($1,$2,$3) ON CONFLICT(user_id,campaign_id,kind) DO NOTHING RETURNING id`, [userId, id, kind])
        changedId=inserted[0]?.id
      } else {
        const result=await manager.query('DELETE FROM public.campaign_bookmark WHERE user_id=$1 AND campaign_id=$2 AND kind=$3 RETURNING id', [userId, id, kind])
        const rows:{id:string}[]=Array.isArray(result[0])?result[0]:result
        changedId=rows[0]?.id
      }
      const after=await this.readState(manager,userId,id)
      await transactionRegisteredAccess(manager,userId)
      if(changedId){
        await setAuditActor(manager,userId)
        await recordAudit(manager,userId,active?'CREATE':'DELETE','campaign_bookmark',changedId)
      }
      return after
    })
  }
  async list(userId: string, kind: BookmarkKind, page: number): Promise<BookmarkPage<BookmarkItem>> {
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const count = await manager.query('SELECT count(*)::int AS total FROM public.campaign_bookmark WHERE user_id=$1 AND kind=$2', [userId, kind]) as { total: number }[]
      const rows = await manager.query(`SELECT c.id AS "campaignId",
        CASE WHEN ${publicHistory} THEN c.title ELSE 'Campaña no disponible' END AS title,
        CASE WHEN c.status='PUBLISHED' AND c.deleted_at IS NULL THEN c.slug ELSE NULL END AS slug,
        CASE WHEN ${publicHistory} THEN c.status::text ELSE 'UNAVAILABLE' END AS status,
        b.created_at AS "createdAt" FROM public.campaign_bookmark b JOIN public.campaign c ON c.id=b.campaign_id
        WHERE b.user_id=$1 AND b.kind=$2 ORDER BY b.created_at DESC,b.id DESC LIMIT 20 OFFSET $3`, [userId, kind, (page - 1) * 20]) as (Omit<BookmarkItem, 'createdAt'> & { createdAt: Date })[]
      return { items: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })), total: count[0]!.total, page, pageSize: 20 }
    })
  }
  async updates(userId: string, page: number): Promise<BookmarkPage<FollowedUpdate>> {
    const from = `FROM public.campaign_update u JOIN public.campaign c ON c.id=u.campaign_id
      JOIN public.campaign_bookmark b ON b.campaign_id=c.id AND b.user_id=$1 AND b.kind='FOLLOW'
      WHERE (${publicHistory}) AND u.visibility='PUBLIC' AND u.deleted_at IS NULL AND u.published_at<=now()`
    return this.database.connection().transaction('REPEATABLE READ', async manager => {
      const count = await manager.query(`SELECT count(*)::int AS total ${from}`, [userId]) as { total: number }[]
      const rows = await manager.query(`SELECT u.id,c.id AS "campaignId",c.title AS "campaignTitle",
        CASE WHEN c.status='PUBLISHED' THEN c.slug ELSE NULL END AS slug,
        u.title,u.body,u.published_at AS "publishedAt" ${from}
        ORDER BY u.published_at DESC,u.id DESC LIMIT 20 OFFSET $2`, [userId, (page - 1) * 20]) as (Omit<FollowedUpdate, 'publishedAt'> & { publishedAt: Date })[]
      return { items: rows.map(row => ({ ...row, publishedAt: row.publishedAt.toISOString() })), total: count[0]!.total, page, pageSize: 20 }
    })
  }
}
