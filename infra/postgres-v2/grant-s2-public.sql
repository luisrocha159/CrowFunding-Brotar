-- S2-16: lectura de la vista de financiación, sin escritura ni permisos sobre pagos.
BEGIN;
GRANT SELECT ON public.v_campaign_funding TO brotar_app;
COMMIT;
