-- Permisos técnicos S1-18 (BG-16) y S1-20 (BG-19).
-- Ubicación, historia e indicadores del borrador. Lectura de catálogos de referencia.
--
-- DELETE sobre campaign_impact_indicator es necesario porque el asistente declara el
-- conjunto completo de indicadores en cada guardado y reemplaza el anterior. Solo afecta
-- a los indicadores de la propia campaña del creador.
--
-- achieved_value existe en campaign_impact_indicator pero el asistente NUNCA lo escribe:
-- un indicador declarado es una meta esperada, no un resultado ejecutado. Registrarlo
-- corresponde al seguimiento, con su evidencia, fuera de este sprint.
-- Idempotente: GRANT sobre un privilegio ya concedido no altera nada.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON public.campaign_location TO brotar_app;
GRANT SELECT, INSERT, UPDATE ON public.campaign_story TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_impact_indicator TO brotar_app;
GRANT SELECT ON public.country, public.administrative_area TO brotar_app;
COMMIT;
