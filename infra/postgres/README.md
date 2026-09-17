# PostgreSQL provisional · entorno local aislado

**Entorno anterior: no usar para una instalación nueva.** La base vigente es [PostgreSQL provisional V2](../postgres-v2/README.md), puerto 15433. Este directorio conserva la instalación anterior en 15432, sin eliminar sus datos. Las instrucciones siguientes son históricas.

Entorno E02 restaurado y probado localmente el 16/09/2026. Se usa el backup SQL plain suministrado por coordinación, sin subirlo al repositorio. Su versión de origen es PostgreSQL 18.6; el diagrama DBML sirve de referencia, no reemplaza la restauración.

## Requisitos y límites

- Docker Desktop iniciado con contenedores Linux y Docker Compose.
- El archivo original `backup_brotar` o `backup_brotar.sql`, recibido por el canal del equipo.
- PowerShell para los scripts incluidos. PostgreSQL nativo también es válido, pero estos scripts actúan únicamente sobre el contenedor del proyecto.
- Puerto local 15432 disponible si utilizas el asistente (la plantilla manual conserva 5433). La API usa el usuario limitado `brotar_app`, **no postgres**.

El proyecto Compose se llama `brotar-local`, conserva los datos en su volumen `brotar_pgdata` y publica el puerto solo en `127.0.0.1`. No utiliza ni reemplaza instalaciones de PostgreSQL existentes. El montaje `/var/lib/postgresql` sigue la estructura de la [imagen oficial de PostgreSQL 18](https://hub.docker.com/_/postgres).

## 1. Configurar

Desde la raíz del repositorio, con Node.js 24, ejecuta una sola vez:

```powershell
node infra/postgres/setup-local.mjs
```

Genera `infra/postgres/.env` y `backend/.env` con contraseñas aleatorias diferentes para administración y aplicación, sin mostrarlas. Comprueba que puede abrir el puerto 15432 y rechaza sobrescribir archivos existentes. Ambos archivos están excluidos de Git. No los compartas ni los incluyas en capturas. La conexión queda preparada, pero requiere terminar restauración y aprovisionamiento antes de arrancar la API.

Si prefieres configuración manual, copia ambas plantillas `.env.example` únicamente donde no exista `.env`, configura contraseñas propias diferentes y ajusta ambos puertos al mismo valor. No ejecutes después el asistente sobre esas configuraciones.

```powershell
docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml up -d --wait
```

El primer arranque descarga la imagen y crea `brotar_db`. Si el puerto elegido está ocupado o reservado por Windows, ajusta `POSTGRES_PORT` y `DB_PORT` en ambos `.env` antes de arrancar. No elimines reservas de Windows. Cambiar la contraseña del archivo después de inicializar el volumen no cambia automáticamente la contraseña dentro de PostgreSQL.

## 2. Restaurar el archivo recibido

```powershell
./infra/postgres/restore.ps1 -BackupPath 'C:\ruta\al\backup_brotar'
```

El script rechaza una base con objetos existentes. No contiene una opción de borrado forzado. Comprueba que el contenedor es de `brotar-local` y opera exclusivamente sobre `brotar_db`. El dump crea el esquema `public`; por eso se retira el esquema inicial **vacío**, sin `CASCADE`, dentro de la misma transacción de restauración. Ante error, `ON_ERROR_STOP` y `--single-transaction` revierten esa transacción.

El backup usa `public.citext` y el índice `public.gin_trgm_ops`, pero omite la creación de las extensiones `citext` y `pg_trgm`. El script prepara una copia temporal privada e inserta las instrucciones necesarias inmediatamente después de crear `public`. El original permanece intacto. Las extensiones y el resto de la restauración se ejecutan en la misma transacción. Si el marcador del esquema cambia, el script se detiene para revisión. La adaptación fue verificada contra PostgreSQL 18.6 real, sin cambiar tablas ni datos iniciales del dump.

El archivo es SQL plain y se carga con `psql`, no con `pg_restore`. Los logs se guardan en `infra/postgres/private/`, excluido de Git, porque un error de importación podría incluir datos del backup. No adjuntes esos logs completos a Trello o GitHub. La copia temporal del backup en el contenedor se elimina al finalizar.

Si PowerShell bloquea scripts por una política de tu organización, consulta al responsable; no desactives políticas globales. Si la base ya contiene datos, no borres el volumen: detente y revisa qué instancia estás utilizando.

## 3. Verificar

```powershell
./infra/postgres/verify.ps1
```

Solo consulta metadatos. La versión provisional recibida contiene 54 tablas, 5 vistas, 31 enums, 8 funciones propias, 29 triggers, 117 claves foráneas y 6 secuencias (4 explícitas y 2 identity). Las funciones de extensiones se excluyen del recuento de funciones propias. Se comprueban además `citext`, `pg_trgm` y las 10 tablas base de usuarios, perfiles, roles y organizaciones. El resultado no muestra filas de usuarios ni pagos.

Esta comprobación es un inventario inicial, no una validación completa de columnas, claves, reglas, permisos o mapeo ORM de todo el proyecto. La prueba opt-in del backend valida específicamente usuarios/perfiles y ya pasó incluso con reinicio de PostgreSQL. No da por resueltas las decisiones funcionales de VT/D01 ni de módulos posteriores.

## 4. Usuario limitado y conexión TypeORM

No uses `postgres` para la API. Si configuraste con `setup-local.mjs`, tras restaurar ejecuta desde la raíz:

```powershell
node backend/scripts/provision-local.mjs
```

Comprueba que el puerto corresponde al contenedor Brotar y crea `brotar_app` con la contraseña privada ya generada, en una transacción. Concede conexión, uso de esquema, CRUD de usuarios/perfiles y SELECT/INSERT/UPDATE de `user_token` para E05. Rechaza un rol existente y no cambia su contraseña. Ejecutar una sola vez. Para instalaciones E02 ya existentes, aplica solo `grant-session-permissions.sql` según la [guía E05](../../docs/integracion-e05-sesiones.md), sin repetir el aprovisionamiento. Para configuraciones manuales que no usan el asistente, la alternativa es:

```powershell
Get-Content infra/postgres/provision-app.sql -Raw | docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml exec -T postgres psql -X -U postgres -d brotar_db -v ON_ERROR_STOP=1
docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml exec postgres psql -X -U postgres -d brotar_db
```

La primera instrucción crea `brotar_app` con permisos de conexión, uso de esquema, CRUD de usuarios/perfiles y SELECT/INSERT/UPDATE sobre `user_token`. Se detiene si el rol ya existe; no sobrescribe contraseñas ni permisos existentes. En la sesión interactiva de la segunda instrucción, usa `\password brotar_app` para establecer una contraseña propia de al menos 16 caracteres, y `\q` para salir. No escribas esa contraseña en el historial ni en SQL versionado.

En la alternativa manual, configura la misma contraseña del rol en `backend/.env`, junto con `DATABASE_ENABLED=true`, `DB_HOST=127.0.0.1`, el `DB_PORT` elegido, `DB_NAME=brotar_db`, `DB_USER=brotar_app` y `DB_SSL=false`. El asistente ya configura esos valores con puerto 15432. Después sigue la prueba real del [README del backend](../../backend/README.md). Los permisos de organizaciones y roles se ampliarán al desarrollar esos módulos.

## Detener y volver a abrir

```powershell
docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml stop
docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml start
```

No ejecutes `down -v`: eliminaría el volumen y los datos. No se incluyen comandos de reinicio destructivo.

## Esquema y migraciones

El backup suministrado es la base provisional, no una migración para ejecutar cada vez que arranca la API. Se eligió TypeORM para esta implementación. No usar `synchronize: true`, `dropSchema` ni generación automática de tablas sobre esta base. Mapear exactamente las tablas existentes en Infrastructure; registrar en Git solo migraciones revisadas de cambios aprobados, sin datos privados. Mantener las vistas, funciones, triggers y secuencias que el ORM no represente.
