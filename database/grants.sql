-- Permisos de la API sobre la línea base, antes de aplicar las migraciones.
-- Requiere un rol LOGIN brotar_app exclusivo de esta instalación.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'brotar_db' THEN RAISE EXCEPTION 'Se requiere la base brotar_db'; END IF;
END $$;
GRANT CONNECT ON DATABASE brotar_db TO brotar_app;
GRANT USAGE ON SCHEMA public TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user, public.user_profile TO brotar_app;
GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app;
\ir ../infra/postgres-v2/grant-e07.sql
\ir ../infra/postgres-v2/grant-s1-13.sql
\ir ../infra/postgres-v2/grant-s1-15.sql
\ir ../infra/postgres-v2/grant-s1-16.sql
\ir ../infra/postgres-v2/grant-s1-17.sql
\ir ../infra/postgres-v2/grant-s1-18.sql
\ir ../infra/postgres-v2/grant-s1-files.sql
\ir ../infra/postgres-v2/grant-s2-projects.sql
\ir ../infra/postgres-v2/grant-s2-public.sql
\ir ../infra/postgres-v2/grant-s2-santiago.sql
\ir ../infra/postgres-v2/grant-s2-review.sql
