# Revisión e integración local de Santiago · 28/10/2026

Rama destino: **RicardoDev**. Origen recibido: `SantiagoDev b8de6ea` (27/10), sobre el corte local `2c6d612`, que ya contenía Alison `bd4ed69`, soporte completo y correo. Se conserva la autoría y no se reasignan tarjetas. **Sin push, cambios en DEV ni actualización de Trello.** Esta revisión evalúa código y pruebas locales; no toma como acreditación de terminado el estado declarado en la rama o en Trello.

## Qué se recibió y combinó

- Avances, corrección/retiro propio de publicaciones, historial de versiones, preparación y cumplimiento de recompensas con respaldo privado.
- Informes periódicos por revisiones, borradores, gastos/evidencias, revisión independiente, solicitudes de remanente y su autorización/finalización DEMO. El cierre acumula gastos por referencia, sin volver a contarlos como gastos nuevos.
- Gestión de colaboradores, datos permitidos de terceros, restricción/restauración y revocación de sesiones; historial de cambios.
- Representación: OWNER solicita, destinatario acepta y ADMIN independiente decide. Aceptar no concede acceso. La aprobación aplica la membresía y caduca KYB anterior; una petición pendiente bloquea las operaciones sensibles conectadas.
- Panel del creador paginado, ámbito personal/institucional, totales de todo el ámbito y separación por moneda y DEMO. Corrección/reenvío de verificación y avisos privados integrados con el correo previo.

Se resolvieron conflictos de README, cierre, readiness y registro de migraciones conservando ambos lados. El cierre mantiene `recordSupportNotice` de nuestra ampliación, junto a rendición/remanentes de Santiago. El inventario combinado es **36 migraciones y 205 rutas**; los 33/198 citados en la entrega de Santiago describen su rama, que no contenía los tres incrementos posteriores de Alison/Ricardo.

## Defectos corregidos durante la integración

1. **Datos de personas menos validados que en registro/perfil.** La nueva edición administrativa permitía nombres numéricos o HTML. Una prueba reprodujo la aceptación de `12345`; se reutiliza `PERSON_NAME`, con normalización en DTO y paridad en frontend. Se conserva ñ, acentos, nombres compuestos y apóstrofes/guiones. Alias y ciudad opcionales también rechazan HTML y controles ocultos para evitar que un NUL llegue a PostgreSQL como un error interno. Los motivos de miembros/representación se alinean con `textError`: texto significativo, límites, Unicode válido, sin HTML ni controles ocultos. Nuevas comprobaciones unitarias y HTTP.
2. **Alertas de rendiciones sustituidas.** El panel anterior contaba cualquier informe periódico, incluidas revisiones antiguas con CHANGES_REQUESTED. La prueba PostgreSQL reprodujo un pendiente incorrecto (1 frente a 0) tras una corrección aprobada. El panel reutiliza el predicado canónico `currentPeriodic`; conserva compatibilidad con informes históricos sin metadatos de revisión y no borra historial. La prueba también mantiene los controles financieros y de responsabilidades anteriores.
3. **Conexión vencida en el cliente de pruebas.** La prueba recibía ECONNRESET al reutilizar un socket HTTP después de cargar muchos respaldos por Docker/SQL sincrónico. Los nuevos fixtures usan `Connection: close`; no se añade reintento que oculte errores ni se modifica la API financiera. El escenario de 121 gastos tiene margen de 180 segundos para su preparación real; conserva todas sus aserciones.

## Estado por tarea y diferencias reales de alcance

| Tarea / responsable | Implementación presente | Qué queda para cierre íntegro |
| --- | --- | --- |
| S2-01 / Santiago | Galería/multimedia existente conservada. | Sin pendiente nuevo de este incremento; revalidación en la suite. |
| S3-17 / Santiago | Catálogos y parámetros acordados existentes conservados. | Sin pendiente nuevo de este incremento; no se añaden claves arbitrarias. |
| S2-09 / Santiago | Corrección, observaciones, versiones, reenvío y avisos privados de verificación. | Cierre técnico DEMO; la política final KYC/KYB sigue en S2-06/07. |
| S3-24 / Santiago | Panel paginado, totales, ámbitos, pendientes y enlaces a los módulos combinados. | Cierre técnico del panel DEMO; no sustituye la aceptación integral S3-21. |
| S3-12 / Santiago | Avances y recompensas, publicación/corrección/retiro propio con historial y feed coherente. | ADR-013 D13-04 prevé retiro por ADMIN: la API recibida exige CREATOR, propiedad y autoría. Además, la corrección versiona el mismo UUID y actualiza la fila publicada; el acuerdo describe nueva publicación referenciada. No se declara cumplida esa política completa ni se reescribe el acuerdo para hacerla coincidir. |
| S3-13 / Santiago | Captura/revisión de informes y remanentes, saldo y cierre acumulativo funcionales. | ADR-013 D13-04 define periodicidad mensual y resumen público aprobado sin documentos: la captura acepta períodos libres sin superposición y no existe la proyección pública de rendición (el test espera 404). La rendición financiera privada no equivale a implementar esas dos reglas. |
| S3-14 / Santiago | Consultas, cambios de terceros, restricciones/sesiones y colaboradores; representación sensible de tres etapas. | ADR-013 D13-02 pide aceptación autenticada de la invitación. ADD de ADMIN/MEMBER aplica la membresía directamente; la aceptación nueva solo cubre OWNER/LEGAL_REPRESENTATIVE. Falta cerrar ese circuito ordinario, sin confundir ambos flujos. |
| S2-06 y S2-07 / Santiago | Captura, documentos, revisión y representación DEMO, vinculados a destinos simulados. | Legal S1-11 aprobado/versionado y su integración final con consentimiento, políticas/requisitos KYC/KYB y pruebas de versiones/bloqueos. Los documentos sintéticos no acreditan identidad real. |
| S1-11 / Alison | Aviso académico provisional conservado. | Textos definitivos, requisitos por perfil, responsable/fecha/referencia de aprobación y aceptación persistida. No se encontró una entrega legal nueva en origin/AlisonDev; sigue en bd4ed69 del 25/10. No se inventan documentos aprobados. |
| S3-10 y S3-25 / Alison | Nuestro cierre previo de conversación/correo y panel preservado; alertas adaptadas a informes versionados. | Sin pendiente funcional nuevo identificado para esos incrementos; revalidación combinada, sin afirmar aceptación global. |
| S3-19 / Ricardo | Checks y regresión del corte integrado. | Revisión final de todo el MVP y de las diferencias de alcance; no se cierra solo por pruebas verdes. |
| S3-20 / Ricardo | README, contratos y evidencia local actualizados. | Publicación final del MVP cuando se autorice y esté cerrado el alcance. Este pedido mantiene el trabajo local. |
| S3-21 / Ricardo | Recorridos de integración automatizados existentes. | Aceptación integral del MVP tras resolver los pendientes funcionales/legal y reunir evidencia final del conjunto. |
| S3-26 / Ricardo | Correo propio/cola/estados y conversación de soporte ya operativos; avisos de corrección de verificación probados con transporte controlado. | Revalidación y aceptación del alcance completo con legal y módulos finalmente cerrados. Teléfono continúa opcional, sin SMS ni distintivo falso; no se incorpora como bloqueo nuevo. |

Por tanto, **no es exacto que únicamente falten archivos legales**. Las tres diferencias de alcance anteriores quedan explícitas y no son un pedido de rehacer la arquitectura. No se implementan aquí nuevos módulos para cerrar tarjetas de terceros sin mostrar esa distinción.

## Instalación y protección de datos

README §39 reúne los comandos del corte integrado: dependencia backend con pnpm, frontend con Bun, PostgreSQL/V2 con Docker y migración acumulativa. No hay dependencias nuevas ni SQL manual para categorías. Mantener el origen web propio y credenciales Gmail privadas por instalación; ninguna contraseña se integra a Git.

Se respaldó la base original antes de aplicar las cuatro migraciones nuevas en `%LOCALAPPDATA%/Brotar/backups/brotar-before-santiago-20261028.dump`. Sus **97 tablas preexistentes** conservan iguales conteos y huellas de contenido tras migrar; el inventario oficial mantiene 59 tablas. Registro de 36 migraciones sin pendientes, readiness aprobado y cinco categorías activas. No se restauró la línea base sobre datos existentes ni se borraron volúmenes. Se comprobó migración repetible por el registro habitual.

Docker tenía sockets de runtime bloqueados al iniciar. Se apartaron únicamente sus directorios de comunicación inactivos, conservando volúmenes y configuración, y el motor volvió a responder. No se hizo un restablecimiento de fábrica. Los servicios ajenos que arrancaron por su propia política no se modificaron.

## Verificación del corte

| Comprobación | Resultado y límite |
| --- | --- |
| Frontend `bun run check` | 242 pruebas, lint, tipos y build aprobados. |
| Backend `corepack.cmd pnpm run check` | 232 pruebas + 8 de ADMIN local, lint, tipos y build aprobados. |
| PostgreSQL/HTTP, regresión general | 45/48 aprobados. Dos guardias rechazan el nombre de proyecto anterior por no contener `qa`; seguimiento devuelve 404 con DEMO apagado. No se quitaron esas protecciones ni se contabilizan como éxito de esa ejecución. |
| Repetición con precondiciones correctas y último ajuste de campos opcionales | **4/4 aprobados** en otra instalación nueva `brotar-santiago-union-qa-20261028`: panel del creador, administración, publicaciones/recompensas y verificación/correcciones/correo. Configuración QA propia y `DEMO_PAYMENTS_ENABLED=true`. Completa la verificación de **48 escenarios distintos**; no suma las repeticiones como escenarios nuevos. |
| Regresiones específicas de defectos | Nombres: rojo al aceptar 12345, verde con política canónica. Panel: rojo por observación histórica ya resuelta (1 frente a 0), verde tras filtrar revisión vigente. Rendición/panel 2/2 en prueba dirigida anterior. |
| Instalación desde cero y actualización | SQL oficial más 36 migraciones en QA nueva; base original actualizada/repetible, inventario oficial preservado, 97 tablas previas con contenido idéntico y cinco categorías disponibles. |
| Contratos | Inventario combinado de 205 rutas verificado a partir de módulos/guards/permisos; sin rutas repetidas. |
| Entrega | Revisión de secretos y diferencias; documentos actualizados. Commit local en RicardoDev, sin push ni cambios en DEV/Trello. |

**530 casos distintos cubiertos por los resultados aprobados** (242 + 232 + 8 + 48). La ejecución general no se describe como 48/48: se conservan los tres fallos de precondición y sus repeticiones correctas. No hubo un nuevo recorrido manual completo en navegador del MVP combinado; S3-19/S3-21 permanecen abiertas. Las pruebas de frontend/HTTP no sustituyen esa aceptación visual/integral.

Logs ignorados: `tmp/santiago-integracion-frontend-definitivo-20261028.log` y `tmp/santiago-integracion-backend-definitivo-20261028.log` en el repositorio; `tmp/santiago-integracion-full-final-20261028.log` en la copia QA anterior; `tmp/integracion-afectada-final.log` en la copia QA nueva. La regresión incluye reinicio de PostgreSQL, recuperación con archivos y migración sobre SQL oficial aislado. Ningún test con escritura apuntó a la base original.

Para repetir en una copia QA aislada cuyo proyecto incluya `qa`, una vez instalada/configurada con el README y sin SMTP privado, desde `backend/`:

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
$env:DEMO_PAYMENTS_ENABLED='true'
$env:DB_TEST_RESTART='true'
corepack.cmd pnpm run test:integration
```

Esas variables pertenecen al proceso de pruebas en la copia aislada, no son instrucciones para habilitar escritura de tests en la instalación personal. Los contenedores QA y sus datos se conservan fuera del repositorio para reproducir evidencia.

Los ensayos con escritura apuntan exclusivamente a la copia QA en un contenedor/puerto/almacenamiento separado del original; SMTP se sustituye en las pruebas de avisos. No se envió correo real durante esta revisión ni se copiaron secretos Gmail a QA. Vite conserva el aviso conocido de bundle superior a 500 kB; el build no lo considera un fallo. No se acredita capacidad de producción, dinero real, identidad real ni aprobación legal por estas comprobaciones.


## Seguimiento del mismo día · cierre de diferencias S3-12/13/14

El diagnóstico anterior conserva lo que se recibió y los faltantes entonces. El incremento posterior de Ricardo completa sucesoras/retiro ADMIN, rendición mensual y resumen público explícito, e invitaciones ordinarias aceptadas, con pruebas negativas y concurrentes. Consultar la [evidencia de cierre](cierre-s312-314-2026-10-28.md) y ADR-015; no extrapolar este cierre a legal o aceptación global. Sin modificar Trello ni publicar a GitHub.
