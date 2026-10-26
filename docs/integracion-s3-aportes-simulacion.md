# Aportes propios y simulación · 22/10/2026

## Alcance implementado

- S3-03: panel patrocinador con conteos reales propios, importes históricos por moneda, devoluciones y disputas separadas, guardadas/seguidas, novedades públicas y accesos a consultas existentes. Los proveedores `is_sandbox=true` quedan fuera de los importes; la tabla de simulación nunca entra en esas consultas.
- S3-04: historial de aportes propios, páginas de 20, filtros por estado **del aporte** y fecha de creación. `from`/`to` usan días de `America/La_Paz`, incluyendo el día final. La API no acepta actor enviado por el cliente y no filtra aportes por estado de campaña: los cerrados permanecen consultables. Campañas ya no públicas conservan una referencia propia con título oculto.
- S3-05: detalle con estados distintos de aporte, cada intento de pago, devolución y disputa. Proyección explícita sin `provider_payload`, datos de instrumentos, direcciones, documentos ni mensajes internos. Solo el titular puede consultar detalle y comprobante. La constancia es informativa, no fiscal: se emite únicamente mientras un pago esté actualmente `CONFIRMED`, con `confirmed_at` e importe/moneda coincidentes. Si no hay constancia, la pantalla consulta el detalle propio y explica el estado vigente de cada intento: `INITIATED`/`PENDING` sin confirmación; `FAILED`/`EXPIRED` sin pago; `REFUNDED` como reembolsado; `DISPUTED` con constancia bloqueada. Un pago confirmado sin coincidencia verificable tampoco genera comprobante. Si cambia a `DISPUTED` o `REFUNDED`, revalidar el enlace devuelve 409 y muestra esos estados; ajeno/inexistente devuelve 404. SANDBOX/DEMO queda marcado como prueba sin dinero real. No se ofrece factura ni comprobante logístico.
- S2-20: simulación persistida en `brotar_extension.support_simulation`. Modos ficticios `TEST_QR` y `TEST_CARD`; estados `INITIATED`, `PENDING`, `CONFIRMED`, `FAILED`, `EXPIRED` circunscritos al ensayo. Referencia `SIM-UUID`; reintento de fallo/expiración conserva identificador e incrementa intento. Una confirmación simulada nunca modifica `contribution`, `payment`, recaudación, devoluciones ni stock.
- S2-18: selección de monto/recompensa para **simulación** con mínimos oficiales y disponibilidad actual. FE y BE validan decimales sin float; BE vuelve a consultar campaña, fechas y recompensa al guardar, reintentar y confirmar el ensayo. No implementa una reserva real, checkout ni confirmación de apoyo financiero.

## Contratos y registro

Importar `ContributionsModule` en el módulo raíz y registrar `ContributionRead1792627200002`. Migración aditiva: permisos de lectura financiera, índice propio de historial y tabla de ensayo separada; no cambia el SQL oficial ni borra datos. El procedimiento inverso exige una migración revisada de conservación.

| Ruta API | Contrato |
| --- | --- |
| `GET /api/me/contributions` | `page`, `status` de aporte, `from`, `to`; página fija de 20 |
| `GET /api/me/contributions/:id` | detalle del titular de sesión |
| `GET /api/me/contributions/:id/receipt` | comprobante informativo verificado, 409 si no corresponde |
| `GET /api/me/sponsor-summary` | conteos propios y montos por moneda, sin sumar monedas |
| `GET /api/me/support-options/:campaignId` | modalidad, moneda, mínimo nullable, elegibilidad y recompensas activas |
| `GET /api/me/simulations` | últimos 20 ensayos propios |
| `GET /api/me/simulations/:id` | recuperación del ensayo propio |
| `POST /api/me/simulations` | `{mode:'SIMULATION',requestId:UUIDv4,campaignId,rewardId:null\|UUID,amount:decimalString,method:'TEST_QR'\|'TEST_CARD'}` |
| `PUT /api/me/simulations/:id` | `{mode:'SIMULATION',expectedVersion,state}` |

Los controladores requieren `REGISTERED_USER` vigente. Las escrituras añaden `SessionMutationGuard`; `RoleGuard` conserva AUDITOR en solo lectura. POST serializa la clave de ensayo por cuenta: mismo contenido devuelve el mismo registro; reutilizar la clave con contenido distinto genera 409. PUT bloquea la cuenta y la fila y comprueba versión para evitar doble transición. Tras los bloqueos, ambas escrituras vuelven a consultar estado de cuenta, acceso básico y roles vigentes; rechazan AUDITOR, suspensión o rol expirado aunque el guard HTTP ya haya pasado. El reloj de esa comprobación usa `clock_timestamp()` para no congelar vencimientos al inicio de la transacción. La confirmación de prueba no es una transición financiera aprobada.

Frontend: `ContributionPages.tsx` exporta `ContributionsPage`, `ContributionDetailPage`, `ContributionReceiptPage` y `SponsorDashboardPage`. Rutas `/mis-aportes`, `/mis-aportes/:id`, `/mis-aportes/:id/comprobante`, `/panel-patrocinador`. `SimulationPage.tsx` usa `/simulacion-apoyo?campaignId=UUID` para seleccionar y `?id=UUID` para recuperar. Los enlaces de incidencias usan `/mis-incidencias` y `/mis-incidencias/nueva?campaignId=UUID&contributionId=UUID`.

## Decisiones todavía requeridas a Ricardo

La fuente es la descripción vigente de Trello leída el 22/10 (S2-18, S2-20, S3-03/04/05 y D02/D04/D07/D09), contrastada con el SQL oficial y ADR-006. D09 dice expresamente que las transiciones financieras, permisos, equivalencias visuales y efecto contable continúan pendientes. ADR-006 conserva pagos y reglas financieras fuera del Sprint 2.

1. **S2-18 / D02 / S2-19 / S3-23:** aprobar qué campañas admiten apoyo real, mínimo comercial cuando `min_contribution` está vacío, elección sin recompensa, política de cupos y su reserva/liberación/expiración, confirmación atómica y manejo del cambio de fechas/estado. El ensayo exige un período definido y vigente; no presume que una publicación sin fechas pueda recibir dinero. `minimum:null` se muestra como no registrado, sin inventar un monto.
2. **S3-01/02 / D04/D09:** proveedor autorizado, integración sandbox real, validación y conciliación de eventos, fuente de confirmación financiera, transiciones separadas y efecto contable. Las consultas pueden mostrar registros verificados de esas tablas cuando el módulo responsable los produzca; este trabajo no los fabrica.
3. **S3-05 / D04/D07/D09:** la implementación técnica actual usa los estados ya persistidos, muestra por separado pago/devolución/disputa y emite solo una constancia informativa al titular por pago actualmente confirmado y conciliado con el aporte. Esto basta para el alcance técnico local sin decidir D04/D07/D09: el comprobante no es fiscal, no incorpora tarifas ni reglas comerciales, y no afirma entrega de recompensa. Si el equipo quiere proveedor real, comprobante fiscal, nuevas transiciones o efectos contables, debe aprobar primero las decisiones correspondientes; no están incluidos ni se simulan aquí.
4. **S3-09/11 / D05:** creación, aprobación y ejecución de devoluciones/disputas, plazos y responsabilidades. Aquí se consultan estados existentes; reportar una incidencia no devuelve dinero.
5. **S3-04 / D09:** confirmar las etiquetas visuales definitivas. El filtro actual está explícitamente limitado al estado del aporte; los estados de los intentos de pago se muestran individualmente y nunca se fusionan con él.

No marcar S2-18 completo como selección/reserva real ni S3-01/02 implementados por la existencia de la simulación. S2-20 tampoco reemplaza la validación del proveedor sandbox requerida para el MVP integrado.

## Verificación realizada

- Se escribieron y ejecutaron pruebas fallidas antes de implementar contratos/dominio, seguidas por 6 pruebas frontend de precisión/parsers/estados/UI y 5 pruebas backend de validación, privacidad del caso de uso, elegibilidad y transiciones de ensayo.
- Lint de archivos propios pasó. La suite backend completa pasó **169/169**; la suite frontend completa observada pasó **187/187**. Cambios simultáneos de otros módulos pueden ampliar esos conteos en la integración final.
- Integración HTTP + PostgreSQL real: `backend/integration/contributions.integration.test.ts`, **1/1 pasó**. Usa solo cuentas y filas efímeras de prueba y limpia exclusivamente sus fixtures. Verifica 401/404, día Bolivia, errores de filtro, ausencia de payload privado, sandbox separado, devolución, recibo bloqueado por estado, paginación, campaña cerrada, clave concurrente, versión obsoleta, reintento, nueva sesión y revalidación transaccional de AUDITOR/cuenta suspendida/rol vencido. Comprueba que los conteos de `contribution` y `payment` son idénticos antes/después de simular confirmación.
- Se corrigieron errores descubiertos por PostgreSQL: la fecha oficial de disputa es `opened_at`; TypeORM devuelve `[rows,count]` para `UPDATE ... RETURNING`.
- Logs locales: `/tmp/brotar-s3-contributions-integration.log` y `/tmp/brotar-s3-contributions-backend-suite.log`.
- La verificación de navegador y el typecheck global final se coordinan con el agente integrador. No se afirma aquí aceptación externa, proveedor integrado ni cierre total del MVP. Sin commit, push o despliegue.
