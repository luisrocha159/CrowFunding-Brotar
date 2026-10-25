import type { MigrationInterface, QueryRunner } from 'typeorm'

export class DemoPayments1792540800000 implements MigrationInterface {
  name='DemoPayments1792540800000'
  async up(runner: QueryRunner) {
    // No convertir ni reactivar un proveedor previo con el mismo código.
    await runner.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.payment_provider
      WHERE code='BROTAR_INTERNAL_DEMO' AND (NOT is_sandbox OR NOT is_active OR config->>'mode' IS DISTINCT FROM 'DEMO'))
      THEN RAISE EXCEPTION 'Proveedor DEMO en conflicto: revisar sin sobrescribir configuración'; END IF; END $$;
      INSERT INTO public.payment_provider(code,name,description,is_sandbox,config)
      VALUES('BROTAR_INTERNAL_DEMO','Brotar · simulador interno','Sin banco, QR pagable ni dinero real.',true,'{"mode":"DEMO"}') ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.permission(code,resource,action,description)
      VALUES('contribution.write.own','contribution','write.own','Ensayo de aporte propio; nunca autoriza un cobro real.') ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
        WHERE r.code IN ('REGISTERED_USER','SPONSOR') AND p.code='contribution.write.own' ON CONFLICT DO NOTHING;

      CREATE TABLE brotar_extension.demo_event (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key char(64) NOT NULL UNIQUE,
        request_hash char(64) NOT NULL, actor_id uuid REFERENCES public.app_user(id) ON DELETE SET NULL,
        payment_id uuid NOT NULL REFERENCES public.payment(id) ON DELETE RESTRICT,
        observed_status public.payment_status NOT NULL CHECK(observed_status IN ('PENDING','CONFIRMED','FAILED','EXPIRED')),
        amount numeric(14,2) NOT NULL CHECK(amount>0), currency_code char(3) NOT NULL REFERENCES public.currency(code),
        external_reference varchar(200) NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
        processing varchar(20) NOT NULL CHECK(processing IN ('RECEIVED','APPLIED','NEEDS_REVIEW','COMPENSATED','RECONCILED')),
        reason_code varchar(40), processed_at timestamptz
      );
      CREATE INDEX demo_event_payment_idx ON brotar_extension.demo_event(payment_id,recorded_at);
      CREATE INDEX demo_event_reference_idx ON brotar_extension.demo_event(external_reference,currency_code) WHERE observed_status='CONFIRMED';
      CREATE INDEX demo_event_review_idx ON brotar_extension.demo_event(recorded_at) WHERE processing='NEEDS_REVIEW';
      CREATE TABLE brotar_extension.demo_compensation (
        payment_id uuid PRIMARY KEY REFERENCES public.payment(id) ON DELETE RESTRICT,
        event_id uuid NOT NULL UNIQUE REFERENCES brotar_extension.demo_event(id) ON DELETE RESTRICT,
        external_reference varchar(200) NOT NULL UNIQUE, amount numeric(14,2) NOT NULL CHECK(amount>0),
        currency_code char(3) NOT NULL REFERENCES public.currency(code),
        reason varchar(500) NOT NULL CHECK(char_length(trim(reason)) BETWEEN 20 AND 500),
        actor_id uuid REFERENCES public.app_user(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE brotar_extension.demo_reconciliation (
        reconciliation_id uuid PRIMARY KEY REFERENCES public.reconciliation(id) ON DELETE CASCADE,
        currency_code char(3) NOT NULL REFERENCES public.currency(code), request_key char(64) NOT NULL UNIQUE,
        request_hash char(64) NOT NULL, snapshot_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE brotar_extension.demo_reconciliation_item (
        item_id uuid PRIMARY KEY REFERENCES public.reconciliation_item(id) ON DELETE CASCADE,
        original_status public.reconciliation_item_status NOT NULL,
        resolution varchar(30) CHECK(resolution IN ('RECHECK','COMPENSATE_DEMO')),
        reason varchar(500), CHECK(reason IS NULL OR char_length(trim(reason)) BETWEEN 20 AND 500)
      );
      GRANT SELECT,INSERT ON brotar_extension.demo_event,brotar_extension.demo_compensation,
        brotar_extension.demo_reconciliation,brotar_extension.demo_reconciliation_item TO brotar_app;
      GRANT UPDATE(processing,reason_code,processed_at) ON brotar_extension.demo_event TO brotar_app;
      GRANT UPDATE(resolution,reason) ON brotar_extension.demo_reconciliation_item TO brotar_app;
      GRANT SELECT,INSERT ON public.reconciliation,public.reconciliation_item TO brotar_app;
      GRANT UPDATE(status,closed_by,closed_at) ON public.reconciliation TO brotar_app;
      GRANT UPDATE(status,resolved_by,resolved_at) ON public.reconciliation_item TO brotar_app;`)
  }
  async down(): Promise<void> { throw new Error('El historial DEMO no se revierte automáticamente; preparar recuperación revisada.') }
}
