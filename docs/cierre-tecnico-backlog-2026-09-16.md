# Cierre técnico del backlog de Brotar

Actualización posterior: el 17/09 se publicaron implementación y documentación en main (067f832 y dc7bcad), y se cerraron técnicamente E01/E09. El resto de este documento conserva el corte histórico del 16/09. Estado actual: [informe de entrega](entrega-integracion-2026-09-17.md).

Corte: 16/09/2026. El responsable solicitó cerrar las historias verificables y conservar los pendientes. Este registro y Trello actualizan el avance técnico sin cambiar criterios de negocio ni presentar una aprobación del cliente. Posteriormente, el Word v2.2 incorporó este corte y la [planificación por sprints](planificacion-sprints.md). El PDF explicativo conserva su corte anterior. El nuevo reparto se sincronizó con Trello el 17/09/2026; ver [organización y comprobaciones](organizacion-trello-sprints-2026-09-17.md).

## Resumen sin duplicados

- 64 historias generales conservadas, sin crear IDs nuevos.
- 5 cierres técnicos locales: BG-02, BG-03, BG-09, BG-57 y BG-58.
- 16 historias parciales: BG-01, BG-04 a BG-08, BG-10 a BG-12, BG-26, BG-53 y BG-59 a BG-63.
- 43 historias sin implementación funcional identificada en este corte. El diseño Figma o la existencia de tablas no las completan.
- De las 9 tareas acotadas de Trello, E02 a E08 están técnicamente completas. E01 y E09 siguen parciales por versionado/publicación del incremento. Estas 7 tareas no se suman a las 5 historias como si fueran 12 funcionalidades independientes: son desgloses vinculados.

## Cierres de historias

| ID | Resultado y evidencia | Límite |
| --- | --- | --- |
| BG-02 | Recorrido informativo corregido; diferencia sesiones reales de campañas simuladas y pagos ausentes. Test public-copy y página comprobada en navegador. | No implementa aportes ni seguimiento real. |
| BG-03 | Preparación, modalidades y revisión informadas; requisitos pendientes identificados. Enlace al registro comprobado y test public-copy. | No cierra D02/D03 ni implementa editor/KYB. |
| BG-09 | Inicio, consulta y cierre de sesión real; estados de cuenta, expiración, revocación y acceso probados en API/PostgreSQL. | Política local ADR-002, no verificación de correo. |
| BG-57 | React/TypeScript/Bun, lockfile, separación app/features/shared/mocks. Lint, tipado y compilación correctos. | Cierra la estructura base; los módulos futuros siguen pendientes en sus historias. |
| BG-58 | NestJS/TypeScript/pnpm; dominio puro, aplicación y adaptadores separados en los cinco módulos funcionales actuales. Prueba de frontera arquitectónica añadida. | No supone que todo el backend del MVP esté construido. |

El cierre técnico autorizado no acredita revisión independiente, aceptación externa, publicación del incremento ni despliegue. Estos puntos quedan expresos en las tarjetas y en E01/E09/BG-63; no se inventa una aprobación de los líderes.

## Tareas de la entrega actual

| Trello | Resultado | Estado |
| --- | --- | --- |
| E01 Preparación | Aplicaciones separadas, arranque y ejemplos preparados. | Parcial: versionado y commits del incremento pendientes. |
| E02 Base de datos | V2 aislada restaurada, TypeORM y persistencia verificados. | Cierre técnico de esta entrega; BG-59 sigue parcial. |
| E03 HTTP | Contratos y formularios conectados con estados reales. | Cierre técnico. |
| E04 Registro | Usuario/perfil/rol básico, hash, validaciones y transacción. | Cierre técnico; BG-10 sigue parcial. |
| E05 Sesión | Login/logout y consulta autenticada reales. | Cierre técnico. |
| E06 Perfil | Datos propios editables y persistentes. | Cierre técnico; guardados fuera de este bloque. |
| E07 Roles y acceso | Catálogo, roles vigentes, guardas y rutas privadas. | Cierre técnico; permisos avanzados pendientes. |
| E08 Organización | Organización DRAFT con vínculo propio, sin KYB ficticio. | Cierre técnico; BG-26 sigue parcial. |
| E09 Pruebas y entrega | Suites y guion de demostración documentados. | Parcial: publicación y revisión externa pendientes. |

Los números E de Trello no coinciden exactamente con los nombres históricos de los informes: `integracion-e07-roles-organizaciones.md` cubre E07 y E08 del tablero; `revision-entrega-integracion-e08.md` documenta parte de E09. Usar el nombre y los criterios de cada tarjeta, no solo el número del archivo.

## Pendientes conservados

| Historia | Qué ya existe | Qué impide cerrarla y quién interviene |
| --- | --- | --- |
| BG-01 | Landing y estados con mocks. | Integración de campañas reales; desarrollo posterior. |
| BG-04 | Identidad, componentes y navegación del alcance actual. | Verificación responsive y teclado de todas las pantallas incorporadas; continuidad en módulos futuros. |
| BG-05 | Catálogo y paginación simulados. | API de campañas publicadas y privacidad; desarrollo posterior. |
| BG-06 | Búsqueda y filtros simulados. | Conexión a campañas reales y pruebas integradas. |
| BG-07 | Detalle y variantes simuladas. | Campañas y señales de confianza reales; reglas por operación pendientes. |
| BG-08 | Estados reproducibles en la demo. | Repetir contra API de campañas y errores reales. |
| BG-10 | Registro básico real. | Texto legal aprobado, datos por perfil y política definitiva de verificación; responsables funcionales. |
| BG-11 | Recuperación explícitamente simulada. | Servicio/remitente de correo y restablecimiento real; elección/configuración autorizada. |
| BG-12 | Perfil propio real. | Guardados/seguimiento persistentes y participación por rol; campaña y reglas posteriores. |
| BG-26 | Datos básicos de organización y titular del registro. | Representante, respaldos y caso KYB; definición de documentos y revisión por líderes. |
| BG-53 | Roles y controles básicos reales. | Matriz completa de responsabilidades aprobada e implementada. |
| BG-59 | Restauración, lectura/escritura/rollback, manifiesto de baseline y procedimiento. | Mecanismo de migraciones y ensayo de recuperación en copia aislada. No se ejecutó una migración ficticia para cerrar la historia. |
| BG-60 | Contratos básicos de acceso/perfil/organizaciones. | Contratos y conexiones del resto de experiencias. |
| BG-61 | Datos propios protegidos y ejemplos sin secretos. | Cargas privadas, almacenamiento, acceso y retención aprobados. |
| BG-62 | Pruebas de los módulos disponibles. | Pruebas del resto del MVP y revisión visual completa. |
| BG-63 | README y evidencia local actualizados. | Commit/push revisados y entrega/documentos generales actualizados; requiere autorización de publicación. |

## Evidencia de esta ejecución

- `bun run check`: 64 pruebas frontend, lint, tipos y build correctos.
- `pnpm run check`: 45 pruebas backend, lint, tipos y build correctos.
- `pnpm run test:integration`: 5 suites PostgreSQL correctas, con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=false`; fixtures propios limpiados por las suites. No se reinició la base.
- `node scripts/verify-provisional-v2.mjs`: inventario y privilegios correctos, también después de extraer el inventario a `baseline.json`.
- Total: 114 pruebas, no 114 historias. Se mantiene separada la evidencia histórica de esta ejecución.
- Navegador: texto corregido de Cómo funciona, foco visible del enlace Saltar al contenido, página Para creadores y enlace hacia registro comprobados. La herramienta no aplicó el ancho móvil solicitado (el DOM seguía en 1280); se restableció el viewport. No se presenta esa comprobación como validación móvil.
- No se alteró el formulario que tenía abierto el usuario. No se activaron cuentas, no se ejecutaron migraciones ni se modificaron datos ajenos a fixtures. Sin commit ni push.

## Siguiente paso

Revisar y publicar el incremento con autorización y actualizar el PDF explicativo. La planificación ya se sincronizó con el tablero el 17/09/2026. El Word v2.2 incorpora el corte técnico y conserva la versión anterior. La ampliación propuesta del Sprint 1 añade once tareas pendientes a las nueve de la entrega básica, sin ampliar retroactivamente el alcance de E01 a E09 ni aparentar un cierre del MVP.
