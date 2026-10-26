# Revisión e integración local de Alison · 25/10/2026

Se integra `AlisonDev` en `RicardoDev`, sin publicar ni modificar DEV o Trello. Fuente revisada: `bd4ed690fb086fb03e9403ecf4e4c971fab7bffd` (`S3-completado`). Base local: `7d48fbf30cf9b32cb28ea09b5f261143e3801103`. El mensaje del commit no constituye una certificación del Sprint 3 completo.

## Resultado funcional

- Reportes de terceros sobre campañas publicadas, limitados a categorías no financieras y con referencia persistida.
- Bandeja general de soporte, asignación, respuesta administrativa, transiciones e historial de estados; evidencias privadas autorizadas por expediente.
- Resumen administrativo filtrado por responsabilidad, con alertas operativas de identidad, soporte, rendición y cierre. Los objetivos de atención son parámetros internos de ensayo, no SLA legales.
- Comprobante de aportes con alternativa informativa honesta cuando el estado no permite emitirlo.
- Se conservan el ciclo de campañas, las operaciones financieras DEMO, el correo y las funciones previas de Ricardo/Santiago. No se reincorporan dos prototipos antiguos de almacenamiento local ya retirados.

La rama de Alison contiene copias de funciones que ya estaban integradas. Se realizó una fusión Git con ambas ascendencias, resolviendo los conflictos contra el corte actual para conservar esas funciones y revisar el incremento real.

## Defectos encontrados y corregidos durante la integración

| Hallazgo reproducido o comprobado | Corrección |
| --- | --- |
| La migración concedía acceso al resumen a cuatro responsabilidades, pero la matriz HTTP lo rechazaba con 403. | Matriz, readiness, inventario y pruebas coordinados. Nueve perfiles probados y revocación inmediata verificada. |
| Validaciones de soporte lanzadas sincrónicamente podían terminar en 500. | Traducción uniforme a 400/409/404, también para evidencias fuera del caso. |
| Comandos nuevos devolvían 201 mientras su contrato de prueba esperaba 200. | Respuestas explícitas 200 para asignación, mensaje y transición. |
| Un cuerpo vacío de asignación podía desasignar silenciosamente; se ofrecían cuentas bloqueadas o AUDITOR con SUPPORT. | UUID obligatorio o null explícito; asignatarios activos, sin bloqueo y sin perfil de auditoría. |
| Texto vacío, controles y Unicode inválido no estaban suficientemente cubiertos; reporte público sin cuota compartida. | Política de texto común en ambos lados, errores comprensibles y guard de cuota. |
| Alertas podían contar una rendición antigua corregida, campañas ya cerradas o recompensas totalmente devueltas. | Se consulta la versión final vigente, el ciclo aplicable y la obligación canónica de recompensa. |
| Algunos enlaces conducían a vistas ajenas a la responsabilidad. | Navegación condicionada por permisos; la API mantiene el control obligatorio. |
| Pruebas de Alison tenían datos de campaña incompletos y expectativas inconsistentes. | Fixtures válidos, aislamiento de cuotas y casos negativos ampliados; se añadió una prueba integrada del resumen. |

## Estado de las nueve tareas de Alison

| Tarea | Evaluación en este corte |
| --- | --- |
| S2-18 · Selección para aportar | Núcleo DEMO previo conservado y revalidado; no es una función nueva de este commit. |
| S2-20 · Simulación de pago | Núcleo DEMO previo conservado y revalidado; sin proveedor bancario. |
| S3-03 · Panel propio | Implementación previa conservada y revalidada. |
| S3-04 · Historial de aportes | Implementación previa conservada y revalidada. |
| S3-05 · Detalle y comprobante | Conservado; se integra la alternativa para estados que no tienen comprobante confirmado. |
| S3-10 · Registrar incidencias | Cierre técnico del registro: casos propios y reportes de terceros, referencia y evidencia privada. Se incorpora atención administrativa probada. No equivale a conversación bidireccional completa ni envío de correo de soporte. |
| S3-22 · Guardados y seguimiento | Implementación previa conservada y revalidada. |
| S3-25 · Panel administrativo y alertas | **Parcial**. Faltan contadores y accesos de pagos, conciliación, desembolsos, devoluciones y disputas exigidos por el criterio de la tarjeta. Las consultas por responsabilidad implementadas sí se probaron. |
| S1-11 · Legal | **Pendiente** por decisión del equipo: textos y aceptación legal definitivos. |

## Límites que permanecen abiertos

1. Completar los agregados financieros de S3-25 y sus pruebas de permisos/privacidad.
2. El titular puede leer la respuesta de soporte, pero no hay formulario ni endpoint para contestar al estado «Esperando respuesta». No ofrecerlo como conversación completa.
3. El historial nuevo de soporte usa `brotar_extension.support_case_event`; no está conectado a la cola de notificaciones del correo. La integración global S3-26 permanece abierta.
4. Legal definitivo, revisión integral S3-19, aceptación S3-21 y funciones generales pendientes del equipo no se cierran con esta fusión.

## Instalación y evidencia

La instalación habitual del README aplica **31 migraciones acumulativas**: las dos nuevas amplían permisos del resumen e historial de soporte. No asignan roles a usuarios. El inventario comprobable registra **181 rutas**. Las credenciales Gmail permanecen exclusivamente en configuración privada; no se copian al entorno de pruebas ni se versionan.

Comprobación: `bun run check` en la raíz; `corepack.cmd pnpm run check` dentro de backend; integración PostgreSQL/HTTP en copia aislada con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=true`. Resultado final: **218 pruebas frontend, 216 backend, 8 de ADMIN local y 39 de integración PostgreSQL/HTTP: 481 casos distintos aprobados, sin fallos ni omitidos**. Lint, tipos y compilaciones aprobados. Vite conserva un aviso de tamaño de bundle, sin impedir la compilación. No es una prueba de capacidad de producción. Los fallos inducidos de línea base incompleta son casos negativos esperados, no errores de instalación normal.

Prueba visual con cuentas sintéticas: inicio de sesión SUPPORT → resumen propio → bandeja → incidencia → respuesta compartida → estado «En atención», mensaje e historial persistidos. [Captura de evidencia](evidencias/sprint3/alison-soporte-20261025.png). La evidencia no contiene cuentas reales ni secretos.

La base original se respaldó antes de aplicar las dos migraciones nuevas. Migración repetible sin pendientes y readiness de aplicación aprobados con los datos conservados. Respaldo privado: `%LOCALAPPDATA%/Brotar/backups/brotar-before-alison-20261025.dump`.
