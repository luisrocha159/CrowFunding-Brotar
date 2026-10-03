# Verificación técnica S2-16 · Campañas

## Alcance comprobable

- `GET /api/campaigns/public` devuelve únicamente campañas `PUBLISHED`, no eliminadas, con una portada `file_asset` `PUBLIC` cuyo MIME es de imagen.
- El detalle `GET /api/campaigns/public/:slug` expone historia, problema, solución, beneficiarios, impacto y recompensas publicados por la campaña.
- El catálogo usa la respuesta de la API pública y conserva la búsqueda por texto y los filtros por categoría, ubicación y modalidad.
- El avance y el monto mostrado proceden de `v_campaign_funding`, calculados con pagos confirmados menos devoluciones; no se generan recaudaciones ficticias.
- Los estados de carga, error, resultado vacío y campaña no disponible quedan cubiertos por las vistas públicas existentes.

## Verificación reproducible

1. Levantar PostgreSQL V2, backend y frontend siguiendo el README.
2. Consultar `GET http://127.0.0.1:5173/api/campaigns/public`; comprobar que cada fila tenga `status` `PUBLISHED`, `imageId` y `imageUrl` de imagen.
3. Abrir `/explorar/buscar`; combinar texto, categoría, ubicación y modalidad y comprobar que los resultados se reduzcan por intersección.
4. Buscar un texto sin coincidencias; debe aparecer el estado vacío. Detener la API o bloquear la solicitud; debe aparecer el error y el botón de reintento.
5. Abrir el `slug` de una fila y comprobar las secciones de historia, problema, solución, beneficiarios, impacto y recompensas.

Esta evidencia cubre el cierre técnico del incremento. Aportes, checkout, pagos, KYC/KYB, guardados y favoritos siguen fuera de esta etapa y no se declaran completados.
