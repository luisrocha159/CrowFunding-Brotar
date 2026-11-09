# Mi cuenta y desembolsos: jerarquía de información

Corte del 9 de noviembre de 2026 en `RicardoDev`. Cambios de presentación solicitados durante el recorrido manual. Origen: `RicardoDev`; rama de entrega integrada: `DEV`.

## Mi cuenta

Se sustituye la columna única por una página con navegación a siete secciones: resumen del perfil, actividad, datos personales, correo y notificaciones, condiciones y privacidad, iniciativas y permisos, y sesión. Las secciones tienen tarjetas, títulos, texto de ayuda y acciones asociadas. El identificador para invitaciones queda en un desplegable y sigue disponible completo.

Los accesos a apoyos, verificación, campañas guardadas, invitaciones e incidencias conservan sus rutas. Administración sigue apareciendo exclusivamente cuando los permisos efectivos habilitan el panel. La edición del perfil, el cierre de sesión y los accesos por rol conservan sus comprobaciones.

Correo se organiza en tres bloques: dirección y estado de verificación; preferencia opcional de avisos; bandeja de novedades. Se distingue «Pendiente de verificación» mediante texto y color. La preferencia deshabilitada explica que primero hay que verificar el correo. El botón para solicitar el enlace, la carga, los errores y el marcado de avisos como leídos conservan sus operaciones y restricciones. No se enviaron mensajes ni se cambiaron preferencias para validar el aspecto visual.

## Desembolsos

El detalle presenta primero el número de solicitud, campaña y estado; después las etapas de solicitud, autorización, procesamiento y finalización. Un bloque explica qué significa el estado y qué falta. Una solicitud pendiente o autorizada no se presenta como dinero entregado; un fallo tampoco.

El resumen financiero separa importe solicitado, costos e importe neto. La suma de costos usa céntimos exactos y el formato de importes conserva la precisión mediante enteros grandes, sin convertir el monto a un número de coma flotante. El desglose de comisiones queda disponible en un desplegable.

Destino y responsables se muestran en grupos separados. Para las respuestas privadas de desembolsos se incorporan nombre y correo del solicitante, autorizador y ejecutor. Se conservan los permisos de consulta y operación: no se añade un endpoint público. Si un contacto no está disponible se muestra una descripción neutral, sin inventar un nombre. El cliente rechaza estructuras de contacto inválidas.

El prefijo técnico reservado del titular sintético se omite en su etiqueta principal; el titular y referencia originales permanecen completos en los detalles técnicos. También se conservan los UUID, fechas y referencias de operación, sin colocarlos como información principal. El historial muestra nombres de acciones legibles y sus motivos; los identificadores se consultan de forma separada.

Los cambios no conceden roles, autorizan solicitudes ni completan desembolsos automáticamente. La prueba visual utilizó la solicitud local de 600 BOB, consultando su estado vigente sin reiniciarlo ni ejecutar acciones financieras. Las validaciones de saldo, independencia, destino y transiciones siguen en el servidor.

## Comprobaciones

- Frontend: lint, TypeScript, **273 pruebas sin fallos** y compilación de producción.
- Backend: **244 pruebas y 8 comprobaciones de herramientas locales sin fallos**, con compilación correcta.
- Integración PostgreSQL/HTTP aislada: ciclo, destino, autorización, ejecución y cierre; incorpora comprobaciones de los contactos privados y mantiene los rechazos por permisos. **Una prueba de integración completa aprobada**, sin fallos.
- Navegador: cuenta básica con siete anclas válidas; acceso a Administración ausente para la cuenta básica y presente para ADMIN. Comprobación de datos, acciones y ausencia de errores mostrados.
- Revisión visual a 1440 px y 390 px. En móvil, ambas páginas presentan un ancho de contenido de 390 px sin desbordamiento horizontal.
- axe-core sobre el contenido principal: sin incidencias en los controles seleccionados WCAG 2 A/AA y 2.1 AA de las vistas comprobadas. Esta revisión automática no sustituye una auditoría completa de accesibilidad.

Evidencia local: `tmp/verificacion-cuenta-desembolsos-20261109.log`, `tmp/verificacion-cuenta-desembolsos-backend-20261109.log` y `tmp/qa-cuenta-desembolso-legible-20261109.log`.

No se añaden dependencias, migraciones ni variables de entorno. Los comandos de instalación y arranque se mantienen.
