# Avance local E01 y E02 · 16/09/2026

**Continuación posterior:** el registro ya se conectó en el incremento [E03/E04](integracion-e03-e04.md). Este documento conserva el corte y las evidencias de E01/E02; sus referencias a formularios pendientes describen ese momento anterior.

## Estado actual: conexión E02 verificada

Docker Desktop quedó operativo y se creó exclusivamente `brotar-local-postgres-1`, PostgreSQL 18.6, publicado en `127.0.0.1:15432`, con volumen persistente `brotar-local_brotar_pgdata`. No se modificaron contenedores, bases ni volúmenes de otros proyectos. El puerto inicialmente previsto 55432 estaba reservado por Windows; se cambió la configuración de Brotar, sin alterar las reservas del sistema.

### Restauración y configuración

- Se restauró el backup provisional recibido en una base inicialmente vacía, en una sola transacción. SHA256 del original: `77E5B137276176276E51D7DE654CB03E140403E53482127C667627E4809B9C8C`.
- Se detectó una segunda dependencia omitida por el dump: `pg_trgm`, necesaria para el índice de título de campaña. El primer intento se revirtió completamente. La copia temporal de restauración ahora incorpora `citext` y `pg_trgm`; el original no se modifica.
- Inventario real verificado: 54 tablas, 5 vistas, 6 secuencias, 31 enums, 8 funciones propias, 29 triggers y 117 claves foráneas; presentes las 10 tablas base requeridas y ambas extensiones.
- `setup-local.mjs` genera contraseñas locales diferentes para administración y aplicación, sin mostrarlas y sin sobrescribir configuraciones existentes. `.env`, backup, logs privados y compilados están excluidos de Git.
- `provision-local.mjs` crea `brotar_app`, sin privilegios de administrador ni creación de objetos, con CRUD únicamente sobre usuarios/perfiles. TypeORM no sincroniza, borra ni migra el esquema automáticamente.

### Evidencias ejecutadas

- Backend: `pnpm run check`, lint, tipos, **28 pruebas** sin base y build correctos.
- Integración: **1 prueba real** con opt-in de escrituras y reinicio del contenedor. Verifica columnas de usuarios/perfiles, permisos limitados, inserción transaccional, commit, recuperación tras reinicio de PostgreSQL, comparación de correo `citext`, actualización y rollback. Limpia únicamente las filas creadas por esa ejecución.
- API NestJS con la configuración real: `/api/health/live` y `/api/health/ready` devuelven HTTP 200; readiness informa `database: connected`.
- Frontend: `bun run check`, lint, tipos, **51 pruebas** y build correctos. Formularios y acceso continúan simulados.

Esto acredita la base técnica de E02, no registro, autenticación ni módulos de negocio. El mapeo ORM cubre dos tablas, no todo el esquema del proyecto. Las decisiones de activación de cuentas y roles siguen pendientes de implementación/validación en su etapa.

### Pendiente y próximo paso

- E01: revisión del equipo y commit descriptivo; no se realizó commit ni push.
- E02: revisión de estas evidencias por el equipo antes del cierre formal. No se actualizaron tarjetas Trello en este incremento.
- E03–E09: conexión de formularios, registro real, sesión, perfil, roles, organizaciones y pruebas de aceptación. Siguiente incremento: contrato HTTP y registro de usuarios sobre esta base.
- Se conservaron las modificaciones previas de `docs/README.md` y del Word del backlog. No se regeneraron documentos generales ni se marcaron historias de negocio como terminadas.

Guías actualizadas: [backend](../backend/README.md), [PostgreSQL](../infra/postgres/README.md), [ADR-001](decisiones/ADR-001-typeorm.md).

---

## Historial: TypeORM preparado, antes de reparar Docker

**Corte anterior, superado por el estado actual de arriba.** Se conserva para distinguir lo preparado de lo que fue verificado después.

El responsable de esta implementación autorizó TypeORM. Se incorporaron TypeORM 0.3.31 y `pg` 8.23.0, un adaptador de conexión aislado en Infrastructure y el mapeo completo de columnas de `app_user` y `user_profile`. No se modifican tablas al arrancar: sincronización, borrado de esquema, migraciones automáticas y creación de extensiones están desactivados.

La comprobación actual `pnpm run check` pasó con **28 pruebas**, lint, tipos y build. También pasaron instalación con lockfile congelado y auditoría de dependencias de producción. La prueba `test:integration` se añadió y compila, pero **no se ejecutó contra PostgreSQL**. `/api/health/ready` devuelve 503 mientras no exista una conexión verificada; `/api/health/live` solo comprueba que la API esté viva.

Se confirmó que el backup usa `public.citext` sin crear la extensión. La restauración prepara una copia privada que incorpora esa dependencia; el archivo recibido no fue editado. Se comprobó la transformación en memoria y la sintaxis PowerShell, no la restauración real.

Bloqueo actual: los logs de Docker Desktop muestran un fallo al acceder/eliminar su socket temporal `sailor-ingest.sock`. El motor no inicia y la distribución `docker-desktop` de WSL permanece detenida. No se borraron sockets, volúmenes, distribuciones ni datos; cualquier reparación adicional requiere dirección del usuario.

La decisión local consta en [ADR-001](decisiones/ADR-001-typeorm.md). No implica aprobación común de los líderes ni cierra D01/VT o E02. El registro que sigue corresponde al corte inicial, anterior a esta actualización.

## Historial: corte inicial de E01

E01 tiene backend NestJS/TypeScript independiente en `backend/`, con pnpm y lockfile propios, configuración validada, endpoint de vida, CORS explícito, validación de DTO y errores HTTP sin detalles internos. El frontend y su lockfile Bun no fueron modificados; solo se excluye `backend/` del lint del frontend porque tiene configuración propia.

Verificaciones ejecutadas en Windows con Node 24.13.0, Bun 1.4.2 y pnpm 11.19.0:

- `bun run check`: lint, tipos, 51 pruebas y build correctos.
- Dentro de `backend`, `pnpm install --frozen-lockfile`: correcto, sin excepciones de antigüedad de paquetes.
- `pnpm run check`: lint, tipos, 21 pruebas y build correctos.
- `pnpm audit --prod --audit-level high`: sin vulnerabilidades conocidas reportadas en ese corte; no sustituye revisión de seguridad.
- `pnpm run start`: respuesta HTTP 200 en `/api/health/live`.
- `pnpm run dev`: compilación en modo watch y respuesta HTTP 200 en un puerto temporal local; proceso de prueba detenido al finalizar.
- Frontend: respuesta HTTP 200 en el puerto 5173.
- `git diff --check`: correcto. Secretos, logs privados y compilados están ignorados por Git.

La compilación usa TypeScript directamente: no necesita Nest CLI ni una excepción para instalar paquetes recién publicados.

## Historial: E02 antes de elegir ORM e iniciar PostgreSQL

Se añadieron Compose para PostgreSQL 18.6 y scripts de restauración y verificación de inventario. La sintaxis PowerShell y la configuración Compose fueron comprobadas. Compose rechaza contraseña vacía; su estructura se validó con un valor efímero de prueba, sin iniciar contenedores ni crear un archivo de credenciales.

No se restauró la base: Docker está instalado, pero su motor no estaba iniciado durante las verificaciones. Los scripts no han sido validados contra PostgreSQL real todavía. No se copió el backup al repositorio ni se modificaron bases existentes.

D01 sigue pendiente: los líderes deben confirmar Prisma o TypeORM. No hay ORM, mapeo de entidades, credenciales de base para la API, migraciones ni prueba de escritura/persistencia desde NestJS. El endpoint de vida no prueba PostgreSQL.

## Historial: pendientes registrados en el corte inicial

- E01: revisión del equipo y commit descriptivo de este incremento. Los cambios permanecen locales; no se hizo commit ni push. Las modificaciones previas del Word y de `docs/README.md` se conservaron intactas.
- E02: iniciar Docker, configurar secreto local, restaurar el backup en entorno aislado, verificar objetos, confirmar ORM y después conectar y probar persistencia real con usuario de aplicación limitado.
- E03–E09: formularios, usuarios, autenticación, perfil, roles, organizaciones y aceptación de la entrega siguen pendientes.
- Trello: la última consulta no respondió; no se cambiaron estados ni criterios de tarjetas en este incremento. No considerar E01 o E02 cerradas por este archivo.

Guías: [backend](../backend/README.md), [PostgreSQL](../infra/postgres/README.md). Referencia de arquitectura: [stack oficial](requisitos/Brotar_Definicion_Stack_Tecnologico_y_Arquitectura%20(1).pdf).
