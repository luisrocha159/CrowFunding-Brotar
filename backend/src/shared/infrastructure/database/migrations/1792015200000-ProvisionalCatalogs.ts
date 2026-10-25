import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Catálogo provisional del equipo: viaja con migrate up, no depende de un equipo local. */
export class ProvisionalCatalogs1792015200000 implements MigrationInterface {
  name = 'ProvisionalCatalogs1792015200000'
  async up(runner: QueryRunner) {
    await runner.query(`INSERT INTO public.category(slug,name,description,display_order) VALUES
      ('medio-ambiente','Medio ambiente','Conservación y recuperación del entorno natural.',10),
      ('produccion-sostenible','Producción sostenible','Iniciativas productivas con enfoque sostenible.',20),
      ('economia-circular','Economía circular','Reutilización de recursos y reducción de residuos.',30),
      ('educacion','Educación','Aprendizaje y desarrollo de capacidades.',40),
      ('desarrollo-comunitario','Desarrollo comunitario','Mejora de condiciones y oportunidades de la comunidad.',50)
      ON CONFLICT(slug) DO NOTHING;
      INSERT INTO public.expense_category(code,name,description,display_order) VALUES
      ('MATERIALS','Materiales','Insumos y materiales del proyecto.',10),
      ('SERVICES','Servicios','Servicios necesarios para ejecutar la iniciativa.',20),
      ('LOGISTICS','Logística','Transporte y distribución.',30),
      ('EQUIPMENT','Equipamiento','Herramientas y equipos.',40),
      ('OTHER','Otros gastos','Otros gastos justificados del proyecto.',50)
      ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.country(code,code_alpha3,name) VALUES('BO','BOL','Bolivia') ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.currency(code,name,symbol) VALUES('BOB','Boliviano','Bs') ON CONFLICT(code) DO NOTHING;`)
  }
  async down(): Promise<void> { throw new Error('No se eliminan catálogos que pueden estar referenciados. Desactiva entradas o prepara una migración de conservación.') }
}
