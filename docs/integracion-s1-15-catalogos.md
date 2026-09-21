# S1-15 · Categorías y catálogos de campaña (BG-55)

Módulo `catalogs` sobre la base V2. Responsable: Santiago (rama `SantiagoDev`). Depende de E07, cerrada técnicamente, y de **D02 y D10, ambas abiertas**.

## Qué se implementó

**Catálogo de categorías con referencias protegidas (CA 1).** `category` es jerárquica (`parent_id`) y `campaign.category_id` la referencia. La API valida antes de escribir: identificador en minúsculas con guiones, nombre no vacío, orden entre 0 y 32767, sin autorreferencia, sin identificador repetido y con categoría superior existente y activa.

**Desactivar, nunca borrar.** Una categoría en uso no se desactiva: se rechaza con 409 si tiene campañas que la referencian o subcategorías activas. `grant-s1-15.sql` no concede `DELETE` sobre `category`, así que el borrado no está disponible ni por error. Reactivar sí es libre: no deja referencias colgando.

**Edición autorizada (CA 1).** Lectura del catálogo activo para cualquier cuenta con `REGISTERED_USER`, en `GET /api/catalogs/categories`, que consumirá el asistente de campaña. La administración vive en `/api/catalogs/admin/categories` y exige `ADMIN`, comprobado en la API. El auditor no edita aunque acumule `ADMIN`, por la regla de solo lectura de S1-13.

**Parámetros con autoría registrada (CA 2).** `system_setting` guarda `value` en `jsonb` y `updated_by`, de modo que queda constancia de quién modificó cada parámetro.

## Lo que deliberadamente NO se hizo

**No se creó ninguna categoría.** El contenido del catálogo lo administra un `ADMIN` en ejecución; inventar categorías del MVP sería decidir por D02. La tabla sigue vacía y eso es correcto.

**`AGREED_SETTINGS` está vacía a propósito.** El criterio exige gestionar «solo parámetros de negocio previamente acordados» y no hay ninguno acordado: D02 y D10 siguen abiertas. El mecanismo está completo y probado, y **toda clave se rechaza** con un mensaje que nombra las decisiones pendientes. Poblar esa lista es el trabajo que desbloquea D02/D10, no una tarea de implementación.

**No se introdujeron configuraciones avanzadas ni modalidades nuevas (CA 3).** El esquema ya trae `campaign_type` con `DONATION`, `REWARD` y `PRESALE`; no se añadió ninguna. Su interfaz se define en D10.

## Comprobación

Desde `backend`, con la base V2 levantada:

```bash
pnpm run check
ALLOW_DB_TEST_WRITES=true DB_TEST_RESTART=false node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
```

Cubren esta historia `test/catalogs.test.ts` (dominio y reglas) e `integration/catalogs.integration.test.ts`, que comprueba contra la API real la denegación a cuentas sin `ADMIN`, el conflicto por identificador repetido, la protección por subcategoría activa y por campaña que la referencia, el rechazo de parámetros no acordados y que el auditor conserva la lectura. Los fixtures llevan sufijo aleatorio y se eliminan al terminar.

Referencias: [reparto](asignacion-sprint-1.md), [plan](planificacion-sprints.md), [permisos S1-13](integracion-s1-13-permisos.md).
