# Avance de Ricardo en Sprint 2

Registro para el equipo y la revisión técnica del avance de Ricardo al 1 de octubre de 2026, basado en DEV y entregado en la rama personal **RicardoDev**. Se implementaron la gestión de proyectos propios y la base de consulta administrativa. Docker se recuperó y pasaron las pruebas con PostgreSQL. No se completó el Sprint 2: las decisiones sobre campañas y su publicación siguen pendientes. Subir código a la rama personal no publica una campaña ni reemplaza la aceptación de los líderes.

## Estado de las cinco tareas

| Tarea | Avance implementado | Estado de revisión | Pendiente para cerrar |
| --- | --- | --- | --- |
| S2-15 Gestionar proyectos propios y descartar borradores | Lista, detalle, vínculo al borrador concreto, acciones por estado, confirmación y descarte lógico con control de propiedad y registro del actor; probado con PostgreSQL | En revisión técnica parcial | Integrar reglas de corrección cuando S2-11 y S2-14 estén listas y demostrar continuidad con el constructor completo |
| S2-17 Preparar acceso y cola administrativa | Navegación según roles vigentes, cola de `IN_REVIEW`, búsqueda local y detalle preparatorio; cola/autorización probadas en PostgreSQL con fixtures | En revisión técnica parcial | Probar campañas enviadas por el flujo real S2-11 y unir el detalle completo de S2-12 |
| S2-12 Decidir sobre campañas recibidas | Función de dominio para validar las tres decisiones y exigir motivos en rechazo/cambios; pruebas aisladas | En curso | API de decisiones, transacción, información completa de campaña, actor y observaciones persistidas; no hay botones que finjan estas operaciones |
| S2-14 Publicar y controlar estados | Contrato de seis estados y función que diferencia aprobación de publicación | En curso | Migración para `REJECTED`, transiciones persistidas, integración del filtrado público y definición del actor que publica |
| S2-21 Verificar y documentar el segundo incremento | Pruebas de cliente, aplicación, SQL simulado, autorización HTTP, ensayo visual y 15 pruebas de integración reales; README actualizado | En curso | Recorrido completo de las otras doce tareas y aceptación del equipo |

Las columnas de Trello representan el avance de las tareas, no una certificación automática. No se marca ninguna de estas cinco como terminada ni se dan por completas BG-13, BG-14, BG-32, BG-41 o BG-42. Se mantienen responsables, esfuerzos y criterios originales.

## Contraste con el Figma final

La fuente visual es el archivo final de coordinación [CrownFundingV3](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3). Se revisaron el contexto de diseño y las capturas de las tres pantallas correspondientes al trabajo de Ricardo. No se afirma haber auditado todas las pantallas del archivo ni haber implementado los módulos de otros integrantes.

| Pantalla del Figma | Aplicación en este avance | Diferencia deliberada y alcance pendiente |
| --- | --- | --- |
| [Mis proyectos con proyectos, nodo 1:2402](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=1-2402) | Filas blancas, icono de proyecto exportado del diseño, títulos, estados, categoría, meta y acciones | Se conserva el encabezado existente. No se inventan importes recaudados ni estadísticas. Una aprobada se rotula como aún no publicada. Solo DRAFT ofrece continuar/descartar |
| [Revisión de campañas, nodo 1:11195](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=1-11195) | Sidebar, título, tabla con campaña/creador/fecha/meta/estado y acceso al detalle | Se usa la moneda real, no un USD fijo. Se omiten accesos ficticios a finanzas, conciliación, desembolsos y KYC. Búsqueda por campaña o creador |
| [Detalle administrativo, nodo 1:11585](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=1-11585) | Secciones para datos generales, historia e historial | Vista preparatoria: faltan plan, presupuesto, financiamiento, recompensas y decisiones. No se reproduce el recorte de títulos del diseño ni una insignia de verificación inexistente |

Se mantuvieron React, TypeScript, CSS Modules y los tokens existentes de Brotar; no se instaló Tailwind. El recurso `src/assets/figma/project-tree.svg` proviene de la exportación del nodo de proyectos. La línea visual no sustituye los requisitos funcionales de la [tarea oficial de campañas](requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf).

## Implementación y contratos de lectura

El nuevo módulo reutiliza sesiones, `RoleGuard`, TypeORM y el transporte HTTP existentes. Dominio y aplicación permanecen independientes de NestJS y del ORM. Las consultas SQL usan parámetros, no interpolan los identificadores enviados por el cliente.

| Operación | Ruta | Autorización y resultado |
| --- | --- | --- |
| Lista propia | `GET /api/campaigns/mine` | Rol CREATOR vigente; filtra propietario y registros no descartados |
| Detalle propio | `GET /api/campaigns/mine/:id` | CREATOR, UUID válido y propiedad; un proyecto ajeno/no disponible devuelve 404 |
| Descartar borrador | `POST /api/campaigns/mine/:id/discard` | CREATOR, protección de origen/cabecera y cuerpo `{ "confirmed": true }`; 204 solo al confirmar la transacción |
| Cola administrativa | `GET /api/admin/campaigns/review` | ADMIN vigente; solo campañas no descartadas en IN_REVIEW |
| Detalle administrativo | `GET /api/admin/campaigns/review/:id` | ADMIN; solo una campaña aún disponible en revisión |

No hay un endpoint nuevo para asignarse CREATOR/ADMIN. D06 sigue pendiente de coordinación. Los permisos técnicos de `brotar_app` no son los roles funcionales de personas. El registro básico y el constructor del Sprint 1 conservan su comportamiento; la nueva gestión de campañas exige CREATOR.

La aprobación no es publicación. El contrato preparatorio `reviewTarget` valida que la campaña esté en revisión y requiere un comentario no vacío para rechazar o solicitar cambios. El límite técnico de comentario es 5000 caracteres. Estas funciones todavía no ejecutan decisiones ni filtran el catálogo público real: falta integrarlas en los módulos correspondientes.

## Descarte y protección de datos

El backend vuelve a comprobar propiedad, estado DRAFT y `deleted_at IS NULL` bajo `SELECT ... FOR UPDATE`. Esto evita descartar un borrador que cambió de estado entre la consulta y la confirmación. Actualiza `deleted_at` y registra `DISCARD_DRAFT` con el usuario autenticado dentro de una misma transacción.

El descarte no hace `DELETE` físico ni elimina archivos, relaciones o datos de historia. El registro de auditoría conserva DRAFT como estado y declara la acción mediante metadatos; no inventa un estado financiero o de cancelación. Un segundo intento sobre un borrador descartado devuelve 404, no un éxito ficticio. No se implementa todavía una función de restauración desde la interfaz.

Los cambios de interfaz incluyen carga, error, acceso denegado, lista vacía, búsqueda sin coincidencias y confirmación. El diálogo usa el comportamiento modal nativo, enfoca inicialmente “Conservar borrador” y evita solicitudes duplicadas mientras guarda. Ante una respuesta incierta pide actualizar la lista, sin anunciar que el descarte ocurrió.

## Preparación del entorno local

Primero seguir la instalación V2 del [README principal](../README.md). Docker aloja solo PostgreSQL; el frontend y la API siguen corriendo fuera del contenedor. Con V2 instalada y el motor disponible, desde la raíz:

```powershell
cd backend
pnpm install --frozen-lockfile
node scripts/prepare-sprint2.mjs
pnpm run check
pnpm run dev
```

`prepare-sprint2.mjs` aplica exclusivamente los permisos de `infra/postgres-v2/grant-s2-projects.sql` usando la configuración local V2. No restaura la base, no borra datos, no modifica contraseñas, no otorga roles de personas y no migra estados. Si falla, no ignorar el error: revisar Docker y la configuración generada. No copiar `.env.example` sobre el `.env` vigente.

La base oficial tiene `REJECTED` en `review_decision`, pero no en `campaign_status`. No se modifica el SQL oficial ni se mapea un rechazo a CANCELLED para ocultar esta diferencia. S2-14 necesita una migración explícita y una verificación con PostgreSQL antes de habilitar esa transición. D05 debe confirmar quién ejecuta la publicación; D06 debe definir la provisión de responsabilidades.

## Pruebas y límites de la evidencia

En este corte pasaron **100 pruebas del frontend y 101 del backend**, además de lint, comprobación de tipos y compilación. Las ocho pruebas nuevas de backend usan repositorios o SQL simulados y un servidor HTTP local con el guard real; no son ocho pruebas contra PostgreSQL. Las cinco nuevas del frontend comprueban contratos, estados, datos inválidos, acciones y continuación segura.

Archivos de evidencia:

- `tests/project-management.test.ts`: cliente, cookies, cabecera de mutación, confirmación, errores, formato de respuestas, enlaces y acciones según estado.
- `backend/test/projects.test.ts`: propiedad, confirmación, restricciones del descarte, bloqueo SQL y contrato preparatorio de decisiones/visibilidad.
- `backend/test/projects-http.test.ts`: sesión, rol, UUID, datos extra, confirmación y origen de la solicitud a través de HTTP.
- `backend/integration/projects.integration.test.ts`: ejecutada correctamente con PostgreSQL V2. Crea cuentas efímeras, usa roles de fixture y limpia únicamente sus datos. Comprueba listas propias/ajenas, lecturas del borrador concreto, descarte, auditoría, bloqueo por estado y cola/detalle administrativos.

En el primer intento el motor Docker no respondió y se detuvo únicamente la consulta que excedió su límite. El diagnóstico posterior encontró sockets temporales inaccesibles en `docker-secrets-engine/engine.sock` y `Docker/run/sailor-ingest.sock`; Docker fallaba antes de arrancar PostgreSQL. Se detuvieron exclusivamente sus procesos, se conservaron las carpetas temporales verificadas mediante renombrado con sufijo `.stale-20261001-s2` y se dejaron regenerar. No se borraron volúmenes, bases ni distribuciones WSL. La corrección recupera este arranque, pero no elimina de forma demostrada el origen de la recurrencia de sockets de Windows.

**Resultado posterior a la recuperación:** Docker Engine 29.7.2 responde; PostgreSQL V2 está saludable en `127.0.0.1:15433`. La verificación de inventario y permisos limitados pasó. Pasaron las **15 pruebas de integración PostgreSQL**, incluida la nueva de proyectos, además de las 201 pruebas locales. El test de migración sobre una base incompleta muestra intencionalmente un mensaje de rechazo: esa comprobación pasó y no es un fallo de la instalación V2. El ensayo completo utilizó `DB_TEST_RESTART=false`; adicionalmente se reinició exclusivamente el contenedor PostgreSQL V2 y se comprobaron iguales los recuentos de usuarios y campañas antes/después, con su volumen conservado.

Para ejecutarla una vez preparado el entorno, desde `backend/`:

```powershell
pnpm run check
$env:ALLOW_DB_TEST_WRITES='true'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test dist-test/integration/projects.integration.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
}
```

La prueba rechaza producción y exige el puerto/contenedor de esta copia V2. Los roles concedidos a sus cuentas temporales sirven exclusivamente para comprobar autorización; no resuelven la provisión de roles para el equipo.

## Ensayo visual reproducible

Con `bun run dev` activo, abrir `http://127.0.0.1:5173/tests/visual-projects.html`. Es un ensayo independiente con datos ficticios: no escribe en PostgreSQL, no se importa desde la aplicación y no se empaqueta en `dist`. No presentarlo como persistencia real.

Se contrastaron visualmente las filas y la cola en escritorio, el diálogo de confirmación y su mensaje de éxito simulado, el detalle, la búsqueda, los estados vacío/error/denegado y la adaptación a 390 píxeles de ancho. En móvil la tabla conserva desplazamiento horizontal dentro de su contenedor, sin forzar el ancho de toda la página.

El escenario `?view=admin` abre la revisión. Los botones `normal`, `empty`, `error` y `forbidden` cambian el escenario. Las rutas reales para usuarios con roles autorizados son `/mis-proyectos`, `/mis-proyectos/:id`, `/administracion/campanas` y `/administracion/campanas/:id`.

## Siguiente integración

PostgreSQL, permisos nuevos y prueba preparada ya están verificados. El orden pendiente es integrar el envío de Santiago, completar el detalle administrativo y sus decisiones, resolver la migración de estados y la publicación, y finalmente ensayar el recorrido completo con el catálogo público real. No se necesitan pagos, KYC/KYB, correo real ni estadísticas completas para avanzar en este alcance. El trabajo se entrega en RicardoDev; DEV y main no se modifican remotamente en esta entrega.

Este registro no modifica el reparto de las trece tareas del Sprint 2 ni añade tareas del Sprint 3. La revisión técnica local y la aceptación de los líderes son verificaciones diferentes.
