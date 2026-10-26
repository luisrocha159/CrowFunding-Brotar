# Avance de auditoría del Sprint 3

Fecha: 19/10/2026. Rama local RicardoDev. Responsable Ricardo. Este incremento implementa consulta restringida de auditoría, instrumenta acciones existentes y amplía las pruebas de permisos, transacciones y recuperación. S3-15, S3-16 y S3-18 siguen en curso; no se cambian DEV, main ni Trello.

## Cobertura por tarea

| Tarea | Avance implementado | Pendiente para cerrar |
| --- | --- | --- |
| S3-15 Consultar auditoría del sistema | Pantalla, API, filtros, páginas y lectura mínima de audit_log/status_history. Actor local de transacción en campañas y núcleo sandbox. Registros de negocio y auditoría atómicos, sin duplicar reintentos idempotentes. | Retención definitiva D03, decisiones de D06, instrumentación de verificaciones y operaciones futuras y revisión de cobertura final BG-56. |
| S3-16 Completar permisos por responsabilidad | audit.read en API, accesos de Mi cuenta y navegación. ADMIN/AUDITOR leen; otros perfiles no reciben acceso por su responsabilidad distinta. Revocación, expiración y auditor con ADMIN probados. | Matriz definitiva, provisión de roles y permisos de los módulos futuros de cumplimiento, finanzas operativas y soporte. |
| S3-18 Cerrar contratos y persistencia integrados | Contrato 0.3, undécima migración, proyección privada, readiness, prueba integrada HTTP/PostgreSQL y recuperación con conteos de ambos historiales. | Integración final de todos los módulos del equipo, autorización de documentos por caso, proveedor, privacidad y recuperación del esquema final del MVP. |

Esta ampliación reutiliza las tablas oficiales. No introduce otro historial, tablas en public, dependencias nuevas, proveedores ni cuentas administrativas. S3-06 conserva su cierre técnico de consulta financiera; no se cierra otra historia por haber aplicado una migración o superado pruebas parciales.

## Acciones registradas

Las escrituras instrumentadas usan `audit_log` dentro de la misma transacción que la modificación. El helper guarda actor UUID, uno de sus roles vigentes, acción, entidad, objeto, fecha de PostgreSQL y metadatos constantes `{source:"APPLICATION",result:"APPLIED"}`. No recibe cuerpos de formularios, motivos libres, contraseñas ni payloads.

| Flujo existente | Acción nueva mínima |
| --- | --- |
| Crear borrador | CREATE de campaign; la misma clave idempotente recupera el recurso sin otra acción |
| Guardar borrador, información general, historia, modalidad, portada o secciones | UPDATE de campaign tras completar el guardado de la sección; no copia el texto ni los adjuntos |
| Enviar a revisión | STATUS_CHANGE de campaign |
| Aprobar o rechazar | APPROVE o REJECT de campaign |
| Solicitar correcciones o publicar | STATUS_CHANGE de campaign; aprobar sigue siendo distinto de publicar |
| Descartar borrador | DELETE de campaign como baja lógica; no borra físicamente la campaña |
| Crear aporte e intento mediante núcleo interno sandbox | CREATE de contribution; el alta oficial de payment conserva el actor en status_history |
| Aplicar un evento interno distinto de pago | PAYMENT_EVENT de payment, actor humano null y rol SYSTEM; reintento del mismo evento no duplica el registro |

Los registros existentes de habilitación provisional CREATOR, cambios de catálogo y revisión de semejanzas siguen almacenándose por sus flujos originales. La pantalla los consulta con la misma proyección, pero no inventa el resultado APPLIED para formatos anteriores sin la marca explícita. El rol capturado por el helper es un rol vigente ordenado por código; no es una instantánea de todos los permisos ni prueba qué rol concreto autorizó la acción.

La cobertura nueva no incluye ingreso/registro, perfil, organizaciones, todos los archivos, accesos denegados ni una auditoría completa de KYC/KYB, conciliación, devoluciones, desembolsos o soporte. Enumerar esas acciones en un filtro no implementa esos procesos.

## Diferencia entre auditoría y estados

`audit_log` registra acciones de seguridad u operación. `status_history` conserva transiciones creadas por los triggers oficiales de campaign, verification, payment, refund, dispute, disbursement y reward_fulfillment, además del descarte lógico ya existente. No se añadió un trigger de contribution ni se presenta una edición de texto como cambio de estado.

El actor humano procede de la sesión y se establece con `set_config('brotar.actor_id', UUID, true)` dentro de la transacción. `brotar_current_actor()` lo lee para los triggers. El tercer argumento true limita el contexto a esa transacción: termina en commit o rollback y no queda como identidad de la próxima solicitud del pool. Los eventos internos limpian explícitamente el contexto antes de escribir y no se atribuyen al patrocinador.

Un fallo al insertar auditoría revierte la modificación de negocio. Un fallo posterior a la inserción revierte ambos registros. Los huecos de secuencia que pueda dejar un rollback son normales y no se rellenan. El helper no crea evidencia de éxito para una operación abortada ni un historial retroactivo para datos heredados.

La consulta mantiene ambos orígenes separados. AUDIT muestra APPLIED solo para la marca explícita nueva; otros registros muestran UNSPECIFIED. STATUS muestra RECORDED y no reconstruye un rol histórico a partir de roles actuales. Un actor null antiguo se muestra como no registrado, no como SYSTEM ni como el administrador actual.

## Demostración de la consulta

Preparar el entorno con README secciones 3 o 24, once migraciones y API/frontend iniciados. No copiar credenciales de QA ni publicar archivos de configuración.

1. Ingresar con una cuenta que tenga audit.read vigente. Mi cuenta y la navegación administrativa ofrecen «Consultar auditoría del sistema» o `/administracion/auditoria`. El registro público no concede ese permiso.
2. Seleccionar Auditoría y aplicar filtros de acción, actor UUID, objeto UUID, entidad o días UTC. Un UUID identifica la persona/objeto; el número del registro es otro identificador, bigint en cadena.
3. Con otra cuenta creadora, crear un borrador, guardarlo y copiar su UUID desde la URL. Consultar ese objeto en auditoría: aparecen CREATE y UPDATE. Si se descarta con confirmación, aparece la baja lógica.
4. Cambiar a Cambios de estado manteniendo el objeto: se observa el alta y, si corresponde, el descarte o transiciones oficiales. Una edición de texto no agrega por sí misma una transición.
5. Probar filtros sin coincidencias y páginas anterior/siguiente. Aplicar o limpiar filtros reinicia las páginas; actualizar vuelve al inicio. Un fallo de API muestra error y reintento, no una lista vacía simulada.
6. Con usuario básico, FINANCE o REVIEWER sin audit.read, comprobar acceso restringido. Sin sesión, la ruta vuelve al login conservando el destino. AUDITOR tiene lectura, aunque acumule ADMIN; no se ofrecen operaciones ni exportación de auditoría.

El contrato HTTP completo está en [contratos del Sprint 3](contratos-sprint-3.md). La lista usa un máximo de 50 elementos, 25 por defecto, orden por ID descendente y cursor numérico. No es una instantánea forense entre páginas ni garantiza que una transacción pendiente ya sea visible. Los controles de fecha y UUID tienen etiquetas, estados de carga/error/vacío y navegación de teclado; se reutilizan componentes y tokens de Brotar.

## Persistencia y privacidad

`AuditRead1792368000003` completa once migraciones. Habilita SELECT/INSERT y secuencia de audit_log y SELECT de status_history, retirando UPDATE/DELETE de audit_log a brotar_app. No modifica official-schema.sql ni agrega funciones/triggers públicos. Se conserva el acceso limitado a columnas de revisión de status_history que necesita el flujo anterior.

La API usa brotar_app, no postgres. Readiness verifica permisos de auditoría y no anuncia preparación si el rol tiene UPDATE/DELETE de tabla en audit_log. El propietario/administrador de PostgreSQL conserva capacidades de mantenimiento: esta protección no es inmutabilidad criptográfica ni protege de un administrador de base comprometido. Los ensayos limpian únicamente fixtures propios mediante su conexión administrativa aislada.

La proyección de lectura selecciona campos cerrados. Excluye description/reason, old_values/new_values, IP, user_agent, request_id, metadata y referencias externas. Motivos y payloads heredados pueden permanecer en almacenamiento y respaldos; ocultarlos en la respuesta no los anonimiza ni los elimina. La retención y el tratamiento definitivo de esos datos requieren decisión; no se añadió una purga automática.

`drill:recovery` compara ahora también los conteos de audit_log y status_history recuperados, además de permisos, datos financieros, control de migraciones e inventario. Los respaldos permanecen fuera de Git. Es una prueba de restauración y conservación de conteos, no una prueba de integridad criptográfica registro por registro.

## Ubicación y decisiones de diseño

- `backend/src/shared/infrastructure/database/audit.ts`: contexto transaccional y escritura mínima parametrizada; se reutiliza donde corresponde sin otra biblioteca.
- Repositorios `campaigns/infrastructure`, `campaign-drafts/infrastructure/typeorm-cover-draft.repository.ts` y `contributions/infrastructure/contribution-ledger.ts`: llaman al helper dentro de sus transacciones existentes. No se interceptan indiscriminadamente cuerpos HTTP.
- `backend/src/audit/audit.module.ts`: DTO, controlador protegido y lector de dos proyecciones cerradas. Usa la validación de calendario/periodo existente de finance/domain/report.ts.
- `backend/src/shared/infrastructure/database/migrations/1792368000003-AuditRead.ts`: permisos técnicos incrementales; no reescribe migraciones anteriores.
- `src/features/audit/auditClient.ts`, `useAudit.ts` y `AuditPage.tsx`: contrato estricto, transporte/cancelación/paginación y presentación separados. Reutilizan API, controles y estilo adaptable existentes.
- `backend/test/audit.test.ts`, `backend/integration/audit.integration.test.ts` y `tests/audit.test.tsx`: validación, privacidad, autorización y comportamiento integrado. Las integraciones de aportes y migraciones amplían sus aserciones sin inflar el número de casos.

KISS/YAGNI y la guía Ponytail orientaron la reutilización de tablas, transacciones, permisos, controles y validación existente. SRP mantiene presentación, estado HTTP y persistencia separados. La guía UI/UX mantuvo etiquetas, mensajes explícitos y los tokens visuales del proyecto; no se añadió otro sistema visual ni una dependencia para una consulta. No se afirma que cada principio SOLID requiera una clase o patrón nuevo.

## Verificación del incremento

Pruebas con escritura exclusivamente en `brotar-s3-ricardo-20261019`, proyecto Docker del mismo nombre y puerto local 15443. API/frontend de inspección en 3019/5193. La base original del equipo no recibió migraciones ni fixtures. Esta ampliación reutiliza las dependencias ya instaladas en QA; no declara un nuevo clon remoto ni otra instalación de dependencias desde cero.

| Comprobación ejecutada | Resultado final |
| --- | --- |
| `bun run check`, raíz de trabajo | Lint, tipos, 167 pruebas y compilación aprobados |
| `corepack pnpm run check`, backend de trabajo | Lint, tipos, 157 pruebas, 8 ADMIN local y compilación aprobados |
| Compilación de API y pruebas en QA | Correcta; 355 archivos de código, pruebas y scripts comparados por hash con trabajo, sin diferencias |
| Suite PostgreSQL/HTTP completa tras la corrección final, con DB_TEST_RESTART=true | 24/24 aprobadas, 0 fallos/omitidas; incluye las regresiones S1/S2, auditoría nueva y las aserciones ampliadas de decisiones y sandbox |
| Auditoría integrada | Dos orígenes, proyección cerrada, datos heredados con secretos sintéticos excluidos, actor de sesión, rechazo de actor enviado por cliente, permisos revocados/vencidos, auditor con ADMIN, filtros UTC, páginas y bigint por encima de 2^53 |
| Atomicidad y contexto | Fallo al auditar revierte negocio; fallo posterior revierte auditoría y negocio; identidad termina en commit/rollback en la misma conexión; transacciones paralelas no comparten actor |
| Reintentos y decisiones reales | Creación/envío/correcciones/aprobación/publicación/rechazo y eventos sandbox conservan acciones aplicadas sin duplicar carreras ni reintentos idempotentes; no se registra un fallo como éxito |
| Migraciones desde SQL oficial desechable y sobre la copia existente | Once migraciones, pending:false, reaplicación sin pendientes; se verifica SELECT/INSERT permitido y UPDATE/DELETE denegados de audit_log al rol de API |
| Recuperación | Dump fuera de Git; audit_log/status_history con datos de prueba presentes, conteos e historial conservados junto a pagos, devoluciones, disputas y permisos |
| Inventario oficial y hash SQL | 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 FK; citext/pg_trgm presentes; SHA-256 oficial sin cambios |
| Navegador de QA | Sin sesión vuelve al login; ingreso retorna a auditoría; ambos orígenes, objeto, vacío, siguiente/anterior y reinicio de páginas comprobados; presentación observada a 320 px y escritorio, sin desbordamiento horizontal a 320/768/1024/1440 px |
| Limpieza y Git | Cuenta/campaña sintéticas de la inspección visual retiradas solo de QA; procesos y contenedor temporales detenidos conservando volumen y respaldos; git diff --check sin errores; sin commit/push ni cambios en DEV/main/Trello |

Total vigente: **356 casos automatizados distintos**: 167 frontend + 157 backend + 8 ADMIN local + 24 PostgreSQL. Las ejecuciones dirigidas, repeticiones y probes visuales no se suman otra vez. Los conteos anteriores de 351 y 344/345 corresponden a sus cortes, no a pruebas adicionales de este incremento.

SHA-256 de `official-schema.sql`: `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`. Se conserva el aviso de Vite: JavaScript de 549.01 kB antes de gzip, 161.56 kB comprimido. No impide compilar ni se elevó el umbral para ocultarlo. No se hizo una nueva auditoría visual exhaustiva de todas las pantallas del producto.

### Incidencias corregidas durante la verificación

La prueba visual detectó que `ORDER BY id` resolvía el alias `id::text` en la consulta y podía ordenar como texto, con páginas incompletas y rechazo del contrato del cliente. Se reprodujo el fallo con dos IDs bigint de distinta longitud y mayores a 2^53: se recuperaban cuatro filas de cinco. La consulta ahora ordena `entries.id` numérico, dejando la conversión a string solo para transporte. El caso falló antes del ajuste y pasó después, seguido de la regresión completa y el recorrido en navegador.

En 320 px, el mínimo global de body de 320 px más la barra vertical provocaba desplazamiento horizontal. Se retiró ese mínimo fijo, manteniendo los controles y rejillas adaptables; las mediciones posteriores igualaron scrollWidth y clientWidth en los cuatro tamaños probados. Los títulos de las fichas de auditoría usan el tamaño compacto ya existente en Finanzas.

Un test nuevo intentaba buscar el alta de contribution en status_history, pero la línea base solo tiene ese trigger para payment y otras entidades oficiales. Se corrigió la aserción para comprobar el actor en el alta del intento de pago; no se alteró el SQL oficial para satisfacer una expectativa equivocada. El test de frontend que simula un ID numérico inválido usa una conversión explícita en lugar de un literal que infringe el lint de precisión.

Docker Desktop volvió a fallar por sockets locales inaccesibles de Ingest y Secrets Engine. Se conservaron por renombrado sus directorios temporales de comunicación y se reinició el motor, sin borrar volúmenes ni usar Factory Reset. Es una incidencia local de Windows, no un paso de instalación que el equipo deba repetir normalmente. El respaldo previo y los dumps de recuperación permanecen fuera del repositorio.

## Pendientes para el cierre

Definir retención D03, confirmar la matriz D06 y completar la cobertura de módulos faltantes. Validar privacidad de los registros heredados y el acceso por caso a documentos; instrumentar decisiones de verificación y operaciones cuando existan, incluidos fallos que deban conservarse bajo una política aprobada. Integrar los contratos finales del equipo y ensayar recuperación del conjunto completo. Estas pruebas no certifican cobros reales, aceptación externa ni ausencia universal de defectos.
