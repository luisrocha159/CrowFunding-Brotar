# ADR-001 · TypeORM para nuestra implementación

Fecha: 16/09/2026. Estado: elegido por el responsable de esta implementación en la conversación («ya usa TypeORM y continúa»). No se presenta como aprobación global de los líderes para otros equipos.

## Decisión

Utilizar TypeORM 0.3.31 y el driver PostgreSQL `pg` 8.23.0 dentro de Infrastructure. NestJS configura el adaptador mediante providers; no se añaden dependencias del ORM al dominio, los casos de uso o el frontend. Estas versiones quedan fijadas en el lockfile pnpm del backend.

## Motivo y límites

Es una de las dos alternativas permitidas por el stack oficial. La base ya existe y tiene objetos SQL propios. Se mapean las tablas conforme se implementa cada módulo, sin generar un esquema alternativo. Prisma no se instala.

Se fijan `synchronize: false`, `dropSchema: false`, `migrationsRun: false` e `installExtensions: false`. Incluso `citext` se prepara explícitamente al restaurar, no mediante privilegios administrativos del proceso API. Los filtros con valores null o undefined se rechazan para evitar consultas accidentales sin el criterio esperado.

## Mapeo inicial

Actualización E05: se incorpora además `UserToken` → `public.user_token` (11 columnas, hash excluido de lecturas por defecto), sin generar ni modificar la tabla. Las siguientes entradas conservan el alcance inicial de E02.

- `AppUser` → `public.app_user`: 15 columnas; `password_hash` excluido de lecturas por defecto.
- `UserProfile` → `public.user_profile`: 14 columnas; clave primaria `user_id` ya definida por el backup.
- Las demás tablas, restricciones, relaciones, vistas y triggers permanecen en PostgreSQL sin modificación. Su mapeo se incorporará en los módulos correspondientes; no se afirma que todo el esquema esté representado en TypeORM.

La política de activación del usuario no cambia: se respeta el default `PENDING_VERIFICATION` del backup. La decisión funcional sobre activación/inicio de sesión pertenece a E04/E05 y a las verificaciones pendientes.

## Migraciones

El backup es la base provisional, no una migración de arranque. Esta etapa no agrega cambios al esquema del producto. Antes de introducir una migración: revisar SQL, confirmar aprobación, probar sobre una copia y registrar el cambio sin datos privados. No ejecutar generación automática y aplicarla sin revisión, especialmente porque el mapeo inicial es parcial.

## Verificación local realizada

El 16/09/2026 se restauró la base en PostgreSQL 18.6 y se verificaron sus objetos. Pasó `pnpm run test:integration` con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=true`: mapeo de las dos tablas, rol sin privilegios administrativos, commit, lectura de datos después de reiniciar el contenedor, actualización y rollback. La prueba elimina únicamente sus filas de usuario/perfil al terminar. `/api/health/ready` respondió 200 con la base real.

El backup recibido omite `CREATE EXTENSION` para `citext` y `pg_trgm`; la restauración las prepara explícitamente en una copia temporal. El archivo original permanece intacto. Estas extensiones no se crean desde TypeORM.

D01 queda parcialmente resuelta (elección local de ORM). No cerrar la verificación completa de la base ni atribuir una decisión común a coordinación sin confirmación.

Referencias: [configuración de TypeORM](https://typeorm.io/docs/data-source/data-source-options/), [base de datos en NestJS](https://docs.nestjs.com/techniques/database).
