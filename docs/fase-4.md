# Fase 4 · Experiencia pública conectada

## Pantallas implementadas

| Ruta | Contenido y comportamiento |
| --- | --- |
| `/` | Propuesta de valor, impacto social/ambiental/productivo, tres destacados y CTA públicos |
| `/como-funciona` | Cinco pasos: descubrir, revisar, apoyar, seguir avances y consultar resultados; información de confianza |
| `/para-creadores` | Preparación, revisión, publicación, información necesaria y explicación de donación/recompensa/preventa |
| `/explorar` | Campañas, ordenamiento y paginación; acceso a búsqueda y detalle |
| `/explorar/buscar` | Texto, categoría, ubicación y modalidad; filtros visibles, eliminación individual, limpieza y cantidad de resultados |
| `/proyectos/:slug` | Historia, problema, solución, beneficiarios, objetivos de impacto, creador, confianza, actualizaciones y recaudación |

Los datos están separados de las vistas. `useProjectResource` conecta el servicio simulado, cancela solicitudes al cambiar de vista y evita presentar respuestas antiguas como actuales. No hay API HTTP, base de datos, almacenamiento de contraseñas, sesión ni pagos.

## Estados y conexiones

- Carga, vacío y error con recuperación en portada y catálogos; detalle con carga, error y campaña no encontrada.
- Campañas activa, finalizada y cancelada, con explicación de cierre y CTA deshabilitado cuando corresponde.
- Sin actualizaciones y con novedades; porcentajes 0 %, parcial y mayor a 100 % (barra limitada visualmente al máximo).
- Texto/filtros/orden/página en parámetros URL: `q`, `categoria`, `ubicacion`, `tipo`, `orden`, `pagina`.
- Filtros desconocidos: aviso y cero resultados, no un fallo técnico. Cambiar filtros reinicia la paginación.
- Apoyar lleva a `/iniciar-sesion?continuar=...` con un destino interno de proyecto. La implementación del formulario y de esa continuación pertenece a la fase 5.
- Controles desplegables de demostración al pie de las vistas dinámicas; `estado=carga|vacio|error`. Reintentar vuelve a éxito y mantiene los filtros.

## Referencia y decisiones visuales

Se inspeccionaron, en modo de lectura, las seis pantallas públicas del Figma CrownFundingV3. El conector de diseño respondió con límite de consultas; el archivo pudo revisarse en el navegador después de recargarlo. No se modificó el Figma compartido.

Se mantienen el logo original, Poppins/Inter, verde Brotar, fondos claros, tarjetas y pie verde. La portada conserva el esquema de imagen con mensaje superpuesto; Cómo funciona utiliza introducción verde y pasos; Para creadores presenta proceso y requisitos; el catálogo utiliza cuadrícula; el detalle dispone de contenido principal y bloque de recaudación lateral.

Adaptaciones explícitas: se usa la fotografía local disponible en lugar de las portadas específicas de cada frame; no se recrearon ilustraciones ni iconos sin sus recursos. Los números de la portada identifican el contenido de la muestra, no resultados reales de Brotar. Se omiten enlaces a funciones fuera del alcance y garantías de pago no implementadas. La maqueta de búsqueda muestra ejemplos de estados juntos; la aplicación muestra un estado a la vez según los datos.

La lista UI/UX se usó para foco, etiquetas, adaptación móvil, feedback y movimiento reducido. El script de consulta de esa skill no estaba instalado; no se sustituyó la identidad aprobada por otra paleta. En móvil, el detalle mantiene el orden portada, apoyo y contenido, tanto visualmente como en el DOM.

## Verificación

- `bun run check`: lint, TypeScript, **29 tests** y build correctos.
- Navegador: navegación portada → Explorar, página 2, búsqueda `POTOSI`, eliminación de filtros y combinación Producción sostenible + Cochabamba + Recompensa.
- Recarga de URL con los tres filtros: conserva selección y campaña coincidente.
- Apertura de detalle desde la tarjeta y paso a acceso con ruta interna de continuación.
- Campañas finalizada y cancelada: botón deshabilitado y ausencia del enlace activo de aportar.
- Error simulado en detalle y reintento con recuperación.
- Portada sin destacados, filtro inválido con aviso, campaña inexistente y carga lenta con skeleton visible.
- Inspección de portada, información, catálogo y detalle en escritorio; revisión móvil de Para creadores, búsqueda y detalle; catálogo en tableta.
- Sin desbordamiento horizontal detectado en las seis rutas a 320 px, y en las vistas inspeccionadas a 375, 768, 812 (horizontal) y 1440 px. No equivale a una auditoría completa en todos los dispositivos.

## Pendientes

1. Fase 5: inicio de sesión, registro y recuperación con validación y respuestas simuladas, sin autenticación real.
2. Completar recursos visuales específicos y optimizar las imágenes conservando los originales.
3. Revisión final de recorridos, accesibilidad y entrega. No declarar terminado el documento completo mientras las pantallas de acceso sigan provisionales.
