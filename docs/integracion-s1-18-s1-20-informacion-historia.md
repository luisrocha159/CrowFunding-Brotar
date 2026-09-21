# S1-18 · Información general (BG-16) y S1-20 · Historia e impacto (BG-19)

Etapas de contenido del asistente, backend y frontend. Responsable: Santiago (rama `SantiagoDev`). Dependen de S1-15, S1-16 y S1-17, las tres cerradas, y de **D02, que sigue abierta**.

## S1-18 · Información general

**Nombre, categoría, ubicación y resumen con límites visibles (CA 1).** Los límites **salen del esquema oficial**, no se inventan: `campaign.title` varchar(200), `campaign.summary` varchar(500), `campaign_location.locality` varchar(160). La API los publica en `limits` y el asistente los muestra en la etiqueta de cada campo, antes de escribir.

**Un error por campo (CA 2).** La validación devuelve todos los errores a la vez, cada uno asociado a su campo. El filtro global del proyecto conserva `message` como lista de cadenas, así que viajan como `campo: mensaje` y el cliente los reconstruye en un mapa para mostrarlos junto a cada entrada. No hay un aviso genérico que obligue a adivinar.

**Referencias comprobadas.** El país se valida contra `country` y la categoría contra el catálogo activo de S1-15. Un código inexistente se rechaza; no se guarda una referencia rota.

**Reutilización en tarjeta y revisión, sin inventar (CA 3).** `GET /api/campaigns/drafts/:id/review` devuelve lo guardado y añade explícitamente `raisedAmount: null`, `goalAmount: null` y `verified: false`. Son explícitos a propósito: así ninguna vista rellena esos huecos por su cuenta con cifras o distintivos que un borrador no tiene.

## S1-20 · Historia e impacto

**Problema, solución, beneficiarios y resultados esperados (CA 1).** Se guardan en `campaign_story`, que tiene `campaign_id` como clave primaria: una fila por campaña, con upsert.

**Indicadores con unidad y meta, nunca como resultados ejecutados (CA 2).** Esta es la distinción central y el esquema ya la tenía preparada: `campaign_impact_indicator` separa `target_value` (la meta) de `achieved_value` (lo conseguido).

**El asistente no puede escribir `achieved_value`.** No está en el tipo de entrada, no está en el DTO y el repositorio no lo incluye en su `INSERT`. Enviarlo devuelve 400 por campo no declarado. Hay pruebas de las tres capas. Registrar un resultado conseguido corresponde al seguimiento, con su evidencia, fuera de este sprint.

Además, una meta sin unidad se rechaza señalando el indicador concreto (`indicators.1.unit`), porque una meta sin unidad no se interpreta.

**Reutilización (CA 3).** La misma revisión que S1-18 incluye historia e indicadores.

## Contrato

```
GET  /api/campaigns/drafts/:id/general  → { title, summary, categoryId, location, status, limits }
PUT  /api/campaigns/drafts/:id/general  → 400 con un error por campo
GET  /api/campaigns/drafts/:id/story    → { story, indicators, limits }
PUT  /api/campaigns/drafts/:id/story    → { problem, solution, beneficiaries, expectedResults, indicators[] }
GET  /api/campaigns/drafts/:id/review   → proyección para tarjeta y revisión, sin cifras inventadas
```

`grant-s1-18.sql` concede escritura sobre `campaign_location`, `campaign_story` y `campaign_impact_indicator`, y **solo lectura** sobre `country` y `administrative_area`. El `DELETE` sobre indicadores es necesario porque el asistente declara el conjunto completo en cada guardado y reemplaza el anterior.

## Lo que NO cierra estas historias

- **Los textos legales, las políticas de verificación y las reglas de publicación no se tocan.** El plan prohíbe inventarlos y siguen dependiendo de D02.
- `administrative_area` está **vacía** en la base oficial, así que la ubicación se captura con país, localidad, dirección y referencia en texto. Enlazarla a un área administrativa concreta requiere que ese catálogo se puebla primero.
- `country` solo contiene Bolivia. La validación es contra el catálogo real, así que ampliarlo es un dato, no un cambio de código.
- No se capturan meta económica, moneda, duración ni multimedia: son etapas posteriores del flujo de ocho.
- La revisión es del borrador propio. El detalle público de la campaña es otra historia.

## Comprobación

Backend: `backend/test/general-story.test.ts` e `integration/general-story.integration.test.ts`. Frontend: `tests/campaigns.test.ts`.

Referencias: [reparto](asignacion-sprint-1.md), [plan](planificacion-sprints.md), [borrador S1-16](integracion-s1-16-borrador.md), [modalidad S1-17](integracion-s1-17-modalidad.md).
