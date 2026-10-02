-- S2-15 / S2-17. No altera datos, estados, contraseñas ni roles de personas.
BEGIN;
GRANT SELECT ON public.campaign, public.category, public.user_profile,
  public.campaign_location, public.campaign_story, public.status_history TO brotar_app;
GRANT UPDATE ON public.campaign TO brotar_app;
GRANT INSERT ON public.status_history TO brotar_app;
COMMIT;
