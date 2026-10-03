-- Permisos técnicos S1-16 (BG-18). Borrador del asistente de campaña.
-- S1-15 ya concedió SELECT sobre campaign para proteger referencias de categoría.
--
-- INSERT en status_history es obligatorio, no opcional: el trigger campaign_log_status
-- registra cada alta y cada cambio de estado, y no es SECURITY DEFINER, así que se
-- ejecuta con el rol de la aplicación. Sin esta concesión crear un borrador falla con
-- "permission denied for table status_history". La columna id es IDENTITY, sin secuencia
-- propia que conceder. Solo INSERT: el historial no se corrige ni se borra desde la API.
--
-- No se concede DELETE sobre campaign: retirar una campaña es un flujo propio con su
-- revisión, no una operación del asistente.
-- Idempotente: GRANT sobre un privilegio ya concedido no altera nada.
BEGIN;
GRANT INSERT, UPDATE ON public.campaign TO brotar_app;
GRANT INSERT ON public.status_history TO brotar_app;
COMMIT;
