# E03/E04 · Registro conectado · 16/09/2026

**Corte histórico:** el incremento posterior [E05](integracion-e05-sesiones.md) ya implementa sesiones reales y consulta propia. Las referencias siguientes a login pendiente describen el momento de finalizar E03/E04.

La política vigente [ADR-002](decisiones/ADR-002-acceso-basico-sin-verificacion.md) permite iniciar sesión con la cuenta recién registrada sin cambiar `PENDING_VERIFICATION` ni marcar verificaciones como completadas.

## Resultado y alcance

`/registro` dejó de simular respuestas: envía `POST /api/auth/register` a NestJS mediante el proxy `/api` de Vite. La API persiste usuario y perfil con TypeORM en la misma transacción sobre `brotar_db`. El frontend público conserva sus datos simulados; inicio de sesión y recuperación siguen siendo demostraciones explícitas.

Esto es un incremento de E03/E04, **no el cierre de toda la entrega integrada**. No implementa todavía sesión, consulta/edición de perfil autenticado, roles, organizaciones, verificación por correo ni recuperación real. No se modificaron los documentos generales del backlog ni las tarjetas de Trello; no se hizo commit ni push.

## Contrato de registro

| Campo | Regla del servidor |
| --- | --- |
| `firstName`, `lastName` | Texto recortado, 1–120 caracteres |
| `email` | Correo válido, hasta 254 caracteres; normalizado a minúsculas |
| `password` | 15–128 caracteres; sin recortar ni normalizar |
| `demoConsent` | Debe ser `true`: reconoce la persistencia en el entorno de pruebas |
| `phoneCountryCode`, `phoneNumber` | Opcionales, pero deben enviarse juntos; prefijo `+` y 1–5 dígitos (primero no cero), número de 4–30 dígitos |

El servidor rechaza campos extra, entre ellos rol, estado, verificación de correo y contraseña preprocesada. La confirmación de contraseña se compara en la interfaz y no se envía. Los teléfonos se almacenan sin declararlos verificados.

Respuesta 201: únicamente `{ id, status: "PENDING_VERIFICATION" }`. Respuestas relevantes: 400 datos inválidos, 409 conflicto de correo/teléfono, 429 límite temporal y 503 indisponibilidad conocida. Los errores inesperados no exponen SQL, credenciales ni detalles internos. Un fallo de red o respuesta incierta se muestra como falta de confirmación, no como prueba de que nada se guardó. No hay reintentos automáticos ni éxito simulado como alternativa.

## Persistencia y decisiones pendientes

- Se mantienen las tablas existentes y su estado por defecto `PENDING_VERIFICATION`. No se cambió el esquema, no se crearon migraciones y no se modificaron datos iniciales del backup.
- `email_verified_at` queda vacío. No se envía correo, no se crea sesión ni se asignan roles. La elección de perfil de las rutas históricas no concede permisos.
- El texto legal definitivo sigue pendiente. La interfaz explica la persistencia de prueba; **no** se rellena `accepted_terms_at` como si existiera una aceptación legal definitiva.
- Los límites de teléfono son de formato para esta etapa, no una validación de que el número pertenezca al usuario ni de todos los planes de numeración.
- La política de activación de cuentas para E05 debe quedar explícita antes de implementar el acceso. No activar usuarios silenciosamente ni conceder roles elevados desde el formulario.

## Protección técnica inicial

Contraseñas almacenadas con scrypt asíncrono de Node, sal aleatoria individual y formato versionable que incluye los parámetros `N=16384, r=8, p=5`. No se almacenan en claro ni se devuelven en la API. Esta combinación está entre las opciones publicadas por [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt); se usa la [API criptográfica de Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) sin añadir dependencias nativas. La regla de 15–128 caracteres es una configuración técnica inicial, no una decisión funcional global aprobada por coordinación.

Límite en memoria de 20 solicitudes/minuto por IP, máximo 256 grupos activos y dos operaciones de hash simultáneas. Se responde 429/503 sin encolar trabajo ilimitado. La API no confía en cabeceras de IP proporcionadas por clientes. Con el proxy local de Vite, las solicitudes comparten la IP local. Esto es una protección inicial para una instancia, no un control distribuido de producción.

Antes de publicar un servicio real faltan revisión de seguridad, HTTPS, política de cuentas/roles, textos legales, controles de abuso adecuados al despliegue y estrategia completa de sesión/verificación. No se presenta esta etapa como lista para producción.

## Cómo abrirlo

Desde la raíz, si ya restauraste y configuraste E02:

```powershell
docker compose --env-file infra/postgres/.env -f infra/postgres/compose.yaml start
```

En una terminal, dentro de `backend`:

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

En otra terminal, desde la raíz:

```powershell
bun install --frozen-lockfile
bun run dev
```

Abre <http://127.0.0.1:5173/registro>. Usa datos ficticios y una contraseña exclusiva de esta prueba. El éxito debe indicar cuenta guardada y pendiente de verificación. No permite iniciar una sesión real aún.

Vite y `bun run preview` reenvían `/api` a `http://127.0.0.1:3000`. Si cambias el puerto de NestJS, configura `BACKEND_URL` en un `.env.local` en la raíz y reinicia Vite. Esta variable configura el servidor de desarrollo, no contiene credenciales y no se expone como `VITE_*`. Para alojamiento estático/producción se deberá configurar el encaminamiento de `/api` en el servidor; el build por sí solo no incluye una API.

## Verificaciones realizadas

- Backend: lint, tipos, build y **33 pruebas** sin base.
- PostgreSQL real: **2 pruebas de integración**, ejecutadas en secuencia. La primera verifica persistencia tras reinicio; la segunda valida registro HTTP, usuario/perfil, estado pendiente, hash no expuesto, correo sin distinguir mayúsculas, teléfono, solicitudes duplicadas concurrentes y rollback cuando falla el perfil.
- Frontend: lint, tipos, build y **54 pruebas**, incluidas validación y contrato del cliente HTTP; ningún fallo se transforma en éxito simulado.
- Proxy Vite: `/api/health/ready` devuelve conexión correcta y el registro vacío recibe 400 desde la API.
- Navegador: formulario visible, avisos de persistencia real, validación de campos vacíos y foco en el primer error comprobados. No se creó una cuenta adicional desde el navegador; el guardado real se probó mediante HTTP en la suite de integración.
- Las pruebas crean correos únicos `@example.invalid` y limpian exclusivamente sus propias filas. Se comprobó que no quedaron sus cuentas temporales.

Las instrucciones de ejecución de integración están en [backend/README.md](../backend/README.md). Las pruebas escriben solo con `ALLOW_DB_TEST_WRITES=true`; el reinicio del contenedor requiere además `DB_TEST_RESTART=true`.
