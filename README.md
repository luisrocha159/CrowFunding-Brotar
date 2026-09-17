# Brotar · Base integrada del equipo

Entrega de **frontend + backend + PostgreSQL** para revisión de los líderes. Esta versión permite registrar una cuenta, iniciar y cerrar sesión, editar el perfil y registrar una organización propia. **No es todavía todo el crowdfunding.**

[Repositorio](https://github.com/luisrocha159/CrowFunding-Brotar) · [Trello](https://trello.com/b/37xCrdes/crowudfunding) · [Documentación](docs/README.md) · [Trabajo en equipo y ramas](CONTRIBUTING.md)

## 1. Qué pueden revisar los líderes

| Función | Estado de esta entrega |
| --- | --- |
| Frontend ↔ API HTTP ↔ PostgreSQL oficial V2 | Integrado |
| Registro de usuarios y perfil inicial | Persistencia real y contraseña protegida |
| Inicio, consulta y cierre de sesión | Sesión revocable con cookie HttpOnly |
| Perfil propio | Consulta y edición real de nombre, apellido y teléfono |
| Roles iniciales | Usuario registrado, consulta de roles y controles básicos; sin otorgar administrador desde el formulario |
| Organización/empresa | Alta real en borrador, catálogo oficial y vínculo con el usuario |
| Rutas privadas | Exigen sesión; la API también aplica controles |
| Carga, éxito, error y validación | Implementados en los flujos de esta etapa |
| Portada, catálogo, filtros y detalle de campañas | Datos simulados, identificados como demostración |
| Recuperación de contraseña | Demostración: no envía correos ni restablece cuentas reales |
| Campañas completas, KYC/KYB, aportes, pagos y administración completa | Pendientes de etapas posteriores |

Las cuentas nuevas conservan `PENDING_VERIFICATION`, pero pueden iniciar sesión básica y gestionar perfil/organizaciones en borrador. Esto **no** verifica correo/identidad, no publica campañas ni habilita pagos. Decisión local: [ADR-002](docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md). Las reglas definitivas y la aceptación formal corresponden a los líderes.

La ampliación planificada del Sprint 1 (constructor inicial, archivos, recuperación, etc.) **no forma parte del requisito original de esta entrega de integración**.

## 2. Requisitos y versiones utilizadas

- Git.
- Node.js **24**, mínimo **24.13.0**, menor que 25.
- **Bun 1.4.2** para el frontend, en la raíz.
- **pnpm 11.19.0** para el backend, dentro de `backend/`.
- Docker Desktop iniciado, con motor Linux operativo, para PostgreSQL **18.6**.
- SQL oficial **Brotar_BD_Provisional (3).sql**, recibido de coordinación por canal privado.

Comprueba en PowerShell:

```powershell
git --version
node --version
bun --version
pnpm --version
docker version
```

`docker version` debe mostrar cliente y servidor. Si solo aparece el cliente o falla el motor, resuelve Docker antes de instalar la base. No uses Factory Reset ni borres volúmenes para corregirlo.

No usar npm/yarn para instalar este proyecto. No mezclar gestores: conservar `bun.lock` y `backend/pnpm-lock.yaml`. NestJS y TypeORM se instalan como dependencias del backend, no necesitan instalación global.

## 3. Primera instalación completa

Estas instrucciones son para PowerShell en Windows, desde una copia nueva. Ejecuta los bloques en orden y **detente si un comando falla**. Cada integrante utiliza su base local, no la base de otro compañero.

### A. Obtener el código

```powershell
git clone https://github.com/luisrocha159/CrowFunding-Brotar.git
cd CrowFunding-Brotar
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
cd backend
pnpm install --frozen-lockfile
```

Para demostrar la entrega utiliza `main`. Para desarrollar, sigue [CONTRIBUTING.md](CONTRIBUTING.md) después de instalar la base.

### B. Instalar PostgreSQL oficial V2, una sola vez

Desde `backend/`, sustituye la ruta de ejemplo por la ubicación real del SQL:

```powershell
node scripts/adopt-provisional-v2.mjs install 'C:\ruta\Brotar_BD_Provisional (3).sql'
node scripts/verify-provisional-v2.mjs
pnpm run check
```

El instalador comprueba el hash de la versión oficial, levanta una instancia exclusiva en `127.0.0.1:15433`, instala solamente sobre una base vacía y genera credenciales locales distintas para administrador y aplicación. Usa `brotar_db` y un rol limitado `brotar_app`; TypeORM no sincroniza ni borra el esquema automáticamente.

El SQL **no se incluye en el repositorio público**. Pídelo a los líderes. Si recibes otra versión/hash, coordina su revisión; no evites la comprobación ni ejecutes el archivo encima de una base existente.

Antes de activar el candidato, verifica sus cinco pruebas de integración:

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='false'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

Solo si todo pasó, y con la API detenida:

```powershell
node scripts/adopt-provisional-v2.mjs activate
pnpm run dev
```

No vuelvas a ejecutar `install` ni `activate` cada vez que abras el proyecto. Si ya hay configuración V2, el instalador se detiene para no sobreescribirla. Para una instalación anterior a los permisos de organizaciones, consulta [la guía V2](infra/postgres-v2/README.md); no reinstales el SQL.

### C. Abrir el frontend

En **otra terminal**, desde la raíz (donde está `bun.lock`):

```powershell
bun run dev
```

Abre **http://127.0.0.1:5173/**. No abras `index.html` directamente ni uses Live Server. Mantén ambas terminales abiertas. Vite reenvía `/api` al backend en `127.0.0.1:3000`.

Comprueba:

- http://127.0.0.1:3000/api/health/live — 200: API viva; no demuestra conexión con la base.
- http://127.0.0.1:3000/api/health/ready — 200: conexión y tablas base comprobadas.
- http://127.0.0.1:5173/api/health/ready — mismo resultado a través del frontend.

Si `ready` devuelve 503, revisa PostgreSQL y la configuración; no continúes como si registro y login funcionaran.

## 4. Abrirlo otro día o actualizar una copia existente

Con cambios locales propios, revisa `git status` y consérvalos antes de cambiar de rama o actualizar. No utilices `reset --hard`, force-push ni borres trabajo para “sincronizar”.

Para revisar una copia limpia de la entrega:

```powershell
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
cd backend
pnpm install --frozen-lockfile
pnpm run dev
```

En otra terminal, raíz: `bun run dev`. Actualizar código **no** exige restaurar nuevamente la base. Si cambia el esquema, leer el procedimiento acordado antes de aplicar cambios.

Para cerrar, usa `Ctrl+C` en ambas terminales. Opcionalmente, desde la raíz:

```powershell
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml stop
```

`stop` conserva los datos. No usar `down -v`, `docker volume rm` ni reinstalar una base poblada.

## 5. Guion para probar y presentar la entrega

Usar datos ficticios, un correo de prueba único y una contraseña exclusiva de demostración. **No hay una cuenta demo compartida** ni se entregan contraseñas en este README.

1. Abrir `/registro`. Enviar vacío y comprobar campos/errores. Completar nombre, apellido, correo y una contraseña de **15 a 128 caracteres**; confirmar contraseña y aceptar manualmente el consentimiento de demostración. Si se añade teléfono, completar código y número.
2. Registrar. Debe aparecer confirmación y estado pendiente de verificación. No debe afirmar que envió un correo.
3. Abrir `/iniciar-sesion`. Probar una contraseña incorrecta: debe mostrar error, no crear sesión. Entrar con la cuenta recién registrada: **no requiere activarla por SQL**.
4. Abrir `/mi-cuenta`. Cambiar nombre/apellido y teléfono; guardar y recargar. Los datos deben persistir. Mostrar el rol Usuario registrado y aclarar que no es administrador ni verificación de identidad.
5. Abrir `/mis-organizaciones`. Registrar nombre legal, nombre comercial, tipo del catálogo oficial y contacto. Debe guardarse como **DRAFT/Borrador**, relacionada con el usuario. Recargar y comprobar que aparece.
6. Cerrar sesión. Entrar de nuevo en `/mi-cuenta` o `/mis-organizaciones`: debe pedir acceso. Volver a iniciar sesión: perfil y organización siguen guardados.
7. Para mostrar persistencia entre arranques, detener **solo la API** con `Ctrl+C`, volver a ejecutar `pnpm run dev` y comprobar los datos. No restaurar el SQL ni borrar el volumen.
8. En otra ventana privada, sin sesión, comprobar que las rutas privadas exigen acceso. Las suites de integración comprueban también aislamiento entre usuarios, expiración y revocación.
9. Mostrar los resultados de pruebas y explicar los límites de la entrega. La validación de líderes se registra aparte del cierre técnico.

No probar con pagos, correos reales ni documentos de identidad. Evita publicar capturas de cookies, contraseñas o credenciales. La recuperación de contraseña **sigue simulada**: para esta demostración conserva tus credenciales de prueba.

### Experiencia pública que se conserva

- `/`, `/como-funciona`, `/para-creadores`: contenido e identidad Brotar.
- `/explorar` y `/explorar/buscar`: búsqueda, filtros, orden y paginación simulados.
- `/proyectos/reforestacion-chiquitana`: detalle de ejemplo; un slug inexistente muestra no disponible.
- Los selectores **Probar estados de la muestra** permiten carga, vacío y error. También se puede utilizar `?estado=carga`, `?estado=vacio` o `?estado=error` donde corresponda.
- Apoyar no procesa dinero. Registro/login son reales; campañas y recuperación no deben presentarse como integradas a PostgreSQL.

Se puede abrir **solo la muestra pública** con `bun install --frozen-lockfile` y `bun run dev`, sin backend. En ese modo los flujos reales de registro, sesión, perfil y organizaciones **no funcionarán**.

## 6. Pruebas, compilación y evidencia

Desde la raíz:

```powershell
bun run check
```

Desde `backend/`:

```powershell
pnpm run check
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='false'
try { pnpm run test:integration }
finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

Verificación local repetida el **17/09/2026**: **64 pruebas frontend + 45 backend + 5 de integración = 114**, además de lint, TypeScript y build. Las pruebas de integración escriben fixtures ficticios propios en la base local y los limpian al finalizar; nunca ejecutarlas en producción. Si se interrumpen abruptamente, revisar solamente sus fixtures, no limpiar tablas completas.

Esta ejecución no reinicia el contenedor; comprueba reconexión y reinicios de APIs temporales. El ensayo opcional de reinicio de PostgreSQL se describe en [backend/README.md](backend/README.md).

Para ejecutar compilado: raíz `bun run build` y `bun run preview`; backend `pnpm run build` y `pnpm run start`. Para probar acceso real en preview (puerto 4173), añadir su origen exacto a `CORS_ORIGINS` del backend y reiniciar la API. Usar siempre el mismo hostname, preferentemente `127.0.0.1`. Preview no es un despliegue de producción.

## 7. Configuración y seguridad de la entrega

- El instalador crea `infra/postgres-v2/.env`, `.env.backend` y, al activar, `backend/.env`. Están excluidos de Git. La copia anterior, si existe, se conserva como `.env.before-v2`.
- `backend/.env.example` es una plantilla sin contraseña; con `DATABASE_ENABLED=false` solo sirve para probar la API sin base. No la copies encima de la configuración generada.
- `DB_HOST=127.0.0.1`, `DB_PORT=15433`, `DB_NAME=brotar_db` y `DB_USER=brotar_app` corresponden a V2. No conectar la aplicación como `postgres`.
- La API escucha localmente en 3000 y Vite en 5173. `CORS_ORIGINS` admite orígenes concretos; no sustituirlo por `*`.
- No incluir secretos en variables `VITE_*`, commits, Trello, capturas o comentarios. Cada integrante genera sus propias credenciales.
- El repositorio es público. No subir SQL con datos iniciales/privados, backups, `node_modules`, `dist` ni archivos `.env`.
- No habilitar `synchronize`, `dropSchema` ni migraciones automáticas. La base sigue siendo provisional.

## 8. Ramas, asignaciones y forma de trabajar

`main` es la entrega revisable. `DEV` integra el trabajo. Las ramas personales existentes son **`RicardoDev`, `AlisonDev` y `SantiagoDev`**; respetar exactamente mayúsculas/minúsculas.

Flujo: **rama personal → PR a DEV → pruebas/revisión → PR de DEV a main**. No trabajar directamente en `main` después de esta entrega. No dar por hecho que hay protección técnica de ramas: esta es la convención del equipo; los cambios de permisos/protección requieren al propietario.

- Alison: S1-11, S1-12, S1-14 y S1-19.
- Santiago (Thiago Rocha en Trello): S1-10, S1-13, S1-15, S1-16, S1-17, S1-18 y S1-20.
- Ricardo: entrega base E01–E09 y atribución de las historias ya cerradas; coordina la integración y la revisión.

Ambos pueden iniciar en paralelo, pero la portada S1-19 depende del borrador S1-16. Hay que acordar el contrato antes de modificar sus componentes compartidos. Las decisiones pendientes de cliente no desaparecen por asignar responsables.

Lee [CONTRIBUTING.md](CONTRIBUTING.md) para comandos exactos, orden de trabajo, conflictos y criterios de PR; [asignación del Sprint 1](docs/asignacion-sprint-1.md) para los límites de cada responsable.

## 9. Estructura del proyecto

```text
src/                  React: app, features, shared y mocks
tests/                Pruebas del frontend
backend/
  src/                NestJS: auth, users, profiles, roles, organizations
  test/               Pruebas sin base externa
  integration/        Pruebas con PostgreSQL local
  scripts/            Instalación y verificación V2
infra/postgres-v2/    Compose, permisos y baseline vigentes
infra/postgres/       Entorno anterior; no usar para instalar V2
docs/                 Requisitos, entregables, decisiones y evidencias
```

Frontend por funcionalidades. Backend separado en dominio, aplicación e infraestructura; dominio/aplicación no deben importar NestJS, SQL ni TypeORM. Compartir solo lo realmente reutilizable. [Detalles del backend](backend/README.md).

## 10. Problemas frecuentes

| Problema | Comprobación |
| --- | --- |
| Herramienta no reconocida | Instalar la versión requerida y abrir otra terminal; comprobar PATH y versión. |
| No encuentra package.json | Frontend en raíz; backend en su propia carpeta. |
| Docker no responde | Comprobar motor Linux y `docker version`. No borrar volúmenes ni reinstalar la base. |
| Instalador rechaza hash/configuración | Revisar versión SQL o instalación previa; no quitar la protección. |
| API viva pero registro falla | Revisar `/api/health/ready`, base V2 y `DATABASE_ENABLED`; reiniciar API tras corregir. |
| Puerto ocupado | Utilizar el proceso de Brotar ya abierto o detener solo ese proceso; no matar aplicaciones ajenas. |
| Cookie/sesión no persiste | Mantener hostname consistente, usar la URL de Vite y revisar CORS; no alternar localhost y 127.0.0.1. |
| 401 al abrir perfil | Iniciar sesión; 401 sin cookie es esperado. |
| 403 al modificar | Revisar origen, sesión y permisos; no desactivar guards para ocultarlo. |
| No llega correo de recuperación | Es simulación; no está incluido el envío real en esta entrega. |
| Base nueva no muestra cuentas anteriores | V2 usa volumen separado; no se migraron usuarios de la versión antigua. |
| Credencial incorrecta o correo duplicado | Usar otra cuenta ficticia única y recordar su contraseña; no activar usuarios ni modificar datos ajenos. |
| Cambios de otro compañero no aparecen | Integrar por DEV según CONTRIBUTING, reinstalar dependencias si cambian lockfiles y reiniciar procesos. |

## 11. Documentos y aceptación

- [Informe de entrega de integración](docs/entrega-integracion-2026-09-17.md).
- [Backlog general Word: 64 historias](docs/entregables/general/03_Product_Backlog_General_Brotar.docx).
- [Plan de 62 tareas por sprints](docs/planificacion-sprints.md). Historias y tareas no se suman como funcionalidades diferentes.
- [Figma final](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574).
- [Revisión funcional de la integración](docs/revision-entrega-integracion-e08.md).
- [Índice de documentos y versiones históricas](docs/README.md).

Las notas de fases anteriores y el PDF explicativo conservan sus fechas de corte. Para ejecutar esta entrega prevalece este README. GitHub comparte el código, **no publica automáticamente una aplicación web**. La aceptación de los líderes, las reglas definitivas y la validación en las computadoras del equipo no se sustituyen por las pruebas locales.
