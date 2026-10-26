# Avance local · pagos y conciliación DEMO · 21/10/2026

Rama **RicardoDev**. Implementación local autorizada, sin commit/push, modificaciones de DEV/main ni cambios en Trello. No se implementaron pantallas de compañeros, no se configuró correo y no se habilitó dinero real. Las tareas siguientes son avances técnicos, no aceptación externa ni cierre del MVP.

## Qué quedó y qué falta

| Tarea | Incremento implementado | Pendiente para cerrar la tarea integral |
| --- | --- | --- |
| S3-01 · proveedor autorizado | Alternativa de simulación interna acordada: proveedor fijo, bandera explícita, prohibición de producción, resultados sintéticos verificables en BD y recibos idempotentes. No hay proveedor bancario. | Integrar S2-20/pantallas de Alison y aceptación del recorrido DEMO. Una pasarela real queda fuera del alcance autorizado. |
| S2-19 · checkout | API que valida campaña, mínimo, modalidad, recompensa/cupo, importe/moneda y consentimiento de ensayo; boleto privado no pagable, reintentos y contrato 0.5. | Pantalla de resumen/edición/confirmación, desglose y opciones de privacidad/contacto aplicables; integración con S2-18 y método visual S2-20 de Alison. No se añaden direcciones/logística sin definir. |
| S3-02 · importes/estados | Núcleo integrado por HTTP DEMO: céntimos exactos, reservas hasta 30 minutos, intentos conservados, máximo un confirmado por aporte, idempotencia y expiración operativa, avisos tardíos durables sin reactivar ni sumar. | Integración final con UI, ciclo de campaña y futuras devoluciones/disputas; las relaciones/historial oficiales se conservan, sus operaciones aún no se implementan aquí. |
| S3-07 · conciliación | Backend de lotes por moneda/fechas UTC, faltantes, importes distintos, referencias contradictorias y repetición de avisos sin duplicar ingresos; contraste, compensación DEMO de recibos no ingresados, responsables/motivos y cierre protegido. | Pantalla administrativa y aceptación integral. Este corte concilia confirmaciones brutas; no es saldo disponible, listado integral de pendientes ni flujo de devoluciones de aportes confirmados. Diferencias sin evidencia permanecen abiertas. |
| S3-15/16/18 | Instrumentación de recibos/resoluciones/cierres, retención por avisos pendientes, permisos técnicos limitados, catorce migraciones, contrato y ampliación de recuperación. | Cobertura e integración de todos los demás módulos. |

Siguen pendientes sin cambios: correo real/contactos verificados S1-12/S3-26, textos legales definitivos, captura KYC/KYB y ejecución/rendición de Santiago, pantallas de Alison, revisión/integración KYC de Ricardo, desembolsos S3-08, devoluciones S3-09, incidencias/ciclo de campaña e integración final. No se sustituyen por registros ficticios de éxito.

## Diseño y archivos

- `backend/src/demo-payments/domain/demo.ts`: reglas puras de entorno de ensayo, claves, períodos, motivos, comparación y suma exacta; sin NestJS/ORM.
- `backend/src/demo-payments/infrastructure/demo-payments.ts`: checkout, privacidad del boleto, simulación con recibo durable y SAVEPOINT para conservar observaciones de negocio rechazadas.
- `backend/src/demo-payments/infrastructure/demo-reconciliation.ts`: permisos FINANCE vivos dentro de transacción, lotes, evidencia, compensación sin autoaprobación y cierre revalidado.
- `backend/src/demo-payments/demo-payments.module.ts`: rutas/DTO, sesión/permisos, CSRF, no-store, frecuencia y traducción segura de errores.
- `backend/src/contributions/infrastructure/contribution-ledger.ts`: mismo núcleo de importes/cupos/historial, reutilizado en la transacción del simulador; confirmación bloqueada si el recibo ya fue compensado.
- `backend/src/shared/infrastructure/http/write-budget.ts`: extracción del límite PostgreSQL existente para reutilizarlo sin copiar la lógica; mantiene el comportamiento previo de campañas.
- `backend/src/shared/infrastructure/database/migrations/1792540800000-DemoPayments.ts`: proveedor exclusivamente DEMO, permiso propio y cuatro tablas de extensión; grants de columnas, sin modificar SQL/inventario oficial ni crear cuentas/aportes.
- `backend/src/audit/audit-retention.ts` y `backend/scripts/drill-recovery.mjs`: retención de detalle con recibos pendientes y recuperación de los nuevos registros.

Se aplicaron SRP (HTTP, comparación, orquestación/persistencia), DRY (ledger y límite compartidos), KISS/YAGNI (sin SDK bancario, colas, broker, dependencias nuevas ni QR bancario ficticio) y transacciones/idempotencia. No se añadieron interfaces o patrones artificiales para llenar una lista. La compensación separada evita descontar de la vista oficial un dinero que nunca ingresó; no es una implementación oculta de devoluciones.

## Recorrido técnico de demostración

El [contrato DEMO 0.5](contrato-pagos-demo-0.5.md) contiene cuerpos y rutas. Preparar catorce migraciones, habilitar la bandera explícitamente y mantener NODE_ENV development/test. Sesión válida y campaña publicada, sin exigir KYC para el aporte de prueba según ADR-012.

1. Crear checkout con amount decimal string, moneda de campaña, recompensa solo para REWARD/PRESALE y demoConsent true. Guardar contribution.id/paymentId; comprobar que aún no sube recaudación.
2. Repetir la misma clave/cuerpo: mismos registros. Cambiar el monto con la misma clave: conflicto. Intentar leer/simular el pago desde otra cuenta: 404.
3. Simular CONFIRMED; consultar estado e ingreso oficial. Repetir la misma clave o aviso idéntico con otra clave: el ingreso aumenta una sola vez. Un aviso FAILED posterior no desconfirma el pago.
4. Para un intento fallido/vencido, reintentar el mismo aporte con otra clave/consentimiento. Cambia el paymentId, no el contributionId; el intento anterior sigue consultable y no se borra.
5. En las pruebas automatizadas se envejece una reserva **sintética en QA** con administración de BD; no modificar fechas de campañas reales para demostrar. Su confirmación tardía se conserva como NEEDS_REVIEW y no suma recaudación. FINANCE puede ejecutar expiración persistente por lotes.
6. FINANCE crea un lote para el día UTC y moneda del recibo. Una notificación repetida no suma dos veces totalProvider. La falta de confirmación interna aparece como MISSING_INTERNAL; cerrar o RECHECK sin evidencia se rechaza.
7. Otra persona de FINANCE puede COMPENSATE_DEMO con motivo. Queda un comprobante único de ensayo y originalStatus preservado. Ni `refund` ni recaudación cambian; no afirmar que se envió dinero. Repetir no duplica. Cerrar revalida que no quedan diferencias sin resolver.
8. Diferencias de monto, referencia ambigua o falta de evidencia no permiten «ignorar»/forzar cierre. Para el ensayo, las alteraciones se generan solo en fixtures administrativos de la integración, nunca desde una ruta pública. Un lote cerrado conserva su corte; nuevas operaciones requieren otro.

No hay nueva pantalla que revisar en este incremento: la demostración es HTTP/PostgreSQL y deja contratos disponibles para el equipo. No se declara prueba manual visual ni aceptación de las pantallas de Alison.

## Verificación

**369 casos distintos aprobados**, sin fallos, cancelaciones ni omisiones en las ejecuciones finales:

| Ejecución | Casos | Resultado |
| --- | ---: | --- |
| Raíz: `bun run check` | 169 frontend | Lint, tipos, tests y build aprobados. Aviso de paquete Vite de 552.08 kB / 162.42 kB gzip conservado. |
| Backend: `corepack pnpm run check` | 165 backend + 8 ADMIN local | Lint, tipos, tests y build aprobados. |
| QA backend: integración completa con `ALLOW_DB_TEST_WRITES=true`, `DB_TEST_RESTART=true` | 27 PostgreSQL/HTTP | Suite completa final 27/27, aproximadamente 292 s. Reinicio real y recuperación de respaldos incluidos. |

Las repeticiones de la suite y los ensayos dirigidos son comprobaciones adicionales, no se suman como casos distintos. Las primeras ejecuciones detectaron dos errores del fixture (nombre enum de preventa y fecha de expiración incompatible con su creación) y una expectativa antigua de permisos básicos; se corrigieron sin debilitar restricciones ni omitir tests. La línea «Migration failed» de la prueba de base incompleta es el rechazo esperado de ese escenario negativo, cuyo test aprueba.

El escenario DEMO recorre API real y PostgreSQL con cuentas/campañas sintéticas: bandera apagada/producción, consentimiento, tipos/campos extra, CSRF, identidad/privacidad, importes, monedas, donación y último cupo de preventa concurrente; claves y UUID con mayúsculas equivalentes; avisos repetidos, ingresos únicos, reintentos/expiración, cuarentena tardía durable, cinco clasificaciones de conciliación, recontraste/compensación, prohibición de resolver compensación propia, cierre protegido y permisos revocados. Prueba frecuencia compartida entre dos instancias de API, permisos SQL de recibos/compensaciones, responsable/motivo, auditoría y recuperación con registros presentes. El núcleo conserva además los hashes de idempotencia internos previos al consentimiento explícito DEMO.

La prueba administrativa altera solo fixtures de QA para generar discrepancias imposibles de enviar desde los DTO públicos. Verifica que no se puedan cambiar importes de recibos ni borrar compensaciones con `brotar_app`. Consulta adicional: DELETE de reconciliation y demo_event denegados; UPDATE de amount denegado y UPDATE de processing permitido. No se rebajaron permisos para superar las pruebas.

Después de la suite, se repitió la preparación S2 y la verificación de inventario/permisos siguiendo README: **14 migraciones**, `pending:false`, 59 tablas oficiales, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 FK. Una API de QA arrancó y `/api/health/ready` respondió **200/database=connected** tanto directo (3019) como por Vite (5193). Checkout sin sesión respondió **401**, sin crear aportes. Es un smoke HTTP, no una prueba visual de pantallas nuevas.

Limpieza verificada: cero recibos DEMO, compensaciones, metadatos de lotes y cuentas sintéticas con prefijo demo en la base QA tras el ensayo. Los respaldos sintéticos de recuperación quedan fuera de Git. El backend probado de QA coincidió por hash con los 53 archivos backend modificados/no rastreados del árbol local; el SQL oficial conserva el hash documentado. `git diff --check` aprobado. No se añadieron dependencias/lockfiles ni se movieron referencias Git.

## Infraestructura y límites

Ensayos sobre la copia aislada `brotar-s3-ricardo-20261019`, proyecto Docker del mismo nombre, puerto PostgreSQL **15443**. No copiar esos puertos/credenciales al README de instalación normal. No se migró, restauró ni purgó la base original para este ensayo. La migración 14 queda en el repositorio; para usar el incremento en una instalación existente seguir respaldo/migración de README §24 y activación §28.

Al terminar se cerraron los servidores temporales de QA y se detuvo únicamente ese contenedor, conservando su volumen. Docker quedó respondiendo. Los 88 archivos modificados/no rastreados del árbol local coincidieron con la copia de QA; las referencias HEAD/DEV/main permanecieron iguales y la planificación registra published false. No se publica este incremento ni se deja una copia de pruebas ocupando la aplicación del usuario.

Docker volvió a arrancar tras aislar sus dos directorios de sockets inaccesibles, conservados con sufijo `.stale-20261021-…` para recuperación. No se borraron bases ni volúmenes, no se hizo factory reset ni se instaló una actualización de Docker. Los respaldos sintéticos contienen datos de prueba y quedan fuera del repositorio, en carpetas privadas de ensayos.

El SQL oficial conserva SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`. No cambian dependencias/lockfiles. El aviso de Vite por paquete grande sigue siendo una optimización pendiente; no se oculta aumentando su umbral.
