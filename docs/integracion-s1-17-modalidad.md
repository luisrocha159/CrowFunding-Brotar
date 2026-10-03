# S1-17 · Elegir la modalidad de campaña (BG-15)

Etapa de modalidad del asistente, backend y frontend. Responsable: Santiago (rama `SantiagoDev`). Depende de S1-16, cerrada, y de **D02, que sigue abierta**.

## Qué se implementó

**Una modalidad con explicación clara, conservada durante el asistente (CA 1).** `DONATION`, `REWARD` y `PRESALE` son los valores del enum `campaign_type` del esquema oficial; no se añadió ninguno. El asistente explica cada una y guardar cualquier otro paso no altera la modalidad elegida, comprobado en la prueba de integración.

**La donación omite los requisitos de recompensas (CA 2).** `requiresRewards` decide si la etapa aplica, y `GET /api/campaigns/drafts/:id/modality` lo devuelve como `rewardsApply` para que el asistente la salte. El progreso de ocho etapas ya lo aporta S1-16 con `builderStep` y `totalSteps`.

**Cambiar de modalidad no descarta datos en silencio (CA 3).** Si el cambio dejaría recompensas cargadas sin aplicar, la API responde 409 y **no cambia nada** hasta que el creador lo reconozca con `acknowledgeRewards`. Al confirmarlo, las recompensas **no se borran ni se desactivan**: se conservan intactas. Si el creador vuelve a recompensa o preventa, siguen ahí. La prueba de integración lo verifica contando filas de `reward` antes y después.

La concesión `grant-s1-17.sql` da a `brotar_app` **solo `SELECT` sobre `reward`**: la API necesita contarlas para avisar, y no poder modificarlas es justamente lo que garantiza que no se descarten.

## Hallazgo del esquema

`reward` tiene una clave foránea **compuesta** `(campaign_id, currency_code)` contra `campaign`: una recompensa debe usar la moneda de su campaña. Aparece al crear fixtures y condicionará la etapa de recompensas de sprints posteriores.

## Contrato

```
GET  /api/campaigns/drafts/:id/modality  → { campaignType, fundingModel, rewardsApply, rewardCount }
PUT  /api/campaigns/drafts/:id/modality  → { campaignType, fundingModel?, acknowledgeRewards? }
                                            409 si dejaría recompensas sin aplicar
```

`fundingModel` admite `ALL_OR_NOTHING` y `FLEXIBLE`, los valores del enum `funding_model`. No se fija ninguno por defecto.

## Lo que NO cierra la historia

- **«Según reglas aprobadas» sigue pendiente de D02.** Lo implementado es la garantía técnica de que nada se pierde y de que el cambio es explícito. Qué ocurre finalmente con las recompensas al publicar una campaña que cambió a donación es una decisión de negocio que no se toma aquí.
- No se fija un `fundingModel` por defecto: cuál corresponde a cada modalidad es de D02.
- La etapa de recompensas en sí (crear, editar, ordenar) no es de este sprint. Aquí solo se cuenta lo que exista para poder advertir.
- El flujo de ocho etapas se muestra con la posición, pero **las etapas no están nombradas**: su contenido depende de D02 y D10.

## Comprobación

Backend: `backend/test/modality.test.ts` e `integration/modality.integration.test.ts`. Frontend: `tests/campaigns.test.ts`.

Referencias: [reparto](asignacion-sprint-1.md), [plan](planificacion-sprints.md), [borrador S1-16](integracion-s1-16-borrador.md).
