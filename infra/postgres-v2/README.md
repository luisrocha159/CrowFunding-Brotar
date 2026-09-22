# PostgreSQL provisional V2 · base vigente

Esta instalación adopta **Brotar_BD_Provisional (3).sql** recibido de coordinación. Es un esquema inicial, no una migración. Nunca ejecutarlo encima de la base anterior.

- PostgreSQL 18.6, base `brotar_db`, proyecto Compose `brotar-provisional-v2`.
- Puerto local **15433**, volumen exclusivo `brotar-provisional-v2_brotar_pgdata_v2`.
- SHA-256 del original: `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`.
- El SQL original está incluido, sin modificar, como [official-schema.sql](official-schema.sql). Contiene estructura y catálogos, no datos de nuestras cuentas de ensayo. No publicar backups de bases pobladas, `.env` ni contraseñas.
- El entorno anterior `brotar-local`, puerto 15432, volumen y credenciales se conservan. **No se migraron sus usuarios ni otros datos a V2.**

## Primera instalación (una sola vez)

Necesitas Docker Desktop con el motor operativo, Node.js 24, pnpm y el SQL oficial indicado. Desde la raíz:

```powershell
cd backend
pnpm install --frozen-lockfile
node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql
node scripts/verify-provisional-v2.mjs
pnpm run check
node scripts/prepare-sprint1.mjs
node scripts/migrate.mjs up
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='true'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

**Detente si un comando falla.** Solo cuando verificación y tests pasen, y con la API detenida:

```powershell
node scripts/adopt-provisional-v2.mjs activate
pnpm run start
```

El instalador comprueba el hash, crea secretos aleatorios distintos para administrador/aplicación, instala exclusivamente en una base vacía y concede permisos limitados. Rechaza configuraciones ya existentes. No elimina ni reinstala un volumen al fallar; diagnosticar el fallo antes de reintentar. El script oficial contiene su propia transacción. La creación del usuario de aplicación se hace en otra transacción.

`activate` guarda el `.env` anterior como `infra/postgres-v2/.env.before-v2` y coloca el candidato en `backend/.env`. No usarlo repetidamente: el respaldo no se sobrescribe. En una instalación sin `.env` anterior no existe ese respaldo. No exponer ninguno de estos archivos.

## Arranques posteriores

No reinstalar el SQL. Desde la raíz:

```powershell
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
cd backend
pnpm run dev
```

En otra terminal, desde la raíz: `bun install --frozen-lockfile` y `bun run dev`. Abrir <http://127.0.0.1:5173/>. Comprobar API y base en <http://127.0.0.1:3000/api/health/ready>.

## Qué hay instalado

Inventario comprobado: 59 tablas, 31 enums, 5 vistas, 16 funciones propias, 40 triggers, 8 secuencias y 134 claves foráneas. Extensiones `pgcrypto`, `citext`, `pg_trgm`. Los catálogos oficiales se conservan. El rol de conexión `brotar_app` no es administrador. E07 incorpora lectura de roles/tipos, registro del rol básico e inserción de organizaciones/membresías, además de usuarios, perfiles y sesiones. Para V2 instalada antes de E07, ejecutar desde la raíz `./infra/postgres-v2/grant-e07.ps1`; es idempotente y no activa cuentas. El instalador nuevo ya lo incluye. Ver [alcance E07](../../docs/integracion-e07-roles-organizaciones.md).

La base nueva no trae usuarios demo. El registro conserva `PENDING_VERIFICATION` y permite acceso básico sin activación, según [ADR-002](../../docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md). No se verifican correos ni identidades automáticamente. Los tests crean usuarios ficticios temporales y eliminan únicamente sus propias filas.

## Recuperación y conservación

La [línea base](baseline.json) y el [procedimiento de migraciones](MIGRACIONES.md) separan restauración inicial, permisos y cambios futuros. BG-59 mantiene pendiente el ensayo del mecanismo incremental y recuperación; no se declara realizado por tener documentación.

No usar `down -v`, `docker volume rm` ni Factory Reset. Para volver a la versión anterior hace falta **tanto la configuración `.env.before-v2` como el código anterior a V2**, porque el mapeo actual espera `administrative_area_id`. Detener la API, preservar la configuración nueva y recuperar ambos de forma coordinada. El entorno antiguo puede arrancarse con su propio Compose en `infra/postgres`; no comparte volumen con V2. Copiar datos entre versiones requiere una migración revisada y respaldos, no ejecutar este instalador.

Si vuelve el error de sockets de Docker Desktop, no reinstalar la base ni borrar sus volúmenes. El 16/09 se recuperó el motor conservando las carpetas temporales afectadas con sufijo `.stale-20260916-v2*`. Eso no es una solución definitiva al origen de la recurrencia; requiere diagnóstico de Docker/Windows si reaparece.
