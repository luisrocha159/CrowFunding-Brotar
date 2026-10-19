# Brotar · Base integrada del equipo

> **Avance local de Sprint 3 · 19/10/2026 · RicardoDev:** se inició S3-16, el núcleo sandbox de S3-02 y la base de S3-18. Este incremento requiere **nueve migraciones**; ver sección 24 y [contratos de integración](docs/contratos-sprint-3.md). No conecta un proveedor ni habilita cobros reales. La entrega remota DEV del 16/10 y sus comprobaciones se conservan como antecedente; este avance no está publicado todavía.

**Infraestructura vigente: `infra/postgres-v2/`.** `infra/postgres/` es la versión anterior y no se usa para levantar la entrega actual. Docker ejecuta **solo PostgreSQL**; el backend NestJS y el frontend Vite se ejecutan en el equipo anfitrión. Lee la instalación desde cero de la sección 3 antes de copiar variables o arrancar la API.

> **Antecedente de entrega en DEV · Sprint 2 · 05/10/2026:** integra las 13 tareas de campañas de Ricardo, Alison y Santiago, las correcciones de validación, la separación de lógica del editor y tres PDF de estudio/tutorial. Conserva las funciones del Sprint 1 y añade los ajustes de navegación con sesión de la sección 17. `main` no se modifica. Los resultados del corte de campañas y del incremento de permisos están en las secciones 15 y 16; la [verificación de instalación limpia](docs/entrega-dev-sprint-2-2026-10-05.md) distingue ese ensayo de las comprobaciones posteriores. Aceptación de líderes y reglas definitivas del cliente siguen pendientes.

**Por dónde empezar:** instalación nueva → sección 3; copia V2 ya instalada → sección 21; abrir otro día → sección 4; probar los flujos → secciones 5, 15, 16 y 20. El [tutorial PDF](output/pdf/Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf) conserva su fecha de corte; no sustituye las instrucciones actuales. No hace falta copiar cuentas, contraseñas, `.env` ni archivos de esta computadora. Cada integrante genera su configuración local.

**Entrega actualizada · 16/10/2026:** este incremento incorpora a DEV las validaciones de la sección 18, varias actividades por hito y su migración (sección 19), y la política de identificación de las secciones 20–21. Consulta el [registro de entrega y comprobaciones](docs/entrega-dev-2026-10-16.md). Los informes anteriores conservan su fecha de corte.

**Política vigente · 15/10/2026:** las secciones 20–21 alinean la entrega con la aclaración de los líderes: nombres repetidos permitidos, UUID/slug únicos y coincidencias solo orientativas. No se exige registrar una iniciativa/etapa adicional. La instalación de la sección 3 carga las cinco categorías provisionales mediante migración, sin pasos SQL manuales. Este incremento conserva las siete migraciones; no borres las extensiones históricas ni el control de migraciones.

**Plan vigente v2.4:** 64 historias y 67 tareas únicas. Sprint 3 reúne 36 tareas: 29 anteriores, cinco desgloses y dos arrastres del Sprint 1, sin duplicar historias. Reparto confirmado: Ricardo 18, Santiago 9, Alison 9. Consulta el [alcance y las dependencias](docs/plan-sprint-3-cierre-mvp-2026-10-15.md). Las 20 tareas originales del Sprint 1 incluyen dos pendientes trasladadas; no sumarlas de nuevo al total. El Sprint 2 aporta 13 tareas de campañas. No se declara terminado todo el MVP.

Acceso al constructor: iniciar sesión → **menú de cuenta → Mis borradores**; también desde **Mi cuenta → Opciones para iniciativas y permisos → Ver mis borradores**. La portada se guarda por campaña en la base oficial, no en un JSON por usuario. Para una V2 ya instalada ejecuta `node scripts/prepare-sprint1.mjs` desde backend si le faltan permisos recientes; no vuelvas a restaurar el backup.

**Recorrido vigente:** borrador → revisión → corrección → aprobación privada → publicación administrativa → consulta anónima. El [cierre técnico local](docs/cierre-tecnico-sprint-2-2026-10-05.md) conserva el ensayo anterior y la revisión de calidad; la nota de entrega registra su incorporación a DEV. No se modificó Trello ni se reemplazó el trabajo de las ramas personales.

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
| Catálogo, filtros y detalle de campañas | API pública real de campañas PUBLISHED; S2-16 integrado |
| Recuperación de contraseña | Solicitud y restablecimiento reales con token de un solo uso; envío de correo pendiente de remitente autorizado |
| Constructor y envío de campañas | Secciones persistidas, revisión de faltantes, envío a IN_REVIEW y reenvío |
| Decisiones administrativas y publicación | Aprobar, rechazar con motivo o solicitar cambios; publicación manual por ADMIN separada de aprobar, habilitada provisionalmente |
| KYC/KYB, aportes, pagos y administración completa | Pendientes de etapas posteriores |

Las cuentas nuevas conservan `PENDING_VERIFICATION`, pero pueden iniciar sesión básica y gestionar perfil/organizaciones en borrador. Esto **no** verifica correo/identidad, no publica campañas ni habilita pagos. Decisión local: [ADR-002](docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md). Las reglas definitivas y la aceptación formal corresponden a los líderes.

La ampliación del Sprint 1 incluyó constructor inicial, archivos, portada y recuperación local. El Sprint 2 añade secciones reales, decisiones administrativas y publicación. No incluye aportes, checkout, pagos, KYC/KYB ni administración completa. La publicación por ADMIN es la decisión provisional [ADR-005](docs/decisiones/ADR-005-publicacion-administrativa-provisional.md), no una regla definitiva del cliente.

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
corepack pnpm --version
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
git clone --branch DEV https://github.com/luisrocha159/CrowFunding-Brotar.git
cd CrowFunding-Brotar
git switch DEV
git pull --ff-only origin DEV
bun install --frozen-lockfile
cd backend
corepack pnpm install --frozen-lockfile
```

`DEV` contiene esta entrega integrada de Sprint 1 y Sprint 2. Para desarrollar, sigue [CONTRIBUTING.md](CONTRIBUTING.md) y trabaja en tu rama personal. Si tu pnpm global tiene otra versión, sustituye **cada** invocación de `pnpm` por `bun x --package pnpm@11.19.0 pnpm`, también `run check` y `run dev`; no cambies el lockfile por ello. Desde `backend/`, `corepack pnpm install --frozen-lockfile` también resuelve la versión declarada, pero no ejecutes Corepack desde la raíz, cuyo gestor es Bun.

### B. Instalar PostgreSQL oficial V2, una sola vez

Desde `backend/`, utiliza el SQL incluido en el repositorio:

**Antes del primer `install`: elige si esta es la única copia de Brotar en esta PC.** Una carpeta diferente no aísla Docker: por defecto todas las copias usan el proyecto `brotar-provisional-v2`, el mismo volumen y el puerto `15433`. Si ya tienes otra instalación en este equipo y quieres probar desde cero, ejecuta primero **en la terminal PowerShell**, desde `backend/`:

```powershell
$env:BROTAR_COMPOSE_PROJECT='brotar-ensayo'
$env:BROTAR_DB_PORT='15434'
```

Usa un nombre y un puerto libres para cada copia adicional. En otra PC, o si esta es la única instalación, no necesitas este bloque: se usan los valores normales. Si ya ejecutaste `install` con la configuración equivocada, estas dos variables no sustituyen los archivos ya generados: conserva la configuración y pide diagnóstico antes de repetir la instalación o cambiar contraseñas. No borres el volumen original.

**Todos los bloques `powershell` de esta guía se ejecutan en la terminal; no se pegan dentro de `.env`.** No crees `backend/.env` manualmente: `install` prepara el candidato y `activate` lo copia automáticamente después de verificar la conexión.

```powershell
node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql
corepack pnpm run check
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
```

El instalador comprueba el hash de la versión oficial, levanta una instancia en `127.0.0.1:15433`, restaura el SQL **solo si el esquema `public` está vacío** y genera credenciales locales distintas para administrador y aplicación. Si se interrumpe, puedes repetir exactamente `install`: reconoce un esquema oficial completo, repone el rol/permisos y conserva los datos. Si detecta un esquema parcialmente distinto, se detiene y pide diagnóstico; no lo restaura encima ni borra volúmenes. Usa `brotar_db` y un rol limitado `brotar_app`; TypeORM no sincroniza ni borra el esquema automáticamente. `pnpm run check` compila antes de migrar y no invoca otro pnpm global internamente. Las **nueve migraciones de RicardoDev** conservan las siete del Sprint 2 y añaden permisos por responsabilidad e integridad de referencias de pago. Las tablas de iniciativa/etapa del ensayo anterior se conservan por compatibilidad; no son requisitos de creación ni admisión. **No crean las tablas oficiales**, por eso siempre van después de `install`. La preparación S2 concede los permisos técnicos, no roles a cuentas.

El SQL incluido contiene estructura y catálogos oficiales, no nuestras cuentas, contraseñas, sesiones ni borradores locales. Conserva el SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`, validado por el instalador. No editar sus saltos de línea ni reemplazarlo por un backup de una base poblada. Si recibes otra versión/hash, coordina su revisión; no evites la comprobación ni ejecutes el archivo encima de una base existente. Las categorías adicionales se cargan automáticamente con `migrate up`, sin modificar ese SQL.

El instalador nuevo aplica los permisos necesarios. Si la instalación V2 es **anterior** a esta corrección, ejecuta `node scripts/prepare-sprint1.mjs` antes de las pruebas, sin volver a restaurar el SQL.

**Pruebas de integración opcionales para comprobar la entrega:** el siguiente bloque se ejecuta completo en PowerShell. Las líneas `$env:...` son variables temporales de la terminal, no el contenido de `backend/.env`. Las pruebas crean datos temporales y los limpian; no las ejecutes sobre una base de producción.

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

Con la instalación, migraciones y verificación aprobadas (y las pruebas aprobadas si las ejecutaste), y con la API detenida:

```powershell
node scripts/adopt-provisional-v2.mjs activate
corepack pnpm run dev
```

**Cómo debe quedar `backend/.env`:** lo genera `activate` desde `infra/postgres-v2/.env.backend`. Es texto de configuración `CLAVE=valor`, no comandos de PowerShell, `try/finally` ni instrucciones de pruebas. Comprueba estas claves sin publicar ni compartir la contraseña:

| Clave | Instalación normal | Copia aislada del ejemplo |
| --- | --- | --- |
| `DATABASE_ENABLED` | `true` | `true` |
| `DB_HOST` | `127.0.0.1` | `127.0.0.1` |
| `DB_PORT` | `15433` | `15434` |
| `DB_NAME` | `brotar_db` | `brotar_db` |
| `DB_USER` | `brotar_app` | `brotar_app` |
| `DB_PASSWORD` | Generada localmente por `install` | Generada para esta copia; no reutilizar la de otra |
| `DB_SSL` | `false`, conexión local | `false`, conexión local |
| `HOST` / `PORT` | `127.0.0.1` / `3000` | Igual; detén la otra API si ocupa `3000` |

No necesitas copiar esta tabla a ningún archivo. Tras activar, reinicia la API si estaba abierta: el proceso carga `.env` al arrancar. Solo una API y un frontend pueden usar los puertos `3000` y `5173` a la vez.

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
3. Cuando `install` termine, ejecuta `pnpm run check`, `node scripts/migrate.mjs up`, `node scripts/prepare-sprint2.mjs`, `node scripts/verify-provisional-v2.mjs` y finalmente `activate` como arriba. Si aparece `app_user`/`user_profile` inexistente, **faltó la restauración inicial**; no ejecutes la migración primero.
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
corepack pnpm install --frozen-lockfile
node scripts/prepare-sprint1.mjs
corepack pnpm run build
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
corepack pnpm run dev
```

En otra terminal, raíz: `bun run dev`. Actualizar código **no** exige restaurar nuevamente la base. Configura la publicación provisional según la sección 15. Los `.env` y archivos privados no se descargan: una computadora nueva sigue la sección 3 y una copia existente conserva su configuración.

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

La instalación de la sección 3 ya lo prepara. En una copia existente, desde `backend/`, con PostgreSQL V2 saludable:

```powershell
corepack pnpm run build
node scripts/migrate.mjs up
node scripts/migrate.mjs status
```

Una instalación nueva ofrece Medio ambiente, Producción sostenible, Economía circular, Educación y Desarrollo comunitario. `ProvisionalCatalogs1792015200000` inserta slugs faltantes; no sobrescribe nombres ni reactiva categorías desactivadas deliberadamente. Países, monedas y categorías de gasto también quedan preparados. El frontend consulta el catálogo de PostgreSQL; no contiene una lista alternativa hardcodeada. El antiguo `seed-categories-demo.sql` se conserva como referencia, no como paso adicional requerido. Son categorías provisionales del equipo, no aprobación definitiva del cliente.

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

`DEV` contiene la integración actual del Sprint 1 y las 13 tareas del Sprint 2. `main` conserva la entrega anterior hasta aprobar su integración. Las ramas personales existentes son **`RicardoDev`, `AlisonDev` y `SantiagoDev`**; respetar exactamente mayúsculas/minúsculas. Esta publicación no actualiza automáticamente esas ramas: cada integrante incorpora `origin/DEV` en su rama con el árbol limpio siguiendo CONTRIBUTING.

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

## 12. Antecedente de Ricardo del Sprint 2

Esta sección conserva el corte del 02/10; para decisiones y publicación actuales prevalece la sección 15.

Este incremento se entrega en **`RicardoDev`**, conservando como base el Sprint 1 de DEV. No sustituye la integración posterior del equipo en DEV ni declara completado el Sprint 2.

Después de completar la instalación V2 de las secciones 3–5, con Docker operativo, aplicar desde `backend/`:

```powershell
pnpm install --frozen-lockfile
node scripts/prepare-sprint2.mjs
pnpm run check
pnpm run dev
```

El comando de preparación concede únicamente permisos técnicos del incremento: proyectos, historial, descarte, vista financiera pública, secciones/envíos, revisiones y observaciones. No restaura SQL, elimina datos ni concede CREATOR/ADMIN a personas. No modifica `.env`; sigue utilizando V2 en puerto 15433. Desde el 05/10 este único comando prepara el trabajo de los tres integrantes; la primera instalación también aplica estos permisos. Para la migración y publicación vigentes seguir la sección 15.

Las nuevas rutas son `/mis-proyectos` (CREATOR), su detalle `/mis-proyectos/:id`, `/administracion/campanas` (ADMIN) y su detalle `/administracion/campanas/:id`. Los accesos correspondientes aparecen en **Mi cuenta → Opciones para iniciativas y permisos**, según los roles vigentes. El registro no concede esos roles. El constructor conserva los borradores y posiciones del Sprint 1; su ampliación vigente se describe en la sección 14.

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

## 13. Integración local del catálogo público de Alison

Se revisó `origin/AlisonDev` en `f84f017` y se adaptó su módulo S2-16 sobre la base actual de `RicardoDev`. No se sustituyeron el constructor, sesiones, infraestructura V2, proyectos propios ni la cola administrativa. La integración permanece local, sin commit/push y sin cambios en Trello. La [revisión detallada](docs/revision-integracion-alison-s2-16-2026-10-04.md) distingue el trabajo original de las correcciones y pruebas añadidas.

Para utilizar esta copia, después de instalar V2, arrancar PostgreSQL y ejecutar nuevamente `node scripts/prepare-sprint2.mjs` desde `backend/`. Este paso incorpora SELECT sobre `v_campaign_funding`; no exige restaurar la base ni cambiar credenciales. Después arrancar la API y Vite como se indica en las secciones anteriores.

- `/` muestra las campañas publicadas más recientes; no inventa estadísticas ni campañas destacadas.
- `/explorar` y `/explorar/buscar` leen `GET /api/campaigns/public`, con búsqueda, filtros combinados y paginación en el cliente.
- `/proyectos/:slug` lee `GET /api/campaigns/public/:slug`, con historia, impacto esperado, creador, recompensas activas, moneda, meta y recaudación confirmada neta.
- La imagen debe ser pública, pertenecer al almacenamiento de imágenes de campaña y no estar eliminada. No se exponen borradores, campañas aprobadas pero no publicadas ni información privada.
- Una base sin campañas PUBLISHED muestra un vacío explicado; un fallo de API muestra error y Reintentar. No se reemplazan esos estados con datos simulados.

La suite de integración sigue los comandos de la sección 12: tuvo 16 pruebas al integrar Alison el 04/10 y tiene 17 tras integrar Santiago el 05/10. La prueba pública prepara y limpia fixtures locales propios; sus registros financieros solo comprueban la vista y **no implementan pagos**.

Santiago ya fue revisado e integrado localmente; ver la sección 14. S2-12, S2-14 y la verificación técnica de S2-21 se completaron después, según la sección 15. La aplicación publica mediante una acción administrativa real; no se debe alterar el estado con SQL para simular el recorrido.

## 14. Integración local de las campañas de Santiago

Se incorporaron **S2-02, S2-03, S2-04, S2-05, S2-10, S2-11 y S2-13**, conservando el catálogo de Alison y proyectos/cola de Ricardo. La [nota original de Santiago](docs/implementacion-sprint-2-santiago.md) conserva su ensayo sin PostgreSQL; la [revisión del 05/10](docs/revision-integracion-santiago-sprint-2-2026-10-05.md) contiene la comprobación vigente.

Con V2 ya instalado, no restaurar SQL ni borrar el volumen. Seguir la actualización de la sección 15: migrar antes de preparar permisos. `prepare-sprint2-santiago.mjs` es un alias de `prepare-sprint2.mjs`. La preparación solo concede permisos; la migración separada añade REJECTED sin reescribir el SQL oficial ni cambiar credenciales.

Recorrido con una **cuenta de ensayo**:

1. Iniciar sesión y abrir **Mis borradores**. Crear o continuar una campaña propia. Desde **Mis proyectos**, `?borrador=` conserva la campaña seleccionada.
2. Completar modalidad, información, historia/indicadores y portada. Se conservan ocho posiciones porque Portada está separada: cubren las siete áreas funcionales de la tarea sin invalidar avances anteriores.
3. En **Plan y presupuesto**, añadir actividades con responsables/fechas, hitos si corresponden, partidas y riesgos si corresponden. Guardar planificación y presupuesto por separado. Si ambos cambiaron, guardar uno no confirma el otro; se bloquea la navegación hasta guardar los cambios.
4. Guardar meta positiva, moneda activa, duración y modelo. Las fechas son opcionales y coherentes. No se impone presupuesto igual a meta ni una duración comercial no confirmada. No se activan pagos.
5. Guardar recompensas/preventas: tipo, descripción, aporte mínimo, disponibilidad y entrega. Donación omite el paso; cambiar de modalidad conserva los datos anteriores sin mostrarlos como recompensas aplicables a donación.
6. En **Revisión y envío**, comprobar los datos guardados. Los faltantes enlazan su paso y el servidor vuelve a validar al enviar.
7. Con **REGISTERED_USER y CREATOR vigentes**, una campaña completa queda **IN_REVIEW**, con fecha, actor y nueva ronda; aparece en la cola y se bloquea la edición. El registro no concede CREATOR automáticamente; ADMIN puede habilitarlo manualmente de forma provisional (sección 16).
8. Si se solicitan cambios, **Mis proyectos → Corregir campaña** abre el asistente. El último paso muestra las observaciones de la última ronda. Corregir, guardar y reenviar conserva el historial y crea otra ronda. La sección 15 añade la acción administrativa real de solicitud de cambios; el ensayo integral ya usa esa API, no cambios de estado por SQL.

Comprobación: `bun run check` en raíz, comprobaciones backend con pnpm **11.19.0** y suite PostgreSQL de la sección 12. La nueva prueba `backend/integration/campaign-sections-submission.integration.test.ts` cubre propiedad, roles, entradas inválidas, persistencia tras reiniciar la API, envíos concurrentes, bloqueo de edición, observaciones, reenvío y conexión con S2-15/S2-16/S2-17. Limpia sus cuentas/campañas temporales y no asigna roles a compañeros.

El cierre técnico vigente está en la sección siguiente. La aceptación externa, el acuerdo definitivo de provisión de roles y las reglas futuras permanecen separados; no hay nuevos pagos ni KYC/KYB.

## 15. Revisión y publicación del Sprint 2

**Entrega del 05/10/2026 en DEV:** incluye S2-12, S2-14 y la verificación/documentación de S2-21 junto con las otras diez tareas. Las 13 tareas están verificadas en su alcance técnico, no las 64 historias generales del MVP. [Evidencia por tarea](docs/cierre-tecnico-sprint-2-2026-10-05.md) y [ensayo de instalación limpia](docs/entrega-dev-sprint-2-2026-10-05.md). La revisión formal de los líderes sigue pendiente.

### Actualizar una base V2 existente

Conservar `.env`, datos y volumen. Desde la raíz, con Node/Bun/pnpm en las versiones de la sección 2:

```powershell
bun install --frozen-lockfile
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
cd backend
pnpm install --frozen-lockfile
pnpm run build
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
pnpm run check
```

Con la API detenida, añadir o ajustar **solo esta variable** en `backend/.env`, sin duplicarla ni copiar el ejemplo encima de las credenciales:

```dotenv
CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true
```

Después ejecutar `pnpm run dev` y, en otra terminal desde la raíz, `bun run dev`. Una instalación nueva sigue la sección 3 y genera esa variable en el candidato; si ya tenía un valor explícito, se conserva. Un candidato antiguo no se reescribe automáticamente. La API exige un booleano válido; sin la variable, o con `false`, la publicación queda bloqueada. **Aprobar sigue sin publicar**. No registrar ni subir `.env` a Git.

La migración `CampaignRejected1791244800000` añade REJECTED al enum oficial de campaña, manteniendo tablas/datos. Se ensayó desde el SQL oficial en una base temporal aislada, incluyendo repetición segura. No tiene reversión destructiva de ENUM: [procedimiento de migraciones](infra/postgres-v2/MIGRACIONES.md). **Actualmente deben figurar siete migraciones y `pending: false`**, no tres ni cuatro: la lista vigente y el procedimiento de actualización están en la sección 21. Se conservan las migraciones de compatibilidad aunque su formulario experimental se retiró.

### Demostrar el flujo con cuentas autorizadas

#### Crear un administrador de ensayo en cada computadora

Las cuentas de la base local **no viajan con Git**. DEV incluye el procedimiento, no una cuenta compartida, una contraseña predeterminada ni un backup poblado. Cada responsable prepara su propia cuenta y contraseña; nunca las añade al SQL oficial, README, scripts o archivos versionados.

1. Inicia PostgreSQL, backend y frontend siguiendo la sección 3. Registra la cuenta de ensayo desde **Crear una cuenta**, usando una contraseña exclusiva de prueba. Seleccionar un perfil no concede ADMIN.
2. El responsable de esta instalación, con acceso al archivo privado de PostgreSQL, ejecuta desde `backend/` el comando siguiente. Sustituye el correo de ejemplo por el de la cuenta que **ya registró** y que autoriza como administradora:

```powershell
node scripts/grant-local-admin.mjs --email=admin@example.invalid --confirm-local-admin
```

3. Inicia sesión normalmente con esa cuenta y su contraseña. Si ya había sesión abierta, ciérrala y vuelve a entrar. Abre **Mi cuenta → Opciones para iniciativas y permisos → Administración de campañas**, o `http://127.0.0.1:5173/administracion/campanas`.
4. Comprueba consulta, detalle y decisiones sobre una campaña enviada. Aprobar no publica; publicar requiere la configuración provisional de esta sección. ADMIN no implica CREATOR ni sustituye la cuenta del creador para demostrar ambos lados.

Este comando exige configuración **V2 local de desarrollo**, verifica el proyecto Docker, el contenedor y su puerto loopback, y utiliza las credenciales privadas del operador. Concede solo ADMIN a la cuenta indicada. No crea usuarios, restablece contraseñas, verifica correo/identidad ni cambia el estado de la cuenta. Repetirlo para una concesión vigente no duplica roles; una concesión vencida/futura requiere revisión manual. No habilita cuentas suspendidas, cerradas, eliminadas o bloqueadas. No es un endpoint ni un seed que se ejecute al instalar o arrancar. La provisión definitiva en despliegue continúa pendiente de D06.

Las pruebas de este procedimiento están incluidas en `pnpm run check`; también se pueden ejecutar por separado con `pnpm run test:local-admin`. No necesitan una base para los casos simulados de protección e idempotencia.

El registro básico **no concede CREATOR ni ADMIN**, aunque se seleccione un perfil de uso. No hay contraseña administrativa compartida en el repositorio. ADMIN se provisiona mediante el procedimiento local anterior; puede habilitar CREATOR provisionalmente desde la sección 16. Las reglas definitivas siguen pendientes en D06. Las integraciones preparan y limpian sus propias cuentas temporales sin modificar personas existentes.

1. **Creador:** iniciar sesión, abrir Mis borradores/Mis proyectos y completar una campaña propia con información, modalidad, historia/impacto, portada, plan, presupuesto, financiamiento y recompensas aplicables. Guardar cada sección y revisar los faltantes. Donación no exige recompensas.
2. En Revisión y envío, enviar la campaña completa. Debe quedar IN_REVIEW, no pública y sin edición. Un segundo envío no crea una ronda duplicada.
3. **Administrador:** desde Mi cuenta → Opciones para iniciativas y permisos, abrir la cola administrativa y el detalle. Comprobar todas las secciones, portada, rondas e historial; no solo nombre/meta.
4. Elegir Solicitar cambios. Introducir motivo y, si se necesita, observaciones por sección. Confirmar la operación. Sin motivo se señala el campo y no se guarda. La campaña queda CHANGES_REQUESTED.
5. **Creador:** abrir Corregir campaña, consultar observaciones, guardar correcciones y reenviar. Se conserva la ronda anterior y se crea una nueva pendiente.
6. **Administrador:** actualizar el detalle; aprobar la nueva ronda y confirmar. Debe quedar APPROVED con aviso de que **todavía es privada**, sin aparecer en Explorar.
7. Pulsar Publicar campaña y confirmar la publicación pública. Solo ADMIN con configuración habilitada y aprobación vigente puede hacerlo. El estado pasa a PUBLISHED y se registra actor/fecha; repetir o usar una ronda antigua devuelve conflicto, sin duplicar historial.
8. **Visitante sin sesión:** abrir Explorar, combinar filtros y abrir el detalle publicado. Deben aparecer los datos reales guardados y el enlace de imagen pública. Una base sin publicaciones muestra un vacío explicado, no proyectos ficticios de respaldo.
9. Con otra campaña completa enviada, probar Rechazar con motivo. Queda REJECTED, conserva la decisión y el historial, no se publica ni permite edición/reenvío en esta entrega. No confundir rechazo con solicitud de corrección.

Las operaciones están protegidas también en backend: sesión, rol, propiedad, origen de la solicitud, ronda vigente, completitud y transición bajo transacción. La interfaz muestra carga/confirmación/resultado y exige actualizar cuando una respuesta es incierta; un botón oculto no sustituye estos controles.

### Pruebas y límites de entrega

Después de la revisión de calidad del 05/10, `bun run check` aprobó **130** casos frontend, lint/tipos/compilación. El backend aprobó **128** casos sin base y lint/tipos/compilación. La suite real de la sección 12 aprobó **18** integraciones PostgreSQL, sin fallos ni omisiones: **276** en total, incluyendo regresiones de Sprint 1. El corte previo de 263 casos y su ensayo real de escritorio/móvil/teclado se conservan como antecedentes. El ensayo interactivo adicional de esta revisión quedó bloqueado por el acceso de la herramienta; no se declara repetido.

La autorización del equipo para que ADMIN publique es **provisional** ([ADR-005](docs/decisiones/ADR-005-publicacion-administrativa-provisional.md)). No resuelve reglas definitivas del cliente, KYC/KYB, correo, textos legales ni pagos. Esta entrega de DEV no sincroniza Trello ni implica aceptación externa: obtener la revisión de los líderes sigue siendo necesario.

### Guías PDF de estudio y defensa del Sprint 2

- [Demostración de las 13 tareas y flujos nuevos](output/pdf/Guia_Demostracion_y_Estudio_Sprint_2_Brotar.pdf): 19 páginas, checklists con estado real, implementación, pasos, ensayos negativos, anclajes de código y pruebas. El recorrido integral está en la página 4; las fichas individuales comienzan en la 5.
- [Principios, patrones y defensa técnica](output/pdf/Informe_Principios_y_Patrones_Sprint_2_Brotar.pdf): 15 páginas, ejemplos agrupados por KISS, DRY, YAGNI, SOLID, IoC/DI, composición y Boy Scout; Repository/Adapter, transacciones, validación y límites de las afirmaciones.
- [Tutorial de los siete flujos de inicio a fin](output/pdf/Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf): 19 páginas; preparación, cuentas/roles necesarios, botones reales, datos ficticios, guardados, faltantes, correcciones, aprobación/publicación, visitante, rechazo, descarte y resultados esperados.

Los PDF conservan el corte local con el que se redactaron antes de la entrega; están incluidos en esta versión de DEV. Su texto sobre publicación pendiente no equivale a que falten sus archivos en el repositorio. No incluyen contraseñas de cuentas: CREATOR/ADMIN para un ensayo manual requieren provisión autorizada, como se explica arriba. Las pruebas automáticas crean y limpian sus propias cuentas efímeras.

La revisión extrajo `useCampaignSections`, corrigió falsos rechazos decimales y suma de céntimos, fechas imposibles, NUL en textos persistidos, límites técnicos y el campo HTML de contraseñas Unicode. El hash y la política de sesión se conservaron: Ñ, acentos y espacios de contraseña siguen siendo exactos, sin recorte ni normalización. No constituye una certificación absoluta de seguridad ni introduce reglas comerciales pendientes.

Fuente reproducible: `scripts/build-sprint2-pdfs.py` (Python con reportlab/pypdf y fuentes Arial/Consolas de Windows). El generador valida las trece tareas, los anclajes y la cantidad de páginas; la revisión visual con Poppler es un paso separado. Usar los PDF incluidos para estudiar: no es necesario ejecutar el generador para arrancar Brotar.

## 16. Habilitación provisional de creadores y varios borradores

**Decisión provisional del equipo, no regla definitiva del cliente ni aprobación KYC.** El administrador puede habilitar exclusivamente CREATOR desde la interfaz. ADMIN nunca se concede desde registro ni desde este panel. La relación definitiva entre acceso, creador y KYC continúa pendiente.

Para una instalación existente, desde `backend/`:

```powershell
pnpm run build
node scripts/migrate.mjs up
```

La migración `CreatorGrantAudit1791244800001` concede a `brotar_app` únicamente la inserción de auditoría y el uso de su secuencia oficial. No crea tablas, cambia el SQL oficial, asigna roles a personas, verifica cuentas ni elimina datos. La secuencia de instalación de la sección 3 ya incluye `migrate.mjs up`; reinicia el backend si no está en modo desarrollo.

1. Iniciar sesión con la cuenta ADMIN provisionada localmente (sección 15). Abrir **Mi cuenta → Habilitar creadores · provisional**, o `/administracion/usuarios`.
2. Buscar el correo exacto de una cuenta ya registrada. Se muestran nombre, correo, estado y roles vigentes; no contraseñas, tokens, documentos ni un listado público de cuentas.
3. Introducir un motivo y marcar la confirmación explícita. Pulsar **Habilitar como creador · provisional**. Solo se admite una cuenta disponible, no bloqueada y con REGISTERED_USER; Auditor permanece en lectura. Concesiones CREATOR vencidas/futuras no se reactivan silenciosamente.
4. El backend exige sesión ADMIN y protección de origen. Guarda CREATOR con `granted_by` y una entrada en `audit_log` dentro de una transacción. Repetir una concesión vigente no duplica rol ni auditoría. Conserva contraseña, estado pendiente y verificaciones.
5. Volver a la cuenta del creador, recargar Mi cuenta/constructor y completar **Revisión y envío → Enviar a revisión**. Habilitar el rol no envía automáticamente una campaña. Solo «Campaña recibida» / IN_REVIEW confirma el envío; entonces aparecerá en el panel administrativo.

**Varios borradores:** el constructor muestra el selector **Elegir campaña guardada**, el número de campañas y **Crear otro borrador · conservar los anteriores**. Abrir una cambia el parámetro `?borrador=<id>` para que recargar conserve la selección. Cada campaña tiene un ID independiente. Crear otra no modifica ni descarta la anterior. Guarda cada sección antes de cambiar; un error de envío conserva DRAFT editable. Enviada y confirmada pasa a IN_REVIEW y queda en consulta hasta que administración solicite cambios. Solo la cuenta propietaria ve sus borradores; ADMIN ve la cola de enviados, no borradores ajenos.

Pruebas añadidas: contratos frontend, reglas/guardias/confirmación backend e integración PostgreSQL de concesión, concurrencia, auditoría, CSRF, cuenta bloqueada, rol caducado y conservación de contraseña/estado/verificaciones. La integración de borradores comprueba que dos campañas propias siguen accesibles sin sustituir datos. Los recuentos de la sección anterior corresponden al corte previo.

Verificación del incremento del **05/10/2026**: **133** pruebas frontend, **131** pruebas backend, **8** pruebas del procedimiento ADMIN local y **19** integraciones PostgreSQL: **291 casos aprobados**, sin omisiones. Lint, tipos y compilación aprobados. La integración de campañas recorre envío, cambios, reenvío, aprobación privada, publicación y rechazo; la de migraciones ensaya la nueva secuencia desde SQL oficial aislado. La interfaz administrativa se comprobó buscando una cuenta existente, sin concederle permisos durante ese ensayo visual. Estos resultados permiten demostrar el incremento; no equivalen a aceptación de los líderes ni certificación absoluta de seguridad. Las cuentas locales no viajan con Git.

## 17. Navegación con sesión iniciada

Login y registro comprueban primero la sesión mediante `GET /api/auth/me`. Con una sesión válida no vuelven a pedir credenciales: conservan un destino `continuar` permitido o llevan a Mi cuenta; el acceso de creador u organización conserva su pantalla correspondiente. Estas redirecciones no conceden roles: la API sigue comprobando sesión, permisos y propiedad.

- **Para creadores**, inicio, cabecera y pie adaptan sus botones a la sesión confirmada. Con sesión aparecen Mi cuenta/Mis borradores en lugar de otro registro o login.
- Cambiar entre login, registro y recuperación conserva el borrador o la portada seleccionados. Se rechazan destinos externos, parámetros no admitidos y bucles hacia otro acceso.
- Durante la comprobación aparece un estado de carga. Un fallo de conexión no se interpreta como cierre de sesión: permite reintentar. La revalidación en segundo plano no desmonta los formularios que se están rellenando.
- Recuperación sigue accesible aunque haya sesión. Un restablecimiento confirmado actualiza el estado de la interfaz; el backend mantiene la revocación de sesiones existente.

**Cómo comprobarlo:** iniciar sesión, visitar Para creadores y abrir Mis borradores. Escribir `/iniciar-sesion` o `/registro` en la dirección: debe volver a Mi cuenta sin pedir otra contraseña. Probar `/iniciar-sesion?continuar=%2Fadministracion%2Fcampanas` con ADMIN: conserva ese destino; otra cuenta no obtiene permisos administrativos. Cerrar sesión desde Mi cuenta y entrar en una ruta privada: vuelve al login con su destino conservado. La cuenta y contraseña para ensayar deben crearse/provisionarse en cada instalación; no viajan en Git.

Este incremento no cambia la arquitectura, el esquema SQL ni las reglas provisionales de CREATOR/publicación. La revisión de Figma fue parcial, no una certificación de coincidencia de todas las pantallas. Los resultados automatizados actuales y sus límites se indican a continuación.

**Comprobación del arranque posterior al apagado · 05/10/2026:** `bun run check` aprobó **142** pruebas frontend; `pnpm run check`, **131** backend y **8** del procedimiento ADMIN local; la suite PostgreSQL aprobó **19** integraciones con `ALLOW_DB_TEST_WRITES=true`, `NODE_ENV=test` y `DB_TEST_RESTART=true`: **300 casos**, sin fallos ni omisiones. Lint, tipos y compilaciones aprobaron. El aviso de Vite por un paquete de unos 505 kB sigue presente: no impide arrancar, pero es una optimización pendiente. API `/api/health/ready` y el mismo endpoint mediante Vite respondieron HTTP 200 con `database=connected`; la consulta pública de campañas también respondió 200. La suite comprobó conservación de datos tras reiniciar PostgreSQL y los escenarios de sesiones/recuperación. No se restauró SQL ni se borró el volumen original.

El ensayo visual de las redirecciones se realizó antes del apagado. No se repitió por completo en este arranque: la herramienta de escritorio detuvo el acceso a Opera al no poder determinar su URL con seguridad. Los tests de navegación/renderizado y las integraciones de sesión sí se repitieron; no sustituyen una aceptación visual de los líderes. La recuperación del socket local de Docker se describe en [infraestructura V2](infra/postgres-v2/README.md#recuperación-y-conservación); no se declara resuelto definitivamente su origen.

## 18. Validaciones del equipo para el Sprint 2

Las reglas acordadas por Ricardo para este ajuste están detalladas en [ADR-006](docs/decisiones/ADR-006-validaciones-del-equipo-sprint-2.md). Son criterios del equipo para el MVP, no reglas atribuidas al cliente. Se reutiliza la validación de dominio entre frontend y backend, con mensajes junto al campo y protección también en la API.

- **Registro:** correo primero, comprobación de formato y disponibilidad al salir del campo, asteriscos de obligatoriedad y distribución responsive del teléfono. La disponibilidad no verifica la propiedad del correo. El endpoint está limitado a 20 consultas por minuto/IP en cada instancia y permite conocer si un correo está registrado; ese compromiso exige revisión antes de una exposición pública de producción. El registro conserva la comprobación definitiva de unicidad.
- **Textos y opciones:** límites de longitud, contenido significativo y rechazo de etiquetas HTML, controles invisibles y Unicode mal formado. El resumen exige entre 11 y 500 caracteres. Países y categorías de gasto provienen de los catálogos; unidades, impacto y modalidad usan opciones permitidas. Ñ, acentos y contraseñas Unicode siguen admitidos; las contraseñas no se recortan ni normalizan.
- **Fechas y cantidades:** calendario real y fechas planificadas no pasadas según el día de Bolivia; un hito de cierre no termina antes de sus actividades relacionadas, y la duración es coherente con las fechas de financiamiento. Personas, familias, unidades y stock requieren enteros; medidas y dinero admiten decimales según su precisión. Porcentajes no exceden 100.
- **Presupuesto:** el importe planificado se calcula a partir de cantidad × precio unitario y no se edita manualmente. La API rechaza importes alterados y exige que la meta sea estrictamente mayor al presupuesto, tanto al guardar financiamiento como al modificar partidas. El control se repite bajo bloqueo transaccional para solicitudes simultáneas.
- **Modalidades:** donación no tiene recompensas; preventa exige stock y el tipo de recompensa debe corresponder a la modalidad. Los aportes mínimos y las fechas de entrega deben ser compatibles con el financiamiento cuando corresponde. No se añadieron formularios particulares por materiales.
- **Campañas con nombres repetidos:** la política vigente de la sección 20 sustituye los bloqueos ensayados anteriormente. Nombres y contenido similares no bloquean el envío ni la decisión; UUID/slug son únicos y las coincidencias son orientativas.
- **Asistente y revisión:** «Siguiente» señala los faltantes del paso actual sin exigir pasos futuros. Envío, aprobación y publicación revalidan lo guardado y devuelven campo/paso para corregir datos antiguos. Los borradores existentes pueden necesitar correcciones; no se cambian ni eliminan silenciosamente.

No hace falta restaurar el SQL ni borrar el volumen para aplicar este ajuste. No cambia el esquema oficial, las credenciales ni los comandos de instalación de la sección 3. Reinicia el backend después de actualizar el código si no utilizas el modo desarrollo.

### Comprobar las nuevas reglas

1. En Registro, salir de un correo mal formado y después probar uno ya registrado: debe aparecer el error junto al correo, sin crear otra cuenta. Probar uno libre debe indicar disponibilidad, no verificación de identidad.
2. Crear un borrador con resumen de 10 caracteres: debe rechazarse. Un resumen significativo de 11 o más, hasta 500, supera ese límite; los demás campos siguen siendo obligatorios.
3. En una partida, escribir cantidad `100` y precio `60`: debe calcular `6000` como importe planificado no editable. Con ese presupuesto, meta `6000` se rechaza; `6000.01` cumple esta comparación. Las otras validaciones de financiamiento siguen aplicándose.
4. Probar probabilidad `101` y después `100`. La primera debe rechazarse. Un indicador de porcentaje no acepta más de 100; un indicador de personas no acepta `1.5`.
5. Probar una actividad para ayer, un hito que finalice antes de sus actividades relacionadas o fechas de financiamiento incompatibles con la duración: deben señalarse sus campos. En preventa, stock vacío o fraccionario debe rechazarse.
6. Seguir la sección 20: dos campañas con el mismo nombre y contenido pueden enviarse y publicarse con UUID/slug distintos. No deben aparecer faltantes de iniciativa/etapa ni un `422` por semejanza. Otros datos incompletos o inválidos siguen impidiendo el envío.
7. Pulsar «Siguiente» con el paso incompleto: debe permanecer allí y explicar los faltantes. Completar, guardar y revisar permite seguir; un dato antiguo que incumpla las reglas se informa antes del envío o de una decisión administrativa.

### Pruebas del ajuste del 13 de octubre

**315 casos aprobados:** 153 frontend, 135 backend sin base, 8 del procedimiento ADMIN local y 19 integraciones PostgreSQL. Lint, tipos y compilaciones aprobaron. Los ensayos incluyen disponibilidad de correo, errores anidados, porcentajes, fechas, cálculo monetario, modalidades, duplicados simultáneos y la carrera entre presupuesto y meta. Las repeticiones de suites no se suman como casos nuevos.

Frontend: `bun run check` desde la raíz. Backend: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run test:local-admin` y `pnpm run build` desde `backend/`, con la versión de pnpm fijada en su `package.json`. En este equipo se invocaron mediante `corepack pnpm` para evitar otra versión de pnpm disponible en PATH.

Las 19 integraciones de este corte usaron la configuración V2 generada, `NODE_ENV=test`, `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=false`, siguiendo las precauciones de la sección 12. Prueban persistencia, reconexión y reinicio de la API; **no declaran un nuevo ensayo de reinicio de PostgreSQL**. El ensayo con reinicio de base de la sección 17 corresponde al 05/10.

La revisión visual comprobó registro, disponibilidad de correo, campos obligatorios, cálculo de partida, error de porcentaje y distribución móvil a 375 px. La entrada de fechas se verificó mediante pruebas de reglas/API; no se presenta como un recorrido manual completo del selector de calendario. Vite conserva un aviso no bloqueante por un paquete de unos 517 kB. Estos resultados no garantizan ausencia absoluta de fallos ni aceptación externa.

## 19. Varias actividades por hito

En **Plan y presupuesto → Hito → Actividades relacionadas**, las casillas permiten seleccionar una o varias actividades. Por ejemplo, «Huerto listo» puede vincular «Preparar terreno», «Instalar riego» y «Sembrar». El vínculo sigue siendo opcional; cada actividad también puede participar en varios hitos. Las actividades y el hito conservan su nombre, responsable y fechas propios. Revisión y administración muestran todos los nombres vinculados.

El criterio del equipo trata estos hitos como resultados de cierre: no pueden finalizar antes de la última actividad relacionada ni comenzar antes del inicio más temprano de las relacionadas. Pueden finalizar después de ellas. Se mantienen las validaciones de fechas no pasadas y fin posterior o igual al inicio. Al quitar una actividad del formulario, se elimina su vínculo y se reajustan las referencias; el hito y sus otras actividades no se eliminan. Los cambios se persisten al pulsar **Guardar planificación**.

Para actualizar otra instalación V2, primero respalda su base siguiendo [Migraciones](infra/postgres-v2/MIGRACIONES.md). Desde `backend/`, con PostgreSQL iniciado:

```powershell
pnpm run build
node scripts/migrate.mjs up
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
pnpm run dev
```

Una instalación nueva ya ejecuta `migrate.mjs up` en la sección 3. No restaura nuevamente el SQL ni borra el volumen de una instalación existente. El corte inicial de hitos tenía cuatro migraciones; la instalación vigente debe mostrar siete y `pending: false` (sección 21). El frontend se inicia desde la raíz con `bun run dev`.

`MilestoneActivities1791849600000` crea `brotar_extension.milestone_activity`, copia los vínculos anteriores y concede acceso limitado a `brotar_app`. El archivo oficial y sus 59 tablas públicas se conservan. Las claves foráneas, la clave primaria y un trigger impiden vínculos inexistentes, repetidos o entre campañas distintas. La API utiliza `activityIndexes: number[]`, no el campo singular anterior, y guarda el bloque en una transacción bajo el bloqueo de campaña existente. No se concede ningún rol nuevo a personas.

La migración puede reaplicarse en una copia restaurada sin duplicar ni borrar vínculos. Su `down` se rechaza: volver al modelo singular automáticamente perdería información. Los hitos anteriores conservan su actividad vinculada, aunque sus fechas pueden necesitar corrección para cumplir el criterio de cierre antes de un nuevo envío/aprobación.

El frontend reconoce el formato singular retenido en una pantalla antigua y lo convierte al arreglo al mostrar/guardar. Guarda los formularios antes de actualizar el código o recargar el navegador: ese soporte no sustituye la persistencia de cambios aún no guardados.

**Verificación del incremento:** 154 casos frontend, 136 backend, 8 ADMIN local y 19 integraciones PostgreSQL: **317 aprobados**. Lint, tipos y compilaciones aprobaron. La integración comprueba dos actividades por hito, listas inválidas sin pérdida de lo guardado, conservación del otro vínculo al quitar una actividad, reinicio de API, revisión y publicación. El ensayo de migración usa una base aislada con un vínculo antiguo, conserva ese dato y mantiene el inventario oficial. Este corte no reinició PostgreSQL (`DB_TEST_RESTART=false`). La compatibilidad de estado anterior tiene una regresión automatizada; la pantalla de un borrador guardado volvió a abrirse, sin editar sus datos durante la inspección visual.

## 20. Nombres e identificación de campañas · política vigente 15/10/2026

La aclaración de Heriberto del 14/10, compartida por Santiago el 15/10 y autorizada por Ricardo, sustituye los bloqueos semánticos ensayados previamente:

- **El nombre no es único.** Se pueden guardar, enviar, aprobar y publicar campañas con nombres iguales o parecidos, incluso con contenido coincidente. El resto de validaciones y permisos sigue siendo obligatorio.
- **UUID y slug sí son únicos.** PostgreSQL conserva la clave primaria y el índice único de slug. El slug estable `camp-<UUID>` no depende del título; cambiar el nombre no cambia la identidad técnica ni los enlaces.
- **Semejanzas solo orientativas.** La comparación de ubicación, historia, presupuesto y cronograma informa al administrador. `COPY` es un código interno de coincidencia fuerte, no prueba de fraude ni prohibición; `POSSIBLE` expresa una semejanza parcial. No hay porcentajes de certeza.
- ADMIN puede solicitar cambios con motivo si hay confusión, o aprobar/publicar sin una casilla, token ni justificación adicional obligatorios. Se registra en auditoría la evidencia actual disponible y la operación. Un comentario del contrato anterior sigue siendo opcional y se valida si se proporciona; una evidencia antigua no veta la decisión.
- El creador solo recibe un aviso general, nunca títulos, IDs o contenido privado de otras cuentas.
- Se retiraron el formulario y las rutas experimentales `/api/campaigns/drafts/:id/identity`, la reserva de etapa en admisión y el bloqueo global que la acompañaba. No se borraron datos, tablas, migraciones ni auditorías anteriores. Una declaración histórica existente puede consultarse en el detalle ADMIN, sin bloquear campañas nuevas o antiguas.
- Evitar que **un mismo reintento técnico** cree dos borradores sigue siendo distinto de prohibir dos campañas intencionales: se mantiene `Idempotency-Key` UUID v4 por actor y datos, así como la cuota compartida creación/envío de 20/minuto por cuenta e IP.

Los métodos comparativos son heurísticos, no identidad real verificada ni un sistema antifraude infalible. No se impide automáticamente financiar dos veces una causa: esa prohibición requeriría una política de negocio explícita, diferente de la unicidad técnica aquí acordada.

### Prueba de aceptación de la aclaración

1. A crea una campaña completa, la envía y ADMIN la aprueba/publica.
2. B crea otra con **el mismo nombre y contenido**, completa sus secciones y la envía. Debe admitirse; el aviso no se convierte en faltante.
3. ADMIN consulta coincidencias, UUID y slug. Puede solicitar ajustes o aprobar y publicar normalmente.
4. Los dos enlaces e identificadores deben ser distintos. La base rechaza reutilizar el slug exacto.
5. Dos campañas equivalentes pueden enviarse simultáneamente. Repetir la misma solicitud con la misma clave de idempotencia devuelve el mismo borrador, no crea otro.

Los antiguos guiones de bloqueo del 13–15/10 fueron sustituidos por este comportamiento. Los informes docentes conservan su fecha de corte; no usarlos como instrucciones actuales de un bloqueo eliminado.

## 21. Preparación y verificación del cierre local · 15/10/2026

### Actualizar una V2 existente

Con los formularios guardados, la API detenida y PostgreSQL saludable, respalda según [Migraciones](infra/postgres-v2/MIGRACIONES.md). Desde `backend/`:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run check
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
corepack pnpm run dev
```

Ejecuta en orden y detente ante cualquier error. Deben quedar **siete migraciones aplicadas, ninguna pendiente**. En otra terminal, raíz: `bun install --frozen-lockfile` y `bun run dev`. Para una instalación nueva sigue íntegramente la sección 3: primero SQL oficial, después compilación/migraciones, permisos y activación. No copies archivos privados ni restaures de nuevo el SQL sobre una base poblada.

Las categorías provisionales se insertan mediante migración en PostgreSQL y se consultan por API, sin una lista alternativa hardcodeada en frontend. La repetición no sobrescribe categorías modificadas ni reactiva las deshabilitadas deliberadamente. Si todas fueron deshabilitadas, el aviso de configuración es correcto.

### Cambios conservados

Registro con correo primero y disponibilidad al salir; teléfono separado en país/prefijo y número nacional, con Bolivia (+591) claro; áreas de texto y mensajes consistentes. El retorno desde General/Historia incompletas ofrece descarte explícito de esa sección sin perder el resto. El avance sigue validando el paso actual.

Se mantienen Ñ/Unicode, contraseñas exactas, mínimos/máximos, fechas reales no pasadas, porcentajes 0–100, enteros cuando corresponden, cálculo monetario, coherencia presupuesto/meta, modalidades, stock/entrega, hitos con varias actividades, propiedad, roles, sesiones, origen y archivos privados. No se rebaja la seguridad al retirar una regla de negocio de duplicidad.

### Verificación de este corte

**338 casos aprobados, sin fallos ni omisiones: 162 frontend, 147 backend, 8 ADMIN local y 21 integraciones PostgreSQL.** Lint, tipos y compilación aprobaron; los 298 archivos de código/pruebas/scripts comparados coinciden por hash con la copia aislada ensayada. El caso de escritura del endpoint experimental retirado se sustituyó por comprobaciones de compatibilidad/lectura y rutas ausentes; no comparar el total con los 339 del ensayo anterior como si la política fuera idéntica.

El recorrido real de integración cubre creación y guardado de secciones, retorno tras login, portada, roles/propiedad, porcentajes/fechas/importes, reintentos y cuotas entre dos API, envío, correcciones/reenvío, aprobación privada, publicación/rechazo y consulta pública. Dos campañas con el mismo nombre y contenido se envían/publican sin justificación adicional; UUID/slug distintos y el índice único rechaza un slug repetido. La recuperación de acceso comprueba caducidad, un solo uso y revocación de sesiones; su fixture vencido usa el reloj de PostgreSQL en vez de depender de un plazo de un segundo. La prueba de semejanzas ya no presupone un orden de UUID aleatorios.

La copia nueva completó instalación con lockfiles → SQL oficial → siete migraciones → permisos → verificación → activación. API y proxy devolvieron readiness 200 con base conectada; el registro nuevo se renderizó sin errores de consola. Se conserva el aviso de error deliberado del test que rechaza una base sin tablas: el resultado final de la suite es 21/21, no una migración fallida de la instalación. No se reinició PostgreSQL durante esta suite (DB_TEST_RESTART=false).

Una copia nueva del código local, sin `.env`, dependencias ni volumen previo, se prepara en el proyecto Docker `brotar-s2-alineado-20261015`, puerto `15440`. No es un clon remoto de cambios aún sin publicar. La instalación normal sigue en `15433/3000/5173`. Las pruebas con escritura se ejecutan únicamente en la copia aislada y limpian sus fixtures.

La recuperación conserva el historial de migraciones restaurado; `corepack pnpm run drill:recovery` comprueba una base desechable, no borra el volumen original. Las migraciones de la extensión experimental se retienen para no perder datos ni romper instalaciones anteriores, aunque sus controles de admisión se retiraron.

Permanece un aviso de tamaño del paquete frontend mayor a 500 kB antes de gzip. El arranque local de Docker puede requerir resolver sockets temporales inaccesibles de Windows: no se soluciona borrando bases ni haciendo Factory Reset. No se garantiza cero defectos ni capacidad de producción por pasar pruebas locales.

**Corte histórico del 15/10:** estas comprobaciones precedieron a la publicación de este incremento. La [entrega del 16/10](docs/entrega-dev-2026-10-16.md) registra las comprobaciones para compartirlo. La aceptación externa no la sustituye una suite verde.

## 22. Sprint 2 frente al proyecto completo

La guía general `docs/requisitos/Guia_Contexto_y_Alcance_MVP_Crowdfunding.pdf` abarca el ciclo descubrir → verificar → aportar → ejecutar → rendir cuentas. No define que todo ese ciclo deba terminar en el Sprint 2.

El documento específico `docs/requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf` delimita esta entrega a campañas: creación progresiva, guardado/continuación, consulta y descarte de borradores propios, historia/impacto, plan/presupuesto/riesgos, financiamiento, recompensas condicionales, envío/correcciones, revisión/aprobación/rechazo y exploración pública real. Excluye explícitamente aportes, checkout, pagos, desembolsos, devoluciones, finanzas/conciliación, KYC/KYB y rendición.

Para completar el **MVP general**, además de lo anterior, hacen falta:

1. Identidad verificada KYC y organizaciones KYB, documentos privados, destino de fondos, niveles de confianza explicados y responsables de revisión.
2. Aporte por donación/recompensa/preventa, checkout con condiciones y desglose, cupos y pagos con estados confirmados/pendientes/fallidos/expirados; solo lo confirmado suma recaudación y los reintentos no duplican operaciones.
3. Panel del patrocinador, favoritos/seguimiento, historial, detalle/comprobante, novedades y consulta de incidencias.
4. Operación financiera: conciliación, desembolsos, devoluciones y disputas con autorizaciones, referencias e historial.
5. Ejecución: avances reales de actividades/hitos, responsables, evidencias y actualizaciones. Rendición presupuesto frente a gasto real, saldo, resultados/indicadores y cierre.
6. Administración por permisos: revisión, Compliance, Finanzas, Soporte, configuración y auditoría de solo lectura; no confundir el ADMIN provisional del Sprint 2 con todos esos roles separados.
7. Completar multimedia adicional, avisos legales/correo operativo y reglas de negocio pendientes antes de declarar operación definitiva.

Los tres documentos de pantallas describen **9 públicas + 10 de creador + 11 de patrocinador/administración**, con variantes de carga/vacío/error, no treinta historias nuevas ni treinta pantallas pendientes. Su contexto inicial era prototipado Figma: el documento de patrocinador pide pago simulado, no pasarela real. La guía general incorpora operación financiera conceptual; proveedor, custodia, comisiones y reglas definitivas requieren acuerdo antes de integrar dinero real.

No forman parte del MVP: equity/préstamos/retorno financiero, tokenización/criptomoneda/billetera, apps nativas, IA predictiva/reputación de estrellas ni logística completa de envío de recompensas. Las menciones antiguas a datos de entrega en checkout no deben convertirse sin acuerdo en gestión de transportistas o paquetes.

**Conclusión de alcance:** un Sprint 2 técnicamente comprobado no significa MVP completo, KYC aprobado ni sistema financiero listo para operar.

## 23. Comprobación de entrega · 16/10/2026

El [registro de esta entrega](docs/entrega-dev-2026-10-16.md) documenta una instalación nueva aislada con lockfiles congelados, SQL oficial, siete migraciones, categorías automáticas y activación, más la repetición segura de instalación/migraciones/activación conservando datos y sesión. Pasaron **338 casos** (162 frontend, 147 backend, 8 ADMIN local y 21 integraciones PostgreSQL), esta vez con reinicio real del contenedor de ensayo. También se comprobaron registro, login, categorías y logout por el proxy, readiness 200 y recuperación aislada del respaldo.

Se corrigió una prueba que asumía el nombre del contenedor original: ahora verifica el proyecto configurado en cada copia sin quitar sus controles de aislamiento. No hace falta cambiar puertos ni nombres en los tests para instalar en otra computadora. El entorno normal sigue siendo `15433/3000/5173`.

Para instalar desde cero, seguir la sección 3 completa; para actualizar, conservar cambios propios y seguir las secciones 4 y 21 y [CONTRIBUTING](CONTRIBUTING.md). No restaurar SQL, borrar volúmenes, copiar `.env` ajenos ni forzar un pull. Un pull divergente requiere integrar los commits; no puede prometerse ausencia de conflictos futuros entre ramas con cambios diferentes.

## 24. Inicio de Sprint 3 · RicardoDev · 19/10/2026

Este incremento sigue local y las tres tareas permanecen **en curso**. Ver [alcance y evidencia](docs/avance-ricardo-sprint-3-2026-10-19.md) y [contratos 0.1](docs/contratos-sprint-3.md). No modificar DEV/main ni conceder roles nuevos automáticamente para probarlo.

El catálogo provisional de permisos ahora distingue revisión, publicación, Finanzas, Soporte y auditoría. Las vistas consultan `/api/access/permissions`; la API aplica permisos vigentes y mantiene al auditor en lectura incluso si acumula ADMIN. Revisión permite REVIEWER, publicación continúa reservada a ADMIN y separada de aprobar. La matriz definitiva D06 y la integración de los módulos futuros siguen pendientes.

Para una **V2 ya instalada**, primero detener la API y guardar un respaldo completo, fuera del repositorio. Desde `backend/`, con el contenedor saludable:

```powershell
$backupName='brotar-pre-s3-{0}.dump' -f ([Guid]::NewGuid().ToString('N'))
$backupDirectory=Join-Path $env:LOCALAPPDATA 'Brotar-private/backups'
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$containerBackup='/tmp/'+$backupName
$localBackup=Join-Path $backupDirectory $backupName
docker compose --env-file ../infra/postgres-v2/.env -f ../infra/postgres-v2/compose.yaml exec -T postgres pg_dump -U postgres -Fc -f $containerBackup brotar_db
if ($LASTEXITCODE -ne 0) { throw 'No se creó el respaldo; no continuar.' }
docker compose --env-file ../infra/postgres-v2/.env -f ../infra/postgres-v2/compose.yaml cp "postgres:$containerBackup" $localBackup
if ($LASTEXITCODE -ne 0) { throw 'No se copió el respaldo; no continuar.' }
```

El archivo lleva datos privados: no subirlo a Git/Trello ni compartirlo. Después, sin repetir la restauración SQL:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run check
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
corepack pnpm run dev
```

Debe mostrar nueve migraciones y `pending:false`. Si ya existían referencias de pago repetidas para el mismo proveedor, la novena migración se detiene sin borrar pagos: requiere diagnóstico, no quitar el índice. Una instalación nueva sigue la sección 3 con el compilado actual y aplica las nueve automáticamente. La API no anuncia readiness para el nuevo incremento si faltan sus objetos. Reiniciar frontend desde la raíz con `bun run dev`; no copiar los puertos ni credenciales de la copia de ensayo.

Después de migrar, `corepack pnpm run drill:recovery` ensaya la restauración del estado actualizado en otra base. El script actual compara también permisos e historial: no usar ese ensayo como reemplazo del respaldo previo sobre una base que aún tenga migraciones de catálogos/permisos pendientes.

El núcleo de aportes está disponible solo para integración interna de servidor y pruebas sandbox. `GET /api/contributions/:id` permite consultar el aporte propio, con importes decimales en cadenas y sin payloads privados. No existen POST públicos de creación o confirmación: completar checkout, verificar callbacks del proveedor, conciliar pagos tardíos y cumplir las verificaciones aplicables es trabajo pendiente antes de exponerlos. Un evento sintético de prueba no acredita un cobro externo.
