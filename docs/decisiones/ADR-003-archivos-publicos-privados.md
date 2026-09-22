# ADR-003 · Archivos públicos y privados

Actualización local 21/09/2026: los binarios siguen en disco privado, pero el adaptador activo registra metadatos y propiedad en `file_asset` (PostgreSQL). El manifiesto JSON original ya no es el almacenamiento activo. La baja es lógica y se rechaza mientras el archivo esté vinculado. Véase [integración vigente](../integracion-local-sprint-1.md); retención definitiva pendiente.

## Estado

Decisión técnica local para S1-14. Requiere revisión de líderes antes de considerarse política definitiva de privacidad, retención o cumplimiento.

## Decisión

La API separa archivos públicos y privados desde la carga:

- `PUBLIC`: solo imágenes `image/png`, `image/jpeg` o `image/webp`, para avatar o imagen pública de campaña. Límite: 2 MB.
- `PRIVATE`: documentos de organización en PDF o imagen. Límite: 5 MB.
- Toda carga requiere sesión y rol `REGISTERED_USER`.
- La descarga pública usa `/api/files/public/:id` y solo entrega archivos marcados `PUBLIC`.
- La descarga privada usa `/api/files/:id`, requiere sesión y solo permite al dueño del archivo.
- La eliminación requiere sesión, rol básico y titularidad.

Los archivos se guardan fuera de las carpetas públicas del frontend, por defecto en `backend/private/files`, excluido de Git. La API escribe primero un temporal y solo registra el archivo después de moverlo correctamente; si falla, limpia temporal y destino parcial.

## Límites de alcance

No se implementa todavía antivirus, escaneo de contenido, expiración automática, retención legal definitiva, revisión manual de documentos ni asociación funcional con campañas/KYB. Los documentos privados no se publican por error mediante URL pública. Los enlaces o IDs de archivos privados no deben compartirse en Trello, capturas ni commits.

## Verificación

Pruebas unitarias cubren límites, propósitos, privacidad pública/privada, acceso por dueño, eliminación y contrato del cliente. La validación funcional completa debe repetirse con API y PostgreSQL V2 iniciados cuando existan pantallas que consuman estos endpoints.
