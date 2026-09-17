import { Inject, Injectable, Logger, ServiceUnavailableException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { DataSource } from 'typeorm'
import { createDataSource } from './data-source'
import type { DatabaseConfig } from './database.config'

export const DATABASE_CONFIG = Symbol('DATABASE_CONFIG')

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private readonly source: DataSource | null

  constructor(@Inject(DATABASE_CONFIG) config: DatabaseConfig) {
    this.source = config.enabled ? createDataSource(config) : null
  }

  async onModuleInit(): Promise<void> {
    if (!this.source) return
    try { await this.source.initialize() }
    catch { this.logger.warn('PostgreSQL no disponible. Revisa configuración y restauración; readiness devuelve 503.') }
  }

  async isReady(): Promise<boolean> {
    if (!this.source?.isInitialized) return false
    try {
      // Una conexión a una base vacía no significa que la entrega esté preparada.
      const rows: { ready: boolean }[] = await this.source.query(`
        SELECT to_regclass('public.app_user') IS NOT NULL
          AND to_regclass('public.user_profile') IS NOT NULL
          AND to_regclass('public.role') IS NOT NULL
          AND to_regclass('public.organization') IS NOT NULL AS ready
      `)
      return rows[0]?.ready === true
    } catch { return false }
  }

  connection(): DataSource {
    if (!this.source?.isInitialized) throw new ServiceUnavailableException()
    return this.source
  }

  async onModuleDestroy(): Promise<void> {
    if (this.source?.isInitialized) await this.source.destroy()
  }
}
