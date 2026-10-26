# Sprint 3 · integración local de Ricardo y Santiago

23/10/2026 · RicardoDev · alcance académico DEMO. No es cierre del MVP completo, aprobación externa ni autorización para dinero real.

## 1. Fuentes y conservación

- Base local Ricardo `bd8f566`, con todos sus cambios no publicados conservados. Se tomó una instantánea recuperable de 522 archivos no ignorados en una copia temporal antes de integrar. Los `.env` privados y la base habitual no se trasladaron ni migraron.
- SantiagoDev remoto `a504e43ef738025920277ed6b38b25d1e120eec9`, contrastado con el remoto el 23/10. Incluye el avance de Alison; no se mezcló de nuevo su rama antigua.
- Se resolvieron siete conflictos: módulos de aplicación/aportes, migraciones, rutas, continuación autenticada, navegación administrativa y pruebas de aportes. Las dos baterías de aportes se conservan: `contributions.integration.test.ts` y `contribution-history.integration.test.ts`.
- La combinación se preparó en una copia aislada y se trasladó al árbol local sin sustituir `.git` ni secretos. HEAD de RicardoDev permanece `bd8f566`; sin commit/push en el repositorio original, sin cambios en DEV/main ni Trello. El commit de instantánea existe únicamente en la copia de respaldo.
- Se recuperó el arranque de Docker conservando sus datos: se renombraron directorios de ejecución/caché bloqueados con Docker detenido y se reinició. No se borraron volúmenes ni se restableció Docker a fábrica. Las escrituras de validación se dirigieron al proyecto QA aislado.

## 2. Definiciones funcionales completadas

[ADR-013 v1.0](decisiones/ADR-013-definiciones-integracion-mvp-demo.md) registra responsable Ricardo, fecha, fuente interna y criterios de aceptación de seis grupos: identidad sintética y retención; representación/permisos; apoyos y pagos; ejecución/rendición; soporte/alertas; parámetros. Complementa [ADR-012](decisiones/ADR-012-reglas-mvp-pruebas.md).

Se definieron requisitos y acciones concretos, no una supuesta aprobación jurídica. **Los textos legales definitivos y el correo real siguen pendientes.** Las decisiones permiten continuar implementaciones; no convierten automáticamente las once tareas parciales de Santiago/Alison en terminadas.

## 3. Integración y cambios implementados

1. Registro único de módulos y rutas, manteniendo el motor transaccional `ContributionLedger` de Ricardo y los historiales de Santiago. Los dos contratos de consulta propia coexisten; ningún controlador sustituye el checkout por una simulación aislada.
2. Selección de Alison conectada a `/apoyo-demo`. Resumen, corrección, consentimiento DEMO, intento no pagable, consulta de estado, resultados y reintento del mismo aporte con otro pago. No se solicitan tarjetas ni direcciones. No se publica identidad del aportante; contacto mínimo es la cuenta registrada, sin afirmar verificación ni envío de correo.
3. Comprobante e historial leen el aporte canónico. Solo confirmación coherente habilita comprobante; referencia ajena devuelve 404. Los intentos fallidos se conservan y no suman recaudación. Los avisos tardíos pasan a conciliación sin ingreso duplicado.
4. Panel de patrocinador separa `totals` fuera de sandbox de `demoTotals` del proveedor interno `BROTAR_INTERNAL_DEMO`. `support_simulation` sigue aislado: confirmarlo no crea aporte, reserva ni financiación.
5. REWARD/PRESALE requieren recompensa activa tanto en selección como en checkout; servidor revalida mínimo, moneda, fechas y cupo. DONATION no acepta recompensa. No se suman monedas distintas.
6. Migración adicional `MvpDemoAgreements1792713600000`: permiso `catalog.read`, dos parámetros operativos y tres políticas sintéticas versionadas KYC/KYB. El arranque actualizado requiere **20 migraciones**, sin SQL manual oculto. Conserva categorías automáticas, valores existentes y políticas previamente activas.
7. Captura DEMO exige campos iniciados con DEMO/PRUEBA, documentos sintéticos privados y aceptación versionada; bloqueada como política operativa en producción. Enviar expediente no aprueba identidad, cuenta destino ni publicación. Alta/revisión de destinos y decisiones COMPLIANCE todavía no están terminadas.
8. ADMIN edita únicamente las dos metas enteras de soporte aprobadas; validación de rangos, confirmación en pantalla, revalidación de permisos en transacción y auditoría atómica. AUDITOR solo consulta aunque acumule ADMIN. Las alertas del resumen administrativo consumen valores persistidos, sin correo ni resolución automática.
9. Se conservaron diseño y componentes existentes. Los formularios nuevos usan controles nativos, estados de carga/error y confirmaciones. Se corrigió separación y área de interacción de los parámetros sin incorporar librerías, fuentes ni otro sistema visual.

Preparación y recorrido: README §30. El contrato HTTP DEMO 0.5 conserva sus rutas; sus notas iniciales y los contratos generales indican la integración posterior.

## 4. Evidencia ejecutada el 23/10

| Comprobación | Resultado y alcance |
| --- | --- |
| Frontend `bun run check` | Lint, tipos, **202 pruebas** y compilación. |
| Backend `corepack pnpm run check` | Lint, tipos, **194 pruebas + 8 de administración local** y compilación. |
| PostgreSQL/HTTP, ejecución serial y reinicio habilitado | **32/32 aprobadas**, sin omisiones. Datos, concurrencia, permisos, archivos privados, recuperación/restauración, conciliación y regresión S1/S2/S3. |
| Revalidación específica de migraciones | **3/3 aprobadas**, repetición de casos ya incluidos, no tres casos adicionales. Se amplió la instalación limpia: tres políticas sintéticas, dos parámetros y reaplicación sin sobrescrituras. |
| Inventario V2 | 59 tablas oficiales, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers, 134 FK; extensiones separadas y privilegios verificados. 20 migraciones, ninguna pendiente. |
| Navegador: aporte integrado | Selección aislada sin aporte; resumen/confirmación; fallo y reintento con **1 aporte/2 pagos**; confirmación de **10.25 BOB una sola vez**; comprobante privado; panel DEMO separado; ADMIN edita/AUDITOR lee; alertas. Sin errores JavaScript. |
| Navegador: conciliación | FINANCE consulta/crea/resuelve/cierra, confirmaciones reiniciadas al editar, diferencia negativa, expiración, revocación; ADMIN/AUDITOR solo lectura; usuario básico y anónimo denegados. |
| Adaptación y revisión visual | Checkout a 375 px sin desbordamiento y movimiento reducido; conciliación a 320/375/812/1440 px, orientación, zoom de texto, teclado y movimiento reducido. Capturas locales revisadas. |

Son **436 casos automatizados distintos**: 202 + 194 + 8 + 32. Las repeticiones no inflan la cifra. Los recorridos de navegador son evidencia adicional, no certificación de todos los posibles escenarios. El primer ensayo del navegador esperaba el texto antes de finalizar la consulta del comprobante; se corrigió la espera del ensayo y el recorrido completo pasó. No se ocultó un fallo de aplicación.

Los **484 archivos de código, pruebas y scripts** del incremento se cotejaron con la copia QA: coinciden normalizando CRLF. La planificación local lista exactamente las mismas 36 tarjetas del Sprint 3, sin duplicados: 12 cierres DEMO y 24 restantes. El índice Git del repositorio original permanece sin archivos preparados y DEV conserva `99d70d7`.

La compilación conserva un aviso de tamaño de paquete JavaScript (aproximadamente 721 kB minificado, 206 kB gzip). No falla la compilación, pero no se presenta como rendimiento óptimo de producción. No se cambiaron dependencias ni arquitectura. No se probó correo real, proveedor bancario, documentos reales ni producción.

## 5. Tareas cerradas técnicamente en el alcance DEMO local

El Sprint 3 incluye arrastres S1/S2. Los números se conservan para no duplicar tarjetas. “Cierre técnico” significa implementación/evidencia del alcance señalado; no cierre externo de Trello ni aceptación del producto real.

| Tarea | Responsable | Resultado comprobado |
| --- | --- | --- |
| S2-01 · Multimedia | Santiago | Galería múltiple, orden, versiones, propiedad y presentación pública. |
| S2-18 · Seleccionar apoyo | Alison | Modalidad, mínimos/cupos/recompensa; selección conservada y revalidada antes del checkout DEMO. |
| S2-19 · Checkout | Ricardo | Resumen/corrección, privacidad interna, consentimiento y creación del intento DEMO; contacto por cuenta, sin logística ni correo real. |
| S2-20 · Pagos de prueba | Alison | Ensayo aislado explícito QR/tarjeta ficticios; puente al checkout canónico sin convertir el ensayo en dinero. |
| S3-01 · Integración de pagos DEMO | Ricardo | Alternativa interna autorizada por el equipo para pruebas; adaptador, referencias, confirmaciones y QR ilustrativo no pagable. **No integración bancaria externa.** |
| S3-03 · Panel del patrocinador | Alison | Actividad propia, estados, seguimiento y totales reales/DEMO separados. |
| S3-04 · Mis aportes | Alison | Historial privado, filtros y páginas; conserva referencias históricas. |
| S3-05 · Detalle y comprobante | Alison | Detalle propio y comprobante informativo solo si hay confirmación verificable; sandbox rotulado. |
| S3-06 · Operaciones financieras | Ricardo | Consulta, filtros, totales por moneda, CSV seguro y permisos. Cierre anterior preservado. |
| S3-07 · Conciliación | Ricardo | Pendientes, diferencias, resolución/compensación DEMO trazable y cierre protegido. Cierre anterior revalidado. |
| S3-17 · Catálogos y parámetros | Santiago, completado en integración | Categorías y referencias protegidas; dos claves acordadas tipadas, permisos, actor/auditoría y consumidor operativo. |
| S3-22 · Guardar y seguir | Alison | Acciones independientes, idempotentes, persistencia, páginas y novedades propias. Sin correo externo. |

**Total: 12 cierres técnicos locales** en el alcance DEMO (4 tareas arrastradas S2 y 8 con numeración S3). Se preserva el responsable de planificación; integrar/completar no reasigna la tarjeta.

## 6. Lo que todavía no está cerrado

| Tareas | Trabajo restante real |
| --- | --- |
| S1-11; S1-12 / S3-26 | Textos legales definitivos/versionados y correo real/contactos verificados. Buzón local no equivale a envío. Pendientes por solicitud expresa. |
| S2-06 / 07 / 09 y S2-08 | Captura sintética integrada; faltan destinos DEMO, revisión/decisiones COMPLIANCE, habilitación operativa y correcciones conectadas a esas decisiones. |
| S3-02 | Núcleo de pagos DEMO verificado; falta integrar consecuencias de devoluciones, disputas y ciclo completo. No se cierra por probar confirmación/reintentos. |
| S3-08 / 09 / 11 / 23 | Desembolsos, devolución de pagos confirmados, resolución de disputas y ciclo/cierre completo de campaña. Compensar un aviso sin ingreso no es devolver un aporte confirmado. |
| S3-10 | Reportes propios integrados; falta aplicar reportes de terceros/categorías definidas y la resolución/escalamiento de soporte. |
| S3-12 / 13 | Avances y consulta de rendición disponibles; falta cumplimiento de recompensas, captura/aprobación de rendiciones y cierre operativo. |
| S3-14 | Consultas y edición propia básica; faltan miembros/representación, cambios de terceros y restricciones según el acuerdo. |
| S3-15 / 16 / 18 | Auditoría, permisos y contratos de lo actual integrados; falta cobertura y persistencia de módulos aún no implementados. |
| S3-24 / 25 | Paneles parciales con datos/alertas actuales; falta consolidar operaciones de rendición, identidad, soporte y cierre. |
| S3-19 / 21 | QA y recorrido del incremento aprobados; no validación integral de funcionalidades que todavía no existen. |
| S3-20 | Documentación actualizada localmente; publicación pendiente, expresamente no autorizada en esta solicitud. |

**24 de las 36 tarjetas actuales siguen en curso o pendientes**. Hay definiciones suficientes para avanzar en código DEMO; no se sigue atribuyendo a falta de decisiones lo que ahora es implementación pendiente. Las responsabilidades de Santiago/Alison se conservan. No se tocaron sus ramas, tarjetas ni entornos.

## 7. Reproducción y límites

1. En instalación nueva seguir README §3; en instalación existente hacer respaldo y seguir §24/30. No copiar `.env.example` sobre la configuración generada ni borrar volúmenes.
2. Compilar, aplicar migraciones y permisos, verificar readiness/inventario; para esta integración esperar 20 migraciones y cinco categorías provisionales salvo cambios administrativos intencionales.
3. Habilitar DEMO explícitamente en desarrollo, entrar con cuenta registrada y una campaña publicada/vigente; seguir README §30. Nunca pagar el QR ilustrativo.
4. Repetir selección, resumen, fallo/reintento, confirmación, historial y comprobante. Con otra cuenta comprobar 404; confirmar recaudación una sola vez.
5. ADMIN gestiona categorías/parámetros; AUDITOR solo consulta. FINANCE, no ADMIN implícitamente, opera conciliación.
6. Las pruebas con escritura se ejecutan únicamente contra una copia Docker aislada con `ALLOW_DB_TEST_WRITES=true`. Esta autorización de ensayo no se incorpora al `.env` de la aplicación ni habilita datos reales.

No se ejecutó purga de la base original, envío externo, publicación ni movimiento de dinero real. No se garantiza ausencia universal de errores: se documentan alcance, resultados y pendientes verificables.
