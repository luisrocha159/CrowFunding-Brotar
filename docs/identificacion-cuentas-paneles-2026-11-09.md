# Identificación de cuentas en paneles administrativos

Actualización local de RicardoDev, 9 de noviembre de 2026. Responde a la observación de Ricardo: un identificador de aporte, solicitud o pago no basta para saber qué cuenta está involucrada.

## Presentación y alcance

Se muestra nombre destacado y correo debajo, con etiquetas que distinguen la participación. Se conserva el identificador técnico para trazabilidad. Los datos se consultan desde las cuentas realmente relacionadas con cada registro; no se deduce el responsable a partir de la sesión que está mirando el panel.

| Panel administrativo | Cuentas identificadas |
| --- | --- |
| Devoluciones | Aportante, solicitante, autorización y actor de cada evento |
| Operaciones financieras | Cuenta aportante de cada intento de pago |
| Conciliación | Preparación y cierre del lote; aportante y resolución de cada referencia; aportante de los pendientes |
| Soporte | Solicitante, responsable asignado, autores de mensajes y cambios de estado |
| Disputas | Solicitante, agente asignado, autores de mensajes y decisiones |
| Verificaciones | Cuenta remitente y último revisor |
| Revisión de campañas | Cuenta creadora en la cola y el detalle; revisor de cada ronda |
| Ciclo de campañas | Cuenta creadora, solicitante de cancelación y actores del historial |
| Preparación de cierre | Cuenta creadora, presentación y revisión del informe permitido por el rol |
| Rendición y remanentes | Cuenta creadora, presentación/revisión, solicitud/autorización/finalización de remanentes e historial |
| Desembolsos y destino | Responsables del desembolso, de sus eventos y de la revisión del destino |
| Auditoría | Cuenta responsable del evento y referencia técnica original |

Por ejemplo, una devolución rechazada muestra por separado la cuenta del aportante y la que rechazó la solicitud. No se presenta la cuenta que está iniciando sesión como autora de una operación ajena.

## Permisos y privacidad

- Se reutilizan los permisos existentes de lectura por módulo y las comprobaciones de propiedad. No se crean roles ni se permite operar dinero por mostrar un contacto.
- La incorporación de contactos de terceros se limita a respuestas administrativas autorizadas. Las páginas públicas, los comprobantes públicos y el flujo personal del aportante no se convierten en un directorio de cuentas internas.
- El helper compartido solo obtiene nombre y correo para los identificadores presentes en registros previamente autorizados. Usa una consulta parametrizada por grupo, sin una búsqueda pública de usuarios y sin cargar contraseñas, teléfonos, sesiones, documentos ni credenciales de correo.
- Los componentes muestran texto escapado. Los contactos mal formados se rechazan al interpretar la respuesta. Las respuestas privadas mantienen sus controles de caché existentes.
- Si una cuenta no está disponible, se informa de ello; no se inventan personas. Un registro sin actor personal no se atribuye automáticamente a un administrador. Las devoluciones automáticas identificadas como tales conservan su origen de sistema.
- Son **datos actuales de contacto**: si la persona cambia su perfil, la visualización puede cambiar. Los eventos y sus UUID históricos permanecen intactos; no se reescribe la auditoría como si esos datos se hubieran guardado en el momento original.
- La exportación CSV financiera conserva su selección previa de columnas; esta actualización no añade correos a ese archivo.

## Actualización y comprobaciones

No se requiere otra migración, variable de entorno ni carga manual de cuentas. Se actualizan backend y frontend juntos y se recarga el navegador. El inventario continúa en 42 migraciones y 218 rutas HTTP.

Se comprueban la consulta compartida parametrizada, el rechazo de contactos mal formados, el escape de textos y la separación entre vista administrativa y personal. Se ejecutan los controles completos de frontend/backend y nueve recorridos HTTP/PostgreSQL aislados: devoluciones, pagos financieros, auditoría, disputas, soporte, conversación/correo, revisión de identidad, ciclo/desembolsos y rendición.

Los recorridos con escritura usan una base aislada; no se alteran aportes, solicitudes ni decisiones que Ricardo está revisando manualmente. El correo real y las credenciales privadas no se modifican ni se publican con este cambio.

## Recorrido para abrir una disputa

1. Iniciar sesión con la cuenta que realizó un aporte confirmado.
2. En Mis aportes, utilizar **Reportar incidencia** en el aporte correspondiente. Así queda vinculada al aporte exacto, no solamente a su campaña.
3. Elegir el tipo de incidencia, escribir asunto y descripción, adjuntar evidencias opcionales y confirmar **Registrar incidencia**.
4. En el detalle de la incidencia, elegir **Abrir disputa del pago de este aporte**.
5. Seleccionar su pago confirmado, escribir la descripción de la disputa, confirmar y pulsar **Abrir disputa**.
6. Con una cuenta SUPPORT independiente, entrar a Administración → Disputas, abrir el expediente y elegir **Asumir o reasignarme el caso**. A continuación podrá solicitar información, retomar, escalar o resolver según el estado.
7. Recomendar una devolución no la ejecuta: el aportante solicita el importe recomendado y FINANCE independiente lo revisa, autoriza y completa por separado.

Una devolución en trámite o una disputa con retención sobre el mismo pago impide abrir otra reserva. Un pago completamente devuelto no está disponible para una disputa nueva. No se duplica dinero ni se fuerzan estados para mostrar el recorrido.


## Presentación visual del ciclo

La consulta del ciclo de campaña organiza las etapas, estado, cuenta creadora, meta y resultado del período en un resumen visual. Se muestran seis tarjetas financieras y una lista numerada de condiciones pendientes de cierre. El historial conserva fechas, responsables y decisiones en una línea de seguimiento; las referencias técnicas quedan en un desplegable.

«Pendiente de desembolso» es el compromiso total menos lo ya desembolsado, calculado con importes exactos. El compromiso total original se conserva en los detalles del corte. Una campaña cancelada o cerrada con devolución no se presenta como si hubiera completado la ejecución. Los datos ausentes se indican sin sustituirlos por importes inventados.

La actualización es de frontend: conserva permisos, acciones, confirmación e idempotencia existentes. Se revisa en escritorio y móvil y no requiere migraciones ni variables nuevas.
