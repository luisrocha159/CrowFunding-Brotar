# Ricardo · inicio técnico del Sprint 3

Fecha: 19/10/2026. Rama local: `RicardoDev`, actualizada por avance rápido desde `origin/DEV` (`99d70d7`). Este incremento no está publicado ni se han modificado tarjetas de Trello. Las tres tareas siguen **en curso**: este documento distingue una base ejecutable de su cierre global.

Actualización posterior del mismo día: [S3-06, consulta financiera](cierre-s3-06-finanzas-2026-10-19.md), incorpora una décima migración y tiene cierre técnico propio con 351 casos vigentes. Las tablas de resultados de este documento conservan los cortes iniciales de nueve migraciones y 344/345 casos. No sumar ni confundir esos cortes con la evidencia posterior; S3-16/02/18 siguen en curso.

El [avance posterior de auditoría S3-15/16/18](avance-auditoria-s3-15-16-18-2026-10-19.md) incorpora la undécima migración y contrato 0.3. Sus resultados y límites son el corte más reciente; este documento conserva la evidencia del inicio, no las cifras actuales ni el cierre de esas historias.

## 1. S3-16 — permisos por responsabilidad

### Implementado en esta base

La migración `ResponsibilityPermissions1792368000000` instala doce capacidades y sus relaciones con los roles oficiales, sin asignar roles a cuentas. La matriz provisional está en [contratos S3](contratos-sprint-3.md); ADMIN no obtiene automáticamente operaciones de FINANCE ni resolución de SUPPORT. REVIEWER puede leer y decidir revisiones; publicar continúa reservado a ADMIN y a la configuración D05.

`RoleGuard` reutiliza sesión, roles vigentes y permisos persistidos. Un endpoint sin requisitos, o con una lista vacía, deniega. Si exige rol y permiso, ambos se cumplen. Un AUDITOR no escribe aunque acumule otros roles. La API sigue comprobando propiedad de borradores, proyectos, aportes y organizaciones: un permiso de lectura no permite acceder a datos ajenos.

Se aplicaron permisos explícitos a cola/detalle/decisión/publicación de campañas, habilitación provisional de creadores y gestión de catálogos/parámetros. Los parámetros de negocio no acordados siguen rechazándose. La revisión de semejanzas registra la responsabilidad vigente en lugar de atribuir siempre ADMIN a un REVIEWER.

`GET /api/access/permissions` comunica capacidades efectivas y `readOnly`, con `no-store`. Mi cuenta, navegación administrativa y decisiones/publicación usan ese contrato para mostrar accesos acordes; errores de consulta no habilitan escritura. La API no confía en esa presentación y vuelve a autorizar cada petición. Se conserva el acceso básico pendiente y el registro no se convierte en alta de un rol privilegiado.

### Evidencia y pendientes de cierre

Pruebas de la base: nueve perfiles, auditor con ADMIN, expiración de REVIEWER, acceso anónimo, denegación de publicación a no autorizados, permisos vacíos/ausentes/combinados y parsing del contrato de frontend. Ver `backend/test/contribution-policy.test.ts`, `backend/integration/contributions.integration.test.ts`, `tests/access-permissions.test.ts` y regresiones existentes.

**Falta para cerrar S3-16:** confirmar D06 y aplicar esta matriz a todos los endpoints/paneles futuros de KYC, Finanzas, Soporte y auditoría. Los códigos reservados para ellos no equivalen a módulos terminados. La administración completa y la provisión definitiva de todos esos roles no se implementaron en este bloque.

## 2. S3-02 — núcleo de importes y estados

### Implementado en esta base

`ContributionLedger` opera sobre `contribution`, `payment` y `payment_event` oficiales. Separa el estado del aporte del intento de pago, utiliza transacciones y conserva las vistas/FK/triggers originales. El nuevo índice evita reutilizar una misma referencia de cobro dentro de un proveedor; se mantiene el índice oficial de un único intento confirmado por aporte.

Los importes se reciben como cadenas decimales, se convierten a céntimos exactos y respetan `numeric(14,2)`. No se redondean entradas inválidas ni se convierten floats/notación científica. Se verifica moneda, mínimo, modalidad, recompensa y comisión no superior al aporte. No se inventan tipos de cambio ni comisiones comerciales.

Una creación interna genera aporte PENDING e intento INITIATED juntos. La clave UUID v4 se delimita por actor y se guarda con huella de los datos; reintentos iguales devuelven el mismo recurso y una clave reutilizada con otros datos produce conflicto. El bloqueo por campaña coordina disponibilidad y confirmaciones concurrentes, con cupos reservados durante 30 minutos como regla provisional del ensayo. No se duplica la venta del último cupo. Un aporte representa una unidad; no se agregó compra de varias unidades ni reposición automática tras reembolso.

Los eventos internos se identifican por proveedor e identificador, con hash del contenido. Se rechaza cambiar los datos de un evento repetido. Repetir un evento anterior devuelve el estado vigente, no vuelve a PENDING ni duplica recaudación. Estados terminales no se reactivan silenciosamente. La recaudación se consulta en `v_campaign_funding`; los reembolsos completados se descuentan según la vista oficial y las disputas/reembolsos asociados no se eliminan ni se sobrescriben por un aviso antiguo.

Los eventos financieros son de inserción/lectura para `brotar_app`, no edición/borrado. Las referencias o confirmaciones que chocan con restricciones revierten también aporte, estado y evento de esa transacción.

### Límite deliberado de seguridad

No hay proveedor real conectado. El núcleo solo acepta proveedores activos sandbox y rechaza producción. No existe POST público de creación ni de confirmación/webhook. El método interno `applyVerifiedEvent` no autentica firmas por llamarse así: el adaptador futuro debe verificar al proveedor antes de invocarlo. Las pruebas inyectan eventos sintéticos; **no acreditan un cobro externo válido**.

`GET /api/contributions/:id` y `GET /api/contributions` sí están implementados: solo propietario con sesión y permiso, importes como cadenas, fechas ISO/null y sin payloads/referencias privadas. Un UUID ajeno e inexistente comparten 404 en detalle. Una reserva vencida se comunica explícitamente; no se finge que el proveedor haya notificado expiración.

### Evidencia y pendientes de cierre

El ensayo verifica céntimos, estados, transacciones, reintentos simultáneos, un único cupo, eventos repetidos/alterados, moneda/importe/comisión inválidos, referencia duplicada y rollback, fallos/expiración, rechazo de confirmación tardía, consulta propia/ajena y ausencia de confirmación HTTP. Introduce una devolución parcial y una disputa sintéticas para comprobar que la vista neta y sus relaciones se conservan.

**Falta para cerrar S3-02:** integrar S3-01/S2-19 con proveedor autorizado y su verificación de callbacks; decidir verificación aplicable al aportante, duración definitiva de reservas, nuevos intentos sobre el mismo aporte y tratamiento/compensación de cobros tardíos o conflictos. Resolver esos casos antes de habilitar pagos. No se implementaron los procesos completos de devoluciones/disputas: aquí se protege su vinculación, no se ejecutan operaciones financieras externas.

## 3. S3-18 — contratos y persistencia iniciales

### Implementado en esta base

[Contratos 0.2](contratos-sprint-3.md) especifica capacidades, lectura propia paginada de aportes, formatos decimales, enums, errores y separación entre métodos internos y rutas públicas. El frontend valida capacidades y no importa clases del backend. Las escrituras públicas y los listados de otros módulos no se presentan como terminados.

Dos migraciones nuevas elevan el total de siete a nueve, sin tocar `official-schema.sql`, crear tablas oficiales nuevas ni activar sincronización del ORM. La API comprueba los objetos del incremento para readiness. Una referencia de cobro repetida previa hace fallar el índice: no se borra dinero/datos para instalar.

`drill:recovery` conserva el control de migraciones y ahora compara también conteos de aportes, pagos, eventos, devoluciones, disputas y relaciones de permisos. La integración nueva lo ejecuta con datos financieros ficticios presentes; crea una base de recuperación separada y conserva el dump fuera del repositorio. No se usa una base real del usuario para las pruebas con escritura.

### Pendientes de cierre

S3-18 depende de todos los módulos de Alison, Santiago y Ricardo. Falta integrar contratos finales de checkout/pagos, captura/revisión KYC/KYB, operaciones financieras, seguimiento, rendición, incidencias y paneles; acordar listados/paginación, autorización de documentos privados por caso, retención y proveedor operativo. Un compilado verde o estos contratos iniciales no sustituyen esa integración.

## 4. Instalación, comandos y pruebas

La [sección 24 del README](../README.md) indica respaldo previo, actualización sin restaurar SQL y nueve migraciones. La instalación desde cero conserva el orden de la sección 3. Los `.env`, cuentas, contraseñas y volúmenes de otro integrante no se comparten.

Se usó una copia nueva de archivos no ignorados, sin configuración privada ni dependencias, en `brotar-s3-ricardo-20261019`, proyecto Docker del mismo nombre y puerto `15443`. Es un ensayo local del incremento sin publicar, no un clon remoto de código ya entregado. La instalación normal sigue en `15433/3000/5173`.

Comprobaciones de código, desde raíz y backend respectivamente:

```powershell
bun run check
cd backend
corepack pnpm run check
```

Con compilación, permisos y nueve migraciones aplicados, desde backend de una **copia aislada local**, pruebas con escritura:

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='true'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
```

El bloque reinicia el contenedor de esa copia durante la prueba de persistencia; detener otras API que la estén utilizando. Los fixtures se limpian por sus propios IDs; no se borran volúmenes ni datos previos. No ejecutar sobre producción. Para ejecutar solo la integración del nuevo bloque, sustituir el glob por `dist-test/integration/contributions.integration.test.js`; no cuenta como regresión completa.

### Registro de verificación

| Comprobación ejecutada | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` y `corepack pnpm install --frozen-lockfile` en la copia nueva | Correctas; sin cambiar lockfiles |
| `bun run check`, en trabajo y copia nueva | Lint, tipos, 163 pruebas y compilación aprobados |
| `corepack pnpm run check`, en trabajo y copia nueva | Lint, tipos, 151 pruebas, 8 ADMIN local y compilación aprobados |
| Suite completa PostgreSQL/HTTP, con `DB_TEST_RESTART=true` | 22/22 aprobadas, sin omitidas; incluye regresiones S1/S2 y el nuevo bloque |
| Repetición dirigida tras limitar los eventos financieros a inserción/lectura | 4/4: tres casos de migraciones y el bloque S3; instalación oficial desechable verifica INSERT permitido y UPDATE/DELETE denegados sobre `payment_event` |
| Instalación V2 nueva → migraciones → permisos → verificación → activación | Nueve migraciones, `pending:false`, sin restauración sobre datos existentes |
| Recuperación con datos financieros ficticios presentes | Dump fuera de Git, restauración aislada, historial y conteos conservados; comprobadas una devolución y una disputa |
| Comandos de respaldo previo del README | Ejecutados sobre QA; archivo no vacío conservado fuera del repositorio |
| Arranque `corepack pnpm run dev` y Vite | API viva/readiness 200; frontend y proxy de readiness 200; `/access/permissions` sin sesión devuelve 401 |
| Objetos nuevos ausentes, simulado renombrando y recuperando el índice únicamente en QA | Readiness 503 durante la ausencia y 200 al reponer el nombre; no se eliminó la restricción ni los datos |
| POST de creación/confirmación no implementados | HTTP 404, tanto en pruebas autorizadas como en el arranque de comprobación |
| Integridad de archivos y SQL | 336 archivos de código/configuración/pruebas comparados por hash con QA, sin diferencias; SQL oficial conserva SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88` |

Total: **344 casos automatizados distintos**, 163 frontend + 151 backend + 8 ADMIN local + 22 PostgreSQL. Los cuatro casos repetidos y los probes HTTP no se suman otra vez. El ensayo completo falló inicialmente en la frase de rechazo de `down` y en el reloj de un fixture de sesiones; se corrigieron y se repitió completo: 22/22. No se ocultaron ni omitieron esos casos.

El inventario oficial permanece en 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 FK; `citext` y `pg_trgm` presentes. Esa comprobación no sustituye una comparación exhaustiva de todas las definiciones. Se limpiaron únicamente fixtures propios; la base original del equipo no recibió estas migraciones ni datos de ensayo.

Los puertos API/frontend de QA fueron `3019/5192`, no una nueva configuración obligatoria para otros equipos. Al terminar se detuvieron exclusivamente esos procesos y el contenedor de ensayo, conservando volumen y respaldos. No se realizó una nueva inspección interactiva completa de todas las pantallas; HTTP 200, pruebas de componentes y compilación no equivalen a esa inspección. Permanece el aviso de Vite por un paquete JavaScript de 528.35 kB antes de gzip (156.78 kB comprimido); no bloquea el arranque ni se ocultó elevando el umbral.

Estos resultados no declaran terminado el Sprint 3 ni acreditan cobros, autenticidad de un proveedor externo, ausencia universal de defectos o aceptación del cliente/docente.

### Incidencias encontradas durante la preparación

- Docker Desktop no iniciaba por el socket temporal `sailor-ingest.sock` inaccesible. Se conservaron por renombrado los directorios de sockets y se reinició el motor; no se borraron volúmenes ni se usó Factory Reset. Sigue siendo una incidencia local de Windows, no un paso que deban repetir otros equipos.
- La prueba real encontró un parámetro SQL inferido simultáneamente como texto y enum; las escrituras especifican ahora `payment_status`/`contribution_status` explícitamente. No se quitó la restricción de la base.
- Dos fixtures de autorización simulaban ADMIN sin permisos; se actualizaron a la política explícita manteniendo los casos de denegación. Un test frontend utilizaba por error tipos de `bun:test`; se mantuvo la convención `node:test` ya usada en el proyecto, sin añadir dependencias.
- El ensayo de sesiones asignaba `used_at` desde el reloj Windows y podía anteceder en milisegundos al `created_at` de PostgreSQL. El fixture usa ahora `clock_timestamp()`, igual que la revocación real. No se relajó el CHECK ni se cambió el flujo de autenticación.
- El test de reversión exigía un mensaje común que la migración nueva expresaba con otra frase; se unificó el mensaje y se conservó el rechazo de `down`. No se agregó una reversión destructiva para hacerlo pasar.

## 5. Diseño y decisiones

KISS/YAGNI: se reutilizan roles, guard, PostgreSQL, tablas/vistas oficiales y gestores existentes. No se instala SDK de proveedor no elegido ni se publica un webhook ficticio. El bloqueo por campaña es una simplificación explícita: serializa operaciones de una campaña; si el volumen medido lo exige, se revisa la granularidad sin quitar la integridad transaccional.

SRP/DRY: política de importes/estados pura en `contributions/domain/payment.ts`; transacciones y adaptación SQL en `contribution-ledger.ts`; autorización común en `RoleGuard`; transporte y parsing de capacidades separados de las vistas. La migración de permisos conserva una instantánea inmutable: cambiar la matriz en el futuro exige otra migración, no editar un historial ya desplegado.

Contratos pequeños y verificables: el módulo de aportes expone crear internamente, aplicar evento interno y consultar propio; conserva bloqueo, reintentos y invariantes dentro del módulo. No se añadieron envoltorios que solo deleguen ni nuevos frameworks. Esta separación no prueba por sí sola todos los principios SOLID ni sustituye una revisión del diseño final.

**Conclusión:** base técnica iniciada y verificable; no hay habilitación de dinero real, aprobación definitiva de D06 ni cierre de estas tres tareas o del MVP completo.

## 6. Segundo bloque local — historial propio para integración

Se añadió `GET /api/contributions`, con sesión y permiso persistido, filtro de propietario invariable y páginas de 1–50 registros (20 por defecto). El cursor es un UUID del propio usuario; un marcador ajeno e inexistente tienen el mismo error. Se rechazan campos/arrays/parámetros adicionales. La consulta SQL parametrizada conserva microsegundos y usa `created_at,id` como orden total: no emplea OFFSET ni fechas redondeadas del navegador. No requiere nuevas dependencias, cuentas, proveedores ni migraciones.

Listado y detalle comparten la proyección privada y el último intento por número. Incluyen `createdAt` ISO y conservan aportes históricos sin pago con `paymentId/paymentStatus=null`; no se ocultan filas ni se inventan estados. El núcleo que crea un intento sigue devolviendo un identificador de pago no nulo; se sustituyó su aserción ciega por una comprobación explícita de recuperación.

Este contrato permite avanzar al historial de Alison sin desarrollar su pantalla ni cerrarle su tarea. La prueba PostgreSQL/HTTP cubre paginación de varias páginas, fechas empatadas con microsegundos, inserción entre páginas, fin de listado, vacío real, selección del último intento, registros sin intento, no-store, proyección exacta sin secretos, cursor ajeno/inexistente, entradas inválidas y revocación del permiso entre lecturas. Se amplió el caso integrado existente; las aserciones nuevas no se cuentan como pruebas independientes.

La primera tabla de verificación conserva los resultados del primer bloque. Esta ampliación se comprobó nuevamente:

| Ejecución del segundo bloque | Resultado |
| --- | --- |
| `bun run check` en la copia de trabajo | Lint, tipos, 163 pruebas y compilación aprobados; persiste el aviso de bundle de 528.35 kB |
| `corepack pnpm run check` en backend de trabajo | Lint, tipos, 152 pruebas, 8 ADMIN local y compilación aprobados |
| Compilación de aplicación y tests en QA | Correcta; los cuatro archivos de código/tests modificados coinciden por hash con trabajo |
| Integración dirigida de aportes en QA | 1/1 aprobada, con las nuevas aserciones del historial y recuperación con datos ficticios |
| Suite completa PostgreSQL/HTTP en QA, con `DB_TEST_RESTART=true` | 22/22 aprobadas, sin fallos ni omitidas; incluye recuperación, nueve migraciones y persistencia después de reiniciar PostgreSQL |
| `git diff --check` y hash del SQL oficial | Sin errores de espacio; SHA-256 oficial sin cambios |

Total vigente: **345 casos automatizados distintos** (163 frontend + 152 backend + 8 ADMIN local + 22 PostgreSQL). La ejecución dirigida no se suma otra vez. No se modificaron dependencias ni lockfiles: se reutilizó la copia aislada instalada en el primer bloque, no se declara una nueva instalación desde cero en esta ampliación. Los registros sintéticos se limpiaron por sus propios IDs; se detuvo solo el contenedor de ensayo conservando volumen y respaldos. La base original no recibió escrituras ni migraciones.

Sigue local en RicardoDev, sin push ni cambios en DEV/Trello. Checkout, proveedor verificado y tareas completas S3-16/02/18 permanecen pendientes; las comprobaciones de API no equivalen a una pantalla de historial integrada ni a una prueba con un proveedor real.
