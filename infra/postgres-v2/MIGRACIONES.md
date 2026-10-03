# Control de cambios de PostgreSQL

## Línea base registrada

`baseline.json` identifica por SHA-256 el SQL oficial instalado, el inventario esperado y el ajuste de permisos E07. La API conserva `synchronize=false`, `dropSchema=false` y `migrationsRun=false`. El instalador solo acepta una base vacía; nunca aplicar el SQL inicial sobre datos existentes.

El proyecto todavía no ha aplicado migraciones de esquema propias. Adoptar V2 fue una restauración nueva aislada, no una migración ni un traslado de los datos de V1. El archivo original y los backups con datos se reciben y conservan fuera de Git.

Comprobación de solo lectura, desde `backend`: `node scripts/verify-provisional-v2.mjs`. Comprueba inventario, mapeo relevante, default de usuario y privilegios limitados; no certifica todas las definiciones del esquema ni migra nada.

## Procedimiento antes de cada cambio futuro

1. Identificar la versión de origen, el cambio solicitado, su aprobación y los criterios que lo requieren. Comparar definiciones, no solo cantidad de tablas.
2. Respaldar la base y ensayar su restauración en una base aislada. No usar datos personales sin autorización; sanitizar cuando sea necesario. No sobrescribir el volumen de trabajo.
3. Preparar una migración incremental con identificador y checksum, precondiciones, pasos y procedimiento de recuperación. La API usa un rol limitado; la migración se ejecuta como operación administrativa separada y revisada.
4. Probarla en la copia aislada. Revisar datos antes/después, restricciones, secuencias, vistas, triggers, funciones, roles y privilegios. Usar transacción si las operaciones lo admiten y documentar las que no.
5. Ejecutar las suites de integración contra la copia; ensayar recuperación y registrar comandos, resultados y evidencia sin secretos. No suponer que `down` puede recuperar datos eliminados.
6. Solo con revisión y autorización, programar la aplicación al entorno de trabajo. Registrar la versión efectiva y comprobar compatibilidad de frontend/API. No actualizar el manifiesto únicamente para silenciar un fallo de verificación.

## Mecanismo implementado (S1-10)

Las migraciones se versionan en `backend/src/shared/infrastructure/database/migrations/` y se declaran de forma explícita en `migration-data-source.ts`; no se descubren por glob, para que lo aplicado sea revisable en el repositorio.

El control vive en el esquema **`brotar_migration`**, tabla `schema_migration_brotar`, deliberadamente **fuera de `public`**: dentro de `public` la tabla de control elevaría el inventario a 60 tablas y haría fallar `verify-provisional-v2.mjs`. El manifiesto no se ajusta para silenciar esa verificación; se mueve la tabla.

La API conserva `synchronize=false`, `dropSchema=false`, `migrationsRun=false` y `migrations: []`. El rol `brotar_app` no tiene DDL, así que las migraciones usan un rol administrativo aparte, según el paso 3 de este mismo procedimiento.

Desde `backend`:

```bash
pnpm run build
pnpm run migrate status          # aplicadas y pendientes
pnpm run migrate up              # aplicar
pnpm run drill:recovery          # ensayo de respaldo y recuperación
```

La primera migración es una **línea base que no altera objetos**: solo comprueba que las diez tablas requeridas y las extensiones `citext` y `pg_trgm` están presentes, y falla si no lo están. Sin esa comprobación una base vacía quedaría registrada como migrada sin tener esquema. Su `down` se rechaza a propósito: la línea base no la creó este mecanismo, sino la restauración del SQL oficial, y revertirla no recupera datos.

`drill:recovery` respalda `brotar_db`, la restaura en `brotar_db_drill`, compara el inventario recuperado contra `baseline.json`, reinicia el control de migraciones en la copia, aplica ahí el mecanismo y comprueba que el esquema oficial no cambió. Conserva el respaldo fuera del repositorio (por defecto `~/Documents/brotar-privado/ensayos`). Nada destructivo toca la base de trabajo.

## Qué queda pendiente de BG-59

El mecanismo y el ensayo existen y están cubiertos por dos pruebas de integración (`migrations.integration.test.ts`), incluida la que comprueba que una base incompleta se rechaza en vez de registrar un avance falso. Eso **no cierra la historia**:

- Todavía no hay ninguna migración incremental real, porque no hay ningún cambio de esquema aprobado. No se inventa uno para marcarla terminada.
- El ensayo se ha ejecutado solo en local, sobre la instancia `127.0.0.1:15433`. `readMigrationConfig` rechaza destinos remotos a propósito.
- La comparación sigue siendo de inventario, no de definiciones SQL completas, con la misma limitación que ya señalaba la línea base.
- **D01 continúa abierta**: la elección de TypeORM consta en [ADR-001](../../docs/decisiones/ADR-001-typeorm.md) como decisión local y no como aprobación de los líderes.
- No se ha aplicado a ningún entorno compartido; eso requiere la revisión y autorización del paso 6.
