# Respuestas de soporte con archivos adjuntos

Corte local de RicardoDev del 9 de noviembre de 2026. No publicado en GitHub.

## Qué cambia

El titular y el equipo de soporte pueden adjuntar hasta diez archivos por respuesta: PDF, PNG, JPG o WebP, hasta 5 MiB por archivo. El texto sigue siendo obligatorio. Se puede quitar un archivo seleccionado antes de enviar. Los archivos compartidos aparecen junto al mensaje correspondiente, con un enlace de descarga privado.

La carga se valida en la interfaz y el servidor comprueba tamaño, MIME, firma básica, propietario, propósito y estado del archivo. No constituye un análisis antivirus. Un adjunto de otra cuenta o destinado a otro módulo no se puede vincular a una respuesta. La descarga del titular exige la propiedad del caso, y la del personal exige el permiso de soporte. Las notas internas y sus adjuntos no se incluyen en la conversación compartida. Los archivos vinculados no se pueden borrar desde la API de archivos.

Las respuestas conservan claves de reintento y transacciones: no se duplica el mensaje, el adjunto ni el aviso por correo. Cambiar los archivos de una solicitud ya registrada produce un conflicto. Las claves anteriores de mensajes sin adjuntos siguen siendo válidas. Los avisos por correo siguen respetando dirección verificada y preferencia; no contienen los documentos ni el texto privado de la conversación.

## Recorrido para el equipo

1. Con el patrocinador, entrar a **Mi panel de patrocinador** (`/panel-patrocinador`).
2. En **Casos y devoluciones**, comprobar las incidencias abiertas y pulsar **Consultar incidencias**. El menú de actividad también contiene **Mis incidencias**.
3. Abrir un caso propio desde `/mis-incidencias`. También se puede registrar uno desde el aporte correspondiente, mediante **Reportar incidencia**.
4. Con la cuenta autorizada de soporte, entrar a **Administración → Soporte**, abrir el mismo caso y localizar **Responder al titular**.
5. Escribir un mensaje, seleccionar los archivos opcionales y pulsar **Enviar respuesta**. Revisar que el mensaje y sus adjuntos aparezcan en **Mensajes compartidos**.
6. Volver con el patrocinador a **Mis incidencias**, abrir el caso y pulsar **Actualizar estado**. El mensaje aparece en **Historial de mensajes** y cada archivo permite su descarga.
7. El titular también puede contestar con archivos desde **Responder a soporte**. El personal verá su respuesta y sus adjuntos en el mismo expediente.

Los casos resueltos, cerrados o convertidos en disputa conservan las restricciones existentes para mensajes nuevos. Una consulta de soporte no ejecuta devoluciones ni modifica un pago.

## Preparación y compatibilidad

La migración aditiva `SupportReplyEvidence1794182400002` crea la relación privada entre mensajes y archivos, sin modificar los mensajes históricos. El registro acumulado pasa a **43 migraciones y 219 rutas HTTP**. El arranque documentado usa el registro de migraciones y aplica esta ampliación; no requiere SQL manual, credenciales nuevas ni cambios de correo.

Para actualizar una instalación existente, desde `backend`:

```powershell
corepack pnpm run build
corepack pnpm run migrate -- up
```

Reiniciar el backend si no se está usando el proceso de desarrollo con recarga. La migración ya se aplicó en la instalación local utilizada para la presentación.

## Comprobaciones

Pruebas de contrato y validación; intercambio real de mensajes y archivos en PostgreSQL aislado; permisos del titular y del personal; denegación a otras cuentas; límites y duplicados; adjuntos de propósito incorrecto; exclusión de notas internas; recuperación de reintentos; reversión de mensaje y adjuntos ante fallo; correo sin contenido privado; protección frente al borrado de archivos vinculados. Se comprueba además el contador de incidencias del panel del patrocinador.

La revisión de navegador utiliza una sesión aislada y consultas de los casos existentes; no envía respuestas ni correos en los casos reales del usuario.

Resultado: comprobación completa del frontend correcta (281 pruebas); comprobación completa del backend correcta (249 pruebas y 8 del aprovisionamiento local); dos recorridos de integración PostgreSQL aislados correctos. El inventario verifica las 219 rutas. El formulario del personal se revisó en escritorio y el formulario del titular y el panel del patrocinador en móvil, sin desbordamiento horizontal ni infracciones detectadas por axe en los criterios WCAG A/AA examinados. Se comprobó selección y retirada disponible de archivos sin enviar un mensaje real. La base auxiliar de pruebas quedó detenida y la instalación original continúa operativa.
