# Entrega de DEV · 16 de octubre de 2026

## Alcance y referencia

Incremento integrado del Sprint 2 y documentación de planificación del Sprint 3. Se prepara exclusivamente para `DEV`, sobre `1fcecd487e287e3fe30e9bd1f062d52e4fb54c70`; no sustituye `main` ni las ramas personales. El identificador exacto del incremento se consulta con `git log -1 origin/DEV` después de `git fetch origin`.

La guía operativa es el [README principal](../README.md): sección 3 para una computadora/copia nueva, sección 4 para abrirla otro día y sección 21 para actualizar una instalación V2. El [procedimiento de colaboración](../CONTRIBUTING.md) explica cómo incorporar DEV sin reemplazar cambios propios.

## Cambios incluidos

- Validaciones del registro y los bloques de campaña, con mensajes por campo, obligatoriedad visible, mínimos/máximos, tipos y controles equivalentes en la API. Correo primero y consulta de disponibilidad al salir del campo; no verifica la titularidad del correo.
- Teléfono compartido entre registro y perfil: prefijo y número nacional diferenciados visualmente; validación conjunta, sin confundir el prefijo con otro número.
- Reglas de fechas, porcentajes, cantidades, importes calculados y coherencia entre presupuesto y meta; recompensas condicionadas a la modalidad. Las reglas locales se distinguen de una aprobación del cliente en [ADR-006](decisiones/ADR-006-validaciones-del-equipo-sprint-2.md).
- Varios vínculos de actividades por hito, con migración de los vínculos anteriores y controles de pertenencia a la misma campaña.
- Cinco categorías provisionales y referencias de país, moneda y gastos cargadas por migración. El frontend consulta PostgreSQL, sin una lista alternativa que oculte un catálogo ausente. No se sobrescriben nombres existentes ni se reactivan categorías desactivadas deliberadamente.
- Campañas con nombres iguales o parecidos permitidas. UUID y slug únicos; semejanzas orientativas para ADMIN, sin bloqueo semántico de envío, aprobación o publicación. El formulario experimental de iniciativa/etapa y sus rutas de escritura se retiraron; sus datos históricos no se borran.
- Reintentos idempotentes de creación y cuota de escritura compartida por cuenta/IP en PostgreSQL. No constituyen por sí solos un sistema antibots completo.
- Revalidación de la información persistida al enviar, aprobar y publicar, dentro de la transacción correspondiente; publicación administrativa separada de aprobar.
- Resolución única de React/ReactDOM en Vite y ejecución de las comprobaciones del backend sin invocar accidentalmente otra versión global de pnpm.
- Plan v2.4 y mapa de tarjetas: 64 historias, 67 tareas únicas y Sprint 3 de 36 tareas, con Ricardo 18 / Santiago 9 / Alison 9. Se documentan arrastres y dependencias sin duplicar historias ni declarar completo el MVP.
- Documentos Word del Sprint 2 para el docente y generadores correspondientes. Conservan su fecha de elaboración; no se presenta su contenido histórico como una auditoría de este nuevo corte.

## Verificación ejecutada

Las comprobaciones no se limitaron a la instalación de trabajo. Se preparó otra carpeta a partir de los archivos no ignorados del repositorio, **sin `.env`, dependencias, compilaciones ni volumen previo**, en `brotar-dev-release-20261015`. El nombre corresponde al inicio del ensayo; su cierre ocurrió el 16/10 en Bolivia. No era todavía un clon remoto del incremento sin publicar.

Para evitar tocar los datos del equipo se usaron el proyecto Compose `brotar-dev-release-20261015` y el puerto PostgreSQL `15441`. API `3019` y frontend `5192` fueron únicamente puertos de comprobación. **No se deben copiar esos valores al entorno normal**, que utiliza `15433`, `3000` y `5173`.

Entorno observado: Windows, Node.js 24.13.0, Bun 1.4.2, pnpm 11.19.0, Docker Engine 29.7.2 y PostgreSQL 18.6.

| Comprobación | Resultado |
| --- | --- |
| Frontend: `bun install --frozen-lockfile` en la copia nueva | Instalación correcta, sin regenerar lockfile |
| Backend: `corepack pnpm install --frozen-lockfile` en `backend/` | Instalación correcta, sin regenerar lockfile |
| Frontend: `bun run check` | Lint, tipos, 162 pruebas y compilación aprobados, tanto en trabajo como en la copia nueva |
| Backend: `corepack pnpm run check` | Lint, tipos, 147 pruebas, 8 pruebas del script ADMIN local y compilación aprobados; comprobación repetida en trabajo después del ajuste del test de reinicio |
| Integraciones PostgreSQL/HTTP sobre la copia nueva | 21/21 aprobadas; 0 fallos y 0 omitidas, con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=true` |
| Persistencia durante reinicio real del contenedor de ensayo | Confirmada por `database.integration.test.ts` |
| Instalación oficial, migraciones y preparación de permisos | Siete migraciones aplicadas, `pending: false` y rol de aplicación limitado |
| Integridad del SQL oficial | SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`, sin modificar |
| Comparación del código de trabajo con la copia ensayada | 326 archivos de código/configuración/pruebas comparados por hash, sin diferencias; documentos de planificación se revisaron aparte |
| Comprobaciones Git | `git diff --check` sin errores; revisión de archivos a publicar y exclusión de configuración/datos privados |

Son **338 casos automatizados distintos**: 162 + 147 + 8 + 21. Repetir una suite o una prueba dirigida no aumenta ese total. Las comprobaciones HTTP adicionales de abajo tampoco se suman como si fueran otros casos de esa suite.

La primera ejecución de integración detectó una suposición incorrecta en **la prueba de reinicio**, no una línea base ausente: exigía el nombre `brotar-provisional-v2` incluso cuando la copia estaba configurada legítimamente con otro proyecto. Se reutilizó `readTestDatabaseTarget` para comprobar el proyecto de **esa copia**, manteniendo los controles de host local, puerto, base, ID de contenedor y publicación exclusivamente en loopback. La prueba dirigida pasó y se repitió la suite completa con reinicio habilitado: 21/21.

La prueba negativa de migraciones imprime deliberadamente que faltan `app_user`, `user_profile`, etc., sobre una **base temporal incompleta**. Es el rechazo esperado de ese caso, no un fallo del procedimiento de instalación. Revisar el resultado final de la suite y su código de salida.

### Arranque, proxy y uso real

Con el candidato generado y activado, se arrancaron la API compilada y Vite desde la copia nueva:

También se comprobó el arranque de desarrollo con `corepack pnpm run dev` (compilación y observadores), sin depender de pnpm global de otra versión; readiness directa y por proxy volvieron a responder 200.

- `/api/health/live` y `/api/health/ready` de la API: HTTP 200.
- `/`, `/registro` y `/api/health/ready` a través de Vite: HTTP 200.
- Consulta anónima del catálogo privado de categorías: HTTP 401, no exposición accidental.
- Consulta pública de campañas: HTTP 200.
- Registro de una cuenta ficticia por el proxy: HTTP 201; disponibilidad de correo cambia de disponible a ocupado.
- Inicio de sesión: HTTP 200 y cookie HttpOnly; consulta autenticada obtiene exactamente las cinco categorías provisionales de la instalación nueva.
- Repetición de `install`, `migrate up`, preparación S2 y `activate`: conserva la cuenta, la sesión y las siete migraciones. `activate` repetido no cambia la configuración ya activada.
- Cierre de sesión: HTTP 204; reutilizar esa sesión devuelve HTTP 401.

No se realizó un nuevo ensayo interactivo completo de todas las pantallas en navegador para este corte. Servir `/registro` con HTTP 200 no demuestra por sí solo su renderizado; las pruebas de componentes, tipos y compilación aportan cobertura complementaria. No se atribuye aquí una nueva inspección visual que no se haya realizado.

### Respaldo y recuperación

`drill:recovery` se ejecutó sobre la instalación de ensayo. Creó un respaldo, lo restauró en una base temporal y conservó el historial de siete migraciones. Ejecutar `up` sobre lo restaurado no cambió sus conteos. La cuenta ficticia existente sobrevivió también a la repetición del instalador en la base fuente.

Inventario oficial verificado: 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 claves foráneas; extensiones `citext` y `pg_trgm` presentes. Esto comprueba el inventario previsto, no una comparación exhaustiva de todas las definiciones SQL.

El respaldo se conservó fuera de Git, en la carpeta privada de ensayos. La base temporal de recuperación y la cuenta ficticia de este ensayo se retiraron; no se borró el volumen ni la base original del equipo. No se publican dumps, datos de cuentas, cookies ni claves de recuperación.

## Migraciones y compatibilidad

La secuencia vigente es:

1. `BaselineProvisionalV21789948800000`.
2. `CampaignRejected1791244800000`.
3. `CreatorGrantAudit1791244800001`.
4. `MilestoneActivities1791849600000`.
5. `ProvisionalCatalogs1792015200000`.
6. `InitiativeIdentity1792015200001`.
7. `IdentityDraftCorrections1792015200002`.

No se eliminan las dos últimas por haberse retirado el formulario experimental: también contienen objetos que utilizan los controles activos de idempotencia y frecuencia, además de compatibilidad histórica. No borrar el esquema `brotar_extension`, el historial de migraciones ni el volumen para actualizar. La API mantiene `synchronize=false`, `dropSchema=false` y migraciones como operación administrativa explícita. Ver [MIGRACIONES.md](../infra/postgres-v2/MIGRACIONES.md).

## Actualización y conflictos de Git

Antes de actualizar una copia existente, guardar y revisar el trabajo propio. Con el árbol limpio:

```powershell
git fetch origin
git switch DEV
git pull --ff-only origin DEV
```

Continuar con las dependencias congeladas, Docker, compilación, migraciones y preparación de permisos del README. **Actualizar no implica restaurar el SQL oficial ni reemplazar `.env`.** Una computadora nueva sí necesita todo el procedimiento de primera instalación, que genera sus propias credenciales.

`--ff-only` evita crear una integración accidental, pero no garantiza que nunca haya divergencias o conflictos futuros. Si se detiene, inspeccionar los commits y coordinar; no usar force-push, `reset --hard` ni borrar cambios para fingir una actualización correcta. En una rama personal, incorporar `origin/DEV` mediante el procedimiento de CONTRIBUTING, no sustituir la rama con DEV.

## Límites y decisiones pendientes

- Permanece el aviso de Vite por un paquete JavaScript de aproximadamente 526.58 kB antes de gzip (156.31 kB comprimido). No bloquea las comprobaciones; no se ocultó aumentando artificialmente el umbral.
- En esta PC Docker Desktop volvió a fallar por un socket temporal inaccesible de Windows. Se conservaron las carpetas de sockets mediante renombrado y se reinició Docker; no se borraron volúmenes ni se usó Factory Reset. No es un paso de instalación exigido a otros equipos ni una garantía contra futuras incidencias del motor.
- Correo operativo, textos legales y reglas definitivas KYC/KYB siguen pendientes. El buzón local de recuperación debe habilitarse expresamente según el README; no hay remitente externo ni credenciales compartidas en Git.
- La publicación por ADMIN y el otorgamiento provisional de CREATOR mantienen su carácter transitorio documentado; no equivalen a verificación de identidad.
- Este corte no implementa pagos reales ni completa el Sprint 3. Las suites verdes prueban los casos ejecutados, no ausencia universal de defectos, seguridad absoluta, capacidad de producción ni aceptación externa del cliente/docente.
