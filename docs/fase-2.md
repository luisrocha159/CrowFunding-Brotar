# Fase 2 · Identidad y componentes públicos

Fecha de revisión: 9 de septiembre de 2026.

## Entregado

Base visual compartida para las nueve rutas públicas y de acceso simulado. Logo original, fuentes locales, tokens, navegación desktop/móvil, footer y componentes de botones, campos, tarjetas, progreso, etiquetas y mensajes. La galería `/?vista=componentes` solo existe en desarrollo.

No se implementaron páginas privadas, backend, autenticación, pagos ni una nueva pantalla pública. Las páginas del producto siguen siendo provisionales. La integración completa de sus contenidos e interacciones pertenece a las fases siguientes.

## Verificación

- `bun run check`: ESLint, TypeScript y build de producción sin errores.
- Navegador: botón de carga deshabilitado y restablecimiento; campo vacío con error y correo de prueba con confirmación; reintento simulado con éxito.
- Navegación móvil: apertura, cierre con Escape y teclado, cierre automático al cambiar de ruta.
- Buscador compartido: texto transportado a `/explorar/buscar?q=bosque%20nativo`. El filtrado aún está pendiente.
- Comprobación adaptable de la galería a 320, 390, 768, 1024 y 1440 px; sin desbordamiento horizontal detectado. Inspección visual de escritorio, tableta y móvil.
- Las imágenes de logo y campaña se revisaron visualmente contra los recursos originales. El archivo de Figma no fue editado.

Estas comprobaciones no equivalen a una auditoría completa de accesibilidad ni a una prueba de todos los flujos finales. Las páginas y datos se revisarán nuevamente al implementarlos.

## Siguiente fase

Preparar al menos seis campañas simuladas centralizadas, con tipos y datos coherentes para listado, filtros y detalle. No duplicar los datos en cada pantalla. Después se reemplazarán las páginas provisionales por sus composiciones finales.
