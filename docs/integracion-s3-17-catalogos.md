# S3-17 · Catálogos administrativos · 22/10/2026

La pantalla `CatalogsPage` permite consultar categorías activas/inactivas, crear, editar y cambiar su estado con confirmación. Consume la API real, muestra carga/vacío/error/reintento y conserva los campos ante errores de validación o conflicto. Ante un resultado de escritura desconocido exige consultar otra vez antes de repetir. ADMIN escribe; AUDITOR consulta, incluso si acumula ADMIN. Los controles mantienen etiquetas, foco, mensajes accesibles y distribución móvil.

La integración global registra `/administracion/catalogos`, su enlace en `AdministrativeNavigation` y la continuación autenticada permitida en `access/navigation.ts`.

## Contratos y referencias

- Se conservan `GET/POST /api/catalogs/admin/categories`, `PUT /:id` y `PUT /:id/state`. No existe borrado.
- `GET /api/catalogs/admin/settings` devuelve únicamente las claves de `AGREED_SETTINGS`. Actualmente devuelve `[]`; la pantalla explica el pendiente y no inventa controles para claves no aprobadas.
- La API mantiene sesión, protección de origen y comprobación de roles vigentes. Lecturas administrativas admiten ADMIN o AUDITOR; las mutaciones siguen exigiendo ADMIN y `RoleGuard` impide toda mutación de AUDITOR.
- Se impiden autorreferencias y ciclos de varios niveles, padres retirados y reactivación bajo una rama inactiva. No se desactivan categorías usadas por campañas o subcategorías activas.
- Validación y escritura usan una transacción. El árbol se serializa mediante bloqueo de `category`; la desactivación también bloquea escrituras de `campaign` durante la comprobación de uso. Esto evita cambios de referencias entre la comprobación y la escritura. Las operaciones administrativas son breves; los bloqueos pueden esperar a transacciones existentes.
- Alta, edición y estado insertan `audit_log` con actor autenticado, acción y valores anteriores/nuevos de la categoría dentro de la misma transacción. No se copian cookies, tokens ni credenciales. Si falla auditoría, el cambio se revierte. La migración de permisos de auditoría ya existente es requisito; no se añade otra migración.
- La edición conserva el contrato existente sin versión optimista: escrituras concurrentes se serializan y cada cambio queda auditado; no se afirma detección de formularios obsoletos.

## Preparación reproducible y decisiones pendientes

Se conserva `infra/postgres-v2/seed-categories-demo.sql` y ADR-003: las cinco categorías son provisionales de demostración. El script solo inserta slugs ausentes; no sobrescribe nombres ni reactiva registros deliberadamente retirados. Esta entrega no lo ejecuta ni modifica datos existentes.

Fuentes: [S3-17](https://trello.com/c/RNolTk1j), captura del tablero del 22/10/2026, [S1-15](integracion-s1-15-catalogos.md) y [ADR-003](decisiones/ADR-003-categorias-provisionales.md). La tarjeta exige «parámetros aprobados» y «concretar reglas de campaña/modelo, límites y costos solo tras decisión».

Ricardo debe coordinar y registrar con los validadores indicados en las tarjetas:

1. **[D02 · Reglas de campaña y recompensas](https://trello.com/c/H3kIcMkw):** quién puede crear, categorías definitivas del piloto, elegibilidad flexible/todo o nada, duración, mínimos, cupos y efecto del descuadre de presupuesto. Valida líderes con cliente; la captura mantiene persona, respuesta, fecha y evidencia pendientes.
2. **[D10 · Vistas todavía por detallar](https://trello.com/c/bg81cnOO):** acciones y vistas definitivas de categorías, permisos y preferencias. Valida líderes de producto/diseño; persona y aprobación siguen pendientes. La aclaración de 16/09 prioriza perfil/organización, sin aprobar administración avanzada.
3. **Claves concretas de parámetros:** registrar para cada clave su tipo, valor inicial, límites, responsable de edición, alcance y evidencia de aprobación. Solo entonces poblar `AGREED_SETTINGS`, definir la validación específica y habilitar la edición correspondiente. `system_setting.updated_by` existe; la futura edición debe incorporar historial de cambios adecuado al tipo de valor, evitando registrar secretos.
4. **D04 si hay costos/importes:** aprobar fuente y regla de costos antes de exponerlos como configuración. No se fijaron comisiones ni importes en esta entrega.

La interfaz técnica no cierra estas decisiones ni acredita aceptación del MVP.

## Evidencia

- TDD: fallo reproducido de ciclos entre varios niveles y de cadenas con NUL antes de corregir; fallo de auditoría/ausencia de transacción antes de implementarla.
- `bun test tests/catalogs.test.tsx backend/test/catalogs.test.ts backend/test/catalog-audit.test.ts`: 15 pruebas pasan.
- `bun run test`: 175 pruebas frontend pasan en el corte de esta entrega.
- `bun run typecheck` y `bun run build`: pasan; Vite mantiene advertencia de paquete principal mayor de 500 kB.
- ESLint de `src/features/catalogs`, su prueba, `backend/src/catalogs` y pruebas de catálogos: pasa.
- Verificación final de la continuación: `pnpm run typecheck` pasa y la suite oficial backend completa pasó 174/174 después de integrar los módulos. El primer intento de HTTP necesitó permiso para escuchar en 127.0.0.1; la reejecución autorizada pasó.
- `backend/integration/catalogs.integration.test.ts` amplía la prueba PostgreSQL/API: roles sin privilegios, auditor solo y con ADMIN, listado vacío de parámetros, auditoría real de alta/edición, rollback por fallo de auditoría, ciclo, padre inactivo y protección de campañas. El agente padre confirmó ejecución satisfactoria de la prueba PostgreSQL de catálogos. Los recorridos de navegador se coordinan en el padre; esta nota no declara su ejecución.

Recorrido de navegador pendiente de integración: abrir la ruta con ADMIN, crear categoría de prueba, editarla, desactivar/activar y comprobar el historial; confirmar conflicto por referencia; repetir como AUDITOR (sin botones), cuenta ordinaria (403) y sin sesión (login con continuación). Revisar ancho de 390 px, Tab/Enter, carga, lista vacía, fallo de API y reintento.
