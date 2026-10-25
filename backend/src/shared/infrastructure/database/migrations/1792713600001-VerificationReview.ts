import type {MigrationInterface,QueryRunner} from 'typeorm'
export class VerificationReview1792713600001 implements MigrationInterface {
 name='VerificationReview1792713600001'
 async up(r:QueryRunner){await r.query(`INSERT INTO public.permission(code,resource,action,description) VALUES('verification.read','verification','read','Consulta autorizada de expedientes privados DEMO') ON CONFLICT(code) DO NOTHING;
  INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p WHERE r.code IN ('COMPLIANCE','ADMIN') AND p.code='verification.read' ON CONFLICT DO NOTHING;
  ALTER TABLE brotar_extension.verification_revision DROP CONSTRAINT verification_revision_operation_check;
  ALTER TABLE brotar_extension.verification_revision ADD CONSTRAINT verification_revision_operation_check CHECK(operation IN ('BEFORE_CHANGE','SAVE','SUBMIT','REVIEW'));
  GRANT UPDATE(is_valid,review_notes) ON public.verification_document TO brotar_app;
  CREATE INDEX verification_review_queue_idx ON public.verification(status,updated_at,id);`)}
 async down():Promise<void>{throw new Error('La revisión no se revierte automáticamente; conservar decisiones y documentos.')}
}
