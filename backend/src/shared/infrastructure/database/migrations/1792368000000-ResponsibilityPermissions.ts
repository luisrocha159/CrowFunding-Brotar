import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Instantánea inmutable de D06 provisional; cambios futuros requieren OTRA migración. */
export class ResponsibilityPermissions1792368000000 implements MigrationInterface {
  name = 'ResponsibilityPermissions1792368000000'
  async up(runner: QueryRunner) {
    const matrix: [string, string[]][] = [
      ['campaign.review.read', ['REVIEWER','ADMIN','AUDITOR']],
      ['campaign.review.decide', ['REVIEWER','ADMIN']], ['campaign.publish', ['ADMIN']],
      ['creator.provision', ['ADMIN']], ['catalog.manage', ['ADMIN']],
      ['verification.review', ['COMPLIANCE','ADMIN']],
      ['finance.read', ['FINANCE','ADMIN','AUDITOR']], ['finance.operate', ['FINANCE']],
      ['support.read', ['SUPPORT','ADMIN','AUDITOR']], ['support.resolve', ['SUPPORT']],
      ['audit.read', ['ADMIN','AUDITOR']], ['contribution.read.own', ['REGISTERED_USER','SPONSOR']]
    ]
    for (const [code, roles] of matrix) {
      await runner.query(`INSERT INTO public.permission(code,resource,action,description)
        VALUES($1,$1,'access','Matriz provisional del equipo S3-16; no concede roles a usuarios.')
        ON CONFLICT(code) DO NOTHING`, [code])
      await runner.query(`INSERT INTO public.role_permission(role_id,permission_id)
        SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
        WHERE r.code=ANY($1::text[]) AND p.code=$2 ON CONFLICT DO NOTHING`, [roles,code])
    }
  }
  async down(): Promise<void> { throw new Error('Revisar la matriz y preparar una migración explícita; no revocar permisos automáticamente.') }
}
