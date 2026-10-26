# ADR-014 · Correo operativo del MVP de pruebas

Fecha: 24/10/2026. Responsable del alcance: Ricardo. Decisión del equipo para el MVP local; no es aprobación legal ni habilitación de pagos reales.

## Canal y alcance

Gmail SMTP autorizado con contraseña de aplicación, TLS obligatorio, remitente igual al usuario SMTP y secretos exclusivos de cada instalación. El código no contiene claves. El usuario confirmó la recepción de la prueba inicial y autorizó terminar los flujos y publicar RicardoDev. La configuración privada puede trasladarse por separado mediante `backend/scripts/mail-config.mjs`, sin copiar contraseñas de PostgreSQL.

El correo de la cuenta se comprueba con token aleatorio de 256 bits, SHA-256 en PostgreSQL, caducidad de 30 minutos, uso único y sesión del mismo titular. Máximo cinco solicitudes por hora y una por minuto; además se aplica la cuota persistente de escritura por cuenta/IP. Pedir otro enlace revoca los anteriores. Un fallo de SMTP revoca el nuevo token. La URL de verificación utiliza fragmento, se retira de la barra al abrir y exige confirmación explícita: una previsualización del correo no consume el enlace.

El contacto comprobado queda vinculado a la dirección exacta. Un cambio de dirección no hereda el distintivo ni la suscripción anterior. La API de perfil vigente no permite cambiar correo; un futuro flujo autorizado debe solicitar otra verificación. El cambio de teléfono ya anula su verificación anterior. El teléfono es opcional y **no hay canal SMS autorizado**: no se simula ni se presenta como verificado. No es un requisito para acceso básico del MVP.

Verificar correo no activa una cuenta suspendida, no aprueba KYC/KYB, no autoriza destinos ni concede roles. AUDITOR mantiene las pantallas propias de negocio en lectura. Los textos de aceptación legal definitiva siguen pendientes de S1-11; las pantallas y políticas sintéticas continúan rotuladas como pruebas.

## Avisos de estado

Los próximos cambios confirmados de campaña, verificación, pago, devolución, disputa, desembolso y recompensa se recogen desde el historial persistido, únicamente cuando existe su objeto/titular. Se omiten altas iniciales e historial anterior a la instalación. No se notifica una operación revertida. La cuenta recibe su aviso privado en Brotar; el correo requiere dirección verificada y activación explícita de avisos por el titular. No incluye motivos privados, documentos, montos, credenciales ni tokens: se consulta el detalle en la aplicación autenticada. Para expedientes de organización se usa el correo de la cuenta responsable, no se atribuye verificación a `organization.contact_email`.

El procesamiento ocurre cada 15 segundos con backend activo; hasta diez lotes de 100 eventos y diez mensajes por vuelta. Una tabla de eventos consumidos y bloqueo transaccional evitan duplicar avisos, sin usar la secuencia como orden de commit. La cola se guarda en PostgreSQL, comparte arrendamientos entre procesos y reintenta fallos hasta tres intentos con cinco minutos de espera. La configuración ausente conserva el aviso en aplicación/cola. Una baja de suscripción, contacto cambiado o cuenta no habilitada cancela el envío pendiente. La UI distingue cola, reintento, fallo y aceptación SMTP.

Una aceptación SMTP **no acredita recepción ni lectura en bandeja**. Puede haber repetición de un mensaje si el proceso muere después de la aceptación y antes de guardar el resultado: el envío es de al menos una vez, con Message-ID estable; no se promete entrega exactamente una vez. No se integra un proveedor de rebotes ni se inventa su confirmación. Los fallos definitivos quedan visibles en el aviso propio y requieren revisar el canal; el usuario no dispara reenvíos ilimitados.

La recuperación conserva el contrato público uniforme para no enumerar cuentas, token de una hora, un uso y revocación de sesiones/tokens anteriores al cambiar contraseña. Un 202 no prueba entrega; los fallos operativos SMTP se registran de manera genérica sin destinatarios ni tokens. La verificación de correo, autenticada, sí puede informar fallo del envío al propio titular.

## Límites de cierre

S1-12 puede cerrarse técnicamente tras el ensayo real. El bloque de correo de S3-26 queda implementado y probado para los eventos existentes; su cierre integral conserva pendientes legal definitivo y revalidación con los módulos que entreguen los compañeros. S3-19/S3-21 siguen abiertos. Publicar RicardoDev no publica DEV ni cierra automáticamente S3-20. Las nuevas operaciones del equipo deben registrar sus cambios reales en el historial y probar destinatario, propiedad, permisos y contenido antes de añadir otros avisos. No se construyen en este incremento esos módulos pendientes.
