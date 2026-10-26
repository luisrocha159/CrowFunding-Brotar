# Cierre local de panel, conversación y correo de soporte · 25/10/2026

Rama: **RicardoDev**, sobre la integración `55959ca` de Alison. Este incremento completa los pendientes funcionales identificados en la revisión anterior, por autorización de Ricardo. Sin push ni cambios en DEV/Trello. Legal definitivo permanece pendiente. No acredita aceptación global del MVP ni proveedores financieros reales.

## Panel administrativo · S3-25

El resumen consulta una instantánea PostgreSQL coherente, muestra su fecha y dispone de actualización, carga, vacío, error y reintento. Un error de consulta o contrato inválido no se convierte en contadores cero. Cero significa ausencia real de registros de ese tipo en la consulta.

| Responsabilidad | Agregados disponibles |
| --- | --- |
| REVIEWER | Campañas, rendiciones y pendientes operativos de cierre. |
| COMPLIANCE | Expedientes de identidad en revisión o con información pendiente. |
| FINANCE | Campañas/cierre, pagos, conciliación, desembolsos y devoluciones. |
| SUPPORT | Incidencias generales, disputas, rendiciones y pendientes operativos de cierre. |
| ADMIN | Agregados de sus permisos actuales, incluidos finanzas y soporte. No obtiene autorización para operar dinero por ser administrador. |
| AUDITOR | Agregados de consulta concedidos por la matriz; sin controles de escritura ni acceso adicional a documentos KYC. |

Finanzas muestra intentos de pago totales, pendientes y pendientes con plazo vencido; pagos distintos con eventos DEMO por revisar; lotes abiertos y diferencias no resueltas; desembolsos pendientes/autorizados/en proceso; devoluciones solicitadas/en proceso. Los pagos cuentan intentos y no se presentan como recaudación ni se suman monedas. Las demás colas financieras se limitan al flujo DEMO que sus pantallas pueden consultar. Una fila MATCHED no es una diferencia pendiente y dos eventos de un mismo pago no duplican su contador.

Soporte muestra disputas activas, las que esperan respuesta y las escaladas. El acceso al detalle sigue controlado por sus API. Los enlaces llevan a bandejas existentes y los de solicitudes mantienen el filtro de estado. No se muestran agregados financieros a SUPPORT ni expedientes de soporte a FINANCE sin permisos adicionales. Las metas de atención siguen usando los parámetros internos ya aprobados; no se inventan plazos legales.

## Conversación de soporte · S3-10

Nueva ruta `POST /api/me/support-cases/:id/messages`. Entrada exacta: `{requestId: UUID, body: texto}`. Requiere sesión, rol básico vigente, propiedad, origen permitido y cuota compartida. El servidor no acepta destinatario, autor, estado, fecha ni indicador de nota interna desde el cliente.

- Respuesta del titular: entre **20 y 5000 caracteres**, sin texto compuesto solo de espacios/símbolos, HTML, controles prohibidos o Unicode inválido. Se admiten español, ñ y acentos.
- Casos OPEN/IN_PROGRESS/AWAITING_RESPONSE permiten mensajes. Al responder a AWAITING_RESPONSE pasa a IN_PROGRESS con historial y auditoría en la misma transacción.
- Casos RESOLVED/CLOSED no admiten mensajes nuevos. El reintento de un mensaje ya confirmado puede recuperar su resultado, sin reabrir ni duplicar el caso.
- Las incidencias con disputa financiera vinculada se atienden desde Disputas; la ruta general no evita ese flujo.
- Un caso ajeno devuelve 404; AUDITOR conserva lectura. Se vuelven a comprobar las capacidades dentro de la transacción y después de esperar bloqueos.
- Clave y huella por actor: dos envíos concurrentes con el mismo contenido guardan un solo mensaje; reutilizar la clave con contenido/caso distintos devuelve 409.
- La UI conserva datos y clave ante resultado desconocido, bloquea su edición y permite reintentar la misma respuesta. Solo confirma éxito con una respuesta válida de la API.

La respuesta administrativa también exige ahora `requestId` además de `body`, conserva su política de texto y es reintentable. Los mensajes distinguen titular/soporte sin exponer identificadores internos. Actualizar frontend y backend juntos desde el mismo corte.

## Avisos y correo

Las respuestas administrativas y los cambios de estado generan un evento duradero con metadatos mínimos junto a su operación. Si falla la inserción del aviso, se revierte también el mensaje/estado/clave. El mensaje administrativo que abre la atención genera **un solo aviso**, no un correo por el texto y otro por su transición automática. La resolución mínima desde el cierre de campaña utiliza el mismo mecanismo.

El recolector convierte cada evento una sola vez en notificación interna y reutiliza la cola SMTP existente. Solo el titular actual recibe el aviso; la propia respuesta del titular no le envía un correo a sí mismo. El cuerpo del correo es genérico y enlaza al detalle privado: no copia descripción, mensajes, observaciones ni evidencias. El acceso al enlace requiere iniciar sesión como su propietario.

Correo externo solo para dirección propia verificada y preferencia de avisos activada. Antes de enviar se comprueban otra vez dirección, cuenta, preferencia y propiedad. Se conservan cancelación de entrega, reintentos/backoff y resultado SMTP_ACCEPTED/FAILED. Aceptación SMTP no equivale a recepción en bandeja. Sin canal o preferencia se conserva el aviso interno; no se simula entrega externa. No se reenvía historial previo al instalar esta ampliación.

La configuración Gmail privada se conserva. No hay variables nuevas ni credenciales en Git. Los tests usan remitente sustituido y destinatarios sintéticos, sin enviar correos a personas ni copiar la contraseña al entorno QA. Legal, términos y políticas definitivas no se consideran aprobados por activar avisos de prueba.

## Instalación y compatibilidad

**32 migraciones acumulativas y 182 rutas HTTP.** La nueva `SupportRepliesMail1792886400000` añade claves de respuesta y eventos de correo en `brotar_extension`; no altera la línea base ni elimina datos. Readiness exige las tablas y permisos nuevos.

Para una copia existente, con Docker/V2 iniciado, desde `backend/`:

```powershell
corepack.cmd pnpm run build
node scripts/migrate.mjs up
node scripts/migrate.mjs status
corepack.cmd pnpm run dev
```

La instalación nueva sigue el README §3: aplica todas las migraciones en orden, incluidas las categorías provisionales. No restaurar SQL sobre una base ya instalada ni copiar un .env completo de otra computadora. Las bandejas DEMO usan la configuración `DEMO_PAYMENTS_ENABLED=true` ya descrita para esta entrega. Deshabilitarla cierra explícitamente esas operaciones de ensayo.

## Recorrido demostrable

1. Un usuario abre una campaña publicada → Reportar incidencia → envía categoría, asunto y descripción válidos. Guarda su referencia.
2. SUPPORT entra a Administración → Bandeja de soporte → abre ese expediente y responde. Puede marcarlo Esperando respuesta con motivo válido.
3. El titular entra a Mis incidencias → abre su referencia → Responder a soporte. Un envío vacío muestra error del campo. Una respuesta válida queda en el historial y devuelve el estado a En atención.
4. SUPPORT actualiza el caso y ve el mensaje como Titular. Resuelve y cierra con motivos válidos; después no aparecen formularios de mensajes nuevos para ese caso.
5. Para los avisos externos, verificar antes el correo propio y activar avisos desde Mi cuenta. Consultar el aviso interno y su estado de entrega; el correo no contiene el texto privado del caso.
6. FINANCE entra al Resumen administrativo y abre pagos, conciliación, solicitudes de desembolso/devolución. SUPPORT consulta las disputas desde su propio resumen. AUDITOR puede consultar sin operar.

## Verificación y evidencia

La prueba integrada de conversación incluye propiedad, sesión/CSRF, campos extra, Unicode/longitudes, dos envíos concurrentes, clave reutilizada, historial, rechazo tras cierre, auditor y notas internas. Induce un fallo al insertar el evento para comprobar rollback. Verifica notificaciones sin duplicados, destinatario correcto, ausencia de texto privado, SMTP fallido/reintento y retirada de preferencia antes del envío.

El ensayo del panel cubre nueve perfiles y revocación, cuentas sin acceso, exactitud al cambiar estados, dos eventos del mismo pago, diferencia MATCHED, agregados sin importes/documentos privados y fecha de la instantánea. El flujo financiero de disputas comprueba que la respuesta general no puede saltarse su control.

Resultados: **221 frontend + 217 backend + 8 ADMIN local + 40 integración = 486 casos distintos aprobados**. Regresión completa 40/40 con reinicio/recuperación e instalación desde SQL oficial. Comprobación posterior del último ajuste de concurrencia: **4/4** en soporte, disputa y panel; no se suman las repeticiones al total. Lint, tipos y compilaciones aprobados. Vite conserva un aviso de tamaño del bundle, sin impedir el build. Prueba visual real con cuentas sintéticas: formulario vacío rechazado, respuesta válida guardada y paso a En atención; panel FINANCE y enlace a devolución REQUESTED comprobados. [Respuesta del titular](evidencias/sprint3/alison-respuesta-titular-20261025.png) · [Tarjetas financieras](evidencias/sprint3/alison-panel-financiero-20261025.png).

S3-10 y S3-25 se evalúan por su alcance técnico implementado; S1-11 legal queda pendiente. Las otras tareas integrales y la aceptación del MVP no se dan por terminadas automáticamente.

La comprobación adicional reprodujo la conversión concurrente antes del ajuste: una respuesta que esperaba un bloqueo devolvía 200 aunque se acabara de vincular una disputa. Ahora se vuelve a consultar el vínculo después de adquirir el bloqueo, en las cuatro operaciones de escritura generales. El test espera un bloqueo real con `pg_blocking_pids` y comprueba 404 sin insertar mensajes. Los cuatro ensayos afectados pasan tras el cambio. La primera regresión también detectó un socket HTTP vencido en el cliente de pruebas de finanzas tras SQL sincrónico; se evita su reutilización en ese ensayo, sin cambiar la API financiera. Se unificó el texto del rechazo seguro a `down`, manteniendo su prohibición de borrado.

Base original respaldada antes de la migración 32 en `%LOCALAPPDATA%/Brotar/backups/brotar-before-support-mail-20261025.dump`; actualización repetida sin pendientes y readiness aprobados. Conexión/autenticación SMTP privada comprobada sin enviar un correo externo nuevo. El envío de la nueva cola se verificó con remitente sustituido para no enviar a terceros ni alterar cuentas reales.
