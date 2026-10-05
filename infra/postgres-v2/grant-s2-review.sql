-- S2-12/S2-14: reutiliza tablas oficiales, sin roles funcionales ni DDL para brotar_app.
BEGIN;
GRANT SELECT ON public.organization, public.campaign_review, public.campaign_review_observation TO brotar_app;
GRANT UPDATE ON public.campaign_review TO brotar_app;
GRANT INSERT ON public.campaign_review_observation TO brotar_app;
GRANT UPDATE (reason, metadata) ON public.status_history TO brotar_app;
COMMIT;
