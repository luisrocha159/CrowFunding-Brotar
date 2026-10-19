# Control de cambios de PostgreSQL

## Incremento local de Sprint 3 · 19/10/2026

`RicardoDev` añade dos migraciones a las siete del corte anterior: `ResponsibilityPermissions1792368000000` puebla una matriz provisional de permisos sin asignar roles a cuentas; `ContributionIntegrity1792368000001` crea unicidad de referencia de cobro por proveedor y concede acceso técnico limitado a las tablas oficiales de aportes/pagos/eventos y sus secuencias. No inserta proveedores, no modifica el SQL oficial ni añade tablas en `public`. Ante duplicados existentes, el índice falla y preserva los datos para diagnóstico.

La secuencia vigente de esta rama es **nueve migraciones**, sin restaurar de nuevo una base instalada. Los `down` rechazan retirar integridad/permisos automáticamente. Ver README §24 y [contratos S3](../../docs/contratos-sprint-3.md). `drill:recovery` incluye ahora conteos de aportes, pagos, eventos, devoluciones, disputas y permisos, además del historial y el inventario; se ejecuta en una copia aislada.

## Línea base registrada

`baseline.json` identifica por SHA-256 el SQL oficial instalado, el inventario esperado y el ajuste de permisos E07. La API conserva `synchronize=false`, `dropSchema=false` y `migrationsRun=false`. El instalador restaura únicamente si el esquema está vacío; al repetirlo reconoce una línea base completa y conserva los datos. Nunca aplicar el SQL inicial sobre datos existentes ni forzar la restauración sobre un esquema parcial.

El 05/10/2026 se aplicó localmente la primera migración incremental propia: `CampaignRejected1791244800000`, que añade REJECTED a `public.campaign_status` para cubrir el estado exigido por el PDF de Fase 3. No reescribe el SQL oficial ni modifica campañas existentes. Adoptar V2 inicialmente fue una restauración nueva aislada, no un traslado de datos de V1. El SQL de estructura/catálogos oficial está incluido con hash; los backups poblados y credenciales siguen fuera de Git.

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

## Migración de rechazo del Sprint 2

La segunda migración está en `backend/src/shared/infrastructure/database/migrations/1791244800000-CampaignRejected.ts` y ejecuta `ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'REJECTED'`. El enum de decisiones ya tenía REJECTED, pero el enum de estados de campaña no; no son intercambiables. El cambio sigue la tarea oficial, no introduce una regla de pago, identidad o publicación automática.

Se aplica en una transacción propia, después de la línea base. PostgreSQL exige confirmar la adición antes de usar el nuevo valor; la API se inicia después de finalizar `migrate up`. Repetir `up` no duplica valores ni vuelve a ejecutar migraciones registradas. El rol de aplicación no recibe DDL.

Orden para una V2 instalada: compilar backend → `node scripts/migrate.mjs up` → `node scripts/prepare-sprint2.mjs` → `node scripts/migrate.mjs status` → `node scripts/verify-provisional-v2.mjs` → iniciar API. Para una instalación nueva se restaura primero el SQL oficial según el README. La preparación concede permisos técnicos de revisión/historial y no asigna roles a personas.

La nueva integración crea una base temporal `brotar_db_drill_rejected_*`, instala el SQL oficial, aplica ambas migraciones y comprueba REJECTED, conservación de catálogos, 59 tablas públicas, repetición sin pendientes y rechazo de `down`. Después elimina únicamente su base de ensayo. La suite de campañas también ejerce el rechazo real desde HTTP y verifica motivo, actor, historial y exclusión pública.

**Recuperación:** PostgreSQL no permite quitar un valor ENUM mediante una operación simétrica segura; `down` se rechaza antes de transformar/borrar datos. Respaldar antes de cambios compartidos y restaurar una copia aislada para diagnosticar. No borrar campañas rechazadas ni reconstruir tipos sobre datos existentes para fingir una reversión. Este cambio está aplicado solo al entorno local; cualquier entorno compartido requiere autorización y respaldo propios.

`drill:recovery` respalda `brotar_db`, la restaura en una base `brotar_db_drill_*`, compara el inventario recuperado contra `baseline.json`, **conserva el historial de migraciones restaurado**, ejecuta `up` y comprueba que ni el esquema oficial ni los conteos de usuarios/campañas/extensión/control hayan cambiado. No se borra el historial para repetir migraciones aplicadas. La instalación sobre SQL oficial vacío se ensaya por separado en `migrations.integration.test.ts`. Conserva el respaldo fuera del repositorio (por defecto `~/Documents/brotar-privado/ensayos`). Nada destructivo toca la base de trabajo.

## Migración de hitos con varias actividades

`MilestoneActivities1791849600000` es la cuarta migración del equipo. Añade la tabla de vínculos `brotar_extension.milestone_activity`, fuera de `public`, sin modificar el archivo SQL oficial ni su inventario. Copia cada `milestone.activity_id` anterior; para los hitos sin actividad no inserta ningún vínculo. Las relaciones nuevas se guardan como pares hito/actividad, con clave primaria, referencias y control de pertenencia a la misma campaña. El rol `brotar_app` recibe uso del esquema y DML exclusivamente en esa tabla, no permisos DDL ni roles de usuario.

Aplicación en V2 existente: respaldo propio → compilar backend → `node scripts/migrate.mjs up` → `node scripts/migrate.mjs status` → `node scripts/verify-provisional-v2.mjs` → reiniciar API. No repetir la restauración oficial. El corte de hitos tenía cuatro migraciones; **el cierre del 15/10 tiene siete**, sin pendientes. El README, sección 19, explica `activityIndexes`; la sección 21 describe la extensión de identidad vigente.

El ensayo aislado comprueba conservación del vínculo anterior, dos actividades por hito, rechazo de otra campaña y de duplicados, permisos, repetición segura y conservación del hito/otro vínculo al eliminar una actividad. La migración de hitos admite reaplicarse; esto no autoriza borrar el historial ni implica que todas las migraciones puedan repetirse. Su reversión automática se rechaza para evitar perder relaciones múltiples; una reversión requiere una migración de conservación o recuperar un respaldo aislado.

## Catálogos e identidad · 15/10/2026

5. `ProvisionalCatalogs1792015200000`: categorías provisionales y referencias de país/moneda/gastos faltantes. Usa conflicto sin sobrescritura: conserva nombres y desactivaciones existentes. Una instalación desde cero no necesita ejecutar el seed manual.
6. `InitiativeIdentity1792015200001`: tablas de iniciativa, etapa, vínculo de campaña, reserva única, idempotencia y cuotas; índices GIN. Viven en `brotar_extension`, salvo índices sobre tablas oficiales. No asigna identidad a campañas antiguas ni cambia su estado.
7. `IdentityDraftCorrections1792015200002`: permisos del ensayo de corrección de identidad, mantenimiento de cuotas y claves/índices de búsqueda. La política vigente retiró el editor/API de identidad y las reservas de admisión; las tablas y los permisos históricos se conservan sin borrar datos.

No se modifica `official-schema.sql`, no se activa `synchronize` y se conserva el inventario de 59 tablas de `public`. Las tablas adicionales tienen nombres, claves y permisos explícitos. Sus `down` no eliminan automáticamente información ni restricciones: se prepara una migración revisada o se restaura un respaldo aislado.

La aclaración de identificación del 15/10 no requiere una migración destructiva ni reinstalar: UUID/slug continúan únicos y las coincidencias son orientativas. Las tablas de iniciativa/etapa/reserva quedan conservadas, pero no se escribe una reserva al enviar/aprobar/publicar. Las siete migraciones siguen siendo necesarias para la compatibilidad del esquema y los controles activos de idempotencia/frecuencia.

## Qué queda pendiente de BG-59

El mecanismo y el ensayo existen y están cubiertos por tres pruebas de integración (`migrations.integration.test.ts`), incluida la que rechaza una base incompleta y la migración incremental ensayada desde el SQL oficial. Eso **no cierra la historia general del MVP**:

- Ya hay una migración incremental local de REJECTED; no acredita migraciones de reglas futuras ni aprobación de todos los líderes.
- El ensayo se ha ejecutado solo en local, sobre la instancia `127.0.0.1:15433`. `readMigrationConfig` rechaza destinos remotos a propósito.
- La comparación sigue siendo de inventario, no de definiciones SQL completas, con la misma limitación que ya señalaba la línea base.
- **D01 continúa abierta**: la elección de TypeORM consta en [ADR-001](../../docs/decisiones/ADR-001-typeorm.md) como decisión local y no como aprobación de los líderes.
- No se ha aplicado a ningún entorno compartido; eso requiere la revisión y autorización del paso 6.
