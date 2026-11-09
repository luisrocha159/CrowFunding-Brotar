# Ajustes de aportes, verificación y QR

La revisión visual posterior de Mi cuenta y desembolsos se documenta en [Jerarquía de información y comprobaciones](ajustes-mi-cuenta-y-desembolsos-2026-11-09.md).

Corte del 9 de noviembre de 2026. Rama de entrega: `RicardoDev`; integración con DEV pendiente. Complementa las correcciones de presentación e identidad de la misma fecha.

## Aportar y elegir recompensa

El usuario introduce primero un importe positivo, con hasta dos decimales. Las recompensas se presentan como tarjetas con mínimo, disponibilidad y selección visible. Si el importe no alcanza el mínimo, la tarjeta indica cuánto falta y no permite seleccionarla. El servidor vuelve a validar importe, modalidad, disponibilidad y cupos al crear y confirmar el aporte.

- Donación: sin recompensa.
- Recompensa: se permite aportar sin recompensa, incluso por debajo del mínimo de una recompensa concreta, respetando el mínimo de campaña si existe.
- Preventa: exige seleccionar un producto disponible y alcanzar su mínimo.
- Al disminuir el importe después de elegir una recompensa, no se cambia la selección silenciosamente: se informa y se impide continuar hasta corregirla.
- Continuar lleva al resumen integrado del aporte. Un aporte sin recompensa no consume unidades.
- Se conserva el acceso existente «Mi panel de apoyos» desde el perfil. No se añade otro acceso redundante tras la aclaración del usuario.

## Expedientes y revisión

La presentación usa tarjetas y etiquetas destacadas para correo del remitente, nombre e identificador. El correo proviene del servidor y solo se incorpora a las respuestas privadas autorizadas de revisión; no se añade al catálogo público. Los valores y documentos del titular se conservan sin alterar.

Las etiquetas operativas se simplifican. Las condiciones originales permanecen disponibles en un bloque desplegable y en la página legal; las publicaciones legales históricas no se reescriben. Un aviso general compacto aclara el carácter académico y la ausencia de validación de identidad y movimientos bancarios.

El consentimiento se presenta como «He leído las condiciones de privacidad y autorizo el tratamiento de mis datos y documentos para gestionar esta verificación», con un enlace directo a la versión aplicable. Los códigos de política y acuerdo no aparecen en la confirmación. Registro, panel de aceptación y portada de condiciones también usan títulos y mensajes naturales. Versiones y huellas se conservan dentro de detalles técnicos desplegables; no cambia la versión enviada al servidor, la validación de consentimiento ni el contenido legal publicado. Comprobación posterior: 271 pruebas del frontend, lint, TypeScript y compilación correctos; revisión visual del consentimiento obligatorio y no premarcado en navegador.

El administrador no puede decidir sobre su propio expediente. La interfaz explica que necesita otro revisor y oculta ese formulario; el servidor conserva la prohibición. Compliance sí puede revisar el expediente de otra cuenta. La confirmación dice «Confirmo la revisión y que no es un expediente propio».

### Aceptación obligatoria antes de continuar

Abrir el documento no registra consentimiento. El panel comunica la aceptación confirmada por el servidor a la página de verificación: mientras se consulta, falla la consulta o falta aceptación, se permite consultar expedientes pero se deshabilitan inicio, edición y carga de documentos. Al registrar la aceptación se habilita la captura sin recargar la página. Las cuentas que ya aceptaron la versión vigente conservan su recibo y no deben repetir esa aceptación general.

El envío exige además marcar la autorización específica del expediente, inicialmente desmarcada. El botón «Enviar a revisión» permanece deshabilitado hasta marcarla; guardar un borrador no envía el expediente. El backend vuelve a exigir ambos consentimientos y sus versiones, aunque se intente enviar directamente por API. Las pruebas aisladas `legal-agreement` y `legal-lock` pasaron: sin aceptación general se rechaza el envío; con aceptación general pero sin autorización específica también se rechaza, sin cambiar el estado ni generar recibo. Con ambas se permite el envío y se conserva la trazabilidad. No se modificaron aceptaciones previas del usuario para probarlo.

## QR escaneable del aporte

La decisión expresa del usuario fue un QR escaneable para identificar el aporte simulado, sin integración bancaria. Se sustituye el dibujo decorativo por un PNG generado localmente con `qrcode`, margen de cuatro módulos y corrección de errores M, sin letras superpuestas. Puede descargarse.

El contenido es JSON con aplicación, tipo, identificador de pago, referencia, importe, moneda, modo `SIMULATION` y `payable: false`. No incluye correo, contraseña ni datos bancarios. Un lector permite consultar esos datos; escanear no ejecuta una confirmación ni un cobro. No depende de un servicio externo ni de que el teléfono acceda a localhost. El contrato interno de pagos y su control de estados no cambian.

La generación muestra carga y permite reintentar ante un error. El componente descarta resultados antiguos cuando cambia el pago. La confirmación del resumen se presenta como «Confirmo los datos y autorizo registrar este aporte»; el aviso general conserva la aclaración del entorno.

Dependencias: `qrcode` en ejecución; `@types/qrcode` y `jsqr` en desarrollo. Se instalan mediante el comando ya documentado `bun install --frozen-lockfile`. No se requieren nuevas variables de entorno ni migraciones para estos ajustes. Se mantienen las 41 migraciones del corte local anterior y la configuración privada de correo.

## Comprobaciones

- Instalación de dependencias con lockfile congelado: correcta.
- Frontend: lint, TypeScript, 271 pruebas sin fallos y compilación de producción.
- Backend del mismo corte funcional: 244 pruebas y 8 comprobaciones de herramientas locales sin fallos; compilación y controles correctos. Evidencia local: `tmp/verificacion-tarjetas-correos-final-backend-20261109.log`.
- PostgreSQL aislado: tres pruebas de integración sin fallos para revisión privada, pagos y consulta de aportes; incluyen privacidad del correo, permisos, aporte sin recompensa, comprobante y conservación de cupos. Evidencia: `tmp/qa-remitente-tarjetas-final-20261109.log`.
- Navegador: selección con importes 20, 50 y 49.99 BOB, sin recompensa, recompensa habilitada en su mínimo y bloqueo al reducir el importe. No se confirmó ningún aporte del usuario para esta comprobación.
- Navegador: expediente propio sin formulario de decisión para ADMIN y el mismo expediente con formulario y correo para COMPLIANCE. No se modificó la decisión del expediente.
- QR: dos pruebas automatizadas de contenido, ausencia de datos privados y decodificación independiente. Además, la imagen generada por el componente en el navegador fue leída con `jsqr` y devolvió exactamente referencia e importe; se comprobó la descarga y ausencia de desbordamiento a 501 px de ancho. La comprobación del componente usa datos aislados y no crea movimientos financieros.

Estas comprobaciones acreditan los escenarios ejecutados; no equivalen a certificación bancaria ni sustituyen la revisión manual del equipo.

Referencias técnicas: [node-qrcode](https://github.com/soldair/node-qrcode/blob/master/README.md) y [jsQR](https://github.com/cozmo/jsQR).

## Método en el comprobante

Se detectó que la selección conservaba TEST_QR o TEST_CARD, pero el checkout no transmitía ese dato al pago. El historial consultaba exclusivamente el catálogo `payment_method`, que estaba vacío en la instalación local; el resultado era «No registrado» incluso al seleccionar QR.

El frontend ahora transmite el método al checkout y lo muestra en el resumen. El backend admite exclusivamente QR o tarjeta del simulador, conserva el valor en los metadatos del intento y lo incluye en la identidad de la solicitud: cambiar el método con una clave ya utilizada provoca conflicto en lugar de reutilizar otro pago. Cada reintento conserva el método del intento anterior. El historial y el comprobante resuelven la etiqueta del registro, conservando la compatibilidad con los métodos del catálogo para otros proveedores. Un intento de tarjeta no muestra el QR como medio de pago.

Las peticiones históricas sin método mantienen ese dato como desconocido, sin convertirlas automáticamente en QR. En esos casos la interfaz indica «Método no informado». No se necesita migración, catálogo inventado ni cambio de configuración.

Se recuperó el dato de dos pagos locales: `7112e062-4dfc-44a5-aaa8-cc1703123ade` (500 BOB, captura reportada) y `61b4155e-5f6a-4ffb-bf10-b79f4dfefad3` (600 BOB, recorrido de desembolso). Para cada uno se exigió una única selección guardada del mismo titular, campaña, importe, moneda y recompensa, anterior al intento en menos de cinco minutos y coincidente con el identificador conocido. Ambas registraban TEST_QR. La recuperación conserva el identificador de la selección y deja auditoría; no altera importes, estados, confirmaciones ni la firma original de la solicitud. No se ejecutó una recuperación masiva sobre otros pagos.

Comprobación: los dos recibos privados responden 200 con método QR y sus importes originales; el comprobante de la captura también muestra QR en el navegador. Se añadieron regresiones de QR, tarjeta, métodos inválidos, compatibilidad de peticiones sin método, cambio de método con la misma clave y conservación al reintentar. Frontend: 272 pruebas y compilación correctas. Backend: 244 pruebas, 8 comprobaciones de herramientas locales y compilación correctas. La evidencia de integración de pagos, historial, persistencia y ciclo se registra en `tmp/qa-metodo-comprobante-final-20261109.log`; la recuperación local, en `tmp/recuperacion-metodos-20261109.json`.

Ronda final de integración: cuatro pruebas PostgreSQL/HTTP aprobadas, cero fallos, ejecutadas en la base aislada: `demo-payments`, `contribution-history`, `contributions` y `campaign-cycle-disbursements`. La prueba de regresión se observó fallar antes de implementar el traspaso del método y pasar con la corrección.
