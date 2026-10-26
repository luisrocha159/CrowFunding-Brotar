# ADR-012 Reglas del MVP de pruebas

Fecha: 20 de octubre de 2026. Decisión del responsable del equipo, Ricardo, autorizada en la conversación. Alcance: MVP académico local, sin dinero real. No es una autorización bancaria, aprobación legal ni certificación de producción.

Este acuerdo elimina la espera de definición externa para las reglas funcionales descritas abajo. No sustituye la implementación: la tabla final separa lo que ya ejecuta el código de las integraciones pendientes. El trabajo permanece en `RicardoDev`, sin publicación.

## Responsabilidades y concesión de roles

Se adopta la matriz de `backend/src/roles/domain/access-policy.ts`: REVIEWER revisa y decide campañas; COMPLIANCE revisa identidad; FINANCE opera las funciones financieras autorizadas; SUPPORT resuelve incidencias; ADMIN administra, configura y publica; AUDITOR solo consulta. ADMIN no obtiene `finance.operate` por ser administrador. Un usuario puede acumular responsabilidades, pero AUDITOR bloquea cualquier escritura incluso si también tiene ADMIN o FINANCE.

ADMIN concede y revoca REVIEWER, COMPLIANCE, FINANCE, SUPPORT y AUDITOR para otras cuentas, con motivo de 10–500 caracteres y confirmación. No puede modificar sus propias responsabilidades. Se conserva el historial con `revoked_at`; no se elimina la concesión anterior ni se reactiva una vencida o futura sin revocación explícita. Los permisos se vuelven a consultar en cada petición, sin esperar otro login. El alta inicial de ADMIN sigue el procedimiento local documentado, fuera del formulario; la gestión general de personas y organizaciones de Santiago sigue separada.

La concesión de un rol no activa ni desbloquea una cuenta, no modifica su contraseña y no aprueba correo, KYC/KYB o cuenta de destino. No se permite autoaprobar identidad ni desembolsos; los futuros módulos deben comprobarlo también dentro de su transacción.

## Retención de auditoría

El equipo adopta **12 meses de detalle de auditoría** como criterio del MVP, no como plazo obligatorio de una empresa financiera. Después se conserva únicamente mes UTC, acción del catálogo y número de eventos. No se trasladan nombres, correos, identificadores, IP, documentos, motivos ni cuerpos de solicitudes a un TXT.

El mantenimiento es manual: primero `plan`; para aplicar se exige confirmación específica y respaldo completo válido fuera del repositorio. Cada aplicación procesa como máximo 5000 eventos y guarda estadísticas y eliminación en una transacción. Repetir no vuelve a contar los eventos retirados. La API mantiene prohibido UPDATE/DELETE sobre `audit_log`; solo el mantenimiento administrativo puede aplicar la política.

Por prudencia, cualquier campaña no terminal, caso de soporte/disputa no resuelto, pago pendiente/disputado, devolución/desembolso pendiente o conciliación abierta **retiene globalmente el detalle**. Es una decisión conservadora para este MVP pequeño: no se intenta deducir vínculos incompletos y perder evidencia de un caso. El plan muestra esos bloqueos sin identificar personas. No hay cron, purga al arrancar ni endpoint de borrado. `status_history` y los expedientes de negocio no se eliminan con esta política.

Los respaldos completos contienen datos sensibles aunque los agregados no los contengan. Deben permanecer en almacenamiento local restringido, fuera de Git, y revisarse para eliminación manual a los 30 días si ya no hay investigación/recuperación que los requiera. Este incremento no borra respaldos ni datos de la base original. La conservación de documentos de identidad y cuentas requiere una política separada antes de tratar datos reales.

## Identidad y acciones que exigen verificación

Navegar, registrarse, iniciar sesión, editar el perfil y preparar borradores no requieren KYC. Enviar una campaña a revisión tampoco aprueba identidad: permite revisar campaña e identidad en paralelo. Publicar exige la aprobación de campaña y las verificaciones aplicables vigentes:

| Titular | Verificación y evidencia sintética para el MVP |
| --- | --- |
| Persona | Identidad declarada y documento de identidad de prueba legible. Decisión KYC explícita de COMPLIANCE o ADMIN distinto del interesado. |
| Organización | Documento constitutivo/registro y respaldo tributario o explicación de no aplicabilidad, más representación legal de prueba. KYB explícito y KYC aprobado del representante autorizado. |
| Cuenta de destino | Cuenta ficticia perteneciente al beneficiario, moneda coincidente y revisión explícita. No basta cargar un archivo ni escribir un número. |

Usar el catálogo `document_type` y `verification_type` de la base, no listas ocultas en la interfaz. En las demostraciones se utilizan archivos sintéticos y nombres de ensayo, nunca documentos reales nuevos. Aprobar implica una decisión registrada; `PENDING`, `IN_REVIEW`, `REQUIRES_INFO`, `REJECTED`, `EXPIRED` y documentos cargados no equivalen a `APPROVED`. Revocar permisos no debe borrar decisiones históricas válidas del revisor.

Un aporte simulado solo necesita sesión válida y consentimiento de demostración. Un desembolso simulado necesita KYC/KYB aplicable y cuenta de destino revisada. Captura, corrección y documentos de Santiago, revisión S2-08, comprobaciones de publicación S3-23 y cuenta de destino deben integrarse antes de dar por aplicado este bloque. **Todavía no están implementados esos controles KYC completos en la publicación existente del Sprint 2.** No presentar la publicación actual como acreditación de identidad.

## Pagos exclusivamente simulados

Se descarta un proveedor real para esta entrega. S3-01 pasa a tener una alternativa interna de demostración; la integración autorizada con banco/proveedor real queda fuera y no se considera completada por ejecutar eventos sintéticos.

Los futuros checkout, QR y comprobantes deben mostrar «DEMO · sin dinero real». Un eventual QR será no pagable: sin enlaces bancarios, cuentas o instrucciones de transferencia. El servidor fija proveedor de simulación, importe, moneda y referencia; el navegador no puede confirmar dinero real ni modificar el importe registrado. Las comisiones base de ensayo serán cero y no representan precios reales. No se solicitarán tarjetas o credenciales bancarias.

Actualización de implementación del 21/10: el núcleo exige proveedor activo `is_sandbox=true` y rechaza producción. Un simulador interno con bandera apagada por defecto añade API de checkout, boleto con contenido QR no pagable y resultados sintéticos con recibos durables. **No hay proveedor bancario ni QR renderizado/comprobante integral**. Las pantallas de Alison consumirán el [contrato DEMO 0.5](../contrato-pagos-demo-0.5.md); no se expone `applyVerifiedEvent` como un webhook sin autenticación.

## Reservas y reintentos

La reserva dura como máximo 30 minutos y nunca más allá del fin de recaudación. Un intento fallido o vencido permite reintentar el **mismo aporte** con una nueva clave y un nuevo `attempt_number`; conserva el intento anterior. No permite dos intentos abiertos ni reabre aportes que ya tuvieron un pago confirmado. Repetir la misma clave sobre el mismo aporte no crea otro intento; reutilizarla para otro aporte se rechaza.

`ContributionLedger.expireDue` persiste los vencimientos de simulación en lotes acotados y registra su procedencia. No confirma ni reembolsa: libera la reserva, conserva los intentos y audita la transición. Desde el 21/10 FINANCE puede invocarlo por HTTP para el proveedor DEMO; no existe temporizador de expiración al iniciar el servidor. La disponibilidad ya ignora reservas vencidas aunque todavía no haya corrido el mantenimiento.

Una confirmación tardía no reactiva el intento ni suma recaudación. Desde el 21/10 el simulador conserva el aviso como NEEDS_REVIEW para conciliación. FINANCE puede contrastar evidencia o compensar un recibo inequívoco nunca ingresado; no puede resolver su propio aporte. Una compensación DEMO es un registro separado: no es `refund` de un pago confirmado, devolución bancaria ni permiso para alterar la recaudación. Ambigüedades/importe distinto sin evidencia continúan abiertas. La vista oficial y el índice de un pago confirmado por aporte mantienen la fuente única de recaudación.

## Resultado y ciclo de campaña

Al vencer el periodo se bloquean nuevos aportes; se resuelven los intentos pendientes antes de calcular el resultado. Alcanzar la meta antes del plazo no cierra la campaña anticipadamente por sí solo.

En todo-o-nada, alcanzar la meta habilita la siguiente etapa; no alcanzarla abre las devoluciones simuladas de aportes confirmados. En flexible se puede continuar con los fondos confirmados aunque no se alcance la meta. No se desembolsa automáticamente por comparar dos números: se requiere revisión financiera y verificaciones vigentes.

El creador solicita cancelación; ADMIN decide con motivo. Con fondos ya desembolsados se abre resolución de caso y no una devolución automática de dinero inexistente. La ejecución y cierre requieren seguimiento/rendición revisados y obligaciones resueltas, incluidos reembolsos/disputas. S3-23 integra estas transiciones con la ejecución y rendición de Santiago; no se da por terminada por tener el enum en PostgreSQL.

## Desembolsos devoluciones y reclamaciones

FINANCE autoriza y ejecuta movimientos **simulados** con motivo, comprobación de saldo disponible y protección de reintentos. No se autoriza un desembolso solicitado por la misma persona que lo aprueba. No se duplica una liberación ni se compromete saldo ya reservado para una devolución o disputa. El máximo disponible se calcula en servidor con pagos confirmados, devoluciones completadas y compromisos vigentes.

Se admiten devoluciones totales o parciales justificadas, nunca superiores al pago confirmado menos lo ya devuelto y reservado. Una reclamación requiere seguimiento de SUPPORT; resolverla no ejecuta dinero por sí mismo. FINANCE aplica la compensación autorizada por su flujo y queda trazabilidad. Estas reglas definen S3-07/08/09/11; las consultas financieras S3-06 existentes no implementan las operaciones.

## Correo y textos legales pendientes

El buzón local de recuperación sirve solo para demostración. El correo real y la verificación efectiva de contactos siguen pendientes de un remitente autorizado y su configuración privada. La contraseña de aplicación se configura en el `.env` ignorado o almacén de secretos del equipo, no en el chat, README, código ni Git. También siguen pendientes los textos legales definitivos; no atribuir validez legal a la casilla de consentimiento de ensayo.

## Estado de aplicación

| Bloque | Aplicación en este incremento |
| --- | --- |
| Matriz y gestión de responsabilidades | API y formulario de concesión/revocación; controles transaccionales, historial, auditoría y pruebas. S3-16 sigue abierta por módulos futuros. |
| Retención | Plan y mantenimiento administrativo manual con respaldo; agregados sin datos personales. Probado únicamente en QA con filas sintéticas. |
| Reservas y reintentos | Motor y API DEMO implementados; invocador de expiración FINANCE, sin programador automático. |
| KYC/KYB y controles antes de publicar | Criterio fijado; implementación e integración pendientes de captura/revisión. |
| Simulador checkout y QR | API/boletos no pagables implementados el 21/10; UI/QR renderizado y comprobante integral pendientes de Alison. Proveedor real excluido. |
| Conciliación DEMO | Actualización documentada 23/10: interfaz/API/BD con cierre técnico S3-07; pendientes, referencias, contraste/compensación, motivo/responsable y cierre protegido verificados el 22/10. Ver cierre-s3-07-conciliacion-2026-10-23.md. Aceptación externa pendiente; no implementa devoluciones de aportes confirmados. |
| Ciclo de campaña y otras operaciones financieras | Reglas fijadas, implementación pendiente; ejecución/rendición dependen de Santiago e incidencias de Alison. |
| Correo real y textos legales | Pendientes, sin cambios ni credenciales nuevas. |

Las historias completas no se cierran por fijar decisiones ni por probar solo el núcleo con fixtures. La evidencia del incremento detalla las comprobaciones ejecutadas.
