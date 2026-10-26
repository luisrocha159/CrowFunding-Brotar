# S3-23 y S3-08 · ciclo y desembolsos DEMO

Fecha de cierre de comprobaciones: 24/10/2026. Rama RicardoDev; sin commit/push. Responsable: Ricardo. Fuente funcional: petición explícita de implementar ciclo y después desembolsos, ADR-012/013 y criterios BG-32/BG-47 del plan local. No implica aceptación externa, autorización legal o bancaria.

## Resultado implementado

| Bloque | Implementación |
| --- | --- |
| Ciclo | Estados oficiales `PUBLISHED → FUNDING_ENDED → IN_EXECUTION → CLOSED`, más solicitud/decisión de cancelación. Resultado y versión persistidos en extensión; historial con responsable, motivo y fecha. |
| Modelo/fecha | Todo-o-nada, flexible y ausencia de fondos; no cerrar anticipadamente por meta. No admitir nuevas reservas después de fecha/estado no elegibles o durante solicitud de cancelación. |
| Publicación | KYC DEMO/política/documentos vigentes, KYB y representante aplicables. ADMIN independiente; modo DEMO explícito, no publicación real. Mantiene revisión de contenido de Sprint 2. |
| Destino | Referencia y titular obligatoriamente ficticios, sin números de cuenta. Propiedad/representación/moneda comprobadas, FINANCE revisa con motivo, versión y sin autoaprobación. Cambiarlo invalida aprobación; no reescribe historia. |
| Desembolso | Solicitud propia, autorización, procesamiento y resultado separados. Bruto/costos/neto exactos; costos DEMO cero. Reserva y descuentos de otros compromisos; resultado con referencia única. |
| Cierre | Comprueba obligaciones, reservas, remanentes, avance, recompensas y contrato de rendición final aprobada. Falta de otro módulo bloquea la transición, no se sustituye por cifras o aprobaciones ficticias. |

### Reglas de cierre elegidas para este MVP

La rendición final de una campaña ejecutada debe cuadrar el acumulado de desembolsos completados, gastos respaldados y saldo cero. Un remanente todavía en manos del beneficiario no se considera gasto ni se devuelve mediante `refund` del pago original: debe resolverse en el módulo de rendición antes de cerrar. No se agrega aquí una captura de rendiciones ni devolución desde cuenta bancaria real. Una aprobación sin evidencias privadas o con revisor interesado no habilita cierre. Se conserva el contrato de estados oficial (`APPROVED`/`PUBLISHED` para rendición aprobada); no se introducen enums incompatibles por copiar literalmente términos de planificación.

Cancelar después de liberar fondos crea un caso `PROJECT_NOT_EXECUTED`, prioridad 1, del solicitante. Repetir evaluación no crea otro caso. No se cambia a CANCELLED ni se ejecuta devolución inexistente. La solicitud conserva bloqueo hasta decisión; la atención general del caso necesita el módulo de soporte correspondiente, no solo el flujo de disputa sobre un pago. Un caso abierto impide cierre aunque se rechace la cancelación.

Fin de recaudación persiste una instantánea neta de pagos DEMO confirmados menos devoluciones completadas. Antes de ejecución/desembolso se revalida también el importe actual, no solo la etiqueta histórica. Para todo-o-nada fallido o cancelación sin desembolsos se persiste `REFUND_REQUIRED`, pero la solicitud/autoridad/resultados reales de ensayo se ejecutan por S3-09; fijar resultado no devuelve ni libera dinero por sí mismo. El cierre de campañas sin fondos no exige inventar una rendición de gastos inexistentes.

## Contratos HTTP

Todas las mutaciones requieren cookie de sesión, origen/cabecera `X-Brotar-Request:1`, confirmación `demoConsent:true`, `requestKey` UUID v4 y motivo de 20–500 caracteres sin controles invisibles. DTO rechaza propiedades no declaradas. El actor viene de la sesión; nunca del JSON. Lecturas privadas usan `private, no-store` y filtros/páginas acotados.

| Ruta (prefijo `/api`) | Uso |
| --- | --- |
| `GET me/campaign-cycle[/:id]?page=1` | Campañas propias/representadas; detalle con fondos, bloqueos e historial de 20 eventos por página. |
| `GET admin/campaign-cycle[/:id]?page=1` | Consulta ADMIN/REVIEWER/FINANCE/AUDITOR. |
| `POST {me|admin}/campaign-cycle/:id/actions` | `{action,expectedVersion,reason,requestKey,demoConsent}`. Creador solo REQUEST_CANCEL; ADMIN decide resto. |
| `GET me/disbursements/campaigns/:id/destination` | Destino propio vigente e historial reciente, explícitamente limitado a 20 eventos. |
| `PUT me/disbursements/campaigns/:id/destination` | `{reference,holder,expectedVersion,reason,requestKey,demoConsent}`; versión inicial 0. |
| `GET admin/finance/disbursements/campaigns/:id/destination` | Revisión financiera del destino de campaña seleccionada. |
| `POST admin/finance/disbursements/campaigns/:id/destination/review` | `{decision,expectedVersion,reason,requestKey,demoConsent}`; VERIFIED/REJECTED/DISABLED según estado. Solo FINANCE. |
| `POST me/disbursements/campaigns/:id` | `{amount,payoutAccountId,destinationVersion,scheduledFor:null|YYYY-MM-DD,reason,requestKey,demoConsent}`. |
| `GET {me|admin/finance}/disbursements[/:id]` | Listado de 20 por página, `page`, `status`, `campaignId` opcionales; detalle con costos, actores, instantánea del destino e historial. |
| `POST admin/finance/disbursements/:id/actions` | `{action,expectedVersion,reason,requestKey,demoConsent}`. AUTHORIZE/REJECT/PROCESS_DEMO/COMPLETE_DEMO/FAIL_DEMO según estado. |

Importes como cadenas decimales positivas con punto y hasta dos decimales; solicitudes numeric(14,2), acumulados numeric(16,2), cálculos BigInt/SQL exactos. No floats, redondeo silencioso, moneda enviada por navegador ni mezcla de monedas. Estado terminal no se reabre; nueva solicitud tras fallo usa nueva clave. Repetir una clave devuelve la operación existente; cambiar su contenido da 409. La clave pertenece a una intención, no a cada clic.

PENDING reserva; APPROVED autoriza sin salida; PROCESSING registra intento sintético; COMPLETED fija fecha, ejecutor y `DEMO-DISBURSEMENT:<UUID>`; FAILED libera compromiso sin inventar egreso. Se registran cero comisiones porque ese es el acuerdo del ensayo, no una tarifa real. La fecha opcional se valida en Bolivia, y cada intento de procesar/completar contrasta la fecha vigente en servidor.

## Seguridad y persistencia

- Tablas de negocio oficiales reutilizadas (`campaign`, `payout_account`, `disbursement`, `status_history`); metadatos/eventos nuevos en `brotar_extension`. Se mantienen las 59 tablas oficiales.
- Migraciones 25/26 explícitas en `MIGRATIONS`. Los tres permisos nuevos usan recursos distintos porque el esquema oficial exige unicidad recurso/acción. No hay roles nuevos ni permisos bancarios.
- ADMIN no equivale a FINANCE; AUDITOR impone lectura incluso combinado con ADMIN/FINANCE. Revisores/operadores no pueden ser solicitantes ni miembros vigentes del beneficiario. Las bajas futuras siguen siendo pertenencias actuales. Un antiguo creador institucional sin representación vigente no administra el destino/ciclo por conservar autoría histórica.
- Se bloquea campaña antes de fondos/destino/operación. El simulador local reutiliza su cerrojo transaccional existente; no se agrega infraestructura de colas. Tras esperas se revalidan permisos/cuenta. La política histórica aprobada no pierde su autor por revocar después el rol del revisor, pero sí deben seguir vigentes el expediente y la política/documentos.
- Auditoría, estado, evento, versión y operación se confirman en la misma transacción. El rol de API no modifica/elimina eventos ni cambia el importe original de un desembolso. No constituye archivo criptográficamente inmutable frente al administrador de PostgreSQL.
- Backups/recuperación incluyen ciclo, destinos, desembolsos y eventos. No hay purgas, cron de cierre ni movimientos automáticos al arrancar.

## Verificación reproducible y límites de integración

Frontend: `bun run check` desde raíz. Backend: `corepack pnpm run check` desde `backend/`. PostgreSQL/HTTP: solo en copia aislada con `.env` propio, bandera `ALLOW_DB_TEST_WRITES=true`, compilación `corepack pnpm exec tsc -p tsconfig.test.json`, y `node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js`. Para probar reinicio añadir `DB_TEST_RESTART=true` exclusivamente en QA y retirarlo después. Nunca ejecutar fixtures/limpiezas sobre la base de presentación.

Pruebas nuevas: `backend/test/campaign-cycle.test.ts`, `backend/test/disbursements.test.ts`, `backend/integration/campaign-cycle-disbursements.integration.test.ts`, `tests/campaign-cycle.test.tsx`, `tests/disbursements.test.tsx`. Incluyen campos/fechas/importes inválidos, blancos/controles, CSRF/roles/propiedad, KYC vencido, meta/modelo, expiración, repetición simultánea, versión obsoleta, saldo reservado, destino cambiado, costos rechazados, solicitud/aprobador separados, fallo/fecha futura, devolución por meta/cancelación y cierre, auditoría y privilegios nativos. La instalación limpia comprueba los tres permisos nuevos y no omite silenciosamente operaciones por colisiones del catálogo.

La prueba del contrato final aprobado utiliza **fixtures sintéticas de rendición y resolución de caso general**, identificadas como tales en el test. No se presenta esa inserción de QA como implementación de S3-13 ni de atención general. El flujo propio de aportes, pagos, KYC, destinos, desembolsos y devoluciones usa HTTP real; no se sustituye por estado de memoria. Resultado de regresión y comprobación visual se registra al terminar esta verificación.

### Resultados registrados

| Verificación | Resultado |
| --- | --- |
| Frontend `bun run check` | 215/215 pruebas, lint/tipos/build aprobados. Advertencia de bundle >500 kB no bloqueante; no se oculta ni se presenta como garantía de rendimiento. |
| Backend `corepack pnpm run check` | 203/203 pruebas de backend y 8/8 ADMIN local, más lint/tipos/build. |
| Regresión PostgreSQL/HTTP completa | 36/36, sin omitidas; incluye reinicio del contenedor QA, recuperación y migración limpia desde SQL oficial. |
| Repetición tras ajustes de identidad/consulta pública | 4/4: ciclo/desembolsos, duplicidad, constructor/revisión/publicación y consulta pública. |
| Refuerzo institucional final | 1/1 repetida con persona y organización: KYB/representación, miembro con baja futura, moneda incompatible, origen ajeno, solicitud/ejecución institucional. No se suma otra vez al total de 36. |
| Instalación/actualización | 26 migraciones aplicadas, `up` repetido sin cambios, preparación S2 repetida sin pérdida de categorías/configuración. |
| Inventario oficial | 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 FK; rol de aplicación limitado. |
| Fuente ensayada | 537 archivos de código/pruebas/scripts originales y QA iguales, normalizando únicamente CRLF. |
| Navegador con API/BD reales | ADMIN termina recaudación e inicia ejecución; CREATOR configura destino/solicita; FINANCE revisa y autoriza/procesa/completa. Se comprobaron importe cero rechazado, reconfirmación tras cambiar datos, referencia persistida, historial y ausencia de mutaciones terminales. |
| Adaptación/errores JS | Capturas de escritorio y 375×812 revisadas; sin desbordamiento horizontal ni errores JS observados en ese recorrido. |

Total: **462 casos distintos aprobados** (215+203+8+36); las repeticiones y el recorrido visual no se cuentan como casos nuevos. La suite completa corresponde al corte previo al último refuerzo de permisos institucionales; las rutas afectadas se volvieron a probar con la fuente final, incluyendo la ejecución institucional. No implica ausencia absoluta de bugs ni certifica todo el MVP.

Entorno de escritura: `C:/Users/rnune/AppData/Local/Temp/brotar-s3-ricardo-20261019`, PostgreSQL QA 15443, API temporal 3019, Vite temporal 5198. Las sesiones de navegador utilizaron `localhost`, separadas de la sesión del usuario en `127.0.0.1:5193`. Las cuentas, documentos vinculados y campaña de la prueba visual se retiraron al terminar; son recreables desde su fixture temporal. Credenciales efímeras eliminadas, evidencias sin contraseñas en `tmp/cycle-ui-evidence` de QA. No se migró la base original ni se copió su `.env`.

El primer ensayo detectó una colisión recurso/acción en permisos; se corrigió la migración y su prueba de instalación limpia. El ensayo institucional detectó que `FOR SHARE` sobre miembros exigía un permiso UPDATE no concedido; se usa el bloqueo del padre `organization` como el protocolo existente de verificación, **sin ampliar privilegios de miembros**. Las futuras mutaciones de S3-14 deben tomar ese mismo bloqueo de organización antes de modificar representación. Una fixture de moneda se corrigió para no suponer que existe USD: usa otra moneda del catálogo o crea/retira exclusivamente XTS sintética durante QA. No se altera el catálogo inicial BOB del producto para hacer pasar una prueba.

Al reanudar el 24/10 Docker Desktop encontró sockets de ejecución inaccesibles. Se conservaron sus directorios runtime vacíos mediante renombrado recuperable y se arrancó solo el contenedor QA; no hubo restablecimiento de fábrica ni eliminación de volúmenes. Es una incidencia local de Docker, no una migración adicional ni instrucción para limpiar datos de otros equipos.

## Estado de otras tareas

**Actualización posterior del 24/10:** [cierre mínimo S3-23](cierre-s3-23-2026-10-24.md), README §33 y 27 migraciones sustituyen el bloqueo descrito abajo solo para la rendición final/cumplimiento/resolución indispensables. Las fixtures antiguas de aprobación/resolución se retiraron del ensayo del ciclo y se reemplazaron por HTTP real. Este documento conserva la evidencia del corte previo de 26 migraciones; los módulos generales de compañeros no se dan por terminados.

S3-08 implementa su alcance financiero DEMO. S3-23 implementa el motor y las transiciones protegidas; el cierre operativo integral de una campaña con ejecución sigue condicionado a rendición/cumplimiento/soporte general de compañeros. No se cierra una tarjeta global solo porque el contrato se pueda probar con una fixture.

S3-15/16/18 reciben instrumentación, permisos/contratos y migraciones de este incremento. **No quedan automáticamente al 100% del MVP:** faltan los eventos, permisos y contratos de S3-12/13/14 y atención general, además de sus pruebas integradas. S3-19/21 necesitan esos módulos para verificación completa. S3-20 sigue sin publicación por orden del usuario. S1-12/S3-26 correo y S1-11 legal siguen pendientes. Este documento no modifica Trello ni responsables.
