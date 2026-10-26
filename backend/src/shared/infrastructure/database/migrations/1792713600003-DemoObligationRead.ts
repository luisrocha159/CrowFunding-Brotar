import type {MigrationInterface,QueryRunner} from 'typeorm'
/** La reserva de devoluciones debe descontar desembolsos comprometidos, sin permitir operarlos. */
export class DemoObligationRead1792713600003 implements MigrationInterface {
 name='DemoObligationRead1792713600003'
 async up(r:QueryRunner){await r.query(`GRANT SELECT ON public.disbursement TO brotar_app;
  DROP INDEX IF EXISTS public.brotar_refund_external_reference_uq;
  CREATE UNIQUE INDEX brotar_refund_external_reference_uq ON public.refund(external_reference) WHERE external_reference IS NOT NULL AND provider_payload->>'mode'='DEMO';`)}
 async down():Promise<void>{throw new Error('La lectura de obligaciones no se revierte automáticamente; revisar permisos con los módulos financieros.')}
}
