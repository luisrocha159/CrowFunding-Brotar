# Contratos del Sprint 3 · 0.14 · RicardoDev local

## Extensión 0.14 · Cierre de S3-12/13/14 · 28/10/2026

**39 migraciones y 212 rutas**. [Reglas ADR-015](decisiones/ADR-015-cierre-avances-rendicion-colaboradores.md) y [criterios, pruebas y recorridos](cierre-s312-314-2026-10-28.md). Sustituye las diferencias funcionales abiertas de 0.13; legal y aceptación integral siguen pendientes.

- Corrección `PUT /api/campaigns/:id/updates/:updateId/publication`: devuelve sucesora con UUID nueva y `supersedesId`; original conserva `supersededById` en consulta privada. Reintento idéntico recupera sucesora, incompatible 409. Historial paginado abarca la cadena. Público/feed excluyen antecesores y retirados.
- `GET /api/admin/campaign-publications`: página de 20, filtro opcional campaignId UUID, lectura `campaign.review.read`. `PUT /api/admin/campaign-publications/:campaignId/:updateId/withdraw`: `campaign.publish`, sesión/origen/cuota, `{revision,reason,confirmed:true}`; retiro lógico sin alterar finanzas.
- Rendición `SAVE_DRAFT`: mes calendario terminado, primer inicio recortado a ejecución, documento único por mes, gastos dentro del período y sin superposición. Legados conservan límites originales y `reportingMonth:null`; una revisión previa parcial mensual debe completar su mes antes de presentar/aprobar.
- `POST /api/me/accountability/:id/publications`: `{reportId,requestKey,reason,publishConsent:true}`. Titular/representante CREATOR vigente, informe aprobado actual, origen obligatorio y cuota. Confirmación `{reportId,status:'PUBLISHED'}`; reintento idéntico idempotente y clave incompatible 409.
- `GET /api/campaigns/public/:id/accountability?page`: anónimo, campaña previamente pública, página de 20 resúmenes explícitos no retirados. Campos exactos: reportId, reportKind (`MONTHLY|LEGACY|FINAL`), isFinal, periodLabel, periodStart, periodEnd, narrative, varianceExplanation, fundsReceived, fundsSpent, balance, currency, comparison, indicators, publishedAt. Importes decimales string; balance puede ser negativo por uso de saldo anterior. Ningún documento, destino o identificador personal. Final rotulado acumulativo.
- `PUT /api/admin/accountability/:id/publications/:reportId/withdraw`: `campaign.lifecycle.manage`, `{requestKey,reason,expectedVersion:1,confirmed:true}`, origen obligatorio y cuota. Diario separado de aprobación financiera; snapshot permanece inmutable. No se vuelve a publicar un resumen retirado con otra clave.
- `PUT /api/me/organizations/:id/members`: ADD MEMBER/ADMIN o CHANGE→ADMIN responde `{id,version,representationChanged:false,invitationId,status:'INVITED'}`; no crea membresía. Conserva las demás operaciones y añade cuota compartida. Consumir la confirmación, sin anunciar alta efectiva antes de aceptación.
- `GET /api/me/organization-invitations?page&organizationId?`: bandeja propia/gestión autorizada, eventos y allowedActions, 20 por página. `PUT /api/me/organization-invitations/:id`: `{action:ACCEPT|DECLINE|CANCEL,expectedVersion:string,reason,confirmed:true}`. Cuenta/rol/propiedad/origen/cuota, versión y plazo de siete días; revalidación tras bloqueos y transición condicional atómica. ACK `{id,status,version}`; versión resuelta 409, ajena 404, AUDITOR no escribe.

Las notas siguientes son cortes históricos.


## Extensión 0.13 · Integración Santiago/Ricardo/Alison · 28/10/2026

**205 rutas y 36 migraciones**. Inventario regenerado a partir del módulo combinado y comprobado tras compilar; no reemplazarlo por el inventario de una sola rama. Se conserva 0.12 íntegro y se incorporan:

- `/api/{me,admin}/accountability`: consulta, acciones versionadas/idempotentes y descarga privada autorizada. Períodos sin superposición, borradores por revisión, revisión independiente y remanentes DEMO, con comprobantes y reservas. La devolución del beneficiario no crea un reembolso al aportante.
- `/api/administration/parties/users/:id` y `/api/me/organizations/:id/members`: datos básicos/restricción/restauración y membresías con motivo, confirmación y versión. Concesión directa de OWNER/LEGAL_REPRESENTATIVE y transferencia antigua rechazadas; no concede roles globales. Nombres personales conservan la validación de registro/perfil; motivos usan texto significativo sin HTML/controles.
- Solicitudes `/api/{me,administration}/representation-requests` y alta desde organización: propuesta, aceptación/declinación, cancelación y decisión independiente. Aceptar no concede facultades. Aprobar aplica membresía y caduca KYB previo. Petición pendiente bloquea las operaciones sensibles previstas.
- Gestión propia de publicaciones, historial y recompensas en `/api/campaigns/:id/…`; panel del creador con página/ámbito personal o institucional, totales separados por moneda y DEMO. Las versiones de publicación se conservan bajo el mismo identificador; revisar la diferencia con ADR-013 indicada en la evidencia.

El panel administrativo excluye las revisiones periódicas sustituidas de sus alertas, conservando informes históricos sin metadatos de versión para compatibilidad. La ampliación de cierre acumula gastos aprobados por referencia y contempla remanentes; conserva los avisos de soporte de 0.12. Sesión, origen, cuenta/rol vigente, propiedad, versión y revalidación transaccional se comprueban por módulo; el inventario no sustituye esas pruebas.

[Revisión, defectos corregidos, evidencia y límites](revision-integracion-santiago-2026-10-28.md). Legal y diferencias funcionales señaladas continúan abiertas; este contrato documenta la implementación, no aprueba contenido legal ni declara completo el MVP.

## Extensión 0.12 · Panel completo y conversación/avisos de soporte

Nueva `POST /api/me/support-cases/:id/messages`: `{requestId: UUID, body: texto de 20–5000 caracteres}`; sesión/propiedad, CSRF y cuota. También `POST /api/admin/support-cases/:id/messages` requiere `requestId` junto al texto administrativo validado. Responden `{ok:true}` con 200 confirmado; 400 para campos inválidos, 404 para caso ajeno/no disponible, 409 para clave incompatible o caso resuelto/cerrado que no admite una respuesta nueva; AUDITOR no escribe. El detalle propio incorpora `replyAllowed`, y los mensajes administrativos indican `from: reporter|support` sin IDs personales. Reintento con clave/contenido iguales recupera el resultado sin duplicar mensajes ni avisos. Frontend/API deben actualizarse juntos.

El resumen incorpora `asOf` ISO y, solo con sus permisos, `financeAlerts`/`disputeAlerts`. Contadores financieros reales, diferencias sin MATCHED/RESOLVED, pagos distintos por revisar y enlaces a sus colas. Los errores no se convierten en cero. Avisos de soporte transaccionales al titular mediante cola, preferencia y dirección verificada; sin cuerpo privado en el email. La resolución mínima de soporte desde cierre también genera aviso. **32 migraciones y 182 rutas HTTP comprobables**. [Flujos, reglas y pruebas](cierre-alison-panel-soporte-correo-2026-10-25.md). Legal queda pendiente; sin push. La revisión 0.11 siguiente es el antecedente y sus pendientes de panel/conversación se cubren en 0.12.

## Extensión 0.11 · Soporte general y resumen por responsabilidad

Integración local de `AlisonDev bd4ed69` sobre `7d48fbf`, sin publicar: seis rutas administrativas de soporte, reportes de terceros sobre campañas públicas, respuesta/asignación/estados e historial privado. El resumen permite ADMIN/AUDITOR/REVIEWER/COMPLIANCE/FINANCE/SUPPORT con agregados filtrados por responsabilidad; no concede otros permisos de consulta ni roles de usuario. **31 migraciones y 181 rutas** en el [inventario comprobable](contratos-http-sprint3.json). Los comandos de soporte responden 200; texto inválido 400, transición incompatible 409 y expediente/evidencia no disponible 404. El reporte y comandos aplican la cuota compartida de casos. [Correcciones, evidencia y alcance pendiente](revision-integracion-alison-sprint3-2026-10-25.md). S3-25 no está completa: faltan sus agregados financieros. Las notas anteriores de matriz ADMIN/AUDITOR son cortes históricos.

## Extensión de contrato 0.10 · Correo propio

Se añaden seis rutas `/api/contacts`, con sesión/propiedad, origen en escrituras y AUDITOR en lectura. [Contrato, flujos y validaciones](correo-operativo-2026-10-24.md), [ADR-014](decisiones/ADR-014-correo-operativo-mvp.md) e [inventario HTTP de 175 rutas](contratos-http-sprint3.json). Usar 29 migraciones. Correo operativo no equivale a KYC/KYB aprobado, verificación SMS, aprobación legal ni aceptación global del equipo. Los contratos previos se conservan a continuación.

> Corte transversal vigente 24/10/2026: **28 migraciones**, RicardoDev sin publicar. [Auditoría, permisos, contratos y recuperación](cierre-transversal-s3-15-18-2026-10-24.md), README §34. El [inventario comprobado de 169 rutas](contratos-http-sprint3.json) enumera método, ruta, roles, permisos y guards de la API implementada; el check falla ante cambios no registrados. `parties.read` y `dashboard.read` son permisos separados de lectura ADMIN/AUDITOR. Un mapeo residual de un permiso conocido a otro rol no amplía la matriz. Las notas 0.8 y anteriores que siguen son **cortes históricos**, aunque entonces se titularan «vigentes»; no sustituyen este corte ni cierran módulos generales pendientes de compañeros.

> Ampliación vigente del 24/10/2026: **27 migraciones**, RicardoDev sin publicar. [Cierre mínimo S3-23](cierre-s3-23-2026-10-24.md), README §33: presentación/revisión de rendición final, cumplimiento documentado y resolución mínima de incidencias no financieras. Completa solo las dependencias indispensables del ciclo, no los módulos completos de compañeros. La nota 0.7 siguiente conserva su corte anterior; correo/legal siguen pendientes.

> Corte vigente 24/10/2026: **26 migraciones**, RicardoDev sin commit/push. Ciclo, destinos y desembolsos DEMO: [contrato y límites de integración](ciclo-y-desembolsos-demo-2026-10-24.md), README §32. Los bloques siguientes conservan sus cortes previos. Motor de cierre no sustituye captura/aprobación de rendición, cumplimiento de recompensas o soporte general pendientes. Correo/legal reales siguen pendientes.

> Actualización vigente 23/10/2026: **24 migraciones**, RicardoDev sin publicar. Revisión sintética S2-08, devoluciones S3-09, disputas S3-11 y consecuencias financieras S3-02: contratos y recorridos en [cierre de las cuatro tareas](cierre-cuatro-tareas-ricardo-2026-10-23.md), README §31. Las notas 0.5 siguientes conservan su corte anterior; no significan que estas cuatro operaciones sigan pendientes. Correo real/legal y otros módulos futuros sí permanecen abiertos.

> Integración local 23/10: la base HTTP se conserva y las extensiones Santiago/Alison están integradas en RicardoDev; no publicadas. Se requieren 20 migraciones (README §30). ADR-013 define acuerdos DEMO sin cerrar legal ni correo. `catalog.read` permite consulta ADMIN/AUDITOR y las dos claves operativas tipadas de soporte sustituyen la lista vacía anterior. `/api/me/contributions` y `/api/contributions` son contratos de lectura distintos, ambos propios; se preservan los dos. `/api/me/simulations` sigue aislado y nunca confirma un aporte: el checkout canónico es `/api/demo-payments/checkout`.

Corte: 21/10/2026, rama local `RicardoDev`, sin publicar. La versión 0.5 añade checkout de ensayo, simulador interno y conciliación operativa DEMO; conserva los campos anteriores. Requiere **catorce migraciones** y no acredita proveedor externo ni todo el MVP. Los clientes consumen HTTP, no importan clases/ORM del servidor. Las [reglas del MVP de pruebas](decisiones/ADR-012-reglas-mvp-pruebas.md) distinguen los acuerdos de las funcionalidades pendientes. Los contratos nuevos se detallan en [DEMO 0.5](contrato-pagos-demo-0.5.md); las pantallas de Alison siguen pendientes de integración.

## Autorización

`GET /api/access/permissions` exige sesión y rol básico vigente. Respuesta `Cache-Control: no-store`:

```json
{"permissions":["campaign.review.read","contribution.read.own"],"readOnly":false}
```

No se envían roles ni permisos desde el navegador para autorizarse. `user_role` vigente y `role_permission` se consultan en PostgreSQL; los roles revocados, futuros o vencidos no conceden acceso. Las capacidades se consultan al cargar la vista y la API vuelve a comprobarlas en cada petición. Ante un error de consulta, no mostrar botones de escritura ni fingir acceso.

La matriz fue **adoptada por el equipo para el MVP de pruebas el 20/10**. No se atribuye a un tercero y las migraciones no asignan roles a ninguna cuenta:

| Permiso | Responsabilidades que lo conceden |
| --- | --- |
| `campaign.review.read` | REVIEWER, ADMIN, AUDITOR |
| `campaign.review.decide` | REVIEWER, ADMIN |
| `campaign.publish` | ADMIN |
| `creator.provision` | ADMIN; el endpoint conserva también el requisito de rol ADMIN |
| `roles.manage` | ADMIN; solo otras cuentas y roles internos cerrados; nunca autoasignación |
| `catalog.manage` | ADMIN; el endpoint conserva también el requisito de rol ADMIN |
| `verification.read` | COMPLIANCE, ADMIN; expedientes/documentos privados autorizados; no AUDITOR solo |
| `verification.review` | COMPLIANCE, ADMIN; decisiones sintéticas, sin autoaprobación ni aprobación legal |
| `finance.read` | FINANCE, ADMIN, AUDITOR |
| `finance.operate` | FINANCE; tener ADMIN por sí solo no lo concede |
| `support.read` | SUPPORT, ADMIN, AUDITOR |
| `support.resolve` | SUPPORT |
| `audit.read` | ADMIN, AUDITOR |
| `contribution.read.own` | REGISTERED_USER, SPONSOR; siempre limitado al propietario |

La consulta financiera S3-06 integra `finance.read`, la auditoría `audit.read` y el simulador/conciliación 0.5 incorpora `contribution.write.own` (REGISTERED_USER/SPONSOR) y `finance.operate` (FINANCE). Desembolsos, devoluciones de pagos confirmados, soporte y KYC aún deben integrar sus endpoints. Poblar el catálogo no implementa esas operaciones. Un AUDITOR no puede mutar aunque acumule ADMIN/FINANCE: el guard lo deniega antes del caso de uso. Su respuesta de capacidades omite permisos de escritura, y la interfaz también lo respeta. Las lecturas siguen sujetas a cada permiso y a la pertenencia correspondiente; no hay acceso universal por ser auditor.

Revisión existente: la cola y el detalle requieren `campaign.review.read`; decidir requiere `campaign.review.decide`; publicar requiere `campaign.publish` y la activación provisional D05. Aprobar continúa siendo privado. Las comprobaciones de propiedad del creador se conservan. El guard sin declaración de rol **ni** permiso deniega; si se declaran ambos, exige ambos. Una lista de requisitos vacía tampoco concede acceso.

## Lectura propia de un aporte

Implementado: `GET /api/contributions/:id`, UUID válido, sesión y `contribution.read.own`. Un aporte inexistente o ajeno devuelve el mismo 404. También está disponible el listado paginado propio descrito abajo. Las mutaciones de ensayo están separadas en `/api/demo-payments` y apagadas por defecto; ver contrato DEMO 0.5.

```json
{
  "id":"11111111-1111-4111-8111-111111111111",
  "reference":"BRT-C-00000001",
  "campaignId":"22222222-2222-4222-8222-222222222222",
  "amount":"125.50",
  "currencyCode":"BOB",
  "status":"PENDING",
  "paymentId":"33333333-3333-4333-8333-333333333333",
  "paymentStatus":"INITIATED",
  "createdAt":"2026-10-19T16:00:00.000Z",
  "expiresAt":"2026-10-19T16:30:00.000Z",
  "reservationExpired":false
}
```

Los datos son ilustrativos. `createdAt` es ISO UTC; `expiresAt` puede ser null para registros históricos sin vencimiento. `paymentId` y `paymentStatus` son ambos null si el aporte histórico no tiene intentos: mostrar «Sin intento de pago», no inventar INITIATED/FAILED/CONFIRMED ni ocultar el aporte. Si existen varios intentos, estos campos describen únicamente el de mayor `attempt_number`, no todo el historial ni el estado del aporte. La versión 0.2 añade `createdAt` y hace explícita esta nulabilidad respecto a 0.1; adaptar los consumidores antes de integrarlos.

`reservationExpired` distingue una reserva vencida del estado registrado; no inventar confirmaciones desde la etiqueta visual. `expireDue` ya puede persistir expiraciones DEMO, pero aún no hay programador: la disponibilidad ignora reservas vencidas sin depender de que haya corrido el mantenimiento. No se borran esas filas.

No se exponen payloads del proveedor, referencias externas, claves de idempotencia ni datos de otros usuarios. Errores HTTP: 400 UUID inválido; 401 sin sesión; 403 sin permiso; 404 ausente/ajeno; 503 cuando la base no está disponible. No convertir fallos en datos vacíos o éxito.

## Listado propio paginado

Implementado: `GET /api/contributions?limit=20&cursor=<UUID>`, con la misma sesión, permiso y `Cache-Control: no-store`. No admite `userId`, filtros de estado, campos adicionales ni parámetros repetidos. La identidad siempre procede de la sesión.

Respuesta con dos propiedades: `items`, lista de objetos del contrato anterior, y `nextCursor`, UUID string o null. Una cuenta sin aportes recibe `{"items":[],"nextCursor":null}`. `limit` es opcional, por defecto 20 y acepta enteros decimales escritos de 1 a 50, sin ceros iniciales, fracciones, espacios o exponentes. No hay total ni exportación masiva.

Primera petición: `/api/contributions?limit=20`. Si `nextCursor` no es null, solicitar `/api/contributions?limit=20&cursor=<nextCursor>`; terminar cuando sea null. El cursor es el UUID del último aporte entregado, no una credencial ni un identificador de otro usuario. No calcularlo a partir de `createdAt`.

Orden: `created_at DESC, id DESC`. El marcador se resuelve en PostgreSQL y conserva su precisión de microsegundos; no se compara la fecha ISO redondeada del navegador. La consulta usa marcador, no OFFSET: insertar un aporte más reciente entre peticiones no desplaza los resultados de las páginas siguientes. Para verlo se recarga desde la primera página. No es una instantánea congelada entre peticiones: los estados pueden cambiar. No modificar fechas de creación para reordenar registros existentes.

Un cursor malformado, de otro propietario o inexistente produce 400; los dos últimos comparten mensaje «Marcador de página no disponible. Vuelve a cargar la primera página». Ante eliminación/limpieza del marcador, reiniciar la consulta; no transformar el error en un historial vacío. Sin sesión devuelve 401 y sin permiso vigente 403. Las páginas usan exactamente la misma proyección privada del detalle, sin información adicional del proveedor, documentos, mensajes privados ni otras cuentas. Se reutilizan los índices oficiales `contribution_user_idx` y `payment_contribution_idx`; no requiere una décima migración.

## Importes y estados

- Todos los importes del contrato de aportes/pagos se expresan como **cadena decimal**, hasta doce dígitos enteros y dos decimales, según `numeric(14,2)`. Ejemplo: `"0.30"`. No enviar floats, notación científica, comas, negativos ni redondear tres decimales para aceptarlos. El cálculo interno usa céntimos `bigint`, que nunca se serializan directamente a JSON.
- La moneda debe coincidir con la campaña y el pago. No hay conversión de divisas ni comisión inventada. La comisión de ensayo debe estar entre cero y el importe y procede exclusivamente del evento de servidor; no del cliente.
- No confundir aporte y pago: aporte `PENDING/CONFIRMED/CANCELLED/EXPIRED/REFUNDED`; pago `INITIATED/PENDING/CONFIRMED/FAILED/EXPIRED/REFUNDED/DISPUTED`. FAILED cancela su aporte; `retry` permite abrir otro intento del mismo aporte si no hubo confirmados ni otro intento abierto, sin reactivar el pago anterior.
- `INITIATED` o `PENDING` pueden pasar a pendiente, confirmado, fallido o expirado; los estados terminales no se reactivan automáticamente. Un aviso antiguo no desconfirma dinero. `REFUNDED/DISPUTED` no se escriben con este flujo: pertenecen a las tareas financieras y conservan sus registros asociados.
- La recaudación procede de la vista oficial `v_campaign_funding`: pagos con `confirmed_at` menos devoluciones completadas. No mantener un segundo contador ni sumar desde la interfaz. Las comisiones no se restan de la recaudación bruta por iniciativa propia.

## Núcleo interno de servidor — no disponible como POST público

`ContributionLedger.start(actorId, input)` crea aporte PENDING e intento INITIATED en una sola transacción. `actorId` debe proceder de la sesión del caso de uso de checkout, no del JSON del usuario. `providerId` es una selección/configuración de servidor autorizada que deberá integrar S3-01, no un permiso para escoger proveedores arbitrarios desde el navegador.

Entrada técnica: `campaignId`, `rewardId` (null para DONATION y obligatorio para REWARD/PRESALE), `amount`, `currencyCode`, `providerId` y `requestKey` UUID v4. Devuelve la lectura propia anterior.

Mismo actor + misma clave + mismos datos devuelve el mismo aporte; cambiar datos con esa clave genera `LedgerConflict`. Otra clave representa otro intento intencional, no una duplicidad de campaña. La idempotencia es atómica en PostgreSQL y no depende de mantener memoria en un proceso de API.

El núcleo permite únicamente proveedores activos marcados `is_sandbox=true`, y rechaza producción. No contacta un proveedor, no carga tarjetas y no inicia transferencias. El acuerdo del equipo es de un máximo de 30 minutos, acortado al fin de campaña. Los intentos nuevos guardan `mode:DEMO` en su metadato privado; esto no convierte datos históricos ni prueba que exista una integración externa.

Solo una campaña publicada, no descartada y dentro de su periodo permite iniciar. Se valida moneda, mínimo, modalidad, recompensa activa y cupos. Un aporte reserva una unidad; una compra de varias unidades todavía no está contemplada. El bloqueo por campaña serializa reservas/confirmaciones y evita vender el último cupo dos veces. Reservas vencidas dejan de ocupar cupo; pagos que fueron confirmados siguen ocupándolo, incluso con devolución/disputa, conforme al criterio conservador de la vista oficial. No se inventó reposición automática.

`ContributionLedger.applyVerifiedEvent(event)` es una **entrada interna de confianza**, no un DTO del navegador ni un webhook. El simulador 0.5 la invoca con valores reconstruidos en servidor y una transacción que conserva el recibo. Que el tipo se llame `VerifiedPaymentEvent` **no demuestra una firma**: un eventual adaptador real debe verificar autenticidad, entorno, referencia e importe con su proveedor antes de invocarlo. Los tests y el simulador no prueban cobros externos.

Evento técnico: `providerId`, `eventId`, `paymentId`, `state`, `amount`, `currencyCode`; `externalReference` obligatorio para confirmar y `feeAmount` opcional, por defecto cero. `state` solo acepta PENDING/CONFIRMED/FAILED/EXPIRED. Las referencias/eventos tienen longitud acotada; no se persisten payloads completos con información privada.

El identificador de evento se separa por proveedor y se registra con hash del contenido. Repetirlo con datos diferentes genera conflicto; un reintento idéntico no vuelve a escribir y devuelve **el estado actual** del pago, no un estado antiguo del evento. La referencia de cobro es única por proveedor y el índice oficial permite como máximo un intento confirmado por aporte. Evento, pago y aporte se confirman o revierten juntos.

Una confirmación tardía con reserva vencida, campaña cerrada o intento terminal no reactiva el pago. El simulador 0.5 conserva la observación en `demo_event` como NEEDS_REVIEW y Finanzas puede conciliarla/compensarla exclusivamente en DEMO. La compensación no es una devolución bancaria ni modifica `refund`; S3-09 sigue pendiente para devoluciones de aportes confirmados. **No habilitar cobros reales.**

Actualmente `POST /api/contributions` y `POST /api/payments/webhook` devuelven 404. No implementar en frontend una confirmación simulada llamando al motor ni aceptar `status=CONFIRMED` desde un formulario.

## Preparación de la base y coordinación

La secuencia actual contiene **catorce migraciones**: siete anteriores, cuatro del 19/10 (responsabilidades, integridad de pagos, lectura financiera y auditoría), dos del 20/10 (concesión/revocación y retención) y `DemoPayments1792540800000` del 21/10. La última configura proveedor interno exclusivamente DEMO, recibos/compensaciones/metadatos en brotar_extension y acceso limitado a conciliación oficial. No crea cuentas, pagos ni una pasarela bancaria; el simulador requiere bandera explícita. Si existen referencias duplicadas anteriores o un proveedor con código DEMO/configuración incompatible, falla sin borrar ni reconvertir datos: diagnosticar, no retirar restricciones para forzar la migración.

La instalación nueva mantiene SQL oficial → compilación → migraciones → permisos → verificación → activación. En V2 existente, respaldar antes, compilar/aplicar/verificar sin restaurar el SQL sobre los datos. Readiness exige los objetos del incremento; una versión V2 sin migrar no se anuncia preparada para estos módulos. El procedimiento operativo figura en README §24.

Alison puede conectar su historial a este listado/detalle y sus pantallas al contrato DEMO 0.5, respetando nulabilidad, paginación, consentimiento y estados de carga/vacío/error. Esto no implementa su pantalla ni sus pruebas de aceptación. La alternativa de pago ya acordada es exclusivamente DEMO; no hay autorización para un proveedor real. Santiago conserva sus módulos; archivos KYC privados todavía necesitan autorización por caso para COMPLIANCE, no acceso global a todos los documentos. Las tareas nuevas deben reutilizar estos permisos y el núcleo de importes, no escribir estados financieros directamente desde controladores.

S3-18 permanece en curso hasta integrar todos los módulos, contratos, privacidad, migraciones y recuperación del esquema final. Esta base no cierra por sí sola la historia general.

## Consulta financiera — S3-06

Pantalla `/administracion/finanzas`. Dos endpoints GET con sesión, `finance.read` y `no-store`: `/api/admin/finance/payments` y `/api/admin/finance/payments/export`. La matriz local concede lectura a FINANCE/ADMIN/AUDITOR; no concede `finance.operate` ni roles desde la entrada. No existen mutaciones de este módulo.

Filtros opcionales comunes: `campaignId` UUID, `status` de `payment_status`, `from/to` como fechas reales `AAAA-MM-DD`. El periodo incluye ambos días **en UTC** y rechaza inicio posterior al fin. La lista permite además `limit` (1–50, por defecto 25) y `cursor` UUID del último pago recibido. Parámetros desconocidos o repetidos no son válidos. Marcador inexistente: 400 y reiniciar desde el inicio.

Lista: `{items,totals,nextCursor}`. Cada item contiene exactamente `kind:"PAYMENT"`, `id`, `contributionId`, `reference` del aporte, `campaignId`, `campaignTitle`, `sponsorId`, `createdAt` ISO, `status` del pago, `contributionStatus`, `currencyCode`, `amount`, `feeAmount`, `netAmount`, `refundedAmount` y `sandbox`. Importes y conteos son strings decimales, no floats. No contiene nombre/correo/teléfono del patrocinador, documentos, payloads, referencias externas ni datos de tarjeta. El UUID de patrocinador es un identificador interno, no un dato para publicar.

Una fila es un **intento de pago**, no un nuevo aporte por cada intento. Los estados originales INITIATED/PENDING/CONFIRMED/FAILED/EXPIRED/REFUNDED/DISPUTED se presentan con etiquetas españolas distintas; no se reduce una devolución, disputa o expiración a un genérico COMPLETED/FAILED. El aporte conserva su estado independiente. No se modifica dinero desde una etiqueta. `sandbox` es la configuración del proveedor, no una prueba de autenticidad del cobro.

`totals` agrupa el filtro completo por moneda y estado: `currencyCode,status,count,amount,feeAmount,netAmount,refundedAmount`. Se calcula mediante `numeric` en PostgreSQL; no suma monedas ni usa Number/parseFloat. Solo las devoluciones REFUNDED se agregan al campo `refundedAmount`; una solicitud no se descuenta como devolución completada. El neto del intento es el calculado por la tabla oficial (importe menos comisión), no recaudación ni saldo desembolsable. La consulta no reemplaza `v_campaign_funding` ni crea un segundo contador. No se mezclan pagos pendientes con dinero confirmado.

Página y totales se leen en una sola transacción REPEATABLE READ de solo lectura. Orden `p.created_at DESC,p.id DESC`; la precisión se conserva en SQL al resolver el cursor. Las páginas y exportaciones sucesivas tienen sus propias instantáneas y los estados pueden haber cambiado. No prometer sincronización de una descarga con una consulta anterior.

CSV: usa los mismos filtros, sin cursor/limit, y exporta el conjunto completo hasta 5000 pagos. Superar ese límite devuelve **413 JSON**, no un archivo parcial; reducir el rango. Incluye cabecera aun si no hay filas, UTF-8 con BOM, CRLF y entrecomillado; neutraliza textos con prefijos de fórmula, incluso espacios/controles y equivalentes Unicode. Usar nombres de archivo fijos, no entradas del usuario. Tratarlo como reporte interno y no publicarlo en el repositorio.

Errores: 400 entradas/periodo/marcador inválidos, 401 sin sesión, 403 sin permiso vigente, 413 exportación demasiado grande, 503 base no disponible. Un fallo no se convierte en lista vacía ni en ceros. Readiness exige lectura técnica de `refund`, privilegios limitados de auditoría y las extensiones actuales: aplicar las catorce migraciones antes de arrancar. Las pruebas crean registros sintéticos explícitos; una instalación normal configura un proveedor interno DEMO inactivo por bandera, sin sembrar aportes ni pagos.

## Consulta de auditoría y estados

`GET /api/admin/audit`, con sesión, `audit.read` vigente y `Cache-Control: no-store`. Pantalla `/administracion/auditoria`, disponible a ADMIN/AUDITOR según la matriz provisional. Sin rutas de escritura, borrado ni exportación. No concede acceso a documentos por tener este permiso.

| Parámetro opcional | Formato |
| --- | --- |
| `source` | `AUDIT` por defecto, o `STATUS`; selecciona un origen, no los mezcla |
| `limit` | Cadena decimal de 1–50, por defecto 25; no fracciones, arrays ni ceros iniciales |
| `cursor` | ID bigint positivo en cadena, hasta `9223372036854775807`; no convertir a Number |
| `actorId`, `entityId` | UUID de actor u objeto |
| `entity` | Código minúsculo de hasta 80 letras/guiones bajos, como `campaign` o `payment` |
| `action` | CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, STATUS_CHANGE, APPROVE, REJECT, PAYMENT_EVENT o EXPORT |
| `from`, `to` | Días reales AAAA-MM-DD, ordenados e inclusivos en UTC |

Parámetros desconocidos/repetidos o fechas imposibles devuelven 400; 401 sin sesión, 403 sin permiso y 503 si la conexión no está inicializada. Otros fallos internos se comunican como error genérico, sin detalles SQL. En fuente STATUS una acción distinta de STATUS_CHANGE no tiene coincidencias. Que el filtro enumere acciones/entidades no significa que todos esos módulos ya estén instrumentados.

Respuesta: `{source,items,nextCursor}`. Cada item contiene únicamente `id` string bigint, `actorId` UUID/null, `actorRole` código/null, `action`, `entity`, `entityId` UUID/null, `occurredAt` ISO UTC, `result`, `fromStatus` código/null y `toStatus` código/null. Vacío real: `items:[]` y `nextCursor:null`; un error no se transforma en vacío. El cursor representa una posición numérica del origen, no una credencial ni un recurso cuya existencia se revele; no se exige que la fila del marcador continúe existiendo.

AUDIT proyecta `audit_log`. Los nuevos registros mínimos del helper de aplicación contienen `{source:"APPLICATION",result:"APPLIED"}`; sin esa marca, el resultado es `UNSPECIFIED`, nunca un éxito inferido. No incluye valores antiguos/nuevos, descripción, motivo, IP, user agent, request_id ni payloads. El rol registrado por el helper es uno de los roles vigentes del actor al escribir, ordenado por código; no reconstruye todos sus permisos ni prueba qué rol motivó la autorización. STATUS proyecta `status_history`, acción STATUS_CHANGE y resultado `RECORDED`; el rol es null porque no se reconstruye desde roles actuales. Ambos orígenes pueden describir una misma operación desde perspectivas diferentes.

Orden por ID descendente, páginas keyset de `limit+1`; enviar `nextCursor` sin modificar hasta null. Cambiar origen/filtros reinicia la paginación. Las páginas sucesivas son consultas nuevas, no una exportación ni una instantánea forense global; una transacción aún no confirmada puede hacerse visible después. Los IDs pueden tener huecos por rollback y no se rellenan ni se confunden con UUID de objeto.

El actor de acciones humanas procede de la sesión y se establece con `set_config('brotar.actor_id',...,true)` en la transacción. El mismo contexto alimenta los triggers oficiales de estados. Los eventos internos nuevos sandbox limpian ese contexto, guardan actor humano null y rol SYSTEM en auditoría; no atribuirlos al aportante ni rellenar actores históricos ausentes. El helper se usa dentro de transacciones: fallo de negocio/auditoría revierte ambos; reintentos idempotentes no duplican la acción. La tabla oficial no tiene trigger de estados de contribution: se audita su creación y el alta/cambios del intento payment conservan el historial oficial.

Cobertura anterior en [avance S3-15/16/18](avance-auditoria-s3-15-16-18-2026-10-19.md). La minimización de respuesta no elimina datos heredados ni sustituye retención. El 20/10 se añade mantenimiento administrativo manual, no purga automática ni cierre de las historias generales.

## Gestión de responsabilidades internas

`POST /api/admin/users/:id/responsibilities`, UUID válido, ADMIN vigente, permiso `roles.manage`, protección de origen/`X-Brotar-Request:1` y `Cache-Control:no-store`.

```json
{"role":"FINANCE","operation":"GRANT","confirmed":true,"reason":"Responsable financiero del ensayo del MVP"}
```

`role`: REVIEWER, COMPLIANCE, FINANCE, SUPPORT o AUDITOR. `operation`: GRANT o REVOKE. `confirmed` debe ser boolean true; motivo recortado de 10–500 caracteres sin controles. Cualquier campo extra se rechaza. El actor siempre es la sesión; no se aceptan `actorId`, `userId`, fechas, permisos arbitrarios ni ADMIN en el JSON.

Respuesta 200: `{id,role,operation,changed:boolean}`. `changed:false` significa que el estado solicitado ya estaba aplicado; no se crea una segunda concesión o auditoría. Tras éxito consultar otra vez `GET /api/admin/users?email=...` para leer roles vigentes. Solo ADMIN puede hacer esta búsqueda; no convertirla en un directorio público.

401 sin sesión; 403 sin permiso, con AUDITOR o al cambiar sus propios roles; 404 cuenta inexistente/eliminada; 409 cuenta no habilitable, catálogo ausente o concesión futura/vencida sin revocar; 400 DTO/UUID/confirmación inválidos. Revocar se permite para una cuenta suspendida/bloqueada, para retirar acceso; conceder no. Tener AUDITOR exige retirarlo expresamente antes de conceder otra responsabilidad. La concesión de AUDITOR sí puede coexistir con roles previos y hace efectiva la restricción de lectura.

El servidor bloquea actor/destinatario en orden estable y vuelve a comprobar ADMIN, permiso y cuenta dentro de la transacción. Inserción/revocación y auditoría se confirman juntas. Revocar escribe únicamente `revoked_at`; no elimina filas, modifica contraseñas, verifica identidad ni desbloquea cuentas. Una nueva concesión después de revocar crea otra fila con `granted_by`. Los roles se consultan en cada petición, no se copian a la cookie. El aprovisionamiento de ADMIN conserva su CLI local existente.

## Reintento y expiración de aportes DEMO internos

Estas son **funciones de servidor, no endpoints del navegador**. No añaden un checkout, QR ni callback externo.

`retry(actorId,contributionId,requestKeyUUIDv4)` devuelve el mismo contrato OwnContribution con el pago de mayor `attempt_number`. Requiere titular válido sin AUDITOR, aporte propio CANCELLED/EXPIRED, último intento FAILED/EXPIRED y ningún cobro confirmado, intento abierto ni proveedor no sandbox. Una reserva PENDING vencida se expira dentro de la misma transacción antes de comprobar reintento. Campaña debe seguir publicada y abierta, con mínimo/moneda/recompensa/cupo válidos. No cambia importe, moneda ni recompensa. Reutilizar la misma clave del mismo aporte devuelve su estado actual; usarla para otro aporte da conflicto. Una clave nueva mientras hay intento abierto también se rechaza. El contador SMALLINT está acotado, sin desbordamiento silencioso.

`expireDue(limit=100)` acepta enteros de 1–500 y rechaza producción. Procesa solo aportes DEMO PENDING vencidos sin cobro confirmado. Los lotes bloquean campaña antes que aporte/pagos, igual que reservas y confirmaciones. Cambia intentos INITIATED/PENDING a EXPIRED, conserva estados terminales, escribe evento `demo.reservation_expired` de origen temporal, audita y cambia el aporte a EXPIRED. Repetir no duplica eventos. No toca aportes que mezclen un proveedor no sandbox. Devuelve número de reservas expiradas, no dinero recaudado.

No hay programador automático. El futuro caso de uso de checkout/mantenimiento invocará el núcleo con identidad de sesión o contexto de sistema; no aceptar un usuario arbitrario del navegador. Los pagos tardíos siguen rechazados sin sumar ni resucitar y requieren S3-07; no se declara conciliación por devolver un 409.

## Retención de auditoría fuera de HTTP

`node scripts/audit-retention.mjs plan` solo informa. `apply --confirm-12-months` se ejecuta con configuración administrativa local, respaldo completo previo fuera de Git y comprobación del mismo contenedor/puerto. La conexión de API no recibe DELETE de auditoría ni acceso a los agregados. Ver README §27 y ADR-012 para bloqueos, privacidad de respaldos y límites.

Resultado: `{mode,retentionMonths:12,cutoff,eligible,holds,held,processed,archive:"MONTH_ACTION_COUNT_ONLY",businessHistoryDeleted:false}`. Los conteos son cadenas; las estadísticas no contienen actores, UUID, entidades arbitrarias ni texto libre. Los bloqueos son contadores globales, no listados de casos. Cada aplicación procesa hasta 5000 filas anteriores al corte; agregación y eliminación son atómicas. Trabajo activo retiene todo. Las tablas oficiales de negocio e historial de estados se conservan. Instalar/migrar/arrancar jamás invoca este mantenimiento.
