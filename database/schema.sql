-- Punto de entrada psql para la estructura oficial de Brotar, en una base vacía.
-- La línea base conserva una única copia y su SHA-256 en infra/postgres-v2.
-- Después de completar este archivo se aplican las migraciones con migrate.mjs.
\set ON_ERROR_STOP on
SELECT current_database() = 'brotar_db' AND NOT EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
) AS destino_vacio \gset
\if :destino_vacio
\ir ../infra/postgres-v2/official-schema.sql
\else
DO $$ BEGIN RAISE EXCEPTION 'schema.sql requiere una base brotar_db vacía. Para actualizar use las migraciones.'; END $$;
\endif
