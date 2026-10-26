import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Concede entrada al resumen y los agregados disponibles según responsabilidad. */
export class ResponsibilityDashboard1792800000003 implements MigrationInterface {
  name = 'ResponsibilityDashboard1792800000003'
  async up(runner: QueryRunner) {
    await runner.query(`INSERT INTO public.role_permission(role_id,permission_id)
      SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
      WHERE r.code IN ('REVIEWER','COMPLIANCE','FINANCE','SUPPORT') AND p.code='dashboard.read'
      ON CONFLICT DO NOTHING`)
  }
  async down(): Promise<void> {
    throw new Error('El acceso al panel no se revierte automáticamente; revisar permisos y conservar los existentes.')
  }
}
