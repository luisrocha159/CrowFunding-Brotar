# Actualización completa de DEV · 09/11/2026

Integración autorizada por Ricardo de la rama `RicardoDev` en `DEV`, sobre el corte del 30 de octubre. Commit de origen: **4579e52**. La integración conserva ese commit completo y añade únicamente esta documentación de entrega y la adecuación de las instrucciones a DEV; no introduce otra variante del código funcional.

## Contenido integrado

- Captura y revisión de identidad: errores por campo, autorización obligatoria, condiciones versionadas, recibos y revisión independiente. Correo del remitente en la consulta privada.
- Presentación de etiquetas y consentimientos, acceso a Administración según permisos y página Mi cuenta organizada por secciones.
- Aportes con fechas opcionales coherentes, tarjetas de recompensa por importe y opción sin recompensa en modalidad de recompensa. Preventa conserva producto obligatorio.
- QR escaneable del aporte simulado. Método QR/tarjeta conservado desde la selección hasta el intento, reintento, historial y comprobante.
- Detalle de desembolsos con etapas, explicación del estado, importes exactos, desglose de costos y responsables legibles. Permisos, reservas y controles financieros conservados.
- Migración de presentación y condiciones 1.1: total de **41 migraciones**. Dependencias y lockfile del QR incluidos.

## Instalar o actualizar

Seguir el [README principal](../README.md), que ahora clona y actualiza **DEV**. Para una instalación nueva se incluyen el SQL oficial, el instalador, migraciones y preparación del catálogo. El procedimiento carga las cinco categorías provisionales; no requiere un SQL adicional oculto.

En una copia existente, respaldar antes de actualizar y seguir la sección 5 del README. Conservar la configuración y el volumen de esa copia. No repetir una instalación desde cero sobre datos existentes ni copiar las credenciales de otra computadora.

Gmail utiliza configuración privada independiente según la sección 6. Las claves, archivos `.env`, bases, documentos privados y datos del recorrido local no forman parte del repositorio. Las cuentas y la campaña de presentación de 600 BOB siguen en la base local donde se prepararon; no se crean como usuarios o movimientos de todas las instalaciones al ejecutar migraciones.

## Evidencia y comprobación de integración

El código de origen pasó **273 pruebas frontend, 244 backend y 8 comprobaciones de herramientas locales**, lint, tipos y compilaciones. Las rondas de integración afectadas y las revisiones visuales de escritorio y móvil están documentadas en:

- [Presentación, verificación y actualización de condiciones](ajustes-presentacion-y-verificacion-2026-11-09.md).
- [Aportes, consentimiento, QR y método del comprobante](aportes-verificacion-qr-2026-11-09.md).
- [Mi cuenta y desembolsos](ajustes-mi-cuenta-y-desembolsos-2026-11-09.md).

Para publicar se comprueba que DEV contiene el commit de origen y que la diferencia posterior afecta únicamente a documentación, con el árbol funcional idéntico al probado. La rama se actualiza sin forzar ni descartar commits remotos. Este registro complementa la aceptación S3-21; no atribuye una nueva revisión manual a los otros integrantes.
