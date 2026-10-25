# Avance de reglas y tareas de Ricardo del 20 de octubre de 2026

Rama de trabajo: `RicardoDev`. Incremento local sobre `bd8f566e932de42256b8ddaf2d1e20b4f6dd298d`. Sin commit, push, cambio de DEV/main ni actualización de Trello. Conserva el trabajo local anterior.

Se implementaron tres bloques independientes: concesión/revocación de responsabilidades, mantenimiento manual de retención y reintentos/expiración del motor interno de aportes. Las ocho decisiones están recogidas en [ADR-012](decisiones/ADR-012-reglas-mvp-pruebas.md), sin presentar los acuerdos como módulos ya terminados. El [contrato 0.4](contratos-sprint-3.md) y README §27 incluyen uso y límites.

## Bloques implementados

### Responsabilidades y permisos

API `POST /api/admin/users/:id/responsibilities` y formulario en `/administracion/usuarios`. ADMIN puede conceder/revocar REVIEWER, COMPLIANCE, FINANCE, SUPPORT y AUDITOR de otra cuenta con motivo y confirmación. No concede ADMIN ni permite autoasignación. Revocar conserva las filas y retira el permiso en la próxima petición; no necesita invalidar ni recrear la cookie para comprobarlo.

El repositorio revalida actor, permiso, estado y destinatario con bloqueos transaccionales. Las peticiones simultáneas no duplican concesión ni auditoría. La API solo recibe UPDATE de `user_role.revoked_at`, no de `role_id`, contraseñas o estado. Auditor sigue sin escribir aunque acumule ADMIN. No equivale a KYC ni sustituye la administración general de personas/organizaciones asignada a Santiago.

Archivos: `backend/src/roles/domain/staff-role.ts`, `backend/src/roles/infrastructure/staff-administration*.ts`, `src/features/organizations/StaffResponsibilitiesForm.tsx` y cliente/hook existentes. Sin nuevas bibliotecas.

### Retención manual y anonimización

`backend/scripts/audit-retention.mjs plan` informa sin escribir. `apply --confirm-12-months` crea y comprueba un respaldo completo fuera de Git y ejecuta `backend/src/audit/audit-retention.ts`. Conserva 12 meses de detalle, retiene globalmente por trabajo activo y procesa hasta 5000 eventos antiguos por aplicación. Guarda solo mes UTC, acción del catálogo y conteo en `brotar_extension.audit_monthly`; no guarda actores, UUID ni texto libre.

Agregación y retirada de detalle son atómicas. Ante bloqueo de tablas o fallo de agregación se revierte; repetir no suma dos veces. No borra `status_history`, documentos ni expedientes de negocio. La API continúa sin UPDATE/DELETE de auditoría y sin acceso a los agregados administrativos. El respaldo conserva datos sensibles y requiere acceso restringido y revisión de conservación; anonimizar estadísticas no anonimiza ese archivo.

No se ejecuta automáticamente al instalar o arrancar. **No se purgó la base original.** El ensayo modifica únicamente filas sintéticas identificadas de QA y conserva respaldo privado para recuperación.

### Reservas y reintentos internos

`ContributionLedger.retry` crea otro intento del mismo aporte fallido/vencido, conservando historial y clave de idempotencia. No cambia importe/moneda/recompensa; no abre dos intentos ni reabre un aporte ya cobrado. Revalida cuenta sin AUDITOR, campaña abierta, proveedor de ensayo, moneda, mínimo, recompensa y cupo. Se acota el contador SMALLINT.

`expireDue` persiste expiración por lotes de 1–500, registra evento temporal y auditoría con actor de sistema. Nunca confirma ni devuelve dinero. Los intentos nuevos guardan modo DEMO y su reserva no supera 30 minutos ni el fin de campaña. Producción/proveedor no sandbox quedan rechazados.

No se añadió checkout HTTP, QR, webhook externo ni programador automático. Las confirmaciones tardías se rechazan sin alterar recaudación, pero aún falta su gestión operativa de conciliación. Son límites del alcance, no errores convertidos en éxitos.

## Estado de las tareas

| Tarea de Ricardo | Estado al terminar este incremento |
| --- | --- |
| S3-06 consulta financiera | Conserva su cierre técnico anterior; no se reabre ni se cuenta como tarea nueva. |
| S3-16 permisos por responsabilidad | Gestión de roles completada en los módulos existentes; historia en curso por controles de futuros módulos. Matriz adoptada para el MVP, ya no bloqueada por D06 externo. |
| S3-15 auditoría | Consulta, instrumentación previa y mantenimiento manual completados en su alcance; historia en curso por cobertura de los módulos financieros/KYC/soporte futuros. |
| S3-02 importes y estados | Núcleo ampliado con reintentos y expiración; falta checkout y resolución de confirmaciones tardías para cerrar el recorrido. |
| S3-18 contratos y persistencia | Contrato 0.4, trece migraciones y pruebas del incremento; integración global pendiente. |
| S2-08 revisión KYC/KYB | Pendiente de captura/corrección de Santiago y de implementar el flujo de revisión de Ricardo. La política de acciones y documentos de prueba ya está definida. |
| S2-19 checkout y S3-01 pagos | El alcance será simulación interna, sin proveedor real; faltan API/checkout/QR y pantallas de Alison. El núcleo interno no acredita un proveedor integrado. |
| S3-07 conciliación | Pendiente de implementar; ya hay criterio para pagos tardíos. Ricardo puede seguir avanzando backend sin esperar a las pantallas. |
| S3-08 desembolsos y S3-09 devoluciones | Pendientes; reglas definidas, requieren permisos, saldos/reservas, verificación aplicable e integración del resultado de campaña. |
| S3-11 disputas | Pendiente del reporte de incidencias de Alison y del flujo de resolución/compensación. SUPPORT no mueve dinero por resolver un caso. |
| S3-23 ciclo de campaña | Pendiente de implementar transiciones y coordinar ejecución/rendición de Santiago. Tener estados en la base no cierra esta tarea. |
| S1-12 y S3-26 correo/contactos | Pendientes por canal autorizado. Buzón local conserva su alcance de demostración; no se añadió correo ni credencial. |
| S3-19 y S3-21 QA/aceptación integral | Pendientes del recorrido completo con módulos de los compañeros; no se cierran por las pruebas de este incremento. |
| S3-20 publicación general | Pendiente; publicar está expresamente fuera de este turno. |

Las tareas pendientes propias no se atribuyen todas a los compañeros. Conciliación, operaciones financieras y partes del checkout/ciclo todavía requieren implementación de Ricardo. No hace falta volver a pedir las mismas decisiones del MVP; correo, textos legales y cualquier operación real conservan sus restricciones.

## Comprobaciones y reproducción

Comandos desde la raíz: `bun run check`. Desde `backend/`: `corepack pnpm run check`. Integraciones con PostgreSQL solamente en copia aislada y `ALLOW_DB_TEST_WRITES=true`; `DB_TEST_RESTART=true` incluye reinicio real. No ejecutar una suite con escritura contra la base original.

Las pruebas del incremento cubren rol ADMIN/CSRF/campos extra, no autoasignación, cinco responsabilidades, concesión simultánea/idempotencia, revocación inmediata, historia vencida y cuenta suspendida; expiración repetida y cupos/reintentos propios; corte de reserva al fin de campaña; retención con casos abiertos, bloqueo concurrente, estadísticas sin identificadores y rollback de fallo real. El CLI de retención comprueba su respaldo antes de aplicar en QA y el ensayo de recuperación compara los agregados como cadenas exactas, no números redondeados.

Resultados finales del 20/10, sin fallos ni casos omitidos:

| Comprobación | Resultado |
| --- | --- |
| `bun run check` | Lint, tipos, 169 pruebas y build aprobados. |
| `corepack pnpm run check` | Lint, tipos, 159 pruebas backend, 8 ADMIN local y build aprobados. |
| Suite completa PostgreSQL en QA | 26/26 aprobadas, con `DB_TEST_RESTART=true`; duración aproximada 290 segundos, no medición de rendimiento de producción. |
| Total de casos distintos | **362**; no se suman otra vez las repeticiones de una misma prueba. |
| Migraciones | Trece aplicadas, `pending:false`; instalación de esquema oficial aislado y repetición de migraciones cubiertas por la suite. |
| Recuperación | Respaldo y restauración aislada con agregados no vacíos; conteos exactos como cadenas y conservación del inventario e historial. |
| Inventario oficial | 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 FK. |
| Salud de la API | Readiness directo en QA y a través de Vite: HTTP 200 después del reinicio. |
| Formulario en navegador | Login con cuenta sintética, búsqueda real, roles cerrados, motivo mínimo, confirmación que se reinicia al cambiar el rol y logout comprobados. La concesión/revocación se ejecutó por HTTP en las pruebas PostgreSQL; no se concedieron roles desde el navegador. |
| Diseño adaptable | Sin desbordamiento horizontal a 320, 768, 1024 y 1440 px; leyenda y separación visual conservan los estilos verdes existentes. |

Se detectó y corrigió una comprobación adicional que intentaba bloquear `role_permission` con `FOR SHARE`: PostgreSQL exige privilegios de escritura para ese bloqueo y la API solo debe leer ese catálogo. Se retiró el bloqueo, conservando la consulta de autorización dentro de la transacción y los bloqueos de actor/destinatario. No se concedió UPDATE al catálogo para ocultar el error. La ejecución final completa aprobó la prueba de responsabilidades, incluidas las cinco opciones.

La sesión del navegador usó `localhost` mientras la pestaña habitual permanece en `127.0.0.1`, para no reemplazar su cookie (los puertos por sí solos no aíslan cookies). Se cerró la sesión y se retiraron las dos cuentas sintéticas de la base QA. No se abrió Trello ni se modificaron las cuentas de la instalación original. Los cortes anteriores conservan sus conteos históricos.

La copia ensayada se cotejó con el repositorio: **507 archivos versionados o nuevos, sin diferencias de contenido**. Las dos cuentas sintéticas se retiraron tras el logout. Los servidores temporales de QA se detuvieron al terminar; no se modificó el arranque ni se migró la base original. Para usar este incremento allí, seguir README §24/27 y aplicar las trece migraciones con respaldo previo.

## Infraestructura y límites

La secuencia local incorpora `StaffResponsibilities1792454400000` y `AuditRetention1792454400001`: trece migraciones, sin cambiar el SQL oficial ni sus 59 tablas en `public`. Actualizar una base existente requiere respaldo y `migrate up`, no restaurar el SQL encima. Los agregados viven en el esquema de extensión y no se crean responsabilidades de cuenta automáticamente.

Docker Desktop volvió a responder tras apartar directorios de sockets de comunicación bloqueados en copias recuperables. No se borraron volúmenes, datos de PostgreSQL ni configuración del proyecto. Los servicios/puertos de ensayo permanecen separados de la instalación original.

Permanece la advertencia no bloqueante de Vite por el bundle principal de **552.08 kB** (162.42 kB gzip); no se añadió una dependencia para ocultarla. El SQL oficial conserva SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`. No se modificaron dependencias ni lockfiles. No se afirma que todo el MVP esté completo, que no existan errores futuros o que estos ensayos acrediten una operación financiera real.
