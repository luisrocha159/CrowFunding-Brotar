import type {MigrationInterface,QueryRunner} from 'typeorm'
export class SantiagoRepresentation1793059200000 implements MigrationInterface {
 name='SantiagoRepresentation1793059200000'
 async up(r:QueryRunner){await r.query(`
 CREATE TABLE brotar_extension.representation_request(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES public.organization(id),
  kind text NOT NULL CHECK(kind IN ('REPRESENTATIVE','OWNERSHIP')),
  target_user_id uuid NOT NULL REFERENCES public.app_user(id),requested_by uuid NOT NULL REFERENCES public.app_user(id),
  organization_version integer NOT NULL CHECK(organization_version>=0),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','ACCEPTED','APPROVED','REJECTED','DECLINED','CANCELLED')),
  version integer NOT NULL DEFAULT 1 CHECK(version>=1),reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),accepted_at timestamptz,accepted_by uuid REFERENCES public.app_user(id),
  decided_at timestamptz,decided_by uuid REFERENCES public.app_user(id),decision_reason text CHECK(decision_reason IS NULL OR length(decision_reason) BETWEEN 10 AND 1000),
  CHECK(target_user_id<>requested_by),CHECK((accepted_at IS NULL)=(accepted_by IS NULL)),
  CHECK(accepted_by IS NULL OR accepted_by=target_user_id),CHECK(status NOT IN ('ACCEPTED','APPROVED') OR accepted_at IS NOT NULL),
  CHECK((decided_at IS NULL)=(decided_by IS NULL)),CHECK((decided_at IS NULL)=(decision_reason IS NULL)),
  CHECK((status IN ('APPROVED','REJECTED','DECLINED','CANCELLED'))=(decided_at IS NOT NULL))
 );
 CREATE UNIQUE INDEX representation_one_pending_idx ON brotar_extension.representation_request(organization_id) WHERE status IN ('REQUESTED','ACCEPTED');
 CREATE INDEX representation_requester_idx ON brotar_extension.representation_request(requested_by,requested_at DESC,id DESC);
 CREATE INDEX representation_target_idx ON brotar_extension.representation_request(target_user_id,requested_at DESC,id DESC);
 CREATE INDEX representation_org_idx ON brotar_extension.representation_request(organization_id,requested_at DESC,id DESC);
 CREATE INDEX representation_queue_idx ON brotar_extension.representation_request(requested_at DESC,id DESC);
 CREATE TABLE brotar_extension.representation_event(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES brotar_extension.representation_request(id),
  version integer NOT NULL CHECK(version>=1),action text NOT NULL CHECK(action IN ('REQUEST','ACCEPT','DECLINE','CANCEL','APPROVE','REJECT')),
  actor_id uuid NOT NULL REFERENCES public.app_user(id),reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(request_id,version)
 );
 GRANT SELECT,INSERT ON brotar_extension.representation_request,brotar_extension.representation_event TO brotar_app;
 GRANT UPDATE(status,version,accepted_at,accepted_by,decided_at,decided_by,decision_reason) ON brotar_extension.representation_request TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.representation_event FROM brotar_app;
 REVOKE DELETE ON brotar_extension.representation_request FROM brotar_app;
 `)}
 async down():Promise<void>{throw new Error('La representación no se revierte automáticamente; conservar solicitudes, consentimiento e historial. Una reversión destructiva requiere revisión explícita.')}
}
