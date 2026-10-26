import type { MigrationInterface, QueryRunner } from 'typeorm'

export class FinancialRead1792368000002 implements MigrationInterface {
  name='FinancialRead1792368000002'
  async up(runner: QueryRunner) {
    await runner.query('GRANT SELECT ON public.refund TO brotar_app')
  }
  async down(): Promise<void> { throw new Error('El acceso financiero no se revierte automáticamente; preparar recuperación revisada.') }
}
