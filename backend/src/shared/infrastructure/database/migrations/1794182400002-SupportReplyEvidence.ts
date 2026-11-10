import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Adjuntos privados por mensaje; conserva casos y respuestas existentes. */
export class SupportReplyEvidence1794182400002 implements MigrationInterface {
  name = 'SupportReplyEvidence1794182400002'
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE brotar_extension.support_reply_evidence (
      message_id uuid NOT NULL REFERENCES public.support_case_message(id) ON DELETE CASCADE,
      file_id uuid NOT NULL REFERENCES public.file_asset(id) ON DELETE RESTRICT,
      display_order smallint NOT NULL CHECK(display_order BETWEEN 0 AND 9),
      PRIMARY KEY(message_id,file_id), UNIQUE(message_id,display_order)
    );
    CREATE INDEX support_reply_evidence_file_idx ON brotar_extension.support_reply_evidence(file_id);
    GRANT SELECT,INSERT ON brotar_extension.support_reply_evidence TO brotar_app;
    REVOKE UPDATE,DELETE ON brotar_extension.support_reply_evidence FROM brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('Los adjuntos de conversaciones se conservan; no se eliminan automáticamente.') }
}
