-- Permisos técnicos S1-15 (BG-55). Catálogo de categorías y parámetros acordados.
-- No inserta categorías ni parámetros de negocio: su contenido lo administra un ADMIN
-- en ejecución y las claves admitidas dependen de D02 y D10.
-- No concede DELETE sobre category: las referencias existentes se protegen desactivando,
-- nunca borrando, y la desactivación se rechaza si hay campañas o subcategorías activas.
-- SELECT sobre campaign es necesario para comprobar ese uso antes de desactivar.
-- Idempotente: GRANT sobre un privilegio ya concedido no altera nada.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON public.category TO brotar_app;
GRANT SELECT, INSERT, UPDATE ON public.system_setting TO brotar_app;
GRANT SELECT ON public.campaign TO brotar_app;
COMMIT;
