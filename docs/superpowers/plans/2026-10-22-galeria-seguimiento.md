# Galería y seguimiento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Entregar S2-01 y S3-22 en SantiagoDev como primer bloque del alcance de 18 tarjetas.

**Architecture:** Mantener NestJS por aplicación/repositorio/controlador y React por funcionalidades. Reutilizar Files, file_attachment, campaign.video_url y campaign_bookmark; no duplicar agregados financieros ni restaurar SQL.

**Tech Stack:** React, TypeScript, NestJS, TypeORM, PostgreSQL; herramientas instaladas.

**Spec:** docs/revision-sprint-3-santiago-alison-2026-10-22.md, diseño aprobado por el usuario el 22 de octubre.

## Global Constraints

- Trabajar en SantiagoDev. No commit, push ni cambios en Trello.
- Conservar límites de imágenes PNG/JPEG/WebP de 2 MiB; no documentos privados en galerías.
- Guardar y seguir son elecciones independientes del usuario autenticado.
- Conservar archivos y asociaciones históricas al reemplazar la galería.
- No inventar aprobaciones D02–D10 ni implementar cobros reales.

## Review Focus

- Aislamiento entre usuarios y recursos privados/ajenos.
- Dos pestañas editando y clics repetidos: conflicto explícito o mutación idempotente.
- Fallo de subida: conservar campos y permitir reintento por imagen.
- Campañas cerradas/no públicas: conservar referencias sin revelar borradores.
- Navegación por teclado/móvil y persistencia tras recarga/nueva sesión.

### Task 1: Galería persistente

**Files:** backend/src/campaign-drafts/{application/gallery.ts,infrastructure/typeorm-gallery.repository.ts,infrastructure/gallery.controller.ts}; registro en campaign-drafts.module.ts. src/features/campaign-drafts/{galleryClient.ts,GalleryEditor.tsx,PublicGallery.tsx}; integrar constructor/detalle. Migración explícita de permisos.

**Interfaces:** GET/PUT /campaigns/drafts/:id/gallery: {revision,images:[{fileId,caption}],videoUrl}; GET /campaigns/public/:id/gallery sin revision. PUT usa revision para detectar edición concurrente. Imágenes ordenadas por posición. Máximo técnico 20 recursos. Vídeo HTTPS: enlaces externos a YouTube/Vimeo normalizados, sin iframe ni descarga del servidor.

- [ ] Pruebas de aplicación, DTO y cliente: orden, límites, propiedad, URL, conflicto; observar fallos.
- [ ] Repositorio transaccional con bloqueo de campaña/archivos y archivado de asociaciones anteriores.
- [ ] Interfaz con selección, vista previa, reemplazo, orden y reintentos; bloqueo de navegación con cambios.
- [ ] PostgreSQL y navegador, incluidos permisos/recarga y preservación de archivos.

### Task 2: Guardar y seguir

**Files:** backend/src/campaigns/{application/bookmarks.ts,infrastructure/typeorm-bookmark.repository.ts,infrastructure/bookmark.controller.ts}; registro módulo. src/features/bookmarks/{bookmarksClient.ts,BookmarkActions.tsx,BookmarksPage.tsx}; rutas y cuenta.

**Interfaces:** GET /me/bookmarks?kind=FAVORITE|FOLLOW&page=N; GET /me/bookmarks/:id devuelve ambos estados; PUT /me/bookmarks/:id/:kind {active:boolean}. Páginas de 20. Mutación idempotente, usuario obtenido de sesión. Novedades: GET /me/bookmarks/updates, publicaciones PUBLIC de campañas seguidas.

- [ ] Pruebas de semántica separada, paginación, idempotencia, filtrado por usuario y acceso.
- [ ] Persistencia y API con restricciones transaccionales, nunca aceptar userId del cliente.
- [ ] Botones distintos, listas y novedades con estados de carga/vacío/error.
- [ ] Verificar dos usuarios, sesiones, campañas cerradas/privadas y doble clic.

### Task 3: Verificación y continuación

- [ ] Ejecutar check frontend/backend y pruebas PostgreSQL relevantes; validar interfaz móvil/teclado.
- [ ] Revisión independiente del diff de producto, corregir defectos importantes.
- [ ] Actualizar evidencia de alcance y continuar siguiente bloque viable del inventario de 18.

## Registro de ejecución

- Base: 6424a4e, merge autorizado anterior, árbol limpio salvo auditoría. Sin commits nuevos.
- Decisión técnica: enlaces de vídeo a YouTube/Vimeo como proveedores limitados; contenido incrustado y nuevos formatos quedan fuera hasta acuerdo específico.
- Dependencias posteriores: datos KYC/KYB, textos legales, reglas monetarias, estados financieros y decisiones de cierre todavía pendientes en Trello.
