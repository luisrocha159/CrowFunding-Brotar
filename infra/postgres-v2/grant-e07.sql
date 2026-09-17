-- Permisos técnicos E07. No modifica roles de negocio ni activa usuarios.
BEGIN;
GRANT SELECT ON public.role, public.user_role, public.organization_type TO brotar_app;
GRANT INSERT ON public.user_role TO brotar_app;
GRANT SELECT, INSERT ON public.organization, public.organization_member TO brotar_app;
COMMIT;
