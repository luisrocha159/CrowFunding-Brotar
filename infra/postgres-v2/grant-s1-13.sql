-- Permisos técnicos S1-13 (BG-53). Solo lectura del catálogo de permisos.
-- No define permisos de negocio, no los asigna a ningún rol y no activa usuarios:
-- poblar permission/role_permission depende de D06 y no se hace aquí.
-- Sin este SELECT la comprobación de permisos falla con "permission denied" en la API.
-- Idempotente: GRANT sobre un privilegio ya concedido no altera nada.
BEGIN;
GRANT SELECT ON public.permission, public.role_permission TO brotar_app;
COMMIT;
