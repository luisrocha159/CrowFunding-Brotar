# Brotar · Base integrada del equipo

**Infraestructura vigente: `infra/postgres-v2/`.** `infra/postgres/` es la versión anterior y no se usa para levantar la entrega actual. Docker ejecuta **solo PostgreSQL**; el backend NestJS y el frontend Vite se ejecutan en el equipo anfitrión. Lee la instalación desde cero de la sección 3 antes de copiar variables o arrancar la API.

> **Sprint 1 integrado en DEV — corte 21/09/2026:** reúne el trabajo de Ricardo, Alison y Santiago, las correcciones y el ensayo local. Se aprobaron 93 pruebas frontend, 93 backend y 14 integraciones PostgreSQL (200 casos), además de lint, tipos y compilación. `main` conserva la entrega anterior. Los informes fechados anteriores son históricos; este README describe la versión actual. Esto no equivale a aceptación del cliente ni a certificación de ausencia de errores.

**Actualización de DEV · 30/09/2026:** incluye las mejoras de validación del registro, ayuda para recuperación local, menú de cuenta con sesión y documentos de estudio del Sprint 1. La planificación v2.3 conserva 62 tareas y 64 historias: Sprint 1 = 20; Sprint 2 = 13 tareas de campañas; Sprint 3 = inventario de 29 tareas por refinar, no compromiso de una sola iteración. Esto es planificación: el módulo completo del Sprint 2 todavía no se declara implementado. Su reparto se acordará con el equipo.

Verificación de esta actualización: `bun run check` aprobó lint, tipos, 95 pruebas frontend y compilación; `bun x --package pnpm@11.19.0 pnpm run check` aprobó lint, tipos, 93 pruebas backend y compilación. No se repitieron las integraciones PostgreSQL en esta publicación porque el motor Docker local no estaba disponible. Los 200 casos citados arriba pertenecen al ensayo histórico del 21/09, no al conteo de esta revisión.

Acceso al constructor: iniciar sesión → **menú de cuenta → Mis borradores**; también desde **Mi cuenta → Opciones para iniciativas y permisos → Ver mis borradores**. La portada se guarda por campaña en la base oficial, no en un JSON por usuario. Para una V2 ya instalada ejecuta `node scripts/prepare-sprint1.mjs` desde backend si le faltan permisos recientes; no vuelvas a restaurar el backup.

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
| Archivos públicos y privados | API autorizada con límites, separación de privacidad y almacenamiento local fuera del frontend público |
| Portada de borrador | Selección, vista previa, reemplazo y persistencia de portada; no publica campañas |
| Rutas privadas | Exigen sesión; la API también aplica controles |
| Carga, éxito, error y validación | Implementados en los flujos de esta etapa |
| Portada, catálogo, filtros y detalle de campañas | Datos simulados, identificados como demostración |
| Recuperación de contraseña | Solicitud y restablecimiento reales con token de un solo uso; envío de correo pendiente de remitente autorizado |
| Campañas completas, KYC/KYB, aportes, pagos y administración completa | Pendientes de etapas posteriores |

Las cuentas nuevas conservan `PENDING_VERIFICATION`, pero pueden iniciar sesión básica y gestionar perfil/organizaciones en borrador. Esto **no** verifica correo/identidad, no publica campañas ni habilita pagos. Decisión local: [ADR-002](docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md). Las reglas definitivas y la aceptación formal corresponden a los líderes.

La ampliación del Sprint 1 incluye constructor inicial, archivos, portada y recuperación local. No incluye el crowdfunding completo: las etapas de plan/presupuesto y financiamiento del asistente muestran un aviso de sprint posterior; revisión no publica ni envía a aprobación.

## 2. Requisitos y versiones utilizadas

- Git.
- Node.js **24**, mínimo **24.13.0**, menor que 25.
- **Bun 1.4.2** para el frontend, en la raíz.
- **pnpm 11.19.0** para el backend, dentro de `backend/`.
- Docker Desktop iniciado, con motor Linux operativo, para PostgreSQL **18.6**.
- SQL oficial **Brotar_BD_Provisional (3).sql**, incluido sin modificar como [official-schema.sql](infra/postgres-v2/official-schema.sql).

Comprueba en PowerShell:

```powershell
git --version
node --version
bun --version
pnpm --version
docker version
```

`docker version` debe mostrar cliente y servidor. Si solo aparece el cliente o falla el motor, resuelve Docker antes de instalar la base. No uses Factory Reset ni borres volúmenes para corregirlo.

Puertos y configuración de la instalación normal:

| Componente | Dónde corre | Dirección |
| --- | --- | --- |
| PostgreSQL V2 | Contenedor Docker; publicado solo en el anfitrión | `127.0.0.1:15433` → puerto `5432` del contenedor |
| API NestJS | Anfitrión, fuera de Docker | `127.0.0.1:3000` |
| Frontend Vite | Anfitrión, fuera de Docker | `127.0.0.1:5173` |

El instalador genera `infra/postgres-v2/.env` (administrador de Docker/PostgreSQL), `infra/postgres-v2/.env.backend` (rol limitado) y, al ejecutar `activate`, `backend/.env`. **No copies `backend/.env.example` como `.env` para esta instalación**: es una referencia sin contraseña y con la base desactivada. Si ya existe un `backend/.env` propio, `activate` lo respalda sin sobrescribir el respaldo. Los tres archivos de credenciales son locales, ignorados por Git y no se deben compartir.

No usar npm/yarn para instalar este proyecto. No mezclar gestores: conservar `bun.lock` y `backend/pnpm-lock.yaml`. NestJS y TypeORM se instalan como dependencias del backend, no necesitan instalación global.

## 3. Primera instalación completa

Estas instrucciones son para PowerShell en Windows, desde una copia nueva. Ejecuta los bloques en orden y **detente si un comando falla**. Cada integrante utiliza su base local, no la base de otro compañero.

### A. Obtener el código

```powershell
git clone https://github.com/luisrocha159/CrowFunding-Brotar.git
cd CrowFunding-Brotar
git switch DEV
git pull --ff-only origin DEV
bun install --frozen-lockfile
cd backend
pnpm install --frozen-lockfile
```

Para demostrar el Sprint 1 utiliza `DEV`. Para desarrollar, sigue [CONTRIBUTING.md](CONTRIBUTING.md) y trabaja en tu rama personal. Si tu pnpm global tiene otra versión, sustituye `pnpm` en estos comandos por `bun x --package pnpm@11.19.0 pnpm`; no cambies el lockfile por ello.

### B. Instalar PostgreSQL oficial V2, una sola vez

Desde `backend/`, utiliza el SQL incluido en el repositorio:

```powershell
node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql
pnpm run check
node scripts/migrate.mjs up
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
```

El instalador comprueba el hash de la versión oficial, levanta una instancia en `127.0.0.1:15433`, restaura el SQL **solo si el esquema `public` está vacío** y genera credenciales locales distintas para administrador y aplicación. Si se interrumpe, puedes repetir exactamente `install`: reconoce un esquema oficial completo, repone el rol/permisos y conserva los datos. Si detecta un esquema parcialmente distinto, se detiene y pide diagnóstico; no lo restaura encima ni borra volúmenes. Usa `brotar_db` y un rol limitado `brotar_app`; TypeORM no sincroniza ni borra el esquema automáticamente. `pnpm run check` compila el backend antes de migrar. La migración registra la línea base; **no crea las tablas oficiales**, por eso siempre va después de `install`.

El SQL incluido contiene estructura y catálogos oficiales, no nuestras cuentas, contraseñas, sesiones ni borradores locales. Conserva el SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`, validado por el instalador. No editar sus saltos de línea ni reemplazarlo por un backup de una base poblada. Si recibes otra versión/hash, coordina su revisión; no evites la comprobación ni ejecutes el archivo encima de una base existente. Los permisos técnicos y las cinco categorías se aplican con los scripts separados de este README.

El instalador nuevo aplica los permisos necesarios. Si la instalación V2 es **anterior** a esta corrección, ejecuta `node scripts/prepare-sprint1.mjs` antes de las pruebas, sin volver a restaurar el SQL. Después verifica las pruebas de integración contra el candidato:

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

No necesitas ejecutar `install` ni `activate` cada vez que abras el proyecto. Ambos admiten repetición segura con la configuración vigente; `install` no vuelve a aplicar el SQL sobre una base poblada y `activate` no sobrescribe un respaldo previo. Para una instalación antigua con permisos faltantes, consulta [la guía V2](infra/postgres-v2/README.md).

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

### Si la instalación se interrumpió

1. Comprueba `docker version`: debe mostrar `Server`. Si Docker no funciona, no ejecutes migraciones ni borres volúmenes.
2. Desde `backend/`, repite `node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql`. Reutiliza las credenciales existentes. Si falta uno de los dos archivos privados o el esquema no coincide con el oficial, detente y conserva ambos archivos y el volumen para diagnóstico.
3. Cuando `install` termine, ejecuta `pnpm run check`, `node scripts/migrate.mjs up`, `node scripts/verify-provisional-v2.mjs` y finalmente `activate` como arriba. Si aparece `app_user`/`user_profile` inexistente, **faltó la restauración inicial**; no ejecutes la migración primero.
4. Si aparece autenticación fallida de `brotar_app`, verifica que `backend/.env` coincida con el candidato activado y que `DB_PORT` sea `15433` en la instalación normal. No utilices `5432` ni el PostgreSQL local para la API ejecutada en Windows. El instalador también puede realinear el rol con el candidato al repetir `install`.

Para un ensayo aislado en el mismo equipo, antes de `install` puedes fijar `$env:BROTAR_COMPOSE_PROJECT='brotar-ensayo'` y `$env:BROTAR_DB_PORT='15434'`; el instalador los guarda en `infra/postgres-v2/.env` de esa copia. No uses esos valores al instalar la copia normal. No uses `down -v` para resolver errores de configuración.

## 4. Abrirlo otro día o actualizar una copia existente

Con cambios locales propios, revisa `git status` y consérvalos antes de cambiar de rama o actualizar. No utilices `reset --hard`, force-push ni borres trabajo para “sincronizar”.

Para revisar una copia limpia de la entrega:

```powershell
git switch DEV
git pull --ff-only origin DEV
bun install --frozen-lockfile
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
cd backend
pnpm install --frozen-lockfile
node scripts/prepare-sprint1.mjs
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

1. Abrir `/registro`. Enviar vacío y comprobar campos/errores. Seleccionar perfil de uso inicial: Usuario, Creador u Organización. Completar nombre, apellido, correo y una contraseña de **15 a 128 caracteres**; confirmar contraseña y aceptar manualmente el consentimiento de demostración. Si se añade teléfono, completar código y número.
2. Registrar. Debe aparecer confirmación y estado pendiente de verificación. No debe afirmar que envió un correo.
3. Abrir `/iniciar-sesion`. Probar una contraseña incorrecta: debe mostrar error, no crear sesión. Entrar con la cuenta recién registrada: **no requiere activarla por SQL**.
4. Abrir `/mi-cuenta`. Cambiar nombre/apellido y teléfono; guardar y recargar. Los datos deben persistir. Mostrar el rol Usuario registrado y aclarar que el perfil elegido en el registro no es rol interno, permiso de creador, administración ni verificación de identidad.
5. Abrir `/mis-organizaciones`. Registrar nombre legal, nombre comercial, tipo del catálogo oficial y contacto. Debe guardarse como **DRAFT/Borrador**, relacionada con el usuario. Recargar y comprobar que aparece.
6. Cerrar sesión. Entrar de nuevo en `/mi-cuenta` o `/mis-organizaciones`: debe pedir acceso. Volver a iniciar sesión: perfil y organización siguen guardados.
7. Para mostrar persistencia entre arranques, detener **solo la API** con `Ctrl+C`, volver a ejecutar `pnpm run dev` y comprobar los datos. No restaurar el SQL ni borrar el volumen.
8. En otra ventana privada, sin sesión, comprobar que las rutas privadas exigen acceso. Las suites de integración comprueban también aislamiento entre usuarios, expiración y revocación.
9. Probar `/recuperar-contrasena` con el buzón local configurado como se explica abajo. La respuesta no revela si la cuenta existe ni devuelve el token. Abrir el enlace del `.txt`, cambiar la contraseña de prueba y comprobar que el mismo enlace ya no sirve. No hay envío de correo externo.
10. Probar la API de archivos con una sesión válida: `POST /api/files` requiere `X-Brotar-Request: 1`, rol básico y contenido base64. Las imágenes públicas admiten PNG/JPG/WebP hasta 2 MB; documentos privados admiten PDF/imagen hasta 5 MB. Comprobar que `/api/files/public/:id` no entrega documentos privados y que `/api/files/:id` exige sesión del titular.
11. Desde **Mi cuenta → Mis borradores y portadas** (`/crear-campana`), crear un borrador. Elegir modalidad y avanzar a Información general: completar categoría y ubicación, guardar. En Historia e impacto completar problema, solución, beneficiarios, resultados esperados e indicadores; guardar. En Portada seleccionar PNG/JPG/WebP hasta 2 MB, completar texto alternativo y guardar. Revisar y recargar: **Continuar** debe recuperar contenido y paso. Donación omite recompensas. No se publica la campaña. Ante error, se deben conservar los campos para corregir o reintentar.
12. Mostrar los resultados de pruebas y explicar los límites de la entrega. La validación de líderes se registra aparte del cierre técnico.

No probar con pagos, correos reales ni documentos de identidad. Evita publicar capturas de cookies, contraseñas, enlaces de recuperación o credenciales. La recuperación cambia contraseñas reales de la base local; usa solo cuentas ficticias propias.
Para archivos, usa imágenes o PDF ficticios sin datos personales. No subir documentos reales de identidad, respaldos legales reales ni archivos con secretos.
La portada ya queda asociada a su campaña en PostgreSQL. No publica campañas ni reemplaza las etapas futuras del editor.

### Configuración del catálogo provisional

Con PostgreSQL V2 saludable, desde la raíz en PowerShell:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 infra/postgres-v2/seed-categories-demo.sql | docker exec -i brotar-provisional-v2-postgres-1 psql -U postgres -d brotar_db -v ON_ERROR_STOP=1
```

Debe mostrar cinco categorías activas: Medio ambiente, Producción sostenible, Economía circular, Educación y Desarrollo comunitario. El script se puede repetir: inserta slugs faltantes, no sobrescribe ni reactiva registros existentes. Es un catálogo provisional autorizado por el equipo, no una aprobación definitiva del cliente. No restaura el SQL oficial.

### Recuperación sin correo: solo para la entrega local

En `backend/.env`, añadir o actualizar estas claves (una sola definición por clave), sin reemplazar las variables de base existentes:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PUBLIC_WEB_ORIGIN=http://127.0.0.1:5173
PASSWORD_RESET_LOCAL_FILE=true
```

Reiniciar la API. Solicitar recuperación para una cuenta ficticia existente. En Windows abrir `%LOCALAPPDATA%\Brotar\recovery-mail`, ordenar por fecha y abrir el `.txt` correspondiente. Copiar su enlace al navegador local y completar nueva contraseña/confirmación. El enlace vence en una hora y solo se usa una vez; las sesiones anteriores se revocan. Una cuenta inexistente no genera archivo, pero recibe la misma respuesta pública.

**Si la pantalla muestra «recuperación no disponible» (HTTP 503):** verifica que las cuatro claves anteriores estén en `backend/.env` (no en el `.env` de la raíz), que no haya definiciones duplicadas y que reiniciaste la API después de editarlas. La bandera está en `false` en `.env.example` por seguridad. Comprueba también que PostgreSQL y la API estén disponibles. El archivo se crea **solo** al solicitar recuperación para una cuenta ficticia existente; no esperes un correo ni un enlace en la respuesta HTTP. En otra computadora se debe configurar su propio `backend/.env` y consultar su propio `%LOCALAPPDATA%`; el buzón no se comparte por Git.

El buzón está fuera del repositorio y de su carpeta OneDrive. Sin LOCALAPPDATA se utiliza `backend/private/recovery-mail`, excluido de Git. No compartir, proyectar ni versionar los enlaces: son credenciales temporales. Eliminar los mensajes de prueba al finalizar; no hay limpieza automática. Este modo solo acepta desarrollo y direcciones locales; no habilitarlo en una máquina compartida o despliegue. Para usar SMTP real, desactivar esta bandera y configurar un remitente autorizado según `backend/.env.example`. La bandera anterior `PASSWORD_RESET_LOCAL_LINK` ya no habilita enlaces en la respuesta HTTP.

### Qué se comprobó y qué sigue pendiente

Ensayo en navegador: registro, login, rechazo de nombre numérico, guardado de perfil, organización, información de campaña, historia e indicador, portada, revisión, recarga, logout y redirección sin sesión. Recuperación: solicitud y archivo comprobados visualmente; restablecimiento, caducidad, uso único y revocación comprobados con integración automatizada.

Pendientes de decisión: correo real, textos legales, reglas KYC/KYB, matriz definitiva de permisos y aprobación final del catálogo. No bloquean la muestra local, pero sus criterios no deben marcarse aprobados. No se requiere hosting para esta entrega. Las guías personales de estudio de historias y principios de programación no forman parte de esta publicación.

### Experiencia pública que se conserva

- `/`, `/como-funciona`, `/para-creadores`: contenido e identidad Brotar.
- `/explorar` y `/explorar/buscar`: búsqueda, filtros, orden y paginación simulados.
- `/proyectos/reforestacion-chiquitana`: detalle de ejemplo; un slug inexistente muestra no disponible.
- Los selectores **Probar estados de la muestra** permiten carga, vacío y error. También se puede utilizar `?estado=carga`, `?estado=vacio` o `?estado=error` donde corresponda.
- Apoyar no procesa dinero. Registro/login y recuperación de contraseña son reales; campañas no deben presentarse como integradas a PostgreSQL.

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

Verificación local del **21/09/2026**: **93 pruebas frontend + 93 backend + 14 de integración = 200**, además de lint, TypeScript y build. Las pruebas de integración escriben fixtures ficticios propios en la base local y los limpian al finalizar; nunca ejecutarlas en producción. Si se interrumpen abruptamente, revisar solamente sus fixtures, no limpiar tablas completas.

Esta ejecución no reinicia el contenedor; comprueba reconexión y reinicios de APIs temporales. El ensayo opcional de reinicio de PostgreSQL se describe en [backend/README.md](backend/README.md).

Para ejecutar compilado: raíz `bun run build` y `bun run preview`; backend `pnpm run build` y `pnpm run start`. Para probar acceso real en preview (puerto 4173), añadir su origen exacto a `CORS_ORIGINS` del backend y reiniciar la API. Usar siempre el mismo hostname, preferentemente `127.0.0.1`. Preview no es un despliegue de producción.

## 7. Configuración y seguridad de la entrega

- El instalador crea `infra/postgres-v2/.env`, `.env.backend` y, al activar, `backend/.env`. Están excluidos de Git. La copia anterior, si existe, se conserva como `.env.before-v2`.
- `backend/.env.example` es una plantilla sin contraseña; con `DATABASE_ENABLED=false` solo sirve para probar la API sin base. No la copies encima de la configuración generada.
- `DB_HOST=127.0.0.1`, `DB_PORT=15433`, `DB_NAME=brotar_db` y `DB_USER=brotar_app` corresponden a V2. No conectar la aplicación como `postgres`.
- La API escucha localmente en 3000 y Vite en 5173. `CORS_ORIGINS` admite orígenes concretos; no sustituirlo por `*`.
- No incluir secretos en variables `VITE_*`, commits, Trello, capturas o comentarios. Cada integrante genera sus propias credenciales.
- `PASSWORD_RESET_LOCAL_FILE=true` habilita el buzón de archivos solo en desarrollo local. No devuelve enlaces por HTTP. Mantenerlo desactivado fuera del ensayo y no publicar los mensajes.
- `FILE_STORAGE_DIR` permite elegir la carpeta local de archivos. Por defecto se usa `backend/private/files`, excluida de Git. No apuntarla a `src/`, `public/`, `dist/` ni carpetas sincronizadas públicamente.
- Las portadas se asocian a la campaña en PostgreSQL. `CAMPAIGN_DRAFT_STORAGE_FILE` ya no se utiliza; los JSON previos se conservan sin importar automáticamente.
- El repositorio es público. No subir SQL con datos iniciales/privados, backups, `node_modules`, `dist` ni archivos `.env`.
- No habilitar `synchronize`, `dropSchema` ni migraciones automáticas. La base sigue siendo provisional.

## 8. Ramas, asignaciones y forma de trabajar

`DEV` contiene la integración actual del Sprint 1. `main` conserva la entrega anterior hasta aprobar su integración. Las ramas personales existentes son **`RicardoDev`, `AlisonDev` y `SantiagoDev`**; respetar exactamente mayúsculas/minúsculas. Esta publicación no actualiza automáticamente esas ramas: cada integrante incorpora `origin/DEV` en su rama con el árbol limpio siguiendo CONTRIBUTING.

Para descargar esta actualización, primero guardar el trabajo propio mediante commit o stash; no descartar cambios. Con el árbol limpio, desde la raíz del repositorio:

```powershell
git fetch origin
git switch DEV
git pull --ff-only origin DEV
```

Después volver a la rama personal existente (`git switch AlisonDev`, `git switch SantiagoDev` o `git switch RicardoDev`, según corresponda) y ejecutar `git merge origin/DEV`. Resolver conflictos antes de continuar; no usar reset forzado. Si ya se trabaja en la rama personal, basta con `git fetch origin` y `git merge origin/DEV` sin cambiar de rama. Instalar dependencias y levantar servicios según las secciones 3–5. Los `.env`, buzones y archivos locales no se descargan por Git; cada computadora conserva o genera los suyos siguiendo la instalación, sin borrar volúmenes.

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
  src/                NestJS: auth, users, profiles, roles, organizations, files, campaign-drafts
  test/               Pruebas sin base externa
  integration/        Pruebas con PostgreSQL local
  scripts/            Instalación y verificación V2
  private/            Archivos locales generados; excluido de Git
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
| No llega correo de recuperación | El restablecimiento es real, pero el envío queda pendiente de un remitente autorizado; usar enlace local solo en desarrollo/pruebas. |
| Base nueva no muestra cuentas anteriores | V2 usa volumen separado; no se migraron usuarios de la versión antigua. |
| Credencial incorrecta o correo duplicado | Usar otra cuenta ficticia única y recordar su contraseña; no activar usuarios ni modificar datos ajenos. |
| Cambios de otro compañero no aparecen | Integrar por DEV según CONTRIBUTING, reinstalar dependencias si cambian lockfiles y reiniciar procesos. |

## 11. Documentos y aceptación

- [Informe de entrega de integración](docs/entrega-integracion-2026-09-17.md).
- [Backlog general Word: 64 historias](docs/entregables/general/03_Product_Backlog_General_Brotar.docx).
- [Plan de 62 tareas por sprints](docs/planificacion-sprints.md). Historias y tareas no se suman como funcionalidades diferentes.
- [Ajuste de Sprint 2 a la tarea de campañas](docs/ajuste-sprint-2-fase-3-2026-09-30.md): 13 tareas actuales y 29 futuras por refinar.
- [Avance local de Ricardo en Sprint 2](docs/avance-ricardo-sprint-2-2026-10-01.md): proyectos propios y cola administrativa en revisión técnica; decisiones, publicación y ensayo integral pendientes. No equivale a Sprint 2 terminado.
- [Informe detallado del Sprint 1 — Word](docs/entregables/sprint-1/Informe_Detallado_Sprint_1_Brotar.docx).
- [Principios y patrones para el docente — Word](docs/entregables/sprint-1/Principios_y_Patrones_Sprint_1_Brotar.docx).
- [Calidad y defensa técnica — guía](docs/calidad-sprint-1.md) y [Word](docs/entregables/sprint-1/Informe_Calidad_y_Defensa_Sprint_1_Brotar.docx).
- [Guía de tareas y demostración](docs/verificacion-sprint-1.md), [Word](docs/entregables/sprint-1/Guia_Verificacion_y_Demostracion_Sprint_1_Brotar.docx) y [complemento del ensayo final](docs/ensayo-final-sprint-1.md). Conservan sus cortes históricos; para instalar o actualizar seguir este README.
- [Figma final](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574).
- [Revisión funcional de la integración](docs/revision-entrega-integracion-e08.md).
- [Índice de documentos y versiones históricas](docs/README.md).

Las notas de fases anteriores y el PDF explicativo conservan sus fechas de corte. Para ejecutar esta entrega prevalece este README. GitHub comparte el código, **no publica automáticamente una aplicación web**. La aceptación de los líderes, las reglas definitivas y la validación en las computadoras del equipo no se sustituyen por las pruebas locales.

## 12. Avance de Ricardo del Sprint 2

Este incremento se entrega en **`RicardoDev`**, conservando como base el Sprint 1 de DEV. No sustituye la integración posterior del equipo en DEV ni declara completado el Sprint 2.

Después de completar la instalación V2 de las secciones 3–5, con Docker operativo, aplicar desde `backend/`:

```powershell
pnpm install --frozen-lockfile
node scripts/prepare-sprint2.mjs
pnpm run check
pnpm run dev
```

El comando de preparación concede únicamente permisos técnicos para consultar proyectos, leer historial y descartar borradores. No restaura SQL, elimina datos ni concede CREATOR/ADMIN a personas. No modifica `.env`; sigue utilizando la configuración V2 generada con puerto 15433.

Las nuevas rutas son `/mis-proyectos` (CREATOR), su detalle `/mis-proyectos/:id`, `/administracion/campanas` (ADMIN) y su detalle `/administracion/campanas/:id`. Los accesos correspondientes aparecen en **Mi cuenta → Opciones para iniciativas y permisos**, según los roles vigentes. El formulario de registro no concede esos roles. El constructor básico del Sprint 1 mantiene su comportamiento.

**Cierre técnico del 02/10/2026:** S2-15 y S2-17 cumplen sus criterios acotados. Se comprobaron lista y detalle propios, continuación del borrador concreto, actualización persistida y descarte confirmado solo en DRAFT; también acceso administrativo, cola, búsqueda, entrada al detalle y estados vacío/carga/error/reintento. La administración sigue siendo una cola de consulta con detalle preparatorio: **no aprueba, rechaza ni publica todavía**; eso pertenece a S2-12/S2-14. La base oficial requiere una migración para el estado de campaña REJECTED; no confundirlo con su enum de decisiones. Pasaron 101 pruebas frontend, 101 backend y 15 de integración PostgreSQL. La asignación definitiva de roles, el envío del resto del constructor y el recorrido completo del Sprint 2 siguen pendientes. Ver [criterios, evidencia y tutorial de comprobación](docs/cierre-s2-15-s2-17-2026-10-02.md). No significa aceptación externa ni cierre de las historias generales.

Para repetir la integración con datos temporales de prueba, desde `backend/`, después de `prepare-sprint2.mjs` y `pnpm run check`:

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

Los tests exigen el contenedor/puerto V2 de esta copia, rechazan producción y crean cuentas temporales. Los roles CREATOR/ADMIN de sus fixtures **no** se otorgan a cuentas del equipo. Si Docker falla antes de iniciar por un socket Windows inaccesible, no reinstalar la base: ver [recuperación conservadora](infra/postgres-v2/README.md#recuperación-y-conservación).

Para ensayar la interfaz sin tocar datos reales, con Vite abierto: `http://127.0.0.1:5173/tests/visual-projects.html`. La página indica **datos ficticios** y queda fuera de la compilación de producción. Permite reproducir `normal`, `empty`, `error`, `forbidden` y `loading`; para administración usar `?view=admin&case=loading` y cambiar el escenario. El detalle vigente está en la [evidencia de cierre](docs/cierre-s2-15-s2-17-2026-10-02.md); la [nota del 01/10](docs/avance-ricardo-sprint-2-2026-10-01.md) conserva el avance histórico.
