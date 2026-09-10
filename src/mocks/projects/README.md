# Datos simulados de campañas

`projects.ts` contiene seis campañas ficticias para el frontend público. No representan organizaciones, verificaciones ni operaciones financieras reales. Mostrar `DEMO_NOTICE` cuando las vistas presenten estos datos.

| Campaña / slug | Modalidad | Ubicación | Estado | Avance |
| --- | --- | --- | --- | --- |
| `reforestacion-chiquitana` | Donación | Santa Cruz | Activa, destacada | 72 % |
| `huertos-comunitarios-cochabamba` | Recompensa | Cochabamba | Activa, destacada | 40 % |
| `textiles-circulares-la-paz` | Preventa | La Paz | Activa, destacada | 105 % |
| `biblioteca-comunitaria-potosi` | Donación | Potosí | Activa | 0 % |
| `agua-segura-tarija` | Recompensa | Tarija | Finalizada | 80 % |
| `cacao-agroforestal-beni` | Preventa | Beni | Cancelada | 15 % |

## Coherencia de datos

- Modelo público `Project` en `shared/types/project.ts`; `ProjectCardData` es su presentación resumida.
- Cada campaña tiene ID, slug, portada, resumen, categoría, creador, ubicación, meta, recaudación, modalidad, historia, problema, solución, beneficiarios, impacto esperado y señales de confianza simuladas.
- `getProgressPercentage(project)` calcula el porcentaje a partir de recaudación y meta. No se guarda un porcentaje duplicado que pueda quedar desactualizado. Se conserva 105 % en texto; la barra visual se limita a 100 %.
- Fecha fija `DEMO_REFERENCE_DATE = 2026-09-09`: los días restantes son una fotografía de presentación, no un reloj de producción. Esto evita que los escenarios activos desaparezcan al presentar otro día.
- Hay campañas con y sin actualizaciones, con y sin insignia, y explicaciones públicas para los estados cerrados. El impacto se expresa como objetivo, no como resultado ya alcanzado.
- Se reutiliza temporalmente la única fotografía local de referencia disponible. `imageCaption` la identifica como ilustrativa; no acredita relación con las campañas. Elegir portadas específicas del diseño durante la composición visual posterior.

## Servicio local

`projectService.ts` expone `listMockProjects`, `listFeaturedMockProjects` y `getMockProject(slug)`.

```ts
const campaigns = await listMockProjects({ signal: controller.signal })
const empty = await listMockProjects({ scenario: 'empty', delayMs: 0 })
// Rechaza con MockProjectError; capturar en la vista y ofrecer reintento.
await listMockProjects({ scenario: 'error', delayMs: 350 })
const project = await getMockProject('reforestacion-chiquitana')
```

Por defecto responde con éxito después de 350 ms. Los escenarios son explícitos, nunca fallos aleatorios. La carga la representa la promesa pendiente; el estado de carga de React se implementará en cada feature. Un slug desconocido devuelve `null`. Cada respuesta devuelve copias independientes, incluyendo datos anidados. `AbortSignal` permite cancelar solicitudes al salir de una vista; un `AbortError` no debería presentarse como fallo de carga al usuario.

No usa `fetch`, almacenamiento, cuentas, sesiones ni una API HTTP. Para reintentar después de un error de demostración, invocar con `scenario: 'success'` o sin escenario.

## Consultas de Explorar

`features/public/explore-projects/projectQuery.ts` recibe el conjunto de campañas:

```ts
const result = queryProjects(campaigns, {
  text: 'huertos', category: 'Producción sostenible', location: 'Cochabamba',
  campaignType: 'reward', sort: 'featured', page: 1, pageSize: 3
})
```

- Devuelve `items`, `total`, `page`, `pageSize`, `totalPages`, `hasMore`.
- Texto insensible a tildes, mayúsculas y espacios adicionales. Busca nombre, resumen, descripción, categoría, creador, ubicación y modalidad.
- Los filtros se combinan con AND; cada palabra del texto debe tener coincidencia. No hay restricciones iniciales: se incluyen estados cerrados para probar su detalle.
- Los valores de categoría/ubicación desconocidos devuelven cero resultados sin lanzar errores.
- `getProjectFilterOptions(campaigns)` deriva las opciones del mismo conjunto de datos.
- Al cambiar o limpiar filtros, la vista debe reiniciar `page` a 1. Al avanzar página, debe conservar los filtros.
- Ordenamientos: destacados, más recientes, mayor avance y cierre próximo (campañas cerradas al final).
- La página se limita a los resultados disponibles y el tamaño a 1–24 (6 por defecto). Con `pageSize: 3` se pueden probar dos páginas.
- La fase 4 conecta estas consultas con los parámetros URL, chips y controles visuales de catálogo y búsqueda. Ver `docs/fase-4.md` para el recorrido y sus límites.

Ejecutar `bun run test` para verificar los escenarios e invariantes.
