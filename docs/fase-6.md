# Fase 6 · Verificación final del frontend público

Fecha: 10 de septiembre de 2026.

## Resultado

La revisión del PDF está en [la matriz de cumplimiento](cumplimiento-frontend-publico.md): nueve pantallas, 39 variantes mínimas y requisitos de datos, navegación, componentes, arquitectura y exclusiones. La base funcional está cubierta para la demostración estática. No se declara listo el sistema completo ni una entrega remota que todavía no existe.

## Cambios realizados

- Derivados WebP del logo oficial y la imagen de referencia; los PNG originales siguen intactos. Los dos recursos pasan de 3.213.368 a 303.612 bytes (90,6 % menos), sin cambiar la composición visual.
- El logo se sirve a 128 × 128 para su presentación a 36 px. La imagen mantiene 1344 × 768 y sus metadatos XMP de atribución. La aplicación compilada no incluye los PNG originales de gran tamaño.
- Descripción precisa de la imagen ilustrativa: sus metadatos indican origen IA. No se presenta como registro de las campañas ficticias.
- Área del botón de búsqueda ampliada a un mínimo de 44 × 44 px, siguiendo la revisión UI/UX.
- Tres tests de recursos nuevos: originales presentes, formato/peso WebP y atribución conservada. Total: 49 tests.
- README actualizado y matriz detallada contra los documentos. No se añadieron dependencias, módulos privados ni reglas de negocio.

## Comprobaciones de esta fase

| Prueba | Resultado observado |
| --- | --- |
| `bun run check` en el repositorio de trabajo | Lint, TypeScript, 49 tests y build correctos |
| Clonación local independiente de `3c7ca7b` mediante `git clone --no-hardlinks` | Correcta; sin reutilizar `node_modules` del árbol de trabajo |
| `bun install --frozen-lockfile` en el clon limpio | 166 paquetes instalados; lockfile sin cambios |
| `bun run check` en el clon limpio | Lint, TypeScript, 49 tests y build correctos |
| `bun run preview` del clon limpio | Arranque correcto en 4173; servidor de prueba detenido al terminar |
| Ruta profunda compilada `/explorar/buscar?q=POTOSI` | Un resultado: Biblioteca de Potosí; logo e imagen WebP cargados |
| Portada → catálogo → página 2 | Tres destacados y acceso a las otras tres campañas |
| Búsqueda `POTOSI` y limpieza | Coincidencia correcta y regreso al listado general |
| Categoría + ubicación + recompensa | Coincide Huertos; chips y selección conservados tras recargar |
| Tarjeta de Huertos → detalle | Resumen, historia, problema, solución, beneficiarios, impacto, creador, confianza, recaudación y bloque sin novedades |
| Detalle → acceso → confirmación | Validación vacía, foco en correo, carga, éxito simulado y enlace de vuelta al proyecto de origen |
| Landing vacía/error y catálogo vacío/error | Mensajes y salidas visibles; reintento del catálogo recupera seis campañas |
| Búsqueda sin coincidencias / categoría inexistente | Estado vacío y limpieza; sin error técnico |
| Finalizada, cancelada y slug inexistente | Estado y motivo; aportes deshabilitados o salida a Explorar |
| Carga lenta de portada, catálogo y detalle | Skeletons presentes durante la solicitud simulada |
| Nueve rutas a 320 px | Sin desbordamiento horizontal; un `h1` y un `main` por ruta |
| Estados de vacío/error/cierre a 320 px | Sin desbordamiento horizontal en los casos revisados |
| Cómo funciona a 375 px | Cinco pasos y CTA legibles, sin superposición |
| Registro a 812 × 375 | Columnas, perfiles, campos y acciones visibles sin recortes |
| Recursos finales | Inspección de ambos WebP y de su uso en portada, catálogo y detalle |
| Higiene del repositorio | Sin temporales, dependencias generadas, `.env` real u otros lockfiles versionados en la inspección |

Los escenarios detallados de registro, recuperación, confirmación de contraseña, aceptación y credenciales incorrectas se verificaron en fase 5 y conservan sus tests. Esta fase añade la regresión del recorrido público y la prueba de instalación limpia; no vuelve a etiquetar cada prueba previa como una ejecución nueva.

## Alcance de la evidencia

Las comprobaciones de navegador se realizaron en el navegador integrado de Codex, no en todos los navegadores/dispositivos. El ancho correcto no demuestra por sí solo accesibilidad completa; no se hizo una auditoría con lector de pantalla ni medición certificada de Core Web Vitals. La reducción de peso corresponde a las imágenes, no a un porcentaje medido de velocidad de carga.

El recurso Figma no pudo volver a extraerse: el conector informó límite de consultas del plan. Se preservaron los recursos disponibles y no se inventaron imágenes oficiales. La consulta del script UI/UX no pudo ejecutarse porque no estaba instalado; se aplicó su lista de comprobación pertinente al proyecto React web existente.

## Pendientes externos / de contenido

1. Elegir y configurar el repositorio remoto del equipo, subir los commits y comprobar permisos para los líderes. La clonación local sí se probó; la clonación desde un servidor externo todavía no.
2. Obtener portadas específicas si se busca mayor fidelidad al Figma. El requisito de imagen por campaña está implementado, aunque el recurso se repite.
3. Recibir el texto legal definitivo si se quiere reemplazar la explicación de demostración. El paso funcional de aceptación ya está implementado.

No se publicó el sitio ni se modificaron el Figma compartido o los entregables anteriores del diseño del creador.
