-- Datos iniciales de uso público: cinco categorías activas con nombres y descripciones.
-- Ejecutar en brotar_db después de schema.sql. Es repetible por slug.
-- Las cuentas y operaciones del paquete de evaluación se crean mediante setup-review.mjs.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'brotar_db' THEN
    RAISE EXCEPTION 'Se requiere la base brotar_db';
  END IF;
END $$;
\ir ../infra/postgres-v2/seed-categories-demo.sql
