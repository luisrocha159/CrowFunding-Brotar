# S3-26 · Contactos y comunicación de estados

Ricardo · 29/10/2026 · RicardoDev local. Alcance: MVP académico DEMO, política provisional del equipo. Sin publicación ni cambios en DEV o Trello. El ensayo integral del MVP sigue en S3-21 y la entrega final en S3-20.

**Estado: cierre técnico local de S3-26.** Checks finales aprobados:261 frontend+241 backend+8 ADMIN+5 integraciones dirigidas=**515 pruebas distintas de este cierre**, sin contar repeticiones. Lint, tipos y builds con exit0. Las cinco integraciones terminaron sin fallos ni casos omitidos. No sustituye el recorrido integral S3-21.

## Alcance comprobable

| Criterio | Implementación y evidencia |
| --- | --- |
| Posesión de correo propio | Solicitud autenticada, token aleatorio de 256 bits hasheado en PostgreSQL, vínculo a cuenta/dirección, 30 minutos y un uso. El enlace no se consume al abrirlo; la confirmación requiere pulsar el botón. El fragmento se retira de la dirección del navegador. |
| Intentos y reenvíos | Un enlace por minuto, cinco por hora y cuota persistente por cuenta/IP. Reenviar revoca enlaces anteriores; un fallo de transporte revoca el nuevo. Tokens ajenos, vencidos, usados, revocados y cuerpos con campos añadidos se rechazan. |
| Contacto cambiado | Una dirección diferente no hereda el distintivo ni la suscripción efectiva del correo anterior. La API de perfil no permite cambiar correo arbitrariamente. Cambiar teléfono invalida su verificación previa. |
| Identidad y permisos | Verificar correo no aprueba KYC/KYB, no concede CREATOR ni roles internos y no reactiva cuentas suspendidas. AUDITOR conserva lectura y los avisos solo son consultables por su titular. |
| Teléfono | Opcional y validado por el perfil; SMS no está contratado ni se simula su verificación. Se informa expresamente. No se exige verificar ambos contactos para acceso básico. |
| Comunicaciones entre módulos | Historial confirmado de campaña, identidad, pago, devolución, disputa, desembolso y recompensa; eventos transaccionales de soporte. El creador recibe la decisión de campaña y la cuenta responsable recibe KYB, sin atribuir posesión a organization.contact_email. |
| Preferencias | Los avisos opcionales necesitan correo verificado y elección explícita. Desactivar cancela pendientes antes del envío; los avisos siguen en Brotar. Activar no envía retrospectivamente los avisos nacidos sin suscripción. Recuperación/verificación solicitadas son mensajes de seguridad separados. |
| Persistencia y reintentos | Outbox en PostgreSQL, consumo por evento, bloqueo/arrendamiento entre trabajadores, máximo tres intentos con cinco minutos de espera. Se prueba una instancia nueva del trabajador sobre la misma cola y ejecución concurrente. No se convierte un fallo en envío correcto. |
| Privacidad | Los mensajes no incluyen documentos, motivos privados, conversación interna, contraseñas ni tokens de acceso en avisos ordinarios. El detalle se consulta autenticado. La aceptación SMTP no acredita llegada, lectura, identidad o transferencia real. |
| Legal del ensayo | Se utiliza la versión propia provisional mvp-demo-legal-1.0-20261028 adoptada por el equipo; no se espera un texto externo para probar el MVP. No se atribuye aprobación jurídica/comercial. |

## Correcciones de este cierre

1. **Estados reales en español.** Se completan las etiquetas que faltaban para observaciones de campaña, final del financiamiento, estados de disputa/recompensa y verificación. Los códigos futuros desconocidos se conservan, sin convertirlos en un éxito inventado.
2. **Suscripción efectiva.** El estado del contacto solo muestra avisos activados cuando la dirección actual coincide con la verificada. Se conserva el registro histórico; no se inventa una verificación nueva.
3. **Validación de respuestas del frontend.** Contactos y avisos verifican estructura, UUID, fechas, resultados e intentos entre 0 y 3. Un cuerpo nulo/incompleto no se representa como bandeja vacía o éxito. Marcar leído exige confirmación updated=true del servidor.
4. **Cronología de avisos nuevos.** La fecha guardada procede del cambio de estado o del evento de soporte, en vez de asignar la misma fecha a todo un lote. Se conserva la precisión de microsegundos en PostgreSQL, sin convertir la fecha de origen a JS Date antes de guardarla. Se reprodujo el defecto con una prueba que fallaba y se comprobó el orden posterior a la corrección. Los avisos históricos se conservan; no se reescriben ni se reenvían.
5. **Pruebas aisladas.** Contactos y corrección KYC tienen IP sintética distinta por ensayo. Se mantiene el límite real; una fase larga del fixture transversal avanza únicamente su propia ventana de prueba. KYB exige primero un responsable con KYC DEMO aprobado, realizado mediante HTTP; no se elimina ese requisito.

No hay migraciones nuevas: se conservan las 40 existentes y las 215 rutas HTTP. Frontend y backend deben actualizarse juntos. Los permisos de inserción de notification.created_at ya estaban incluidos en la migración de correo; no se amplían privilegios.

## Pruebas y procedencia

Tras recuperar Docker se restauró la API QA habitual, sin transporte sustituido ni SMTP real. Readiness confirmó conexión a la base. Un nuevo inicio de sesión y lectura HTTP comprobaron que se conservan verificación y preferencia sintéticas: [persistencia tras reinicio](evidencias/s3-26/persistencia-reinicio.json).

La matriz y los resultados finales se guardan en [resumen.json](evidencias/s3-26/resumen.json). No se suman repeticiones como pruebas nuevas. Los logs privados de ejecución quedan en tmp/; se publican únicamente sus hashes y resultados, sin tokens, destinatarios reales ni contraseñas.

La integración dirigida abarca: contacto/token/cuota/cambio de dirección; decisión real de campaña con solicitudes concurrentes; cola sin canal, sustitución del trabajador, fallo y recuperación; lectura ajena/propia e idempotencia; baja/alta sin envío retrospectivo; captura/revisión KYC y KYB por personas separadas; soporte bidireccional, privacidad, rollback y reintentos; perfil/teléfono.

Se conservan los fallos intermedios: interferencia entre cuotas de pruebas, fixture KYB sin KYC previo y reproducción del defecto de fecha. Se corrigió el aislamiento/recorrido del fixture sin relajar reglas de producción. Una última pasada fue interrumpida al detenerse Docker; no se cuenta como aprobada. Los sockets temporales de Windows se conservaron mediante renombrado, sin eliminar volúmenes, y se repitió la pasada final.

### Canal real y transporte de pruebas

La configuración privada existente de Gmail superó una comprobación nueva de **conexión TLS y autenticación** con `check-mail.mjs`, sin enviar mensajes nuevos. La recepción real y los flujos SMTP del 24/10 están documentados en [correo operativo](correo-operativo-2026-10-24.md); son evidencia previa con su fecha, no una recepción nueva inventada.

Para inducir fallos y observar tokens sintéticos, las integraciones sustituyen únicamente ContactMailSender. La prueba visual usa API/PostgreSQL reales en QA15448/API3198/frontend5198 y un transporte en memoria/archivo privado que rechaza destinatarios reales. No usa la contraseña Gmail. **Los correos de esos fixtures no llegaron a Gmail ni prueban posesión de un buzón real.** La marca verificada representa el resultado del token sintético dentro de ese ensayo.

### Interfaz observada

- Cuenta sintética inicialmente pendiente: preferencia deshabilitada, aviso de que no hay verificación SMS y enlace disponible.
- Solicitud de enlace mediante Enter; abrir el enlace no verifica la cuenta y elimina el fragmento de la barra.
- Confirmar mediante Enter devuelve Correo verificado y permite volver a Mi cuenta.
- Activar avisos muestra confirmación y persiste la preferencia; una revisión KYC sintética independiente produce avisos privados visibles.
- [Captura de confirmación en escritorio](evidencias/s3-26/confirmacion-escritorio.png), obtenida con transporte de prueba, no Gmail real.

La herramienta de navegador dejó de estar disponible antes de repetir las interacciones posteriores a la corrección de cronología. Ese cambio se comprueba en PostgreSQL/HTTP; no se declara una segunda pasada visual inexistente. La revisión móvil/teclado global anterior continúa en [S3-19](cierre-s3-19-qa-global-2026-10-29.md); este incremento no cambia el marcado o los estilos del panel. No certifica WCAG, rendimiento de producción ni aceptación integral.

## Repetir con configuración propia

1. Preparar el proyecto según README, con PostgreSQL V2 y las migraciones habituales. Las credenciales son locales y no están en Git.
2. Configurar SMTP privado y PUBLIC_WEB_ORIGIN con el origen real de la interfaz. Mantener PASSWORD_RESET_LOCAL_FILE=false para Gmail.
3. Desde backend: `corepack pnpm run build` y `node --env-file-if-exists=.env scripts/check-mail.mjs`. Esta comprobación autentica sin enviar mensajes.
4. Iniciar backend y frontend según README. Abrir Mi cuenta → Correo y notificaciones → Solicitar enlace, revisar entrada/spam, abrir el enlace en el mismo origen con la misma cuenta y pulsar Confirmar correo.
5. Activar avisos; con otro responsable autorizado decidir un expediente o campaña DEMO y actualizar notificaciones. Comprobar la diferencia entre aviso interno, cola, reintento, fallo y aceptación SMTP. Marcar leído y recargar.
6. Desactivar avisos y provocar un nuevo cambio válido: debe quedar en Brotar sin enviarse por correo. La baja afecta pendientes que aún no se han despachado; no puede retirar un correo ya aceptado por SMTP.

Regresión sin base: `bun run check` en raíz y `corepack pnpm run check` en backend. Para las integraciones con escritura, usar exclusivamente una copia QA separada con Compose que contenga qa y sus credenciales limitadas; compilar con `corepack pnpm exec tsc -p tsconfig.test.json`, habilitar ALLOW_DB_TEST_WRITES=true/DB_TEST_RESTART=false solo en esa consola y ejecutar los archivos contact-mail, contact-transversal, profile, support-conversation-mail y verification-notifications de dist-test/integration con `node --test --test-concurrency=1`. No activar esos flags en la API habitual.

## Límite de entrega

SMTP proporciona aceptación, no acuse de recepción/lectura. Si el proceso cae después de aceptar un mensaje y antes de persistir el resultado puede repetirse el correo: se mantiene Message-ID estable y no se promete entrega exactamente una vez. No se integra proveedor de rebotes ni SMS, ni se habilitan pagos reales. La protección jurídica externa sigue siendo requisito antes de una operación comercial.

**Estado local del Sprint3:**34/36 alcances cerrados técnicamente;Ricardo16/18,Alison9/9,Santiago9/9. Quedan S3-21 y S3-20. Trello conserva su instantánea histórica y no se publica nada.
