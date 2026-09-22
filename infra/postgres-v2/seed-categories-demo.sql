-- Catálogo provisional autorizado por el equipo para la demostración.
-- No representa aprobación definitiva del cliente. No altera categorías existentes.
BEGIN;
INSERT INTO public.category (slug, name, description, display_order)
VALUES
 ('medio-ambiente', 'Medio ambiente', 'Conservación y recuperación del entorno natural.', 10),
 ('produccion-sostenible', 'Producción sostenible', 'Iniciativas productivas con enfoque sostenible.', 20),
 ('economia-circular', 'Economía circular', 'Reutilización de recursos y reducción de residuos.', 30),
 ('educacion', 'Educación', 'Aprendizaje y desarrollo de capacidades.', 40),
 ('desarrollo-comunitario', 'Desarrollo comunitario', 'Mejora de condiciones y oportunidades de la comunidad.', 50)
ON CONFLICT (slug) DO NOTHING;
COMMIT;

SELECT slug, name, is_active FROM public.category ORDER BY display_order, name;
