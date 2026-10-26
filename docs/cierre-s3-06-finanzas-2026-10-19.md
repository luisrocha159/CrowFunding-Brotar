# S3-06 — Consulta de operaciones financieras

Fecha: 19/10/2026. Rama local: RicardoDev. Responsable: Ricardo. Historia: BG-45. Sin push ni modificación de DEV/main/Trello. Esta evidencia cubre el módulo de consulta, no la operación de una pasarela ni la aceptación global S3-21.

## Alcance y criterios originales

Los tres criterios provienen de `stories[BG-45]` en `planificacion-sprints.json`; no se redujo la tarea a un backend parcial:

| Criterio | Implementación y demostración |
| --- | --- |
| CA 1: listar pagos con importe, proyecto, patrocinador, fecha y estado; filtrar por fecha/proyecto/estado | Pantalla real `/administracion/finanzas`, API y PostgreSQL. Tarjetas con importe exacto, campaña, UUID interno del patrocinador, fecha UTC y estados; filtros combinables y páginas anterior/siguiente. El identificador permite reconocer al mismo patrocinador sin exportar su nombre, correo o documentos. |
| CA 2: totales y exportaciones respetando permisos y privacidad | Totales por moneda/estado del filtro completo, una instantánea para página/totales, importes numeric y CSV completo del filtro. Cookie y `finance.read` en ambas rutas; 401/403, revocación y AUDITOR de lectura comprobados. CSV hasta 5000, rechazo explícito a 5001, sin truncamiento ni fórmulas ejecutables. |
| CA 3: distinguir pendiente/completado/fallido de los estados propios de cada operación | Tipo PAYMENT explícito; siete estados oficiales separados y estado del aporte independiente. Comisión/neto/devoluciones completadas visibles sin presentar pendientes como recaudación o neto como saldo desembolsable. No se inventan estados COMPLETED en el enum de pagos ni se ejecutan devoluciones/disputas desde una consulta. |

Desembolsos, conciliación, devoluciones operativas y disputas tienen sus propias tareas. Consultar pagos guardados no necesita elegir un SDK, custodiar dinero ni credenciales de proveedor. Las decisiones D04/D09/D06 siguen siendo necesarias para operación y política definitiva; aquí se conserva la matriz provisional y se aplica minimización explícita de datos. No se declara concluida ninguna de esas decisiones ni otra tarea.

## Archivos y diseño

- `backend/src/finance/finance.module.ts`: DTO de consulta/exportación, permiso y traducción de errores; descarga como StreamableFile solo al tener un CSV válido.
- `backend/src/finance/infrastructure/financial-operations.ts`: SQL parametrizado, paginación por fecha/UUID, agregación numeric, devoluciones asociadas al pago e instantáneas REPEATABLE READ de solo lectura.
- `backend/src/finance/domain/report.ts`: calendario/periodo y codificación CSV segura, independiente de Nest/SQL.
- `src/features/finance/financeClient.ts`: contrato validado, transporte común y formato exacto mediante BigInt, sin pérdida al mostrar sumas grandes.
- `src/features/finance/useFinance.ts`: solicitudes cancelables, carga/error/vacío/permisos, páginas, aplicación de filtros y descarga.
- `src/features/finance/FinancePage.tsx` y CSS: controles nativos etiquetados, avisos claros, cifras separadas, tarjetas adaptables y navegación administrativa existente.
- `FinancialRead1792368000002`: décima migración, concede SELECT de refund al rol técnico; no siembra cuentas ni proveedores, no permite escribir devoluciones y no cambia el SQL oficial.

KISS/YAGNI: sin SDK, gráficos decorativos, nueva biblioteca CSV, tabla financiera paralela ni interfaz con una sola implementación. DRY: mismo transporte HTTP, autorización, proyección/filtros SQL para lista/CSV y componentes de formulario. SRP: dominio de formato/periodo, persistencia transaccional, contrato cliente, estado del recurso y presentación separados. UI/UX Pro Max orientó etiquetas, estados claros, controles nativos, adaptación móvil y ausencia de desbordamientos; se conservaron colores/tipografías/tokens de Brotar en lugar de reemplazar la identidad visual.

## Cómo demostrarlo

1. Preparar entorno con README §3 o actualizar conservando respaldo con §24; comprobar diez migraciones sin pendientes. Levantar API y Vite.
2. Ingresar con una cuenta autorizada con finance.read. Mi cuenta → Consultar operaciones financieras. Una cuenta básica no puede asignarse el acceso; no se crearon credenciales comunes nuevas.
3. Si aún no existen pagos, mostrar vacío real. La instalación no carga un supuesto cobro para adornar el panel. Las pruebas de integración del siguiente apartado son el ensayo reproducible con datos sintéticos.
4. Con pagos presentes, filtrar por campaña UUID, estado o periodo UTC y aplicar. Comparar cada tarjeta con su pago/aporte y comprobar que totales no se limitan a la página.
5. Revisar monedas por separado, estados distintos, comisión, neto y devolución completada; explicar que ningún botón autoriza movimiento de dinero.
6. Descargar el CSV del filtro aplicado; contiene todas las coincidencias hasta el límite, no solo la página. No compartirlo públicamente. Una exportación demasiado grande exige acotar el filtro.
7. Revocar el permiso de una cuenta de ensayo desde el procedimiento administrativo autorizado y actualizar: el servidor devuelve 403 y la pantalla elimina los datos. No realizar ese ensayo sobre una cuenta real sin autorización.

## Pruebas reproducibles

Desde raíz y backend de trabajo respectivamente: `bun run check` y `corepack pnpm run check`. Desde backend de una copia aislada ya migrada:

```powershell
$env:ALLOW_DB_TEST_WRITES='true'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/finance.integration.test.js
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
}
```

Compilar previamente con `corepack pnpm run build` y `corepack pnpm exec tsc -p tsconfig.test.json`. La prueba verifica que el destino sea el Docker local de esa copia, crea fixtures con UUID propios y los retira al terminar. No ejecutar pruebas con escritura sobre producción o la base de trabajo del equipo. Para la regresión completa usar `dist-test/integration/*.test.js` y `DB_TEST_RESTART=true`, sin una API concurrente que utilice esa copia.

Ensayo dirigido: cinco perfiles, anónimo, filtros inválidos/repetidos, 0.10+0.20=0.30, comisión 0.01, devolución completada 0.05 frente a solicitud 0.03, BOB/USD sin conversión, los siete estados, fecha UTC en su último microsegundo, cursor, vacío, revocación, proyección exacta sin secretos y CSV de 5000/5001 filas. USD se crea solo como fixture si falta y se retira al limpiar; no se modifica el catálogo de negocio de la instalación.

Se detectaron y corrigieron un tipo nullable del cursor de prueba, la ausencia de USD en el catálogo oficial del ensayo y la lista cerrada de retorno de login que aún no incluía la nueva ruta. Esta última se comprobó fallando primero y pasando tras añadir únicamente `/administracion/finanzas`, sin abrir redirecciones externas. No se relajaron claves foráneas ni validación para que los ensayos pasaran.

La revisión real de navegador comprobó consulta autenticada, vacío al filtrar confirmados sin coincidencias, retorno a pendientes, descarga CSV y revocación de FINANCE que retiró datos y mostró acceso restringido. Sin errores de consola en esa revisión. Se inspeccionó escritorio, 375×812 y 812×375: sin desbordamiento horizontal. Después se comprobó un login nuevo que volvió automáticamente a finanzas, Tab desde campaña al selector con foco visible de 3 px, cambio del estado por flecha y activación de Aplicar filtros con Enter. Se restauró el viewport y se limpiaron únicamente los registros ficticios. Captura móvil y CSV de prueba quedaron fuera de Git, con datos sintéticos. No se inspeccionaron de nuevo todas las pantallas del MVP ni se afirma accesibilidad universal por esta revisión.

## Registro de verificación y cierre

La verificación dirigida aprobó 1/1. Lint/tipos/compilación y 165 pruebas frontend, 155 backend y 8 ADMIN local aprobaron. La regresión completa PostgreSQL aprobó **23/23**, sin fallos ni omitidas, con `DB_TEST_RESTART=true`, recuperación y diez migraciones sobre SQL oficial aislado. Total vigente: **351 casos automatizados distintos**; no sumar otra vez el caso dirigido ni las repeticiones. Los resultados previos de 344/345 casos conservan su corte y no se reutilizan como evidencia de esta ampliación.

**Estado: cierre técnico de S3-06 y sus tres criterios de consulta**, con interfaz, API, PostgreSQL, exportación y evidencia reproducible. Se registra localmente en el plan, no en Trello. La aceptación externa y el cierre global S3-21 se evalúan aparte. No equivale a certificar ausencia absoluta de defectos ni a completar las operaciones financieras pendientes. Se conserva el aviso no bloqueante de Vite por un bundle de 539.85 kB (159.85 kB gzip), sin ocultarlo aumentando el umbral.

No hay cobros reales, un proveedor verificado, nuevos permisos de operación financiera, push ni cambios en las tarjetas. Las otras tareas de Ricardo no se cierran por haber implementado este módulo de consulta.
