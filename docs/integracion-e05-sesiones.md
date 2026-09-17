# E05 · Sesiones reales y acceso privado · 16/09/2026

> Corte histórico: la restricción ACTIVE-only y el bloqueo del primer login descritos abajo fueron sustituidos por [ADR-002](decisiones/ADR-002-acceso-basico-sin-verificacion.md). Hoy las cuentas pendientes pueden acceder a perfil y organizaciones en borrador sin activarse ni verificarse.

## Resultado

Inicio y cierre de sesión reales, consulta autenticada de datos básicos y página privada `/mi-cuenta`. Las campañas públicas y la recuperación de contraseña continúan simuladas. La edición de perfil, los roles y las organizaciones se implementarán posteriormente.

Se mantiene React/TypeScript/Bun y NestJS/TypeScript/pnpm, con casos de uso y puertos independientes del ORM. Se volvió a revisar el [documento de arquitectura oficial](requisitos/Brotar_Definicion_Stack_Tecnologico_y_Arquitectura%20(1).pdf): no establece JWT como requisito. Se elige una sesión opaca revocable sobre la tabla `user_token` ya suministrada; no se añaden tablas ni tecnologías de infraestructura.

## Activación: verificación pendiente

El responsable confirmó en esta conversación que **los líderes todavía no definieron si las cuentas nuevas pueden entrar inmediatamente o requieren activación/verificación**. Por eso:

- El registro conserva `PENDING_VERIFICATION` y no marca el correo como verificado.
- Solo una cuenta `ACTIVE`, no eliminada y sin bloqueo vigente puede iniciar o mantener una sesión.
- No hay endpoint público para activar cuentas ni conceder roles.
- No se activó ningún usuario inicial del backup. Las cuentas activas de las pruebas son filas temporales propias, creadas y eliminadas por cada ejecución.
- Un registro nuevo no puede completar todavía el recorrido registro → login. Esa habilitación queda pendiente de confirmación funcional, no se disimula con acceso simulado.

La comprobación de `ACTIVE` no significa que se haya verificado un correo: no se modifica `email_verified_at`. No se debe introducir una migración que active usuarios en bloque para demostrar este flujo.

## Contratos implementados

| Ruta | Entrada / salida | Condición |
| --- | --- | --- |
| `POST /api/auth/login` | `{ email, password }` → `{ status: "authenticated" }` y cookie | Contraseña válida y cuenta habilitada |
| `GET /api/auth/me` | Datos propios: id, correo, nombre, apellido, estado | Cookie válida y sesión vigente en base |
| `POST /api/auth/logout` | HTTP 204, revoca sesión y elimina cookie | Origen/cabecera permitidos; idempotente |
| `/mi-cuenta` | Interfaz de consulta y botón de salida | Redirige al acceso si la API devuelve 401 |

Las contraseñas no se recortan. Un correo inexistente o una contraseña incorrecta producen el mismo 401; una contraseña correcta en una cuenta pendiente/bloqueada recibe 403. No se devuelven hash, token, fila completa del usuario ni datos de otras cuentas. La API determina la identidad por sesión, no por un id suministrado en la URL.

Los hashes compatibles son los scrypt versionados que genera este backend. No se cambian contraseñas ni hashes del backup; otros formatos producen credenciales inválidas hasta acordar una migración/compatibilidad explícita. No se conocen ni publican contraseñas de usuarios del backup.

## Manejo de sesión

- Token aleatorio de 32 bytes; PostgreSQL guarda únicamente su SHA-256 en `user_token.token_hash`, con tipo `SESSION` y vencimiento absoluto de una hora.
- Cookie `brotar_session`: `HttpOnly`, `SameSite=Strict`, ruta `/api`, sin `Domain`; `Secure` cuando `NODE_ENV=production`. HTTP sin Secure se usa exclusivamente para el desarrollo local.
- El token no se devuelve en JSON, no se guarda en localStorage/sessionStorage ni se incluye en URL. Se consulta el estado del servidor al entrar, al recuperar foco y cada minuto con la página privada visible.
- Al entrar nuevamente, se genera otro token y se revoca la sesión anterior presentada por ese navegador. Al salir se revoca en PostgreSQL, no solo se borra la cookie.
- Sesiones caducadas, revocadas, consumidas, de otro tipo o de usuarios no habilitados no permiten consultar `/me`.
- La sesión sobrevive al reinicio de la API porque su estado está en PostgreSQL. No es una sesión permanente: su vencimiento se mantiene.

La elección de cookie y token opaco sigue los criterios de [OWASP sobre sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Se mantiene una implementación inicial de una instancia; falta definir caducidad por inactividad, cierre global de dispositivos y políticas finales antes de un despliegue real.

## Protección inicial de solicitudes

Login y logout requieren `X-Brotar-Request: 1`; si se incluye `Origin`, debe estar en la lista exacta de orígenes configurados. Se rechaza `Sec-Fetch-Site: cross-site`. Las peticiones POST del cliente incluyen esa cabecera y usan cookies same-origin a través del proxy de Vite. CORS permite credenciales únicamente para los orígenes explícitos, nunca `*`.

Esta combinación de cabecera no simple, validación de origen y SameSite reduce solicitudes cruzadas no autorizadas, siguiendo la [guía CSRF de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). No sustituye la autenticación ni la revisión del despliegue; no se debe eliminar la validación de origen para resolver una configuración incorrecta.

Límites iniciales: 20 solicitudes de login por IP/minuto y dos operaciones criptográficas simultáneas. Cinco contraseñas incorrectas consecutivas en una cuenta generan bloqueo temporal de 15 minutos utilizando los campos existentes. Tras vencer, un intento fallido reinicia el contador; un acceso correcto lo limpia. Estos valores son parámetros técnicos iniciales, no una política definitiva aprobada por coordinación. El límite por IP está en memoria; detrás de Vite todos comparten la IP local.

## Permisos y puesta en marcha

No se cambió el esquema. Se concedieron al rol de aplicación únicamente `SELECT, INSERT, UPDATE` sobre `user_token`; los permisos de usuarios/perfiles se conservan. Las instalaciones nuevas reciben estos permisos con el aprovisionamiento existente.

Si E02 ya estaba instalado, ejecuta desde la raíz, una sola vez o al actualizar (idempotente):

```powershell
Get-Content infra/postgres/grant-session-permissions.sql -Raw | docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml exec -T postgres psql -X -U postgres -d brotar_db -v ON_ERROR_STOP=1
```

Después inicia API y frontend como indica el README. Abre <http://127.0.0.1:5173/iniciar-sesion>. Mantén el mismo host del navegador: `localhost` y `127.0.0.1` son orígenes distintos. Si usas `bun run preview`, añade su origen exacto (por ejemplo `http://127.0.0.1:4173`) a `CORS_ORIGINS` y reinicia la API; no uses comodines.

Para demostrar el flujo válido sin modificar cuentas reales, ejecuta las pruebas de integración opt-in del backend. Crean cuentas temporales exclusivamente locales con credenciales aleatorias y las eliminan al finalizar. No se distribuye una cuenta administrativa ni una contraseña de demostración fija.

## Verificación y límites

- Backend: lint, tipos, build y 39 pruebas sin base.
- Integración PostgreSQL: 3 pruebas secuenciales; cubren persistencia tras reinicio de PostgreSQL, registro HTTP y sesiones. En sesiones se comprueban credenciales incorrectas, cuenta inexistente, pendiente/suspendida/bloqueada/eliminada, cabecera/origen, cookie, hash del token, consulta propia, rotación, expiración, consumo, logout, desbloqueo por tiempo y conservación tras reiniciar la API.
- Frontend: lint, tipos, build y 56 pruebas, incluidos contratos de sesión y manejo de errores sin éxito simulado.
- Navegador: `/mi-cuenta` sin sesión redirige a login; una cuenta inexistente muestra el error real y devuelve el foco al aviso. La prueba positiva de login/logout se realizó por HTTP con una cuenta temporal, no iniciando sesión con usuarios del backup en el navegador.
- Los tests limpian sus usuarios, perfiles y tokens por las claves propias de cada ejecución. No borran tablas ni datos iniciales.

No se realizó commit, push ni cambios en Trello. No se cierra la entrega completa: quedan decisión de activación, edición de perfil, roles, organizaciones, recuperación/verificación real y aceptación del equipo.
