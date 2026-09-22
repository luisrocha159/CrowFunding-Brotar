# ADR-004 · Portada del borrador de campaña

Actualización local 21/09/2026: integrada con S1-16 mediante `/api/campaigns/drafts/:id/cover`, `campaign.cover_file_id` y `file_attachment.caption`. Ya no se guarda una única portada por usuario en JSON. El adaptador comprueba campaña DRAFT propia y archivo propio; la persistencia nueva todavía debe verificarse con PostgreSQL activo. Véase [integración vigente](../integracion-local-sprint-1.md). El resto describe el antecedente de la rama individual.

## Estado

Decisión técnica local para S1-19. Depende de la integración posterior con el borrador completo de campaña de S1-16.

## Decisión

La portada se maneja como una pieza privada del borrador del usuario:

- La pantalla `/mi-campana/portada` permite seleccionar una imagen, previsualizarla, reemplazarla y guardarla.
- La imagen se carga primero mediante la API de archivos de S1-14 como `PUBLIC` y `CAMPAIGN_PUBLIC_IMAGE`.
- El guardado del borrador verifica en servidor que el archivo exista, pertenezca al usuario y sea una imagen pública de campaña.
- El texto alternativo es obligatorio entre 10 y 180 caracteres.
- Si falla la carga o el guardado, el formulario conserva el archivo seleccionado, la vista previa y el texto ingresado para reintentar.

## Límites de alcance

Esto no publica campañas, no crea el editor completo, no sustituye la revisión funcional ni conecta todavía historia, impacto, modalidad o datos económicos. La asociación final con el borrador completo debe integrarse cuando S1-16 esté disponible.
