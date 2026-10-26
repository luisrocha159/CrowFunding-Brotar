# Entrega local · Sprint 3 · Santiago y Alison · 22/10/2026

> Registro histórico del trabajo de Santiago. El 23/10 Ricardo integró localmente el commit remoto `a504e43` con su trabajo preservado. Los pendientes de definición funcional se resolvieron para pruebas mediante ADR-013; no todas las implementaciones pendientes se completaron por definirlas. El estado vigente se documenta en `integracion-local-sprint-3-2026-10-23.md`. Las menciones a listas vacías, ausencia de política DEMO o UI de Ricardo pendiente no describen el nuevo corte.

La rama `SantiagoDev` contiene la fusión autorizada `6424a4e` de `origin/DEV` (`99d70d7`) y la implementación posterior **sin commit ni push**. Se revisaron las 18 tarjetas de ambos responsables y las 8 de Sprint 2, con sus criterios y decisiones D02–D10. No se modificó Trello.

**No corresponde declarar Sprint 3 completo.** Hay seis tarjetas con alcance técnico listo para revisión, once con implementación parcial y dependencias concretas, y una bloqueada por contenido legal. Los acuerdos pendientes no aparecieron aprobados en Trello, requisitos o ADR revisados. Las políticas sintéticas utilizadas en pruebas se retiraron al finalizar; no se activaron como reglas del producto.

## Estado de las 18 tarjetas

“Listo técnico” significa implementado y probado localmente, pendiente de aceptación del equipo. “Parcial” detalla el límite; no equivale a una tarjeta terminada.

| Responsable / tarjeta | Estado | Entrega comprobable y pendiente |
| --- | --- | --- |
| Santiago · [S2-01 Galería](https://trello.com/c/aW8N2PsG) | Listo técnico | Carga múltiple, descripciones, orden, reemplazo, reintento por archivo, conflictos de versión, bloqueo de salida sin guardar, galería pública y enlaces HTTPS de YouTube/Vimeo. Límites técnicos existentes; otros formatos/proveedores necesitan acuerdo. |
| Santiago · [S2-06 KYC](https://trello.com/c/mXia80Q5) | Parcial | Casos privados, captura y envío condicionados a política aprobada; cuentas existentes enmascaradas. No se solicitan documentos mientras falten requisitos/avisos; falta alta/validación de cuenta destino. |
| Santiago · [S2-07 KYB](https://trello.com/c/QzpTCGZ6) | Parcial | Organización propia, edición básica autorizada, casos institucionales y protección por membresía vigente. Faltan requisitos KYB, representación completa y cuenta destino acordados. |
| Santiago · [S2-09 Correcciones](https://trello.com/c/f2wKElZK) | Parcial | Estado, observaciones, documentos/versiones y corrección en estados permitidos; autorización de descarga por expediente. Falta integrar decisiones de cumplimiento S2-08, notificaciones S3-26 y política definitiva. |
| Santiago · [S3-12 Avances](https://trello.com/c/GfwdpFM3) | Parcial | Actividades/hitos reales, responsables, fechas, porcentajes, indicadores logrados, novedades con imágenes públicas, borrador/publicación e historial paginado con instantáneas. Falta acordar seguimiento de cumplimiento de recompensas y reglas de edición/cierre D05/D07/D10. |
| Santiago · [S3-13 Rendición](https://trello.com/c/qbBmvUPd) | Parcial | Consulta propia del presupuesto, informes, gastos, fondos/saldo y adjuntos registrados, incluso en campañas cerradas. No se inventó captura, aprobación ni cierre financiero; requieren D05/D10 y fuentes de desembolsos. |
| Santiago · [S3-14 Personas/organizaciones](https://trello.com/c/Tx8F84Ts) | Parcial | Consulta administrativa paginada y búsqueda de personas/organizaciones, representación vigente/histórica; edición propia básica. Gestión de terceros, miembros, restricciones y transferencias requiere D06/D10. |
| Santiago · [S3-17 Catálogos](https://trello.com/c/RNolTk1j) | Parcial | CRUD de categorías, activación/desactivación protegida por referencias, auditoría atómica y auditor solo lectura. Consulta de parámetros aprobados; lista vacía porque no hay claves/valores acordados D02/D10/D04. |
| Santiago · [S3-24 Panel creador](https://trello.com/c/fxHKjdAl) | Parcial | Últimos 100 proyectos propios y representación vigente, estados, avance real, importes por campaña/moneda excluyendo sandbox y accesos a revisión, verificación, ejecución, rendición y soporte. Pendientes definitivos de desembolso/ciclo/alertas dependen de Ricardo. |
| Alison · [S1-11 Registro legal](https://trello.com/c/Mk5I3PVJ) | Bloqueada | No se encontró texto aprobado/versionado ni política de aceptación definitiva. Se conserva el consentimiento provisional de demostración explícito. |
| Alison · [S2-18 Selección](https://trello.com/c/Fb0YQnbF) | Parcial | Selección persistente dentro del ensayo, monto/recompensa, mínimos registrados, disponibilidad y revalidación. No reserva cupos ni inicia checkout real; D02/D04/D07/D09 y S2-19 pendientes. |
| Alison · [S2-20 Pagos de prueba](https://trello.com/c/UMGYVbmE) | Listo técnico | Simulación aislada QR/tarjeta ficticios, iniciado/pendiente/confirmado/fallido/expirado, versiones, idempotencia, reintentos y referencia conservada. No cobra ni escribe `contribution`/`payment`. |
| Alison · [S3-03 Panel patrocinador](https://trello.com/c/GhSvBSpq) | Listo técnico | Resumen propio, importes separados por moneda y estado, guardadas/seguidas, novedades, casos/devoluciones/disputas y vacíos reales. Lee registros existentes; la creación financiera real sigue en módulos de Ricardo. |
| Alison · [S3-04 Mis aportes](https://trello.com/c/yH3AVvNa) | Listo técnico | Consulta privada, filtros por estado y día de Bolivia, paginación, detalle y referencias históricas tras cierre. |
| Alison · [S3-05 Comprobante](https://trello.com/c/mAYpejK5) | Listo técnico | Detalle y comprobante informativo autenticado solo para pago confirmado verificable; sandbox claramente identificado. No es factura fiscal ni certificado de entrega. |
| Alison · [S3-10 Incidencias](https://trello.com/c/wOJdAFK4) | Parcial | Reporte propio sobre campaña administrada o aporte propio, contexto autorizado, evidencias privadas, referencia real, idempotencia y consulta de mensajes no internos. Reportes de terceros sin relación, plazos, escalamiento y resolución necesitan D05/S3-11. |
| Alison · [S3-22 Guardar/seguir](https://trello.com/c/kbrLkB1M) | Listo técnico | Guardar es una lista personal; seguir permite consultar novedades. Acciones independientes, idempotentes, persistentes y paginadas; conservación de referencias cerradas sin revelar campañas privadas. No envía correos ni notificaciones externas. |
| Alison · [S3-25 Panel administrativo](https://trello.com/c/vlHnwFl7) | Parcial | Contadores reales de campañas/catálogos/personas para ADMIN/AUDITOR y accesos a módulos disponibles. Faltan alertas y responsabilidades de cumplimiento, finanzas y soporte D06/D10/S3-16. |

## Para enviar a Ricardo

1. **D03/D08 — KYC, KYB y legal:** entregar texto aprobado, versión, fecha y responsable; campos/documentos obligatorios por perfil/país, metadatos documentales, consentimiento, acceso y retención. Definir datos y validación/cifrado de cuentas destino. No basta activar los tipos del catálogo.
2. **D06/D10 — Representación y administración:** acordar quién invita/retira miembros, cambia representante, modifica datos de terceros o restringe cuentas; compatibilidad de roles y efecto sobre verificaciones existentes. Integrar S2-08/S3-16/S3-26.
3. **D02/D04/D07/D09 — Apoyos y pagos:** proveedor y entorno, moneda, costos, mínimos, cupos/reserva/liberación, modalidades, transiciones y fuente de confirmación. Entregar contratos de S2-19/S3-01/S3-02; el ensayo actual debe permanecer aislado del dinero real.
4. **D05/D07/D10 — Ejecución y rendición:** definir estados de cumplimiento de recompensas, quién publica/corrige avances, gastos admitidos, evidencias, períodos, aprobación, variaciones, cierre/cancelación y datos de desembolsos. BG52 pide concretar pantallas de captura/aprobación antes del desarrollo.
5. **D05/D06/D10 — Soporte y alertas:** decidir cuándo un tercero sin aporte puede reportar, qué categorías/plazos/escalamiento rigen y qué responsabilidad consulta/resuelve cada caso. Integrar S3-11 y reglas de alertas de S3-25.
6. **D02/D04/D10 — Parámetros:** aprobar lista de claves, valores, tipos, límites y permisos; `AGREED_SETTINGS` sigue intencionalmente vacío. No convertir ejemplos en reglas del producto.

Detalle y referencias: [identidad/legal](pendientes-ricardo-identidad.md), [aportes y simulación](integracion-s3-aportes-simulacion.md), [catálogos](integracion-s3-17-catalogos.md), [incidencias](integracion-s3-10-incidencias.md), [auditoría inicial con decisiones D02–D10](revision-sprint-3-santiago-alison-2026-10-22.md).

## Comprobación y límites

- Pruebas de dominio/contratos, lint, tipos y compilación frontend/backend. Pruebas HTTP con PostgreSQL real: propiedad entre cuentas, auditor combinado con ADMIN, concurrencia, historial, idempotencia, archivos privados y bajas protegidas, revocación de representación, versiones y aislamiento de simulación. Los registros exactos finales se documentan abajo.
- Navegador móvil de 390 px: galería y carga/reintento, guardar/seguir y novedades, avances con salida protegida, publicación local ficticia y resultados conservados, simulación fallida/reintento/confirmación con la misma referencia, registro de incidencia, historial vacío de aportes, paneles y consultas administrativas. Sin desbordamiento en los recorridos comprobados.
- Los documentos de verificación solo se descargan por un expediente actualmente autorizado, incluso para su uploader. No se permite reutilizar documentos ya vinculados a otro expediente para eludir una revocación.
- Cinco migraciones nuevas de Sprint 3, extensiones fuera de `public`, permisos mínimos y sin alterar el archivo SQL oficial. Se conserva el inventario oficial de 59 tablas. Se aplicaron a PostgreSQL local preservando su volumen; hubo respaldo previo.
- La rendición consulta los últimos 100 informes y no implementa un flujo aprobado de captura/cierre. Las novedades sí están paginadas. Las imágenes cargadas para novedades son públicas desde su carga y la interfaz lo avisa; los documentos KYC/soporte son privados.
- La compilación frontend conserva un aviso de bundle mayor de 500 kB. No se modificaron dependencias ni frameworks.
- Las ocho tareas revisadas de Sprint 2 se conservaron; la regresión incluye sus flujos. No se modificaron tarjetas de Trello, ni se realizaron commits posteriores a la fusión, push o despliegues.

## Registros finales

| Comprobación final | Resultado | Registro local |
| --- | --- | --- |
| Frontend `bun run check` | Lint, tipos, **189 pruebas** y compilación aprobados | `/tmp/brotar-s3-final-frontend.log` |
| Backend `pnpm run check` | Lint, tipos, **174 pruebas + 8 de administración local** y compilación aprobados | `/tmp/brotar-s3-final-backend.log` |
| PostgreSQL `ALLOW_DB_TEST_WRITES=true pnpm run test:integration` | **26/26 aprobadas**, incluye regresiones S1/S2, nuevas funciones y migraciones | `/tmp/brotar-s3-final-postgres.log` |
| Revalidación final tras esperar evidencias | **1/1 PostgreSQL aprobada**: CREATOR vencido durante bloqueo recibe 403 sin publicar; la prueba anterior al arreglo falló con 200 | `/tmp/brotar-s3-progress-expiry-final.log` |
| Navegador | Recorridos de 390 px y detalle público de 1440 px aprobados; consola sin errores en las recargas finales | Evidencia local ignorada en `.superpowers/sdd/2026-10-22-sprint3-continuacion/browser/` |
| Git | `SantiagoDev`, último commit `6424a4e`; diff sin errores de espacio; implementación sin commit/push | Revisión del árbol de trabajo |

Las copias locales de los logs se conservan en `.superpowers/sdd/2026-10-22-sprint3-continuacion/verification/`, fuera del seguimiento de Git. La comprobación inicial de migraciones falló por el texto esperado al rechazar `down`; se corrigió el mensaje sin relajar la protección y la regresión completa final pasó. Se conservan los datos ficticios de la sesión de navegador identificados como ensayo local, sin movimientos financieros reales.
