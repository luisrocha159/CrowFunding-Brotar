# Brotar API · base de desarrollo

Backend independiente: **NestJS 12 + TypeScript + pnpm 11.19.0**, ejecutado en Node.js 24 (>=24.13.0). El frontend permanece en la raíz del repositorio y usa Bun. No hay workspace común ni lockfiles mezclados.

## Estado de este incremento

- E01: servidor, configuración, separación del frontend, validación HTTP, pruebas y documentación.
- E02: TypeORM 0.3.31 y `pg` 8.23.0 conectados a PostgreSQL 18.6 real. Restauración, mapeo de usuarios/perfiles, permisos limitados, lectura/escritura, rollback y persistencia después de reiniciar el contenedor verificados el 16/09/2026.
- E03/E04: `POST /api/auth/register` implementado y conectado a `/registro`. Persiste usuario y perfil juntos, con hash de contraseña, validaciones, duplicados y límite inicial de solicitudes. La cuenta conserva estado pendiente de verificación. Ver [contrato y evidencias](../docs/integracion-e03-e04.md).
- E05: login/logout y consulta autenticada de datos propios implementados con sesiones revocables en `user_token`. La política vigente [ADR-002](../docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md) permite acceso básico a `ACTIVE` y `PENDING_VERIFICATION`, sin cambiar su estado ni verificarlas. Ver [guía histórica de sesiones](../docs/integracion-e05-sesiones.md).
- E06: base oficial provisional nueva adoptada en **15433**, conservando la antigua sin trasladar datos. `GET/PATCH /api/profile` y edición de datos propios en `/mi-cuenta`. Ver [guía vigente V2](../infra/postgres-v2/README.md) y [evidencias E06](../docs/integracion-e06-base-v2-perfil.md).
- E07: roles básicos y registro de organizaciones conectados. Usuario registrado se asigna al registrar la cuenta, sin activarla; organizaciones se crean como DRAFT con membresía propia. Ver [contratos y pruebas E07](../docs/integracion-e07-roles-organizaciones.md). Si V2 ya existía, ejecutar `../infra/postgres-v2/grant-e07.ps1` desde esta carpeta antes de arrancar.
- Entrega: consultar el [README principal](../README.md) y el [informe vigente](../docs/entrega-integracion-2026-09-17.md) para publicación, pruebas y revisión del equipo. Verificación/recuperación real y reglas de operaciones futuras permanecen fuera de esta implementación. No se envían correos de verificación ni se aceptan términos legales definitivos. El acceso básico ya no requiere activación.
- `GET /api/health/live` solo verifica que la API responde, **no** la disponibilidad de PostgreSQL.
- `GET /api/health/ready` devuelve 503 sin base conectada o sin las tablas base; devuelve 200 al comprobar conexión y existencia de las tablas requeridas. No acredita todos los módulos ni permisos.

## Instalar y abrir

Instala Node.js 24 y pnpm 11.19.0 siguiendo la [documentación oficial de pnpm](https://pnpm.io/installation). Desde la raíz del repositorio:

```sh
cd backend
pnpm --version
pnpm install --frozen-lockfile
pnpm run dev
```

Abre <http://127.0.0.1:3000/api/health/live>. La respuesta esperada es `{"status":"ok","service":"brotar-api"}`. `Ctrl+C` detiene el servidor. El modo `dev` recompila los cambios de TypeScript.

No es necesario un `.env` para probar esta base: por defecto escucha solo en `127.0.0.1:3000`. Para personalizarla, copia `.env.example` a `.env` dentro de `backend` y ajusta sus valores. No sobreescribas un `.env` existente y no lo subas a Git.

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | `development`, `test` o `production` |
| `HOST` | Dirección de escucha; local por defecto |
| `PORT` | Puerto de la API, 3000 por defecto |
| `CORS_ORIGINS` | Orígenes exactos del frontend separados por coma, sin `/` final |
| `DATABASE_ENABLED` | `false` por defecto; `true` activa TypeORM |
| `DB_HOST`, `DB_PORT` | PostgreSQL; la instalación vigente V2 configura **127.0.0.1:15433**; la anterior usaba 15432 |
| `DB_NAME`, `DB_USER` | `brotar_db` y un rol limitado (`brotar_app`), nunca `postgres` |
| `DB_PASSWORD` | Contraseña local del rol, mínimo 16 caracteres; nunca en Git |
| `DB_SSL` | TLS con validación de certificado; obligatorio fuera del equipo local y en producción |

CORS está preparado para Vite en `127.0.0.1:5173` y `localhost:5173`, con credenciales y orígenes explícitos. Login/logout requieren también `X-Brotar-Request: 1` y origen permitido. La cookie es HttpOnly/SameSite Strict, Secure en producción. CORS no reemplaza autenticación ni autorización. Para preview añade su origen exacto a la configuración y reinicia la API.

En otra terminal, desde la raíz, `bun run dev` abre el frontend en <http://127.0.0.1:5173/>. Ambos procesos arrancan por separado; Vite reenvía `/api` a `127.0.0.1:3000`. Registro, login, consulta de sesión y logout ya utilizan esta conexión.

## Comprobar y ejecutar compilado

```sh
pnpm run check
pnpm run start
```

`check` ejecuta ESLint, tipado de código y pruebas, tests HTTP reales sobre un puerto local temporal y compilación. `start` requiere haber ejecutado `build` o `check`. Las pruebas no usan cuentas, red externa ni una base de datos. Las rutas `test-only` existen exclusivamente en el módulo de pruebas.

## Estructura y reglas

```text
src/
  app.module.ts
  main.ts
  config/                         # Validación del entorno
  health/
    health.module.ts
    infrastructure/               # Endpoint de vida del servidor
  users/application/               # Caso de uso de registro y puertos
  users/infrastructure/            # DTO/controlador, hash y repositorio transaccional
  shared/infrastructure/database/  # TypeORM, conexión y comprobación
  shared/infrastructure/http/      # Validación, errores y configuración HTTP
```

Registro, sesiones (`auth`), perfiles (`profiles`), roles (`roles`) y organizaciones (`organizations`) separan modelos/reglas puras en Domain, casos de uso y puertos en Application, y adaptadores en Infrastructure. Domain y Application no importan NestJS, SQL ni ORM; una prueba comprueba esa frontera. DTOs HTTP y decoradores de validación pertenecen a Infrastructure.

El responsable de esta implementación eligió **TypeORM** el 16/09/2026. Esa elección local no se presenta como aprobación común de coordinación. D01 mantiene pendientes los acuerdos aplicables, no la prueba local de conexión. No se habilita sincronización automática, borrado de esquema, migraciones automáticas ni creación automática de extensiones. Ver [ADR-001](../docs/decisiones/ADR-001-typeorm.md) y [preparación de PostgreSQL](../infra/postgres/README.md).

## Activar PostgreSQL y probar persistencia

Después de restaurar y crear el usuario limitado según la guía de PostgreSQL, configura `.env` con `DATABASE_ENABLED=true` y los datos de conexión. Reinicia la API. Si la conexión inicial falla, el proceso conserva `/health/live`, pero `/health/ready` devuelve 503; corrige la configuración/base y reinicia para reintentar la inicialización.

La prueba real está separada de los tests sin base. En PowerShell, dentro de `backend`:

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
try { pnpm run test:integration }
finally { Remove-Item Env:\ALLOW_DB_TEST_WRITES }
```

Solo admite una base local de desarrollo y un usuario sin privilegios administrativos. Comprueba las columnas mapeadas, una transacción de usuario/perfil, lectura tras cerrar y abrir conexión, actualización y rollback. Crea dos filas con un UUID propio y correo `example.invalid`, y las elimina al finalizar; nunca limpia tablas completas. No ejecutarla sobre datos de producción. Si el proceso se interrumpe abruptamente, podría quedar su cuenta de prueba pendiente de limpieza manual.

Esta prueba pasó contra PostgreSQL real. Para comprobar además conservación de datos tras **reiniciar solo el contenedor de Brotar**, ejecuta desde `backend` (interrumpe brevemente las conexiones locales a Brotar):

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='true'
try { pnpm run test:integration }
finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

Antes del reinicio se comprueba el proyecto Compose `brotar-provisional-v2` y puerto local. No reinicia Docker Desktop, otros contenedores ni borra volúmenes. Las credenciales de aplicación no permiten crear objetos del esquema ni modificar roles u organizaciones existentes; sí insertar organizaciones y membresías. La suite ejecuta cinco pruebas secuenciales: persistencia/mapeo, registro HTTP, sesiones, perfil y roles/organizaciones. Incluye reinicio de la API y aislamiento entre cuentas temporales propias. E07 usa administración local solo para preparar y limpiar sus propios fixtures; no modifica cuentas preexistentes.

Los errores HTTP inesperados se devuelven sin detalles internos. No registrar contraseñas, tokens, cuerpos de acceso o errores SQL con datos personales. Esta preparación no equivale a una revisión de seguridad de un sistema autenticado.

## Problemas habituales

- Puerto 3000 ocupado: configura otro `PORT` en `.env`; no detengas procesos ajenos.
- Arranque fallido: comprueba nombres y formato de variables y disponibilidad del puerto.
- `pnpm` no se reconoce: instálalo y abre otra terminal. No sustituyas pnpm por Bun dentro de esta carpeta.
- PostgreSQL no responde: no afecta a `/health/live` en E01; no interpretes su 200 como conexión comprobada.

Referencias técnicas: [NestJS](https://docs.nestjs.com/first-steps), [validación](https://docs.nestjs.com/techniques/validation), [base de datos](https://docs.nestjs.com/techniques/database). Stack del proyecto: `docs/requisitos/Brotar_Definicion_Stack_Tecnologico_y_Arquitectura (1).pdf`.
