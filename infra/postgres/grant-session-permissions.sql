-- E05: ejecutar sobre brotar-local/brotar_db como administrador tras E02.
-- No crea tablas ni activa usuarios. Idempotente.
GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app;
