# Revisión e integración local de S2-16 de Alison

Alison implementó el catálogo y el detalle públicos conectados a la API. La revisión del 4 de octubre de 2026 encontró una base funcional aprovechable, pero también problemas de arquitectura, permisos, representación de datos y evidencia que impedían aceptar su rama sin ajustes. Su módulo se adaptó localmente sobre `RicardoDev`, conservando los avances de S2-15 y S2-17. La lectura pública integrada quedó verificada técnicamente; el recorrido completo de publicación sigue pendiente.

Este informe sirve a Ricardo, Alison y Santiago para revisar el incremento antes de publicarlo. No constituye aceptación de los líderes, cierre del Sprint 2 ni actualización del tablero de Trello.

## Fuentes y alcance

- Rama consultada: `origin/AlisonDev`, commit `f84f017`, mensaje `S2-16`, obtenido mediante `git fetch origin`.
- Base local conservada: `RicardoDev`, commit `8f34c8003e55aab32cfb67e5d48c16f7e1fd0a7c`. Los cambios de esta integración aún no tienen commit ni se han enviado a GitHub.
- Criterios: S2-16 en [planificacion-sprints.json](planificacion-sprints.json) y alcance de la [tarea oficial del módulo de campañas](requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf).
- Arquitectura: separación de dominio, aplicación e infraestructura, comprobada por `backend/test/architecture.test.ts`.
- Persistencia: esquema provisional V2 y sus permisos vigentes. No se modificó el esquema oficial, la matriz de roles ni las reglas de publicación.

El alcance de Alison continúa siendo **S2-16**, no las tareas trasladadas al inventario futuro del Sprint 3. Las referencias BG identifican historias generales; implementar este incremento no cierra automáticamente todos sus criterios futuros.

## Qué entregó Alison y qué se corrigió

| Aspecto | Situación de la rama revisada | Resultado de la integración local |
| --- | --- | --- |
| Catálogo y detalle | Endpoints anónimos y consumo mediante API; consulta limitada a PUBLISHED | Conservados, sin reemplazar proyectos propios ni cola administrativa |
| Separación de capas | Caso de uso importaba NestJS y el servicio de base; contenía SQL | Puerto de repositorio en aplicación y adaptador TypeORM en infraestructura |
| Permisos de PostgreSQL | La consulta financiera requería lectura de una vista no concedida por la preparación actual | `grant-s2-public.sql` concede SELECT sobre `v_campaign_funding`; lo aplica `prepare-sprint2.mjs` |
| Contrato del cliente | Conversiones y valores por defecto podían ocultar respuestas incompletas | Validación explícita de estado, UUID, modalidad, dinero, moneda, fechas y listas; errores controlados |
| Moneda y fechas | Importes etiquetados como Bs independientemente de su moneda; fecha ausente se representaba como cero días | Moneda real y mensaje de cierre por definir; fechas ausentes no se priorizan como cierre próximo |
| Contenido | Faltaban resultados esperados, unidad de impacto y texto alternativo guardado | Lectura de esos campos; indicadores se presentan como metas, no logros alcanzados |
| Portada y privacidad | Lectura de imágenes públicas, pero URL procedente del contrato | Ruta de descarga construida con UUID; solo imágenes públicas de campaña no eliminadas |
| Navegación y textos | Enlace a actualizaciones sin sección; referencias a muestra y estadísticas fijas | Enlace a recompensas, textos de API real, estadísticas ficticias retiradas y vacíos explicados |
| Pruebas | No incorporó pruebas propias que sustentaran S2-16 | Cinco pruebas frontend, tres backend y una prueba integrada nueva, además de la regresión existente |

La rama de Alison descendía de `main`, no del avance actual de Ricardo. Su commit incluía numerosos cambios de la base anterior. Por ello se incorporó selectivamente su módulo público mediante edición local: **no se hizo un merge completo de la rama ni se sustituyó la configuración actual**. La implementación original de Alison se reconoce como origen del módulo; las correcciones y pruebas enumeradas pertenecen a esta integración.

## Comprobación de los criterios de S2-16

| Criterio | Evidencia y resultado |
| --- | --- |
| Mostrar exclusivamente campañas publicadas | Listado y detalle filtran PUBLISHED y `deleted_at IS NULL`. DRAFT, IN_REVIEW, CHANGES_REQUESTED y APPROVED no aparecen y su detalle devuelve 404 |
| Imagen, nombre, categoría, creador, localidad, meta y avance | Leídos de PostgreSQL; contrato validado y mostrado en tarjeta/detalle. Se verificó también la descarga del archivo público |
| Buscar y filtrar por categoría, ubicación y modalidad | Filtros combinados por intersección sobre la respuesta pública, persistidos en parámetros de URL. Ensayo real: dos publicadas, un resultado tras combinar filtros y cero con búsqueda sin coincidencias |
| Historia, problema, solución, beneficiarios e impacto | Lectura de `campaign_story` e indicadores con meta y unidad. Resultados esperados diferenciados de resultados alcanzados |
| Recompensas | Solo recompensas activas de la campaña; título, descripción, aporte mínimo y moneda. No se implementa su compra ni reserva |
| Recaudación real | Vista oficial `v_campaign_funding`; fixture financiero: 200 confirmados, 50 pendientes y 25 reembolsados producen 175, tanto en listado como detalle |
| Vacío, carga, error y reintento | Catálogo real inicialmente vacío; carga observada al navegar; detalle con error al detener la API y recuperación al reiniciarla y pulsar Reintentar |
| Exclusión de información privada | JSON sin correo, contraseña, dirección privada, referencia privada, payload de pagos ni recompensa retirada. También se excluyen campañas descartadas, sin portada válida o con portada privada/eliminada |
| Evidencia reproducible | Pruebas y comandos detallados abajo. El cierre de publicación real no se sustituye con un fixture SQL |

El catálogo obtiene las campañas publicadas y filtra/pagina en el cliente; no se declara implementada una búsqueda paginada en servidor. Un 404 significa campaña no disponible; un fallo de API no se convierte en lista vacía ni en datos de demostración. Los mocks históricos siguen disponibles para pruebas, pero ya no alimentan la experiencia pública normal.

## Pruebas ejecutadas

| Comprobación local | Resultado del 04/10/2026 |
| --- | --- |
| Frontend: lint, TypeScript, pruebas y build | 106 pruebas aprobadas, cero fallos |
| Backend: lint, TypeScript, pruebas y build | 104 pruebas aprobadas, cero fallos |
| Integración completa con PostgreSQL V2 | 16 pruebas aprobadas, cero fallos |
| Total automatizado | 226 pruebas; no equivale a 226 historias |
| Navegador y API reales | Catálogo, filtros, búsqueda vacía, detalle, ausencia de borrador y recuperación tras reiniciar API comprobados |

La prueba integrada usa cuentas, campañas, archivos y registros financieros ficticios, delimitados por UUID propios, y los elimina al finalizar. No ejecuta pagos externos ni concede roles a integrantes. El ensayo visual utilizó dos campañas publicadas y un borrador creados temporalmente en la base local; sus registros y archivo se retiraron al terminar. No se realizaron acciones en Trello.

El mensaje de migración que indica una línea base incompleta aparece dentro de una prueba negativa deliberada; dicha prueba comprueba el rechazo y termina correctamente. No corresponde a un fallo de instalación de esta copia.

Se recuperó Docker tras el error de sockets temporales de Windows, conservando las carpetas afectadas mediante renombrado recuperable. No se borraron volúmenes ni se restauró la base. La recurrencia de ese problema de Docker Desktop no se considera solucionada definitivamente por esta recuperación.

## Cómo repetir la comprobación

Primero instalar y activar V2 siguiendo el [README principal](../README.md), sin copiar `.env.example` sobre las credenciales generadas. Desde la raíz del repositorio:

```powershell
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
bun run check
```

Desde `backend/`:

```powershell
node scripts/prepare-sprint2.mjs
pnpm run check
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='false'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

Usar Node 24 y pnpm 11.19.0, como exige el repositorio. En esta computadora había otra versión global de pnpm; se ejecutó cada etapa mediante `corepack pnpm run lint`, `corepack pnpm run typecheck`, `corepack pnpm run test` y `corepack pnpm run build`. Invocar `corepack pnpm run check` no bastaba porque sus subcomandos encontraban la versión global diferente. No se cambió el manifiesto para ocultar esa diferencia.

Para el ensayo manual, arrancar el backend en 3000 y Vite en 5173. Abrir `/explorar`, entrar a Búsqueda y filtros, combinar criterios y abrir una tarjeta. Comprobar las secciones Historia, Impacto, Creador y Recompensas. Los endpoints públicos son `GET /api/campaigns/public` y `GET /api/campaigns/public/:slug`.

Una base sin campañas publicadas mostrará un catálogo vacío: es correcto. **No publicar campañas mediante SQL para una demostración funcional del equipo.** Los fixtures SQL utilizados por las pruebas aíslan la lectura pública; no reemplazan los futuros endpoints de revisión y publicación.

## Lo que todavía falta del Sprint 2

La parte de lectura de **S2-16 está verificada técnicamente en local**, pero no se declara cerrado el recorrido creador → revisión → publicación → catálogo. El inventario conserva sus estados históricos y este informe representa el corte local actual.

- Santiago: S2-02 planificación, S2-03 presupuesto/riesgos, S2-04 financiamiento, S2-05 recompensas, S2-10 revisión final, S2-11 envío y S2-13 corrección/reenvío. Esta revisión no auditó su rama ni afirma que esas tareas sigan sin trabajo.
- Ricardo: S2-12 decisiones administrativas, S2-14 estados/publicación y S2-21 ensayo/documentación integral. S2-15 y S2-17 mantienen su cierre técnico acotado del 2 de octubre.
- Decisiones del equipo: quién publica, provisión de roles y correspondencia de estados con el esquema. No se concede publicación automática ni se añade REJECTED sin la migración y contrato correspondientes.
- Git: cambios de esta integración solamente en el árbol local de `RicardoDev`; `DEV`, `main`, `AlisonDev` remota y Trello no fueron modificados.

El siguiente paso es recibir/revisar el incremento de Santiago y completar las dependencias de Ricardo, ejecutar el recorrido integral y acordar la publicación mediante el flujo de ramas del equipo. No basta con esperar a Santiago para dar por terminado todo el Sprint 2.
