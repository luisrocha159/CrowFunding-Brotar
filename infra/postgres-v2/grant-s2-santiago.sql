-- Permisos mínimos del constructor y envío de campañas de Sprint 2.
-- No concede roles de negocio ni privilegios sobre pagos o aportes.
-- Idempotente para una V2 ya restaurada y preparada para Sprint 1.
BEGIN;
GRANT SELECT ON public.currency, public.expense_category TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_activity, public.milestone TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_item, public.campaign_risk TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward TO brotar_app;
GRANT SELECT, INSERT ON public.campaign_review TO brotar_app;
GRANT SELECT ON public.campaign_review_observation TO brotar_app;
COMMIT;
