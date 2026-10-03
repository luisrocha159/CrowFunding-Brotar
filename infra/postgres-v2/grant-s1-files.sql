-- Adaptadores locales integrados: metadatos y portada usan las tablas oficiales.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON public.file_asset TO brotar_app;
GRANT SELECT, INSERT, DELETE ON public.file_attachment TO brotar_app;
COMMIT;
