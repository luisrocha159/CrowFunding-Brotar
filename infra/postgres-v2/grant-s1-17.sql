-- Permisos técnicos S1-17 (BG-15). Etapa de modalidad del asistente.
-- Solo SELECT sobre reward: cambiar de modalidad necesita saber cuántas recompensas
-- hay cargadas para avisar antes de aplicar el cambio, pero NUNCA las modifica ni las
-- borra. Conservarlas es lo que impide descartar datos en silencio (CA 3).
-- Idempotente: GRANT sobre un privilegio ya concedido no altera nada.
BEGIN;
GRANT SELECT ON public.reward TO brotar_app;
COMMIT;
