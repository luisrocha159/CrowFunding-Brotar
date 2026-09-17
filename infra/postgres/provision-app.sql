-- Ejecutar una sola vez como administrador, después de restaurar.
-- Sin contraseñas en archivos versionados. Si el rol existe, detenerse y revisarlo.
BEGIN;
CREATE ROLE brotar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE brotar_db TO brotar_app;
GRANT USAGE ON SCHEMA public TO brotar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user, public.user_profile TO brotar_app;
GRANT SELECT, INSERT, UPDATE ON public.user_token TO brotar_app;
COMMIT;
-- Configurar contraseña con \password brotar_app en una sesión psql interactiva.
-- Ampliar permisos explícitamente cuando se incorporen los módulos siguientes.
