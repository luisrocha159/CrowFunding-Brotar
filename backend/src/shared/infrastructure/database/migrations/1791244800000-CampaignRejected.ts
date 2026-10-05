import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Complemento explícito del PDF Fase 3. No cambia el SQL oficial ni datos existentes. */
export class CampaignRejected1791244800000 implements MigrationInterface {
  name = 'CampaignRejected1791244800000'
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'REJECTED'")
  }
  async down(): Promise<void> {
    throw new Error('PostgreSQL no elimina valores ENUM de forma segura. Recupera un respaldo previo; no se transforman rechazos ni se borran campañas.')
  }
}
