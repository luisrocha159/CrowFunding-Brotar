**Corte integrado local 28/10/2026:** **36 migraciones**, RicardoDev sin publicar. Incluye soporte/correo y cuatro ampliaciones de Santiago; seguir README principal §3 y §39. Las categorías se preparan automáticamente; no restaurar SQL ni borrar volúmenes para actualizar. [Revisión y diferencias de alcance pendientes](../../docs/revision-integracion-santiago-2026-10-28.md). Los conteos siguientes son históricos.

**Actualización local 25/10/2026:** la instalación vigente contiene **32 migraciones**, sin publicación nueva. El comando habitual `node scripts/migrate.mjs up` incorpora permisos del panel, historial, claves de respuesta y avisos de soporte. No asigna roles a cuentas ni elimina datos. [Cierre, recorridos y pruebas](../../docs/cierre-alison-panel-soporte-correo-2026-10-25.md).

# PostgreSQL provisional V2 · base vigente

**Corte transversal local 24/10/2026:** **28 migraciones**, RicardoDev sin publicar. `IntegratedAccess1792800000001` añade `parties.read`/`dashboard.read` para ADMIN/AUDITOR; no concede roles a usuarios ni cambia datos de negocio. Seguir README principal §34. Readiness verifica todas las concesiones necesarias de la matriz, además del esquema. El ensayo `drill-recovery.mjs --with-files` recupera también binarios verificados con el SHA-256 persistido; el modo sin esa opción verifica solo la base. Cortes siguientes históricos.

**Versión local vigente 24/10/2026, ampliación de cierre:** **27 migraciones**, RicardoDev sin publicar. `CampaignClosure1792800000000` añade solo persistencia/permisos para rendición final y evidencia de cumplimiento del ciclo DEMO. Seguir README principal §33; no restaurar el SQL sobre una V2 existente. [Alcance mínimo y pruebas](../../docs/cierre-s3-23-2026-10-24.md). Los cortes de 26/24 y anteriores se conservan como antecedentes.

**Versión local vigente 24/10/2026:** **26 migraciones** en RicardoDev. Las migraciones 25/26 incorporan ciclo de campaña y desembolsos exclusivamente DEMO. Seguir README principal §32 para instalación/actualización y comprobación; en una base existente no repetir el SQL oficial. Véanse [reglas, pruebas y límites](../../docs/ciclo-y-desembolsos-demo-2026-10-24.md). Sin publicación; correo real, legal y módulos pendientes de compañeros no se consideran terminados. Los cortes siguientes son históricos.

**Versión local vigente 23/10/2026:** **24 migraciones** en RicardoDev; integración del equipo, políticas sintéticas, revisión KYC/KYB, devoluciones y disputas DEMO. README principal §31 contiene orden de preparación y recorridos. Las migraciones 21–24 se aplican con `node scripts/migrate.mjs up`, sin SQL manual ni reinstalar la base. No están publicadas. Correo real/legal siguen pendientes; no se habilita dinero real. Las cantidades indicadas en los cortes siguientes son históricas.

**Actualización local 21/10/2026:** **catorce migraciones** en RicardoDev. La última configura el simulador interno `BROTAR_INTERNAL_DEMO`, recibos, conciliaciones y compensaciones de prueba. No restaura SQL, crea cuentas/pagos ni activa el simulador automáticamente. Se habilita expresamente con `DEMO_PAYMENTS_ENABLED=true` solo en development/test; nunca producción. Seguir README principal §24 y §28 y [contrato DEMO 0.5](../../docs/contrato-pagos-demo-0.5.md). UI integral, KYC completo, operaciones futuras y correo real siguen pendientes.

**Antecedente 20/10/2026:** trece migraciones; gestión de responsabilidades y agregados anónimos de auditoría, sin purga ni cron. La guía operativa actual requiere las catorce.

**Antecedente local del 19/10/2026:** ese corte añadió cuatro migraciones S3 y requirió once en total, incluidas lectura financiera y auditoría sin UPDATE/DELETE para la aplicación. El incremento del 20/10 requiere trece; la entrega DEV del 16/10 con siete se conserva como antecedente. No restaurar SQL para actualizar: respaldar antes y seguir README principal §24–27. Las migraciones no crean roles de cuenta ni activan un proveedor; ver [contratos S3](../../docs/contratos-sprint-3.md).

Esta instalación adopta **Brotar_BD_Provisional (3).sql** recibido de coordinación. Es un esquema inicial, no una migración. Nunca ejecutarlo encima de la base anterior.

**Esta es la infraestructura vigente.** `infra/postgres/` es legado y no debe levantarse junto con V2. Docker aloja solo PostgreSQL; API y frontend corren fuera del contenedor. La guía paso a paso principal está en el [README de la raíz](../../README.md#3-primera-instalación-completa).

**Actualización 16/10/2026:** este incremento requiere siete migraciones. Instala primero el SQL oficial, compila, aplica `migrate up`, prepara permisos y activa la configuración generada, en ese orden. Las categorías provisionales se insertan automáticamente en PostgreSQL, no en el frontend. Para una base existente sigue README §21 sin restaurar el SQL. El ensayo de recuperación conserva el historial de migraciones; las notas de septiembre/octubre siguientes son antecedentes, no pasos adicionales de instalación.

**Incremento local del 05/10/2026:** después de instalar la línea base se aplica la migración separada de REJECTED y los permisos S2 de revisión. No restaurar de nuevo una base existente. Para actualizar y habilitar la publicación administrativa provisional, seguir [la sección 15 del README](../../README.md#15-revisión-y-publicación-del-sprint-2); consultar [migraciones y recuperación](MIGRACIONES.md). El SQL oficial se conserva sin modificar.

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
pnpm run check
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='false'
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

El instalador comprueba el hash, crea secretos aleatorios distintos para administrador/aplicación, instala el SQL solo en un esquema `public` vacío y concede permisos limitados. Si se interrumpe, repetir `install` reutiliza la configuración, verifica la línea base y termina rol/permisos pendientes; no restaura sobre datos existentes. Si detecta una base parcialmente distinta, se detiene sin borrar nada. El SQL oficial contiene su propia transacción. `pnpm run check` compila antes de `migrate`; la migración **requiere** las tablas oficiales, no las crea. El instalador ya aplica los permisos del Sprint 1: `prepare-sprint1.mjs` es solo para instalaciones antiguas.

`activate` guarda el `.env` anterior como `infra/postgres-v2/.env.before-v2` y coloca el candidato en `backend/.env`. Repetirlo cuando ya está activo no cambia nada; si existe un respaldo pero el `.env` actual difiere, se detiene para no sobrescribirlo. En una instalación sin `.env` anterior no existe ese respaldo. No copiar `backend/.env.example` para conectar: no contiene contraseña y tiene la base desactivada. No exponer ninguno de estos archivos.

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

El 01/10 volvió a ocurrir con `docker-secrets-engine/engine.sock` y `Docker/run/sailor-ingest.sock` bajo AppData local de Windows. Ambos eran archivos temporales de tipo reparse point inaccesibles; el fallo ocurría antes de iniciar PostgreSQL. Con los procesos de Docker detenidos y tras comprobar que las carpetas contenían solo esos sockets y `dockerInference`, se conservaron mediante renombrado con sufijo `.stale-20261001-s2` y Docker regeneró sus rutas. El motor volvió a responder como 29.7.2; V2 arrancó saludable en 15433, pasaron 15 pruebas de integración y las filas de usuarios/campañas se conservaron tras reiniciar el contenedor.

Esta reparación es específica del equipo diagnosticado, no un paso normal de instalación ni un script para ejecutar a ciegas. No elimina volúmenes, archivos de la base, secretos de aplicación ni distribuciones WSL; tampoco garantiza que el problema de sockets no reaparezca. Ante otro fallo, identificar primero la ruta exacta en los logs locales de Docker y conservar los datos. No usar Factory Reset para resolverlo.

En el arranque posterior al apagado del 05/10/2026 volvió a ocurrir. Fue necesario esperar a que terminaran los procesos de Docker antes de conservar por renombrado ambos directorios temporales; el primer intento aún falló en `engine.sock`. El segundo recuperó el motor 29.7.2 y el volumen V2 existente, sin restauración SQL. Se comprobó el inventario oficial y la ausencia de migraciones pendientes. Los respaldos `.stale-…-inicioDEV*` quedaron fuera del repositorio, en las rutas locales diagnosticadas. La recurrencia sigue siendo un problema local de Docker/Windows, no una migración ni un requisito de instalación para los compañeros.
