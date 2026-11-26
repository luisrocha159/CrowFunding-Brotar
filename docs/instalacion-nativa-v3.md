# Instalación nativa de Brotar

Esta ruta inicia React, NestJS y PostgreSQL directamente en sus sistemas anfitriones. Deja una instalación ordinaria con los catálogos iniciales y admite registrar cuentas desde la interfaz. Para evaluar las 18 cuentas y las escenas de la defensa se utiliza la [instalación de revisión](revision-lideres/Manual_Revision_Brotar.md), que crea las campañas y sus archivos a través de las reglas de la aplicación.

## 1. Preparar el entorno

Instale Git, Node.js 24.13 o superior de la serie 24, Bun 1.4.2, Corepack con pnpm 11.19.0 y PostgreSQL 18.6 con su cliente psql y extensiones pgcrypto, citext y pg_trgm. Compruebe sus versiones.

```powershell
git --version
node --version
bun --version
corepack pnpm --version
psql --version
```

Use un clúster de PostgreSQL de práctica, inicialmente vacío y con autenticación por contraseña en 127.0.0.1. El ejemplo emplea el puerto de PostgreSQL 15689, la API en 3197 y el cliente en 5397. Si el servicio nativo escucha en 5432, puede conservarlo y sustituir 15689 en todos los pasos siguientes. En Windows con PostgreSQL en WSL2, ejecute los comandos psql en la distribución, desde la misma carpeta del clon. Los comandos de Node y Bun pueden ejecutarse en Windows. Estos puertos se eligieron para coexistir con la defensa local.

```powershell
git clone --branch main https://github.com/luisrocha159/CrowFunding-Brotar.git Brotar-nativo
cd Brotar-nativo
bun install --frozen-lockfile
cd backend
corepack pnpm install --frozen-lockfile
corepack pnpm run build
cd ..
```

## 2. Crear la base y cargar el SQL

Desde la raíz del clon abra una sesión de psql como administrador local. PostgreSQL solicitará su contraseña. La base y el rol siguientes deben pertenecer exclusivamente a la instalación que se está preparando.

```powershell
psql -X -h 127.0.0.1 -p 15689 -U postgres -d postgres
```

En la sesión de psql ejecute:

```sql
\set ON_ERROR_STOP on
CREATE DATABASE brotar_db ENCODING 'UTF8' TEMPLATE template0;
CREATE ROLE brotar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password brotar_app
\connect brotar_db
\i database/schema.sql
\i database/seed.sql
\i database/grants.sql
\q
```

Al ejecutar `\password`, escriba dos veces una contraseña aleatoria de al menos 16 caracteres. Guárdela en el gestor privado del equipo para configurar la cuenta de servicio. [schema.sql](../database/schema.sql) valida el destino y carga la línea base desde su copia oficial. [seed.sql](../database/seed.sql) incorpora cinco categorías legibles y puede repetirse sin duplicarlas. [grants.sql](../database/grants.sql) asigna los permisos iniciales al rol limitado de la API.

El DDL efectivo y los datos se conservan en [official-schema.sql](../infra/postgres-v2/official-schema.sql) y [seed-categories-demo.sql](../infra/postgres-v2/seed-categories-demo.sql). Los comandos internos de psql emplean rutas relativas al archivo, por lo que ambas variantes de instalación usan el mismo SQL. Si la base ya contiene información, aplique las migraciones del paso 4 en vez de volver a cargar la línea base.

## 3. Configurar la conexión privada

En un clon nuevo, cree `infra/postgres-v2/.env` con `POSTGRES_PORT=15689` y `POSTGRES_PASSWORD` igual a la contraseña privada del usuario local postgres. Los scripts de mantenimiento necesitan al menos 16 caracteres. Cree los siguientes archivos en un editor de texto como UTF-8; para valores con un signo numeral, ponga el valor entre comillas en el formato dotenv.

Copie `backend/.env.example` a `backend/.env` y establezca estos valores. En `DB_PASSWORD` escriba la contraseña de **brotar_app** elegida en el paso anterior.

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3197
CORS_ORIGINS=http://127.0.0.1:5397
PUBLIC_WEB_ORIGIN=http://127.0.0.1:5397
DATABASE_ENABLED=true
DB_HOST=127.0.0.1
DB_PORT=15689
DB_NAME=brotar_db
DB_USER=brotar_app
DB_SSL=false
CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true
DEMO_PAYMENTS_ENABLED=true
```

Copie `backend/.env` a `infra/postgres-v2/.env.backend` para el verificador V2. En la raíz del clon cree `.env` con `BACKEND_URL=http://127.0.0.1:3197` para el proxy de Vite. Los archivos locales de configuración contienen las claves elegidas por el operador y quedan fuera de Git.

## 4. Aplicar las migraciones y verificar permisos

Desde la raíz del clon:

```powershell
cd backend
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
```

El corte evaluado registra 43 migraciones y muestra `pending: false`. El último comando comprueba el inventario del esquema oficial y el acceso de brotar_app sin privilegios de superusuario, creación de bases, roles ni objetos en public. Mantenga el servicio PostgreSQL activo durante la operación.

## 5. Abrir la aplicación y comprobar el flujo

En una terminal desde `backend` ejecute `corepack pnpm run start`. En una segunda terminal, desde la raíz, ejecute `bun run dev --port 5397`. Abra [el catálogo](http://127.0.0.1:5397/explorar) y la [sonda de preparación](http://127.0.0.1:5397/api/health/ready). Debe verse la interfaz y la sonda debe indicar `status: ok` y `database: connected`. Una base ordinaria comienza sin campañas. Para crear una cuenta, abra Registro, complete los campos, acepte las condiciones y confirme el alta.

Para volver otro día, inicie PostgreSQL y los mismos dos procesos. Al actualizar el código, haga respaldo, actualice dependencias congeladas, compile, aplique las migraciones y vuelva a verificar. Para una falla de conexión, contraste el puerto real y las dos contraseñas diferenciadas del paso 3. Una respuesta 502 del navegador requiere comprobar primero que la API está escuchando en el destino configurado en BACKEND_URL.

## Evidencia del ensayo nativo

El 26 de noviembre de 2026 se probó la ruta en un clon aislado, sobre la revisión de software `b60f1c8`. PostgreSQL 18.6 se ejecutó como proceso nativo en Ubuntu 26.04 bajo WSL2. El frontend y el backend corrieron en Windows. Se verificaron:

| Comprobación | Resultado |
| --- | --- |
| DDL y seed en una base vacía | Cinco categorías activas. «Medio ambiente» y «Producción sostenible» aparecieron con su nombre en la consulta de PostgreSQL. |
| Migraciones y permisos | 43 aplicadas. El inventario oficial devolvió 59 tablas, 5 vistas y 134 claves foráneas en public. La cuenta de aplicación pasó la verificación de privilegios. |
| Acceso desde el navegador al servicio | GET /explorar devolvió 200. GET /api/health/ready a través del proxy devolvió la conexión de base activa. |
| Persistencia de una operación | El registro por POST /api/auth/register devolvió HTTP 201. Una consulta independiente sobre public.app_user confirmó el correo sintético y el estado PENDING_VERIFICATION. |
