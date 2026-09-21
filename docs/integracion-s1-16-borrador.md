# S1-16 · Guardar y recuperar un borrador (BG-18)

Asistente de creación de campaña, backend y frontend. Responsable: Santiago (rama `SantiagoDev`). Depende de E05, S1-10 y S1-13, las tres cerradas.

**Esta tarea desbloquea S1-19 (portada, Alison).** El contrato estable que puede consumir es `GET /api/campaigns/drafts/:id`, descrito abajo.

## Qué se implementó

**Persistencia de datos y posición (CA 1).** `campaign.builder_step` ya existía en el esquema con valor inicial 0: el asistente lo usa como posición. Datos y posición se escriben en **una sola sentencia**, de modo que nunca queda una posición avanzada sobre datos que no llegaron a guardarse. El frontend confirma el guardado y solo lo da por hecho cuando la API responde.

**Recuperación tras volver a entrar (CA 2).** La prueba de integración cierra sesión, vuelve a entrar y comprueba que el borrador conserva título, resumen y posición. El frontend muestra el error y ofrece **Reintentar guardado**, que repite exactamente la última operación pendiente y no otra.

**Coherencia entre pasos (CA 3).** Se avanza de uno en uno y se retrocede a cualquier paso ya alcanzado; saltar hacia adelante se rechaza con 409 y no mueve la posición. La regla vive en el dominio del backend y se duplica en el cliente solo para no ofrecer un botón que la API va a rechazar: **la autoridad es la API**.

**Propiedad comprobada en la API.** La condición de propiedad va en el `WHERE` de cada consulta, así que un borrador ajeno no llega a leerse. Un tercero recibe 404 y no distingue entre ajeno e inexistente. Una organización que el creador no gestiona se rechaza con 403, reutilizando `Memberships` de S1-13.

## Tres hallazgos del esquema que cambiaron la implementación

**El trigger `campaign_log_status` obliga a conceder `INSERT` en `status_history`.** Registra cada alta y cada cambio de estado, y **no es `SECURITY DEFINER`**, así que corre con el rol de la aplicación. Sin esa concesión, crear un borrador fallaba con `permission denied for table status_history`. Está en `grant-s1-16.sql`, solo `INSERT`: el historial no se corrige ni se borra desde la API.

**El historial necesita saber quién actúa.** `brotar_current_actor()` lee el ajuste `brotar.actor_id`; si nadie lo declara, `changed_by` queda en nulo y el historial pierde la autoría. El repositorio lo fija con `set_config(..., true)` dentro de la misma transacción de cada escritura.

**El trigger `brotar_check_campaign_organization` exige `OWNER`, `LEGAL_REPRESENTATIVE` o `ADMIN`.** Son exactamente los tres roles de `ORGANIZATION_MANAGERS`, elegidos en S1-13 como valor conservador. El esquema oficial confirma esa elección: no era arbitraria.

## Contrato para S1-19 y para los pasos siguientes

```
GET    /api/campaigns/drafts          → lista de borradores propios
POST   /api/campaigns/drafts          → crea uno; arranca en builderStep 0
GET    /api/campaigns/drafts/:id      → { id, title, summary, campaignType,
                                          categoryId, organizationId, status,
                                          builderStep, totalSteps }
PUT    /api/campaigns/drafts/:id      → guarda datos y posición juntos
```

Todas exigen sesión y rol `REGISTERED_USER`. Las mutaciones exigen la cabecera `X-Brotar-Request`. `totalSteps` vale 8, por el flujo de ocho etapas de BG-15.

## Lo que NO cierra la historia

- **`campaign_type` se exige al crear el borrador** porque la columna es `NOT NULL` en el esquema oficial: la fila no puede existir sin modalidad. Las reglas de *cambiar* de modalidad sin descartar datos son de **S1-17**, no de aquí.
- Los pasos **no están nombrados**. El dominio solo valida la posición dentro de ocho etapas; qué contiene cada una es contenido del flujo y depende de D02 y D10. `campaign_builder_step_check` en la base admite 0–20; el límite de 8 es una regla de aplicación, más estricta a propósito.
- El asistente todavía no captura ubicación, historia, meta ni recompensas: son **S1-18**, **S1-20** y tareas posteriores.
- El borrador no se envía a revisión ni se publica. Sigue en `DRAFT` y pasar de ahí es otro flujo.
- El guardado es **manual**. El criterio admite «manual o automático»; el automático no se añadió para no escribir sin intención del creador mientras no haya una regla acordada de frecuencia.

## Comprobación

Desde `backend`, con la base V2 levantada:

```bash
pnpm run check
ALLOW_DB_TEST_WRITES=true DB_TEST_RESTART=false node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
```

Desde la raíz, para el asistente:

```bash
bun run check
```

Cubren esta historia `backend/test/drafts.test.ts`, `backend/integration/drafts.integration.test.ts` y `tests/campaigns.test.ts`.

Referencias: [reparto](asignacion-sprint-1.md), [plan](planificacion-sprints.md), [permisos S1-13](integracion-s1-13-permisos.md), [catálogos S1-15](integracion-s1-15-catalogos.md).
