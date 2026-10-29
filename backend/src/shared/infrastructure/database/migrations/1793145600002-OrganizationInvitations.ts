import type {MigrationInterface,QueryRunner} from 'typeorm'
export class OrganizationInvitations1793145600002 implements MigrationInterface {
 name='OrganizationInvitations1793145600002'
 async up(r:QueryRunner){await r.query(`
 CREATE TABLE brotar_extension.organization_invitation(
  id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,invited_by uuid NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('MEMBER','ADMIN')),current_member_id uuid REFERENCES public.organization_member(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED')),
  version int NOT NULL DEFAULT 1 CHECK(version>=1),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '7 days',resolved_at timestamptz, CHECK(target_user_id<>invited_by),CHECK(expires_at>created_at));
 CREATE UNIQUE INDEX organization_invitation_pending ON brotar_extension.organization_invitation(organization_id,target_user_id) WHERE status='PENDING';
 CREATE INDEX organization_invitation_inbox ON brotar_extension.organization_invitation(target_user_id,created_at DESC,id);
 CREATE TABLE brotar_extension.organization_invitation_event(
  invitation_id uuid NOT NULL REFERENCES brotar_extension.organization_invitation(id) ON DELETE CASCADE,version int NOT NULL,
  action text NOT NULL CHECK(action IN ('INVITE','ACCEPT','DECLINE','CANCEL','EXPIRE')),actor_id uuid NOT NULL REFERENCES public.app_user(id),reason text NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(invitation_id,version));
 GRANT SELECT,INSERT ON brotar_extension.organization_invitation,brotar_extension.organization_invitation_event TO brotar_app;
 GRANT UPDATE(status,version,resolved_at) ON brotar_extension.organization_invitation TO brotar_app;
 REVOKE UPDATE,DELETE ON brotar_extension.organization_invitation_event FROM brotar_app;`)}
 async down():Promise<void>{throw new Error('Las invitaciones y aceptaciones no se revierten automáticamente; conservar el historial de colaboración.')}
}
