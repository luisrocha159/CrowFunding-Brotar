# Contrato HTTP de pagos DEMO · 0.5

> Actualización local 23/10/2026: los contratos HTTP 0.5 se conservan. La interfaz integrada ya existe en `/apoyo-demo`, con QR **ilustrativo no pagable**, resumen, consentimiento, estado y reintentos. Se conecta desde la selección de Alison y desemboca en historial/comprobante. El panel separa `demoTotals` del simulador interno y `totals` fuera de sandbox. La instalación vigente requiere **20 migraciones** (README §30); las menciones a 14 y UI pendiente abajo describen el corte histórico del 21/10. Correo y legal siguen pendientes.

21/10/2026 · RicardoDev local · S3-01, S2-19/S3-02 y S3-07. Complementa los [contratos generales](contratos-sprint-3.md). No se implementan aquí las pantallas asignadas a Alison ni un proveedor bancario. El QR es **contenido no pagable**, todavía no una imagen/componente QR del frontend.

## Preparación y seguridad común

Aplicar catorce migraciones siguiendo README §24, sin reinstalar SQL ni borrar volúmenes. La última configura `BROTAR_INTERNAL_DEMO` y sus recibos/conciliaciones, pero no crea cuentas, concede FINANCE a personas ni crea pagos. El simulador está apagado por defecto. En la terminal del backend, tras migrar:

```powershell
$env:DEMO_PAYMENTS_ENABLED='true'
$env:NODE_ENV='development'
corepack pnpm run dev
```

Alternativamente, agregar `DEMO_PAYMENTS_ENABLED=true` al `.env` **ignorado**, sin publicarlo. Reiniciar API. Para deshabilitar, poner false/quitar la variable y reiniciar. `NODE_ENV=production` o desconocido siempre deniega sus rutas, incluso con la bandera true. La habilitación en development no convierte un despliegue compartido en un entorno autorizado para dinero real.

Todas las rutas exigen sesión cookie HttpOnly y permisos vigentes, responden `Cache-Control: no-store`. En frontend usar `credentials: 'include'`. En POST incluir JSON, `X-Brotar-Request: 1` y origen permitido; no enviar cookies/tokens en el cuerpo. Los DTO rechazan campos desconocidos y conversiones implícitas. Ninguna ruta es un webhook anónimo ni acepta proveedor, usuario, comisión, importe confirmado o referencia externa elegidos por el navegador.

Escritura limitada a 20 operaciones por minuto por cuenta **y** IP real, compartida por todos los procesos/instancias mediante PostgreSQL. No se acepta X-Forwarded-For como IP de confianza. 429 incluye `Retry-After: 60`; no cambiar de clave para sortear el límite.

## Aporte propio y boleto de ensayo

| Método y ruta con prefijo `/api` | Permiso | Datos |
| --- | --- | --- |
| POST `/demo-payments/checkout` | contribution.write.own | campaignId UUID, rewardId UUID/null opcional, amount decimal string positivo de hasta 12 enteros y 2 decimales, currencyCode ISO de tres mayúsculas, requestKey UUID v4, demoConsent true |
| GET `/demo-payments/:paymentId` | contribution.read.own | Solo el titular del aporte; un pago ajeno/inexistente devuelve el mismo 404 |
| POST `/demo-payments/contributions/:contributionId/retry` | contribution.write.own | requestKey UUID v4 nuevo para el nuevo intento y demoConsent true |
| POST `/demo-payments/:paymentId/simulate` | contribution.write.own | requestKey UUID v4 y outcome PENDING/CONFIRMED/FAILED/EXPIRED; solo el titular |

Ejemplo de checkout, reemplazando identificadores por los de una campaña publicada y una clave generada una vez por operación:

```json
{"campaignId":"UUID-CAMPANA","rewardId":null,"amount":"10.50","currencyCode":"BOB","requestKey":"UUID-V4-OPERACION","demoConsent":true}
```

El servidor valida publicación, fechas, moneda, mínimo y modalidad. DONATION no lleva recompensa; REWARD/PRESALE llevan una recompensa activa de esa misma campaña, mínimo y cupo. La reserva dura hasta 30 minutos o el fin de campaña, lo que ocurra primero. No usar floats para importes. Se conserva `demoConsent` en el intento, no como aceptación legal definitiva.

Checkout/retry devuelven `{mode:"DEMO",label,contribution,ticket}`. `contribution` conserva el contrato propio anterior; `ticket` contiene paymentId, contributionId, reference del aporte, amount string, currencyCode, status del intento, attempt, expiresAt ISO, expired, mode, label, `payable:false` y `qrPayload:"BROTAR-DEMO:<paymentId>"`. Sin URL, cuenta bancaria ni instrucciones de transferencia. El frontend debe mostrar prominentemente **SIMULACIÓN · SIN DINERO REAL · NO PAGAR**, y no reemplazar ese contenido por un QR bancario.

Repetir la misma requestKey y datos devuelve el registro vigente, no otro aporte/intento. Cambiar los datos con la misma clave devuelve 409. Tras un fallo de red, consultar el estado y reutilizar esa clave; nunca inventar éxito. Un reintento de aporte confirmado o con intento abierto se rechaza. Reintentar un aporte fallido/vencido conserva los intentos previos y revalida las condiciones vigentes y cupos. El consentimiento de ensayo se exige de nuevo. Un aporte mezclado con otro proveedor no se reintenta por esta ruta.

## Confirmación simulada y avisos tardíos

Ejemplo:

```json
{"outcome":"CONFIRMED","requestKey":"UUID-V4-AVISO"}
```

El servidor reconstruye importe/moneda originales, proveedor interno, referencia `DEMO-<paymentId>` y comisión cero. La entrada interna del ledger no se publica como endpoint. La respuesta es `{mode,label,eventId,paymentId,status,observedStatus,processing,reasonCode,replayed}`. HTTP 200 significa que se registró/procesó el **aviso**, no que el pago necesariamente se confirmó:

| processing | Qué mostrar |
| --- | --- |
| APPLIED | Consultar status vigente: un aviso antiguo no desconfirma ni confirma por sí solo |
| NEEDS_REVIEW | Confirmación observada no aplicable: recibo conservado para Finanzas, sin sumar recaudación ni reabrir el intento |
| COMPENSATED | El recibo ya tiene compensación DEMO; no intentar cobrar ni confirmar otra vez |
| RECONCILED | Finanzas contrastó después el recibo con evidencia coincidente; se conserva el historial |

Una repetición de la misma clave no crea otro recibo; otra clave con la misma confirmación puede ser otro aviso, pero la conciliación lo cuenta como una sola transacción por pago/referencia/importe. `status` se consulta vigente en los replays, no se devuelve un estado histórico obsoleto. No hay más de un pago confirmado por aporte ni referencia de pago repetida por proveedor. Fallos de negocio al aplicar se aíslan con SAVEPOINT: se confirma la recepción del aviso; fallos de BD desconocidos revierten la operación completa y no se ocultan como un éxito.

Expirar se puede invocar mediante POST `/api/admin/finance/demo/expire` con `{ "limit":100 }`, permiso finance.operate; admite entero 1–100, solo aportes del proveedor interno. Devuelve mode,label,expired. No hay cron oculto. La disponibilidad ya ignora reservas vencidas antes del mantenimiento. No confundir GET de ticket.expired con expiración persistida.

## Conciliación DEMO

FINANCE puede operar; FINANCE/ADMIN/AUDITOR pueden consultar mediante finance.read. AUDITOR nunca escribe aunque acumule FINANCE. ADMIN no recibe finance.operate automáticamente. El servicio vuelve a comprobar rol/permiso vigente dentro de la transacción. No cambiar roles directamente en DB para uso normal: ADMIN usa el formulario de responsabilidades existente.

| Método y ruta `/api/admin/finance/demo` | Cuerpo/consulta |
| --- | --- |
| GET `/reconciliations?limit=20&cursor=UUID` | limit 1–50, cursor del último lote; devuelve mode,label,items,nextCursor |
| GET `/reconciliations/:id` | Lote DEMO y hasta 500 referencias de su instantánea |
| POST `/reconciliations` | from/to fechas reales AAAA-MM-DD, inclusivas UTC, máximo 31 días; currencyCode; requestKey v4 |
| POST `/reconciliations/:id/items/:itemId/resolve` | action RECHECK/COMPENSATE_DEMO; reason legible de 20–500 caracteres |
| POST `/reconciliations/:id/close` | confirmed true |

Cada lote separa una moneda y congela totalInternal, totalProvider, difference **brutos** y snapshotAt. No agrega BOB/USD ni infiere tipo de cambio. Períodos con más de 1000 registros distintos de cada origen o 500 referencias se rechazan para que se acoten, sin entregar un lote parcial. La fecha de proveedor es la primera observación de cada transacción, no cada aviso repetido. Repetir la clave de creación reproduce el lote; reutilizarla para otros datos se rechaza.

Las clasificaciones son MATCHED, MISSING_INTERNAL, MISSING_PROVIDER, AMOUNT_MISMATCH y DUPLICATED. El detalle incluye la referencia de proveedor (`reference`), el identificador de pago (`paymentId`) y la referencia legible de aporte (`internalReference`, null si no hay relación inequívoca), más `internalStatus` vigente. El lote conserva `createdBy`/`closedBy` y cada resolución `resolvedBy`/`resolvedAt` y `reason`, sin exponer datos personales de contacto. Una referencia asociada a pagos/observaciones contradictorias se marca DUPLICATED y no se compensa automáticamente. Se conserva `originalStatus` aunque el ítem pase a RESOLVED. No existe acción «ignorar» ni modificación de importes para forzar el cuadre.

RECHECK exige evidencia actual coincidente por esa referencia/moneda; también reconoce una compensación DEMO previamente registrada y compatible. Si aún falta evidencia o el importe difiere, responde 409 y el ítem sigue abierto. Las correcciones se verifican contra el estado vigente, que puede ser posterior a la instantánea; no se reescriben los totales originales ni se acredita una coincidencia retroactiva del período.

COMPENSATE_DEMO solo resuelve un recibo confirmado simulado inequívoco sin confirmación interna, cuyo importe/moneda/referencia coinciden con el intento canónico. FINANCE debe ser otra persona distinta del titular. Registra un comprobante de compensación interno, único por pago y referencia, y marca los avisos correspondientes COMPENSATED. No modifica `public.refund`, no crea dinero ni resta de una campaña un importe que nunca ingresó. Confirmar ese intento después está bloqueado también en el ledger. La compensación es **solo prueba**, no una transferencia ni un reembolso de un pago confirmado; S3-09 sigue pendiente para eso.

Cerrar exige todos los ítems MATCHED/RESOLVED y revalida evidencia actual o compensación compatible. No permite diferencias reconocidas pero sin resolver. Cerrar otra vez es idempotente. Un lote cerrado no se reabre ni se reescribe: crear otro para nuevos avisos/correcciones, conservando el anterior. Un ítem resuelto con la misma acción/motivo no duplica la compensación; otra resolución se rechaza. Las diferencias brutas del corte siguen visibles incluso después de compensar; no son un saldo neto ni importe desembolsable.

## Errores y alcance de integración

400 para DTO, fechas, moneda inexistente o importe inválido; 401 sin sesión; 403 sin permiso/CSRF o compensación propia; 404 con simulador apagado/producción o recurso privado no disponible; 409 para conflictos de estado, claves, conciliación/marcadores/lotes demasiado grandes; 429 frecuencia; 503 base no disponible. Errores desconocidos no exponen SQL/credenciales ni se convierten en listas vacías.

La migración no reescribe el SQL oficial ni añade tablas en public. La API no puede cambiar importes/referencias de recibos guardados ni borrar recibos/compensaciones; sí puede registrar nuevas observaciones y actualizar su estado de procesamiento. ADMIN de PostgreSQL sigue teniendo capacidad de mantenimiento: esto no es almacenamiento criptográficamente inmutable. La retención de auditoría mantiene el detalle si existen avisos NEEDS_REVIEW/RECEIVED; nunca purga recibos financieros con esa política.

Listo para integrar desde frontend: backend de checkout, boleto no pagable, simulación, reintentos, vencimientos y conciliación de ensayo. Pendientes: UI/QR renderizado/comprobante final de Alison, aceptación integral, KYC/KYB aplicable a publicación/desembolso, resultado/ciclo de campaña, desembolsos y devoluciones de aportes confirmados, incidencias y correo real. No presentar este incremento como cierre de esas tareas ni como pasarela real.

## Ampliación compatible del 22/10 · consulta de pendientes e interfaz de conciliación

El texto anterior conserva el corte del 21/10. Se añade `/administracion/conciliacion` y detalle `/administracion/conciliacion/:id`, con las operaciones administrativas del contrato, confirmaciones explícitas, motivo y estados reales de carga/vacío/error. El checkout, QR y comprobantes de Alison siguen separados. No hay otra migración ni cambio de cuerpos existentes.

| Método y ruta con prefijo `/api/admin/finance/demo` | Contrato de lectura |
| --- | --- |
| GET `/currencies` | `finance.read`; devuelve `[{code,name}]` del catálogo persistido. Incluye monedas históricas inactivas para conciliar registros previos; esto no habilita nuevos aportes en ellas. |
| GET `/pending?from=AAAA-MM-DD&to=AAAA-MM-DD&currencyCode=BOB&limit=20&cursor=UUID` | `finance.read`; fechas obligatorias inclusivas UTC, máximo 31 días y moneda existente. `limit` string 1–50, cursor UUID opcional. Rechaza arrays y campos extra. Devuelve `{mode,label,items,nextCursor}`. |

Cada pendiente contiene `id` de pago, `contributionId`, `campaignId`, `campaignTitle`, `reference` del aporte, `amount` string, `currencyCode`, `status`, `createdAt` ISO, `expiresAt` ISO/null, `expired` boolean y `needsReview` boolean. No devuelve correo, documentación ni payload del proveedor. Se incluyen intentos INITIATED/PENDING y aquellos con avisos RECEIVED/NEEDS_REVIEW, aunque el intento ya sea terminal. Una compensación registrada elimina la necesidad de revisión del aviso, no modifica el importe histórico.

El filtro se aplica a `payment.created_at`, no a la fecha del recibo: para contrastar un aviso tardío, crear el lote del día UTC de su primera observación. Las reservas vencidas se señalan aunque todavía no haya corrido el mantenimiento. No se cuentan pendientes como recaudación ni se fuerza su confirmación/expiración mediante GET.

Paginación por `(created_at,id)`, sin OFFSET ni redondear microsegundos. El marcador debe pertenecer al proveedor y moneda de la consulta. Puede haber dejado de estar pendiente al avanzar: conserva su posición para no perder el recorrido. La vista es vigente, no una instantánea congelada de pendientes; actualizar desde el inicio permite descubrir filas nuevas o cambios. Los lotes sí conservan su corte propio.

La UI valida respuestas, identificadores, importes exactos, diferencia aritmética, estado y resoluciones; una respuesta inválida no se convierte en éxito. Mantiene una clave de creación por período/moneda para reintentar un envío incierto; otras claves siguen permitiendo crear nuevos cortes históricos. Resolver/cerrar/expirar reutiliza las operaciones idempotentes del servidor. Cambiar acción o motivo reinicia la confirmación de resolución. Operaciones concurrentes o permisos revocados se revalidan en API/BD, no solo ocultando botones.
