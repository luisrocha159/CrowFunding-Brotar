# Sprint 2 · tareas de Santiago · implementación local

La implementación parte de `SantiagoDev` actualizado al commit `9571bd4` de `DEV`. Este documento registra el alcance técnico local; no equivale a aceptación del equipo ni a cierre de tarjetas Trello.

| Tarea | Implementación |
| --- | --- |
| S2-02 | Actividades, responsables, fechas e hitos vinculados, con lectura y guardado del borrador propio. |
| S2-03 | Partidas de gasto, total planificado y riesgos; categorías activas y montos positivos. |
| S2-04 | Meta, moneda activa, duración, modelo y fechas coherentes, sin integrar pagos. |
| S2-05 | Recompensas y preventas según modalidad; donación omite el requisito y conserva las recompensas al cambiar de modalidad. |
| S2-10 | Vista previa de datos persistidos y lista de faltantes calculada por la API con enlace al paso correspondiente. |
| S2-11 | Envío exclusivo del propietario con rol `CREATOR`, transición a `IN_REVIEW`, fecha `submitted_at`, actor en `status_history` y nueva ronda en `campaign_review`. |
| S2-13 | Lectura de observaciones de la última ronda con cambios solicitados, edición en `CHANGES_REQUESTED` y reenvío con otra ronda sin perder historial. |

Las secciones usan las tablas del esquema oficial PostgreSQL v2. El guardado comprueba propiedad y estado bajo bloqueo de la campaña. El envío comprueba de nuevo la completitud dentro de la transacción para evitar carreras y envíos duplicados. La aprobación y publicación administrativa corresponden a las tareas de Ricardo.

Para una V2 local ya instalada, ejecutar una sola vez `node scripts/prepare-sprint2-santiago.mjs` desde `backend/` con PostgreSQL iniciado. El script solo concede a `brotar_app` los permisos necesarios sobre las tablas y catálogos usados aquí; no cambia datos ni roles de personas. La restauración nueva debe aplicar también `infra/postgres-v2/grant-s2-santiago.sql` antes de probar el incremento.

El PDF de Fase 3 enumera siete pasos. El asistente heredado tiene ocho porque separa Portada de Información general y guarda `builder_step` en los borradores. Se conservaron sus ocho posiciones para no invalidar el progreso ya almacenado; las siete áreas funcionales del PDF están cubiertas y Portada se valida antes del envío. Unificar visualmente Portada con Información general requiere migrar la posición de borradores existentes y se deja para un cambio coordinado.

## Verificación local

- `bun run check`: lint, tipos, 99 pruebas y build del frontend.
- `pnpm run check` desde `backend/`: lint, tipos, 104 pruebas y build del backend.
- Navegación a `/crear-campana` con Vite: se muestra el estado de error previsto cuando la API y PostgreSQL no están disponibles. Con una API local de prueba se inspeccionaron visualmente Plan y presupuesto, Financiamiento, Recompensas y Revisión; el enlace de Portada faltante volvió al paso correcto. La API de prueba no verifica persistencia real.
- Docker no está activo en este equipo, así que la persistencia y las transiciones contra PostgreSQL real aún requieren la prueba de integración en un entorno de desarrollo disponible.
- El MCP de Trello conectado no tiene acceso al tablero `https://trello.com/b/37xCrdes/crowudfunding`; ninguna tarjeta se modificó.

No se hizo commit, push ni PR. Una referencia de commit/PR y la revisión de alcance quedan pendientes de la decisión del equipo.
