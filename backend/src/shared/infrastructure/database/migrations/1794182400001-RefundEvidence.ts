import type {MigrationInterface,QueryRunner} from 'typeorm'
export class RefundEvidence1794182400001 implements MigrationInterface {
 name='RefundEvidence1794182400001'
 async up(r:QueryRunner){await r.query(`CREATE TABLE brotar_extension.refund_evidence(
 refund_id uuid NOT NULL REFERENCES public.refund(id) ON DELETE RESTRICT,
 file_id uuid NOT NULL REFERENCES public.file_asset(id) ON DELETE RESTRICT,
 display_order smallint NOT NULL CHECK(display_order BETWEEN 0 AND 9),
 PRIMARY KEY(refund_id,file_id),UNIQUE(refund_id,display_order));
 GRANT SELECT,INSERT ON brotar_extension.refund_evidence TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.refund_evidence FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('El vínculo de evidencias financieras no se revierte automáticamente; se conserva para revisión.')}
}
