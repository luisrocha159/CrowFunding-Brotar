# Cuatro tareas de Ricardo · cierre técnico local DEMO

Fecha: 23 de octubre de 2026. Rama: **RicardoDev**, trabajo sin commit/push. Responsable de las cuatro tareas: Ricardo. Fuente funcional: reparto local y ADR-012/ADR-013 del equipo, no una autorización bancaria ni legal externa.

## Alcance y orden

| Orden | Tarea | Resultado implementado |
| --- | --- | --- |
| 1 | S2-08 · Revisar casos KYC y KYB | Colas persona/organización, expediente y documentos privados, decisiones motivadas, revisor/fecha, corrección e historial; distintivos públicos DEMO mínimos. |
| 2 | S3-09 · Gestionar devoluciones | Solicitud propia, autorización y resultado separados, total/parcial, límites/reservas, trazabilidad, estado para el titular y referencias DEMO únicas. |
| 3 | S3-11 · Atender y resolver disputas | Apertura sobre incidencia/aporte/pago propios, asignación, prioridad, mensajes compartidos/notas internas, información adicional, escalamiento, resolución, reapertura y cierre. |
| 4 | S3-02 · Asegurar importes y estados del aporte | Estados derivados de obligaciones reales del ensayo; integración devolución/disputa sin duplicar recaudación, reservas o confirmaciones; avisos tardíos y referencias protegidos. |

El cierre es **del alcance técnico del MVP sintético autorizado**. No certifica identidad real, dinero real, aceptación del docente/líderes ni el MVP entero. Correo real y textos legales definitivos quedan pendientes por instrucción del usuario.

## S2-08 · revisión de identidad

Implementación: `backend/src/verifications/domain/review.ts`, repositorio/controlador de revisión, `transaction-access.ts`, migración 21; frontend `src/features/verifications/VerificationReviewPage.tsx`, cliente de revisión y distintivos.

1. El titular captura y envía documentos sintéticos según una política DEMO activa/versionada. No se crean requisitos legales ficticios.
2. COMPLIANCE o ADMIN consulta la cola, filtrada por persona/organización y estado, 20 registros por página. AUDITOR solo no obtiene acceso universal a documentos de identidad.
3. Se inicia PENDING → IN_REVIEW. Solo desde revisión se puede APPROVED, REJECTED o REQUIRES_INFO. Motivo de 20–500 caracteres y control de versión.
4. Aprobar exige validar explícitamente **cada documento actual**, datos/aceptación de la política vigente y documentos existentes. No se permite autoaprobar al titular, al remitente, al cargador de documentos ni a un miembro vigente de la organización.
5. KYB exige representante autorizado vigente con KYC DEMO aprobado. No sustituye la gestión completa de representantes/destinos que sigue pendiente.
6. Se conservan instantáneas anteriores y de revisión, estado, observaciones, responsable y fecha. Corrección/reenvío del titular reinicia la evaluación documental actual sin borrar historial.
7. Descarga privada con permiso vigente, no-store y nosniff. La revisión revalida permisos después de esperar bloqueos. Una revocación/vencimiento no se solventa volviendo a entrar.
8. El distintivo público solo expone código, etiqueta DEMO y fecha pertinente de una revisión vigente; nunca documentos, campos declarados o identidad del titular. La decisión no activa cuentas, concede roles, publica campañas ni acepta términos legales.

Pruebas: `backend/test/verification-review.test.ts`, `backend/integration/verification-review.integration.test.ts`, `tests/verification-review.test.tsx`. Incluyen corrección, autoaprobación, aislamiento documental, versión anterior, expiración del permiso mientras espera, revocación y limitación de frecuencia.

## S3-09 · devoluciones DEMO

Implementación: `backend/src/refunds`, migraciones 22/23, `src/features/refunds`, enlaces del detalle de aportes. Sin proveedor externo ni datos bancarios.

| Estado | Acción | Resultado |
| --- | --- | --- |
| Sin solicitud | Solicitud del titular | REQUESTED, reserva de importe, no salida de dinero. |
| REQUESTED | FINANCE autoriza | PROCESSING, todavía no es una devolución completada. |
| REQUESTED | FINANCE rechaza | FAILED, libera la reserva ordinaria o devuelve la reserva a la disputa. |
| PROCESSING | FINANCE completa DEMO | REFUNDED, fecha y referencia `DEMO-REFUND:<UUID>`. |
| PROCESSING | FINANCE registra fallo DEMO | FAILED, sin descontar dinero ficticiamente. |

Controles:

- Pago canónico DEMO confirmado y del solicitante; importe decimal string positivo con hasta dos decimales, nunca float/redondeo silencioso.
- No exceder pago menos devoluciones completadas y solicitudes activas. Una sola solicitud REQUESTED/PROCESSING por pago; restricción nativa de total de devoluciones y unicidad adicional DEMO.
- La campaña se bloquea antes del pago; se descuentan desembolsos comprometidos, devoluciones y reservas de disputa por moneda. No se interpreta recaudación bruta como todo el saldo libre.
- Causas cerradas; cancelación/meta no alcanzada deben corresponder al estado/modelo del proyecto. Disputa resuelta exige su referencia y el importe exacto recomendado.
- FINANCE no opera su propio aporte/solicitud ni la campaña propia o de su organización. ADMIN/AUDITOR consultan; ADMIN solo no recibe `finance.operate`.
- Clave estable por intención y huella del contenido: mismo reintento devuelve la misma operación; cambiar contenido con esa clave da 409. Versión obsoleta no sobrescribe decisiones.
- La API no puede modificar el importe original ni editar/eliminar su historial de decisiones. El administrador de PostgreSQL conserva sus facultades de mantenimiento: no es un archivo criptográficamente inmutable.

Pruebas: `backend/test/refunds.test.ts`, `backend/integration/refunds.integration.test.ts`, `tests/refunds.test.tsx`. Cubren importes inválidos, simultaneidad/idempotencia, exceso, compromiso de desembolso, rechazo/fallo, parcial/total, privacidad, roles, revocación, referencias y estados resultantes.

## S3-11 · atención de disputas

Implementación: `backend/src/disputes`, migración 24, `src/features/disputes`. Reutiliza las tablas oficiales `dispute`, `support_case`, mensajes y evidencias privadas. No agrega tablas de negocio a `public` ni reescribe el SQL oficial.

Flujo: incidencia del aporte → selección de pago DEMO propio confirmado → OPEN → SUPPORT asume → UNDER_REVIEW. Pedir información lleva a AWAITING_RESPONSE; responder como titular retoma investigación. Escalar lleva a ESCALATED y libera la asignación, no el dinero reservado. Otro SUPPORT autorizado puede asumir con motivo.

La bandeja se filtra por estado/prioridad. Prioridad inicial del caso 3; pago no reconocido se eleva a 1, ajustable justificadamente por SUPPORT. ADMIN/AUDITOR consultan; solo SUPPORT decide y no puede atender como resolutor su propio aporte o campaña vinculada. Las demás acciones requieren ser el responsable asignado.

Mensajes compartidos y notas internas son distintos en API y pantalla. El titular nunca recibe notas internas en el JSON ni puede enviarlas. Los motivos de decisión son compartidos, no notas confidenciales. Evidencias se descargan solo con pertenencia/permiso vigente. Historial y mensajes usan páginas explícitas de 20, con totales; no se ocultan registros por un corte silencioso.

### Resolución y separación financiera

1. RESOLVE_NO_REFUND deja RESOLVED y libera la reserva; no descuenta recaudación.
2. RECOMMEND_REFUND fija un importe positivo dentro del saldo, deja RESOLVED y mantiene reserva. **No inserta una devolución ni transfiere dinero.**
3. El titular solicita exactamente la cantidad recomendada. Se enlazan disputa/devolución y se transfiere la reserva a REQUESTED, sin contar dos veces.
4. FINANCE evalúa, autoriza y completa/falla mediante S3-09. SUPPORT no tiene un botón de ejecutar dinero.
5. Si Finanzas rechaza/falla, la disputa recupera reserva y puede revisarse o volver a solicitar la recomendación. No se borra el intento fallido.
6. Solo después del resultado financiero pertinente puede cerrarse. No cerrar con reserva/recomendación pendiente. Una devolución ya completada no se revierte desde Soporte.

Pruebas: `backend/test/disputes.test.ts`, `backend/integration/disputes.integration.test.ts`, `tests/disputes.test.tsx`. Incluyen evidencia privada real, notas ocultas al titular, respuesta, escalamiento, prioridad, autoatención, roles combinados, versión, recomendación excesiva, rechazo/reapertura/reintento, financiación y cierre.

## S3-02 · estados e importes consistentes

La función de dominio `obligationState` y el módulo `payment-obligations.ts` centralizan las consecuencias que antes podrían divergir entre devoluciones y disputas. Los llamadores ya mantienen bloqueados campaña/pago y guardan negocio, estados, eventos y auditoría en la misma transacción.

| Situación | Pago | Aporte | Recaudación |
| --- | --- | --- | --- |
| Pago confirmado, sin obligaciones | CONFIRMED | CONFIRMED | Suma confirmación histórica. |
| Disputa abierta o recomendación/devolución vinculada pendiente | DISPUTED | CONFIRMED | No resta dinero solo por reservarlo. |
| Devolución parcial completada, sin disputa pendiente | CONFIRMED | CONFIRMED | Confirmado menos parte completada. |
| Devolución total completada | REFUNDED | REFUNDED | Pago menos total devuelto. |
| Rechazo/fallo de devolución | Según obligación vigente | CONFIRMED mientras no haya devolución total | No se descuenta una salida que no ocurrió. |

La vista oficial `v_campaign_funding` sigue siendo fuente única; no se agrega contador frontend. Se conservan `confirmed_at`, importe, moneda, referencia y comisión originales. Avisos repetidos/tardíos no reactivan REFUNDED/DISPUTED; un CONFIRMED con otra referencia/comisión sigue rechazado incluso después de una disputa o devolución total. No se reponen cupos automáticamente por devolver un aporte confirmado.

Ejemplo probado: 10.25 BOB confirmado → devolución parcial/recomendada de 3.10 completada → 7.15 BOB netos. Devolver los 7.15 restantes deja 0.00 y pago/aporte REFUNDED. Reintentos y avisos antiguos no cambian ese resultado.

Pruebas: `backend/test/payment-obligations.test.ts`, integración de aportes/devoluciones/disputas, además de las pruebas existentes de último cupo, referencias, reservas, reinicio y rollback.

## Instalación y evidencias

La configuración vigente necesita 24 migraciones: README §31. Actualizar una V2 existente con respaldo, compilación y `node scripts/migrate.mjs up`; nunca restaurar otra vez el SQL inicial sobre datos. Se verificó instalación limpia desde esquema oficial, categorías automáticas y repetición de `up` sin cambios. Readiness exige tablas/permisos nuevos y no confunde conexión con una entrega preparada.

Pruebas de escritura exclusivamente en `C:/Users/rnune/AppData/Local/Temp/brotar-s3-ricardo-20261019`, PostgreSQL del proyecto Docker aislado del mismo nombre. No se cambió el `.env` ni se migró la base original durante este ensayo. No ejecutar la suite de integración sobre datos personales/de presentación: sus fixtures requieren una base aislada y confirmación `ALLOW_DB_TEST_WRITES=true`.

| Verificación | Resultado registrado |
| --- | --- |
| Frontend `bun run check` | 208 pruebas; lint, tipos y build aprobados. |
| Backend `corepack pnpm run check` | 198 pruebas + 8 del aprovisionamiento ADMIN; lint, tipos y build. |
| Integración PostgreSQL/HTTP completa | 35/35 aprobadas, 0 fallos/omitidas, con reinicio y respaldo/restauración. Incluye instalación limpia y repetición de las 24 migraciones. |
| Pruebas focalizadas | 7/7: retención, disputas, tres migraciones, devoluciones y revisión; además revisión KYC 1/1 tras el ajuste de consulta. Las repeticiones no se suman otra vez al total de casos distintos. |
| Refuerzo final de pertenencia | Devolución/revisión repetidas 2/2 con la fuente final: una baja futura no permite autooperar ni autoaprobar hoy. |
| Preparación/migraciones | 24 aplicadas, ninguna pendiente; preparación S2 repetida, categorías y configuración conservadas. |
| Inventario oficial | 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers, 134 FK; privilegios limitados. |
| Readiness QA | HTTP 200, `status:ok`, `database:connected`. |
| Fuente original / copia probada | 517 archivos de código/pruebas/scripts iguales, normalizando únicamente CRLF. |

Tres recorridos automatizados de navegador sobre API/DB reales: revisión y revocación de COMPLIANCE; devolución parcial con validación local/confirmación reiniciada/ADMIN solo lectura; disputa desde incidencia hasta respuesta, recomendación, devolución financiera y cierre. Capturas revisadas de escritorio/móvil, anchuras 375/812/320 y movimiento reducido, sin desbordamiento horizontal ni errores JS. Los helpers y capturas del ensayo están en `tmp/four-tasks-evidence` dentro de la copia QA, no contienen credenciales reales ni se publican.

Advertencia no bloqueante: Vite informa bundle principal mayor de 500 kB. El build termina correctamente; dividir código se conserva como optimización, no como requisito financiero ni garantía de rendimiento de producción.

El primer ensayo completo detectó una incompatibilidad de texto en el rechazo de `down`: la migración ya impedía la reversión destructiva, pero su mensaje no seguía el contrato existente. Se corrigió el mensaje, se revalidó la instalación limpia y la regresión completa posterior pasó 35/35. Las pruebas visuales también ajustaron sus selectores para distinguir el encabezado del expediente de los encabezados históricos; no se modificó el producto para ocultar errores de la prueba.

Después se reforzó la pertenencia vigente con baja futura. Su primera fixture de devolución fue rechazada por el trigger oficial porque faltaba incorporar al creador como miembro de la organización; además expuso un defecto de limpieza del ensayo. Se corrigieron fixture y `finally`, se retiraron exclusivamente una organización y cinco cuentas sintéticas identificadas de esa ejecución QA, y la repetición final pasó 2/2. Esos datos son recreables; no se eliminaron datos de la base original. La copia final vuelve a coincidir con los 517 archivos fuente originales. Total **449 pruebas distintas aprobadas**, sin volver a sumar las repeticiones ni los tres recorridos visuales como casos unitarios.

Los servidores temporales API/Vite usados en QA se detuvieron al terminar. No se abrió ni manipuló la sesión del usuario en 5193; para usar las funciones nuevas en su instalación original se debe realizar la actualización con respaldo y 24 migraciones de README §31, sin copiar la base QA.

Reproducir las pruebas automatizadas de repositorio: raíz frontend `bun run check`; `backend/` `corepack pnpm run check`. Para PostgreSQL, únicamente en copia aislada preparada con configuración propia: `corepack pnpm exec tsc -p tsconfig.test.json`, habilitar `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=true`, y ejecutar `node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js`. Quitar esas variables al terminar. No copiar las credenciales QA a otra instalación ni convertir este comando en arranque cotidiano.

## Qué permanece pendiente

Correo real, contactos verificados y textos legales aprobados/versionados siguen abiertos (S1-12, S3-26, S1-11). No se configuró SMTP ni se compartieron contraseñas. Tampoco se declaran terminadas las tareas pendientes de Santiago/Alison ni los desembolsos, destino/representación completos, rendición, cumplimiento de recompensas y ciclo integral de campaña.

De las 18 tareas de Ricardo en el Sprint 3 ampliado, este incremento suma cuatro cierres técnicos a los cuatro anteriores: **8 cerradas en alcance DEMO y 10 aún abiertas/en curso**. Restan S1-12, S3-08, S3-15, S3-16, S3-18, S3-19, S3-20, S3-21, S3-23 y S3-26. Auditoría/permisos/QA están comprobados para lo existente, pero sus tareas globales siguen abiertas hasta integrar los módulos restantes. S3-20 no se cierra porque el usuario ordenó no publicar.

El registro local de planificación se actualiza por separado de los estados históricos de Trello; no se cambian responsables, tarjetas ni aceptación externa. DEV y origin/DEV conservan el commit `99d70d7168654881b05ba4505ac3e0a4a0797e42`; RicardoDev conserva HEAD `bd8f566e932de42256b8ddaf2d1e20b4f6dd298d`, con los cambios locales sin añadir al índice. Un cierre técnico no equivale a ausencia absoluta de bugs ni autorización de producción.
