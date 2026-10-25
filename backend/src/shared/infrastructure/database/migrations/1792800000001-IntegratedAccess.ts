import type {MigrationInterface,QueryRunner} from 'typeorm'

/** Permisos separados para consultas administrativas existentes; no concede roles ni modifica cuentas. */
export class IntegratedAccess1792800000001 implements MigrationInterface {
 name='IntegratedAccess1792800000001'
 async up(r:QueryRunner){
  for(const code of ['parties.read','dashboard.read']){
   await r.query(`INSERT INTO public.permission(code,resource,action,description) VALUES($1,$1,'access','Lectura administrativa por responsabilidad del MVP DEMO') ON CONFLICT(code) DO NOTHING`,[code])
   await r.query(`INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
    WHERE r.code IN ('ADMIN','AUDITOR') AND p.code=$1 ON CONFLICT DO NOTHING`,[code])
  }
 }
 async down():Promise<void>{throw new Error('El acceso integrado no se revierte automáticamente; preparar una reversión explícita sin eliminar historial.')}
}
