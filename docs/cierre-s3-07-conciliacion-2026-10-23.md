# S3-07 · cierre técnico de conciliación DEMO

Registro de cierre: **23/10/2026**. Implementación y ensayo integrado/visual: **22/10/2026**. Rama local **RicardoDev**, sin commit/push ni cambios en DEV, main o Trello. Responsable: Ricardo. Historia: BG-46. Alcance autorizado: MVP académico con simulador interno, sin banco ni dinero real, según ADR-012.

## Criterios de la historia y evidencia

| Criterio original | Resultado implementado y comprobación |
| --- | --- |
| CA 1. Detectar operaciones faltantes, duplicaciones, diferencias de monto o estado y pendientes. | Comparación de confirmaciones internas y recibos DEMO: MATCHED, MISSING_INTERNAL, MISSING_PROVIDER, AMOUNT_MISMATCH y DUPLICATED. Un aviso confirmado sin confirmación interna no se convierte en ingreso. Consulta adicional de intentos INITIATED/PENDING y avisos RECEIVED/NEEDS_REVIEW, incluso si el intento ya expiró. Filtros UTC/moneda, paginación y vacío real. Integración PostgreSQL verifica todas las clasificaciones y la lista de pendientes. |
| CA 2. Mostrar ambas referencias y registrar resolución, responsable y motivo. | Pantalla `/administracion/conciliacion/:id`: referencia DEMO, referencia del aporte, ID del intento, estado interno vigente, importes del corte, clasificación original y resolución. Motivo de 20–500 caracteres, confirmación explícita, responsable/fecha y auditoría de servidor. Cambiar acción o motivo reinicia la confirmación. El servidor impide compensar el propio aporte. |
| CA 3. No ajustar cifras silenciosamente ni duplicar movimientos al reimportar información. | Totales brutos de la instantánea inalterados; recibos repetidos no duplican ingresos. Clave estable para reintentar el mismo envío de creación. Recontraste solo con evidencia coincidente; compensación exclusivamente DEMO, única y separada para recibos sin ingreso interno. Sin acción «ignorar» ni edición de importes. Cierre revalida cada referencia y se rechaza si hay diferencias abiertas. Cerrar/repetir no duplica movimientos. |

**Estado: cierre técnico local de S3-07 para pagos del MVP DEMO.** No equivale a aceptación del docente/cliente, proveedor bancario integrado ni cierre de todo Sprint 3. La conciliación de confirmaciones no implementa el saldo desembolsable, las devoluciones de aportes confirmados ni la resolución de disputas; esas operaciones conservan sus propias tareas.

## Recorrido de uso

Preparar el entorno con README §3/24 y habilitar el simulador como en §28. Se mantienen **14 migraciones**, sin SQL extra, nueva dependencia ni credencial predeterminada. ADMIN concede FINANCE a otra cuenta por el formulario de responsabilidades existente.

1. Iniciar sesión y abrir **Mi cuenta → Conciliación DEMO**. FINANCE puede operar; ADMIN/AUDITOR solo consultan. Auditor no escribe aunque acumule FINANCE.
2. Elegir período de hasta 31 días inclusive y moneda del catálogo persistido. El filtro consulta pendientes por fecha de creación del intento. La lista muestra fecha, vencimiento, estado, referencia e importe de ensayo, sin exponer correo o documentos.
3. Si hay reservas vencidas, FINANCE puede procesar hasta 100 mediante el mantenimiento confirmado. Abarca todas las fechas y monedas, no solo el filtro. No confirma dinero ni devuelve importes.
4. Crear un lote. Su corte usa fechas de confirmación interna y primera observación del recibo DEMO; para un aviso tardío puede ser un día diferente del de creación del intento. Los pendientes no se suman a confirmaciones.
5. Revisar ambos lados y la diferencia con signo. **−0,30 BOB** se conserva como negativa: se corrigió el formateo compartido que perdía el signo en diferencias menores a una unidad. No se convierten importes a floats.
6. En una diferencia, elegir **Contrastar evidencia actual** o, solo cuando corresponde, **Compensación DEMO sin ingreso interno**. Escribir motivo y confirmar. Un 409 conserva la diferencia: actualizar estado e investigar; no rebajar controles para forzar el cuadre.
7. Revisar la resolución registrada y cerrar el lote cuando todas las referencias coincidan o estén resueltas. El servidor vuelve a comprobar su evidencia. Un lote cerrado queda de consulta; para cambios posteriores, crear otro corte.
8. Si hay error de red, consultar estado antes de repetir. La creación conserva la clave del mismo envío mientras permanece el formulario; resolver, cerrar y expirar conservan la idempotencia del servidor. Nuevos lotes intencionales no son nuevos ingresos.

La instalación no crea campañas, pagos ni diferencias ficticias. En una base vacía se presenta el estado vacío real. Los ejemplos de la verificación fueron fixtures sintéticos de QA, no datos del usuario.

## Implementación y diseño

| Ubicación | Responsabilidad |
| --- | --- |
| `backend/src/demo-payments/infrastructure/demo-reconciliation.ts` | Comparación/persistencia y operaciones transaccionales existentes; catálogo de monedas y nueva consulta paginada de pendientes. Marcador por `(created_at,id)`, sin OFFSET ni redondear microsegundos. |
| `backend/src/demo-payments/demo-payments.module.ts` | DTO, guardas, permisos, CSRF y rutas. Campos extra, arrays y tipos implícitos se rechazan. |
| `src/features/finance/reconciliationClient.ts` | Transporte HTTP común, validación del contrato y de la diferencia aritmética exacta, fechas/motivos y mensajes seguros. Respuesta inválida no significa éxito. |
| `src/features/finance/useReconciliation.ts` | Carga cancelable, páginas independientes, reintentos y exclusión de envíos simultáneos desde la pantalla. Conservación de clave del envío incierto; 401/403 retiran datos. |
| `src/features/finance/ReconciliationPage.tsx` | Listado, pendientes, corte y resoluciones; confirmaciones, formularios nativos, lectura por perfil y navegación. |
| `src/features/finance/financeClient.ts` | Formato monetario exacto compartido, incluido signo de diferencias inferiores a una unidad. |
| Router, navegación administrativa y `AccountRoles` | Acceso visible según capacidades y retorno de login mediante lista cerrada, sin conceder permisos desde URL. |

**KISS/YAGNI:** reutiliza tablas oficiales, extensión DEMO, transporte, componentes, tipografías y colores existentes. Sin SDK, banco, nueva biblioteca o migración artificial. **DRY:** un mismo formateo de importes y transporte; la UI consume los casos de uso existentes. **SRP:** contrato, estado/cancelación y presentación separados; reglas/transacciones financieras siguen en servidor. UI/UX Pro Max orientó etiquetas, confirmaciones, estados accesibles y adaptación sin sustituir la identidad de Brotar. No se atribuye todo SOLID a esta separación ni se añaden patrones decorativos.

## Verificación

| Comprobación | Resultado del incremento |
| --- | --- |
| Raíz, `bun run check` | Lint, tipos, **172 pruebas** y compilación aprobados el 22/10. |
| Backend, `corepack pnpm run check` | Lint, tipos, **166 pruebas backend + 8 ADMIN local** y compilación aprobados el 22/10. |
| Suite PostgreSQL/HTTP completa en copia aislada | **27/27 aprobadas**, cero fallos, cancelaciones u omisiones. Incluye reinicio real y recuperación de respaldos. Ejecución del 22/10: aproximadamente 572 segundos; no es medición de rendimiento de producción. |
| Total de casos distintos | **373** = 172 + 166 + 8 + 27. Repeticiones y smoke de navegador no se suman otra vez. |
| Revalidación al cerrar el 23/10 | Se repitieron completos `bun run check` y `corepack pnpm run check`: lint, tipos, 172 frontend, 166 backend, 8 ADMIN local y ambas compilaciones aprobados. Sin nueva ejecución de PostgreSQL/navegador: se conserva su evidencia del 22/10 sobre código cotejado sin diferencias. |
| Navegador automatizado con API/BD reales | FINANCE creó un lote, compensó un recibo tardío ajeno, consultó trazabilidad y cerró. Se verificó reinicio de confirmación al cambiar motivo, signo negativo y expiración. ADMIN/AUDITOR sin botones de operación, cuenta básica denegada, anónimo enviado a login con retorno y revocación retirando datos. Sin errores JavaScript. |
| Presentación | Capturas de escritorio y móvil inspeccionadas. Sin desbordamiento a 320×740, 375×812, 812×375 y 1440×900; ampliación del texto al 200 %, movimiento reducido y Tab entre los segmentos nativos de fecha y el siguiente campo. No se afirma accesibilidad universal ni nueva revisión de todo el MVP. |
| Persistencia/infraestructura | Catorce migraciones sin pendientes; readiness directo y vía Vite: 200/database connected. SQL oficial sin cambios, SHA-256 `5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88`. |

Las pruebas reproducibles están en `tests/reconciliation.test.tsx`, `tests/session-navigation.test.ts`, `backend/test/demo-payments.test.ts` y `backend/integration/demo-payments.integration.test.ts`, además de las regresiones existentes. Para integración compilar tests y ejecutar el glob completo según README, únicamente en una copia aislada con `ALLOW_DB_TEST_WRITES=true`; `DB_TEST_RESTART=true` incluye reinicio. No usar una base real con datos del equipo.

El ensayo visual usó Chromium headless del entorno de trabajo sin añadir dependencias al proyecto. Script y capturas sintéticas permanecen fuera de Git en `C:/Users/rnune/AppData/Local/Temp/brotar-s3-ricardo-20261019/tmp/`. API/frontend de QA: **3019/5198**; PostgreSQL **15443**, proyecto `brotar-s3-ricardo-20261019`. No son nuevos puertos obligatorios de instalación. La limpieza del script retiró únicamente sus campañas, operaciones y cuentas por IDs; conserva el registro de auditoría y respaldos sintéticos de QA.

Los primeros intentos visuales detectaron dos supuestos erróneos del runner: correo sintético con parte local demasiado larga y la expectativa de que un único Tab abandonara todos los segmentos del input date nativo. Se corrigió el runner y se repitió completo. No se relajó la validación del registro ni se sustituyó el control nativo para hacer pasar el ensayo.

Durante el ensayo del 22/10 Docker necesitó apartar sus directorios de sockets inaccesibles en copias recuperables. No se borraron volúmenes/bases ni se hizo factory reset. Al retomar el cierre documental el 23/10 ya no había servidores QA escuchando y Docker estaba apagado; no se presenta el resultado de readiness del 22/10 como un servicio actualmente encendido. Se cotejaron **379 archivos de código/pruebas/scripts con QA: cero diferencias**. La documentación de este cierre no altera esos binarios ni afirma una nueva instalación limpia o integración ejecutada el 23/10.

Permanece el aviso no bloqueante de Vite por paquete principal de **575,35 kB / 168,22 kB gzip**. No se oculta elevando el umbral. No se añadieron dependencias/lockfiles, migró la base original ni publicaron cambios.

## Estado de las tareas de Ricardo

| Estado | Tareas |
| --- | --- |
| Cierre técnico local | **S3-06 y S3-07**. |
| En curso integral | S2-19, S3-01, S3-02, S3-15, S3-16 y S3-18. |
| Pendientes | S2-08, S3-08, S3-09, S3-11, S3-19, S3-20, S3-21 y S3-23. |
| Canal de correo pendiente | S1-12 y S3-26. |

No se atribuyen todas las tareas restantes a los compañeros: desembolsos, devoluciones y partes del ciclo/revisión todavía requieren trabajo de Ricardo y la integración de sus controles compartidos. KYC completo conecta captura/corrección de Santiago; ejecución/cierre conecta seguimiento/rendición; disputas conecta las incidencias de Alison. Los cierres globales de auditoría, permisos, contratos y QA deben abarcar esos módulos, no solo los que existen hoy. Publicar permanece fuera de esta autorización local. No se cierran historias globales por disponer de fixtures o una pantalla aislada.
