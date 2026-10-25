# Revisión e integración de las campañas de Santiago

## Resultado y alcance

El 5 de octubre de 2026 se revisó `origin/SantiagoDev` en el commit `2603426c6401d4c2449d305927332f944379f4e9`, publicado el 4 de octubre. Se incorporaron sus siete tareas sobre la copia actual de `RicardoDev`, conservando el catálogo real de Alison y los proyectos/cola de Ricardo. La base local continúa en `8f34c80`, con cambios sin commit. No se hizo push, merge remoto ni cambios en DEV, main o Trello; tampoco se abrió el tablero.

La implementación original contiene las siete áreas asignadas y respeta la separación entre dominio/aplicación e infraestructura NestJS/TypeORM. Su nota informa pruebas unitarias y una inspección con API de prueba, pero no persistencia PostgreSQL. La integración añadió esa comprobación real y corrigió los puntos descritos abajo. Esta revisión es evidencia técnica local, no aceptación formal de los líderes ni certificación de ausencia de errores.

## Comprobación de las tareas

| Tarea | Qué se integró y comprobó | Límite |
| --- | --- | --- |
| S2-02 | Actividades, responsables, cronograma e hitos vinculados. Fechas válidas, relaciones coherentes, propiedad y guardado transaccional. | No incluye ejecución ni rendición de hitos posteriores. |
| S2-03 | Partidas, categorías de gasto activas, importes positivos, suma del presupuesto y riesgos. Una entrada inválida no reemplaza datos guardados. | No se exige presupuesto igual a meta, regla sin confirmar. |
| S2-04 | Meta positiva, moneda activa, duración y modelos del enum oficial, con fechas coherentes. Persistencia comprobada después de reiniciar la API. | No establece límites comerciales nuevos ni activa pagos. |
| S2-05 | Recompensas/preventas con tipo, contenido, importe, disponibilidad y entrega. Se omiten en donación sin borrar las anteriores al cambiar modalidad. | No incluye compra, aportes ni entrega de recompensas. |
| S2-10 | Revisión de datos persistidos, portada, historia/impacto, plan, presupuesto, financiamiento y recompensas aplicables; faltantes calculados por servidor con enlace al paso. | No equivale a aprobación administrativa. |
| S2-11 | Propietario con REGISTERED_USER y CREATOR vigentes envía una campaña completa a IN_REVIEW; se registra fecha, actor y ronda. Dos solicitudes simultáneas producen un único envío. | El registro no concede CREATOR automáticamente. |
| S2-13 | Observaciones de la última ronda, edición en CHANGES_REQUESTED y reenvío conservando comentarios e historial. Se comprobó la segunda/tercera ronda y la conexión con proyectos/cola. | La decisión que solicita cambios fue un fixture SQL temporal, porque S2-12 aún no dispone de endpoint administrativo real. |

El constructor conserva ocho posiciones heredadas, con Portada como paso separado. Cubre las siete áreas funcionales del PDF de campañas sin modificar el progreso almacenado. No se reescribió la arquitectura ni se restauró la base encima de datos existentes.

## Correcciones durante la integración

- Se combinaron los controladores y proveedores con los módulos actuales; no se reemplazó el módulo completo ni se perdieron S2-15/S2-16/S2-17. La apertura mediante `?borrador=` permanece disponible.
- Se añadieron validaciones inmediatas de las secciones y contratos anidados de las respuestas. Datos malformados no se convierten en formularios vacíos, enlaces inválidos ni éxitos simulados. Las validaciones frontend/backend se contrastan mediante pruebas.
- El plan y el presupuesto se guardan por separado. Se detectan cambios pendientes de cada bloque y se bloquea cambiar de paso/borrador hasta guardarlos. Se bloquea navegación durante carga/guardado/envío, se evita doble operación en el cliente y los mensajes de éxito no pasan a otro paso como si también se hubiera guardado.
- Se añadió reintento de carga y presentación clara de errores por campo. La revisión muestra más detalle de historia, indicadores, hitos, riesgos y recompensas. Los enlaces de observaciones de actividades, hitos, modalidad y preventa conducen a su paso correcto.
- La escritura de recompensas reafirma la modalidad bajo el bloqueo de campaña. Donación no borra las recompensas anteriores; la consulta pública y revisión no las muestran como aplicables. Se conservan las recompensas inactivas que no forman parte del formulario activo.
- Se retiró la igualdad exacta entre diferencia de fechas y duración, que no está confirmada en la tarea. Se mantienen fechas válidas, inicio/fin coherentes y duración positiva.
- El envío exige categoría y moneda activas, además de una portada pública de campaña no eliminada. Esta comprobación se adaptó a `file_asset.storage_key` del esquema real y se verificó con PostgreSQL.
- Mis proyectos ofrece acceso a **Corregir campaña** en CHANGES_REQUESTED, pero el descarte sigue limitado a DRAFT. En revisión, aprobada o publicada no se habilita edición por esta vía.
- Se unificaron los permisos técnicos en `prepare-sprint2.mjs`; el script de Santiago es un alias compatible. Una instalación nueva aplica también proyectos, catálogo público, secciones y envío. No se conceden roles de negocio a personas ni permisos de pagos.

## Pruebas y evidencia

Pasaron **116 pruebas frontend, 115 backend y 17 de integración PostgreSQL: 248 en total**, sin fallos ni pruebas omitidas en las suites ejecutadas. También pasaron lint, comprobación de tipos, compilación de ambas aplicaciones y `git diff --check`.

La nueva integración `backend/integration/campaign-sections-submission.integration.test.ts` usa NestJS y PostgreSQL V2 reales. Crea cuentas/campañas temporales y verifica lecturas propias, aislamiento, roles, datos inválidos, rollback, cambio de modalidad, conservación de recompensas, portada privada, reinicio de API, envío concurrente, bloqueo de edición, auditoría, cola, correcciones y rondas históricas. Comprueba además que una campaña no publicada no aparece en el catálogo de Alison. La condición PUBLISHED se prepara solamente como fixture para comprobar lectura, no como implementación de publicación.

La suite se ejecutó desde backend con pnpm 11.19.0, `ALLOW_DB_TEST_WRITES=true`, `DB_TEST_RESTART=false` y la configuración de `../infra/postgres-v2/.env.backend`. El frontend se comprobó con `bun run check`. Los comandos repetibles y el orden de preparación están en el README principal, secciones 12 y 14. El reinicio probado en esta integración fue de la API, no una restauración o eliminación del volumen.

Se ensayó la interfaz en una pestaña oculta con Vite/API/PostgreSQL y una cuenta efímera: continuar borrador concreto, responsable vacío, error junto al campo, guardado independiente de plan/presupuesto, meta cero, conservación de importes, revisión, envío, observación de actividad, corrección, guardado y reenvío. No se usaron campañas reales del equipo para esas operaciones. Las condiciones de revisión solicitada se prepararon como fixtures, no como acciones de un administrador en el producto.

La [captura del reenvío](evidencia-sprint-2/reenvio-ensayo-santiago-2026-10-05.png) muestra únicamente datos ficticios del ensayo. La cuenta, campaña, categorías temporales y archivo cargado se eliminaron al terminar la revisión; no es un proyecto público ni una cuenta que deba utilizar el equipo.

Docker volvió a presentar el socket Windows de arranque inaccesible. Se conservaron los directorios temporales como `run.stale-20261005-santiago` y `docker-secrets-engine.stale-20261005-santiago` y se reinició Docker Desktop. El motor 29.7.2 respondió y PostgreSQL quedó healthy para las pruebas. Al reabrir el entorno después de su cierre, se repitió el error y se conservó otra copia con sufijo `20261005-1041-santiago`. No se borraron volúmenes, distribuciones WSL ni bases; los respaldos temporales permiten revisar lo trasladado. Es una recuperación local del arranque, no una reparación permanente del fallo de Docker Desktop.

## Qué sigue pendiente

Se puede avanzar con la base local integrada de los tres integrantes. **No se declara cerrado todo el Sprint 2:** quedan S2-12, decisiones administrativas; S2-14, estados/publicación; y S2-21, cierre integral y recorrido real de revisión/publicación. Continúan pendientes las decisiones del equipo sobre provisión de roles, quién publica y el tratamiento del estado REJECTED en el esquema provisional.

El ensayo técnico de S2-13 no sustituye el circuito administrativo pendiente. No se implementaron pagos, aportes, KYC/KYB, desembolsos ni reglas comerciales no confirmadas. La siguiente integración remota y cualquier modificación del tablero requieren un pedido separado del usuario.
