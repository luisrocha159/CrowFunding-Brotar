# Fase 3 · Datos y comportamiento simulado

## Alcance entregado

Se preparó la base de datos locales que necesitan las pantallas públicas, sin backend, almacenamiento persistente ni lógica financiera definitiva. Referencia: sección 5 y variantes de las secciones 6 y 9 de `Brotar_Tarea_Desarrollo_Frontend_Publico.pdf`.

| Requisito | Implementación |
| --- | --- |
| Mínimo seis campañas, categorías, ubicaciones y modalidades variadas | Seis registros en `src/mocks/projects/projects.ts`, cinco categorías, seis ubicaciones y tres modalidades |
| Campos mínimos, historia, impacto y confianza | Tipo `Project`; descripciones completas y señales explícitamente simuladas |
| Meta, monto y porcentaje coherentes | Cálculo compartido, casos 0 %, parcial y superior al 100 % |
| Destacados | Selector local de tres campañas activas |
| Búsqueda y filtros | Funciones locales probadas, todavía sin conectar a las pantallas |
| Ordenamiento y paginación | Cuatro órdenes; tamaño de página configurable |
| Detalle por proyecto | Servicio por slug; devuelve `null` si no existe |
| Campañas activas, finalizadas y canceladas | Datos para los tres estados y restricción local del CTA mediante `canSupportProject` |
| Carga, vacío, error y reintento | Promesa con demora y escenarios explícitos; cancelación mediante `AbortSignal` |
| Datos sin repetir dentro de componentes | La galería interna reutiliza los registros centralizados |

## Comprobaciones realizadas

`bun run check`: ESLint sin advertencias, TypeScript de aplicación y tests, 23 pruebas automáticas y build de producción correctos.

Los tests revisan integridad y unicidad, contenido mínimo, coherencia de fechas, progreso, estados de aporte, filtros combinados, tildes y espacios, orden, paginación, ausencia de mutaciones, los seis slugs, destacados, vacío, error, reintento, espera y cancelación.

## Límites y siguiente paso

Las pruebas son de datos y lógica; no certifican que la experiencia pública esté terminada. Las páginas continúan provisionales. Falta conectar sus controles, parámetros URL y estados visuales, componer las pantallas definitivas y verificar sus recorridos en navegador.

No se agregaron reglas de desembolso, devolución, pedidos o recompensas, ni se implementó autenticación. Todos los nombres y valores son ficticios. La fecha de demostración es fija y la portada actual es una imagen ilustrativa compartida; elegir imágenes específicas al implementar las páginas.

Siguiente fase: implementar las pantallas públicas sobre esta fuente común y los componentes ya preparados.
