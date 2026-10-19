# Contratos del Sprint 3 · base 0.1

Corte: 19/10/2026, rama de trabajo `RicardoDev`. Esta base prepara S3-16/S3-02/S3-18; no acredita un proveedor conectado, un checkout público ni todos los módulos del MVP. Los clientes consumen contratos HTTP, no importan clases, ORM ni reglas internas del backend.

## Autorización

`GET /api/access/permissions` exige sesión y rol básico vigente. Respuesta `Cache-Control: no-store`:

```json
{"permissions":["campaign.review.read","contribution.read.own"],"readOnly":false}
```

No se envían roles ni permisos desde el navegador para autorizarse. `user_role` vigente y `role_permission` se consultan en PostgreSQL; los roles revocados, futuros o vencidos no conceden acceso. Las capacidades se consultan al cargar la vista y la API vuelve a comprobarlas en cada petición. Ante un error de consulta, no mostrar botones de escritura ni fingir acceso.

La matriz es **provisional del equipo**, coherente con las responsabilidades del catálogo oficial. No representa aprobación definitiva de D06 y la migración no asigna roles a ninguna cuenta:

| Permiso | Responsabilidades que lo conceden |
| --- | --- |
| `campaign.review.read` | REVIEWER, ADMIN, AUDITOR |
| `campaign.review.decide` | REVIEWER, ADMIN |
| `campaign.publish` | ADMIN |
| `creator.provision` | ADMIN; el endpoint conserva también el requisito de rol ADMIN |
| `catalog.manage` | ADMIN; el endpoint conserva también el requisito de rol ADMIN |
| `verification.review` | COMPLIANCE, ADMIN; reserva del contrato, no un módulo KYC terminado |
| `finance.read` | FINANCE, ADMIN, AUDITOR |
| `finance.operate` | FINANCE; tener ADMIN por sí solo no lo concede |
| `support.read` | SUPPORT, ADMIN, AUDITOR |
| `support.resolve` | SUPPORT |
| `audit.read` | ADMIN, AUDITOR |
| `contribution.read.own` | REGISTERED_USER, SPONSOR; siempre limitado al propietario |

Finanzas, soporte, KYC y auditoría aún deben integrar sus endpoints con estos permisos; poblar el catálogo no implementa sus pantallas ni operaciones. Un AUDITOR no puede mutar aunque acumule ADMIN/FINANCE: el guard lo deniega antes del caso de uso. Su respuesta de capacidades omite permisos de escritura, y la interfaz también lo respeta. Las lecturas siguen sujetas a cada permiso y a la pertenencia correspondiente; no hay acceso universal por ser auditor.

Revisión existente: la cola y el detalle requieren `campaign.review.read`; decidir requiere `campaign.review.decide`; publicar requiere `campaign.publish` y la activación provisional D05. Aprobar continúa siendo privado. Las comprobaciones de propiedad del creador se conservan. El guard sin declaración de rol **ni** permiso deniega; si se declaran ambos, exige ambos. Una lista de requisitos vacía tampoco concede acceso.

## Lectura propia de un aporte

Implementado: `GET /api/contributions/:id`, UUID válido, sesión y `contribution.read.own`. Un aporte inexistente o ajeno devuelve el mismo 404. No hay listado, paginación ni mutaciones públicas todavía.

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
  "expiresAt":"2026-10-19T16:30:00.000Z",
  "reservationExpired":false
}
```

Los datos son ilustrativos. `expiresAt` puede ser null para registros históricos sin vencimiento. `reservationExpired` distingue una reserva vencida del estado realmente registrado en el proveedor; no inventar una confirmación o un evento de expiración a partir de una etiqueta visual. El motor no tiene aún un programador de vencimientos; calcula la disponibilidad ignorando reservas vencidas, sin borrar esas filas.

No se exponen payloads del proveedor, referencias externas, claves de idempotencia ni datos de otros usuarios. Errores HTTP: 400 UUID inválido; 401 sin sesión; 403 sin permiso; 404 ausente/ajeno; 503 cuando la base no está disponible. No convertir fallos en datos vacíos o éxito.

## Importes y estados

- Todos los importes del contrato de aportes/pagos se expresan como **cadena decimal**, hasta doce dígitos enteros y dos decimales, según `numeric(14,2)`. Ejemplo: `"0.30"`. No enviar floats, notación científica, comas, negativos ni redondear tres decimales para aceptarlos. El cálculo interno usa céntimos `bigint`, que nunca se serializan directamente a JSON.
- La moneda debe coincidir con la campaña y el pago. No hay conversión de divisas ni comisión inventada. La comisión de ensayo debe estar entre cero y el importe y procede exclusivamente del evento de servidor; no del cliente.
- No confundir aporte y pago: aporte `PENDING/CONFIRMED/CANCELLED/EXPIRED/REFUNDED`; pago `INITIATED/PENDING/CONFIRMED/FAILED/EXPIRED/REFUNDED/DISPUTED`. FAILED de un intento cancela su aporte en este primer núcleo de un intento por creación. No se implementó todavía reabrir otro intento sobre el mismo aporte.
- `INITIATED` o `PENDING` pueden pasar a pendiente, confirmado, fallido o expirado; los estados terminales no se reactivan automáticamente. Un aviso antiguo no desconfirma dinero. `REFUNDED/DISPUTED` no se escriben con este flujo: pertenecen a las tareas financieras y conservan sus registros asociados.
- La recaudación procede de la vista oficial `v_campaign_funding`: pagos con `confirmed_at` menos devoluciones completadas. No mantener un segundo contador ni sumar desde la interfaz. Las comisiones no se restan de la recaudación bruta por iniciativa propia.

## Núcleo interno de servidor — no disponible como POST público

`ContributionLedger.start(actorId, input)` crea aporte PENDING e intento INITIATED en una sola transacción. `actorId` debe proceder de la sesión del caso de uso de checkout, no del JSON del usuario. `providerId` es una selección/configuración de servidor autorizada que deberá integrar S3-01, no un permiso para escoger proveedores arbitrarios desde el navegador.

Entrada técnica: `campaignId`, `rewardId` (null para DONATION y obligatorio para REWARD/PRESALE), `amount`, `currencyCode`, `providerId` y `requestKey` UUID v4. Devuelve la lectura propia anterior.

Mismo actor + misma clave + mismos datos devuelve el mismo aporte; cambiar datos con esa clave genera `LedgerConflict`. Otra clave representa otro intento intencional, no una duplicidad de campaña. La idempotencia es atómica en PostgreSQL y no depende de mantener memoria en un proceso de API.

El núcleo permite únicamente proveedores activos marcados `is_sandbox=true`, y rechaza producción. No contacta un proveedor, no carga tarjetas y no inicia transferencias. La reserva provisional del equipo dura 30 minutos. Cambiar esa duración o la regla de reposición de cupos debe acordarse antes de habilitar checkout.

Solo una campaña publicada, no descartada y dentro de su periodo permite iniciar. Se valida moneda, mínimo, modalidad, recompensa activa y cupos. Un aporte reserva una unidad; una compra de varias unidades todavía no está contemplada. El bloqueo por campaña serializa reservas/confirmaciones y evita vender el último cupo dos veces. Reservas vencidas dejan de ocupar cupo; pagos que fueron confirmados siguen ocupándolo, incluso con devolución/disputa, conforme al criterio conservador de la vista oficial. No se inventó reposición automática.

`ContributionLedger.applyVerifiedEvent(event)` es una **entrada interna de confianza**, sin endpoint HTTP ni DTO del navegador. Que el tipo se llame `VerifiedPaymentEvent` **no demuestra una firma**: el futuro adaptador S3-01 debe verificar autenticidad, entorno, referencia e importe con el proveedor antes de invocarlo. Los tests proporcionan eventos sintéticos de ensayo, no pruebas de cobro externo.

Evento técnico: `providerId`, `eventId`, `paymentId`, `state`, `amount`, `currencyCode`; `externalReference` obligatorio para confirmar y `feeAmount` opcional, por defecto cero. `state` solo acepta PENDING/CONFIRMED/FAILED/EXPIRED. Las referencias/eventos tienen longitud acotada; no se persisten payloads completos con información privada.

El identificador de evento se separa por proveedor y se registra con hash del contenido. Repetirlo con datos diferentes genera conflicto; un reintento idéntico no vuelve a escribir y devuelve **el estado actual** del pago, no un estado antiguo del evento. La referencia de cobro es única por proveedor y el índice oficial permite como máximo un intento confirmado por aporte. Evento, pago y aporte se confirman o revierten juntos.

Una confirmación tardía con reserva vencida, campaña cerrada o intento terminal se rechaza y debe derivarse a conciliación/compensación en S3-01/S3-07/S3-09. Todavía no existe ese canal operativo: **no habilitar cobros reales** antes de resolverlo. No responder que hubo un reembolso si no existe una devolución real confirmada.

Actualmente `POST /api/contributions` y `POST /api/payments/webhook` devuelven 404. No implementar en frontend una confirmación simulada llamando al motor ni aceptar `status=CONFIRMED` desde un formulario.

## Preparación de la base y coordinación

Este incremento añade `ResponsibilityPermissions1792368000000` y `ContributionIntegrity1792368000001`: nueve migraciones en total. La segunda crea unicidad de referencia por proveedor y permisos técnicos limitados; no crea proveedores ni cuentas. Si existen referencias duplicadas anteriores, falla sin borrarlas: diagnosticar y acordar una corrección, no eliminar pagos para forzar la migración.

La instalación nueva mantiene SQL oficial → compilación → migraciones → permisos → verificación → activación. En V2 existente, respaldar antes, compilar/aplicar/verificar sin restaurar el SQL sobre los datos. Readiness exige los objetos del incremento; una versión V2 sin migrar no se anuncia preparada para estos módulos. El procedimiento operativo figura en README §24.

Alison puede preparar vistas con estas cadenas/enums y estados de carga/vacío/error, pero el listado, la creación pública y el checkout deben acordarse y probarse antes de integrarlos. Santiago conserva sus módulos; archivos KYC privados todavía necesitan autorización por caso para COMPLIANCE, no acceso global a todos los documentos. Las tareas nuevas deben reutilizar estos permisos y el núcleo de importes, no escribir estados financieros directamente desde controladores.

S3-18 permanece en curso hasta integrar todos los módulos, contratos, privacidad, migraciones y recuperación del esquema final. Esta base no cierra por sí sola la historia general.
