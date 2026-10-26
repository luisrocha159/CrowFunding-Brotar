import type { MigrationInterface, QueryRunner } from 'typeorm'

export class StaffResponsibilities1792454400000 implements MigrationInterface {
  name = 'StaffResponsibilities1792454400000'
  async up(runner: QueryRunner) {
    await runner.query(`INSERT INTO public.permission(code,resource,action,description)
      VALUES('roles.manage','user_role','manage','ADMIN gestiona responsabilidades de otras cuentas; criterio MVP del equipo.') ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
        WHERE r.code='ADMIN' AND p.code='roles.manage' ON CONFLICT DO NOTHING;
      GRANT UPDATE(revoked_at) ON public.user_role TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('Las concesiones históricas no se eliminan automáticamente. Preparar recuperación revisada.') }
}
