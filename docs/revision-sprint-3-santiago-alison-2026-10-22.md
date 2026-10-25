# Revisión de Sprint 3 · Santiago y Alison · 22/10/2026

> Este documento conserva la auditoría inicial. La implementación posterior, sus pruebas y los pendientes para Ricardo están en [la entrega local de Sprint 3](entrega-sprint3-santiago-alison-2026-10-22.md).

## Resultado y fuentes

Revisión del [tablero de Trello](https://trello.com/b/37xCrdes/crowudfunding) abierto en Chrome y del código de `SantiagoDev`, commit `6424a4e`, que integra `origin/DEV` (`99d70d7`). El conector Trello agotó el tiempo de espera; la comprobación actual se realizó mediante lectura del tablero y de las tarjetas en el navegador.

Se inventariaron las listas de todo el tablero, se abrieron las **18 tarjetas de Sprint 3 de Santiago y Alison**, las **8 tarjetas de ambos que permanecen en Sprint 2** y las decisiones **D02–D10**. Se contrastaron los criterios con rutas, módulos, casos de uso, repositorios y pruebas del proyecto. La existencia de tablas SQL no se considera implementación funcional.

| Inventario actual | Cantidad |
| --- | ---: |
| Sprint 3 · Planificado · cierre integral MVP | 33 |
| Sprint 3 · Bloqueadas · decisiones y proveedores | 3 |
| Sprint 3 · Terminadas · cierre técnico | 0 |
| Sprint 2 · En curso / En revisión | 0 / 0 |
| Sprint 2 · Terminadas · cierre técnico | 13 |
| Alcance de Santiago en Sprint 3 | 9 |
| Alcance de Alison en Sprint 3 | 9 |
| Alcance conjunto pendiente | **18: 17 planificadas y 1 bloqueada** |

Las otras 18 tareas de Sprint 3 corresponden a Ricardo. Se verificó su presencia y situación en el tablero; esta revisión de implementación se concentra en Santiago y Alison. Asumir el trabajo de Alison no cambia automáticamente los miembros asignados en Trello.

No se modificaron tarjetas, responsables, checklists, código del producto, base de datos ni configuración. Este documento es el resultado de la revisión inicial y una propuesta de secuencia, no evidencia de ejecución del Sprint 3.

## Sprint 2: conservar el trabajo terminado

Las ocho tarjetas de ambos integrantes están en cierre técnico con checklist **3/3**. Sus funcionalidades y pruebas están en la rama actual.

| Tarjeta | Responsable | Evidencia en código |
| --- | --- | --- |
| [S2-02 · Actividades e hitos](https://trello.com/c/GvQVAEEo) | Santiago | `CampaignSections`, editor de secciones y persistencia de planificación; relación múltiple de actividades/hitos incorporada en DEV. |
| [S2-03 · Presupuesto y riesgos](https://trello.com/c/C3c5lbVP) | Santiago | Validación y persistencia de partidas, totales y riesgos en el módulo de campañas. |
| [S2-04 · Financiamiento](https://trello.com/c/Q4m8tguD) | Santiago | Meta, moneda, modelo y fechas en las secciones del constructor y su API. |
| [S2-05 · Recompensas/preventas](https://trello.com/c/mQ72WcrQ) | Santiago | Recompensas persistidas y validación según modalidad; omisión en donación. |
| [S2-10 · Revisión final](https://trello.com/c/M7WEue5G) | Santiago | `CampaignSubmissionPanel`, resumen y faltantes vinculados a los pasos. |
| [S2-11 · Envío a revisión](https://trello.com/c/39GELv0D) | Santiago | `CampaignSubmission`, autorización y transición transaccional. |
| [S2-13 · Corrección y reenvío](https://trello.com/c/3zokcK8z) | Santiago | Edición en `CHANGES_REQUESTED`, observaciones, reenvío y conservación de rondas. |
| [S2-16 · Catálogo y detalle público](https://trello.com/c/6YyGoAQU) | Alison | API pública y `TypeormPublicCampaignRepository`; catálogo, filtros, detalle y exclusión de campañas privadas. |

Referencias verificadas: [casos de uso de secciones](../backend/src/campaigns/application/sections.ts), [envío](../backend/src/campaigns/application/submission.ts), [editor](../src/features/campaigns/CampaignSectionsEditor.tsx), [revisión y envío](../src/features/campaigns/CampaignSubmissionPanel.tsx), [repositorio público](../backend/src/campaigns/infrastructure/typeorm-public-campaign.repository.ts), [integración de campañas](../backend/integration/campaign-sections-submission.integration.test.ts) e [integración pública](../backend/integration/public-campaigns.integration.test.ts).

Durante la actualización previa de esta misma sesión pasaron `bun run check` y `pnpm run check`: 162 pruebas frontend, 147 backend y 8 del script ADMIN local, además de lint, tipos y compilación. No se repitieron en esta revisión documental. Tampoco se ejecutaron aquí las integraciones PostgreSQL ni un recorrido nuevo de la aplicación en navegador. El cierre técnico no equivale a aceptación externa del MVP.

## Sprint 3: Santiago

Todas estas tarjetas están planificadas y pendientes; las bases reutilizables no completan su alcance.

| Tarjeta | Base existente | Falta implementar/verificar | Dependencias de cierre |
| --- | --- | --- | --- |
| [S2-01 · Multimedia](https://trello.com/c/aW8N2PsG) | Servicio de archivos y portada de campaña. | Galería persistente, orden, previsualización/reemplazo y contenido audiovisual autorizado; proyección pública, validación de URL/tipo/tamaño, reintentos y preservación del borrador. | D03; delimitar recursos admitidos. |
| [S2-06 · Identidad de persona](https://trello.com/c/mXia80Q5) | Perfil, sesión y almacenamiento privado de documentos. | Caso KYC, datos/documentos acordados, cuenta destino, titularidad, envío y versiones. Cargar un archivo no debe aprobar identidad. | D03; decisión KYC de Ricardo en S2-08 y contactos en S3-26. |
| [S2-07 · Organización y KYB](https://trello.com/c/QzpTCGZ6) | Organización en borrador y comprobación de pertenencia. | Datos institucionales completos, representación autorizada, documentos, cuenta destino y caso KYB. | D03/D06; S2-08 y S3-26. |
| [S2-09 · Consultar/corregir verificación](https://trello.com/c/f2wKElZK) | No hay flujo de verificación de identidad; las observaciones de campaña pertenecen a otro proceso. | Estado del caso, observaciones, reemplazos/versiones y reenvío del titular, sin exposición pública de documentos. | S2-08, S3-26, D03/D09. |
| [S3-12 · Avances y seguimiento](https://trello.com/c/GfwdpFM3) | Planificación, hitos e indicadores esperados; tablas oficiales de actualizaciones/evidencias. | Captura de avances y resultados, fechas/responsables, evidencias, publicación autorizada y consulta pública/del patrocinador. | D05/D07/D10 y coordinación con ciclo de campaña S3-23. |
| [S3-13 · Rendición y cierre](https://trello.com/c/qbBmvUPd) | Presupuesto previsto y tablas oficiales de rendición. | Ejecución real, evidencias, comparación plan/real, fondos/saldo, resultados, revisión/aprobación y cierre conservando historial. | Desembolsos S3-08, avances S3-12, ciclo S3-23, D05/D10. |
| [S3-14 · Personas y organizaciones](https://trello.com/c/Tx8F84Ts) | Perfil propio, alta de organización y habilitación provisional de CREATOR. | Gestión autorizada de datos, miembros y representación; separación de privacidad, verificación y permisos; historial y restricciones acordadas. | S2-08, S3-16, D03/D06/D10. No implementar bajas destructivas sin autorización. |
| [S3-17 · Parámetros acordados](https://trello.com/c/RNolTk1j) | API de categorías, migración de catálogos y mecanismo de parámetros. | Interfaz administrativa, claves/valores aprobados, controles y auditoría. `AGREED_SETTINGS` sigue vacío expresamente. | D02/D10; D04 si afecta costos o importes. |
| [S3-24 · Panel del creador](https://trello.com/c/fxHKjdAl) | Lista/detalle propios, continuar/corregir borradores y cola administrativa existente. | Resumen por estados, indicadores reales, pendientes, campañas personales/institucionales y accesos a verificación, ejecución y rendición. | S3-12/S3-23; fuentes financieras S3-02/S3-08. |

## Sprint 3: Alison, a cargo de Santiago para esta ejecución

| Tarjeta | Base existente | Falta implementar/verificar | Dependencias de cierre |
| --- | --- | --- | --- |
| [S1-11 · Condiciones legales del registro](https://trello.com/c/Mk5I3PVJ) | Registro real y casilla provisional para datos de prueba. | Texto aprobado/versionado, aceptación verificable cuando corresponda, datos por perfil y avisos consistentes. | **Bloqueada en Trello** por D03/D08; contactos en S3-26. |
| [S2-18 · Selección del apoyo](https://trello.com/c/Fb0YQnbF) | Modalidades, recompensas y detalle público. | Elegir monto/beneficio, mínimos/cupos, persistir selección y revalidar en API al confirmar, con concurrencia y campaña elegible. | D02; checkout S2-19, importes/estados S3-02 y ciclo S3-23. |
| [S2-20 · Pagos de prueba](https://trello.com/c/UMGYVbmE) | Sin flujo de pago en frontend/API. | Simulación claramente rotulada de métodos y resultados, pendiente/fallo/expiración y reintentos con referencia conservada. | S2-19 y contrato de estados; S3-01/S3-02 para integración posterior. No acreditar dinero real con simulaciones. |
| [S3-03 · Panel del patrocinador](https://trello.com/c/GhSvBSpq) | Cuenta y catálogo público. | Resumen propio de aportes, favoritos/seguidos, novedades y enlaces a historial, devoluciones y casos; vacíos reales. | S3-02/S3-04/S3-12/S3-22. |
| [S3-04 · Mis aportes](https://trello.com/c/yH3AVvNa) | Tablas financieras oficiales; sin rutas/pantallas del historial. | Consulta propia paginada, filtros por fecha/estado y vínculos a aporte, comprobante, campaña y casos, incluso después del cierre. | S3-02/S3-05; devoluciones/disputas de Ricardo; D04/D09. |
| [S3-05 · Detalle y comprobante](https://trello.com/c/mAYpejK5) | Sin flujo de comprobantes. | Detalle autorizado, referencia verificable y comprobante solo cuando corresponda; no emitir recibo confirmado para pendientes/fallos. | S3-02/S3-04, D04/D07 y permisos S3-16. |
| [S3-10 · Incidencias](https://trello.com/c/wOJdAFK4) | Archivos privados y tablas de soporte. | Registro de tipo/descripción/evidencia, vínculo autorizado a campaña u operación y confirmación con referencia. | D05, S3-04/S3-05 cuando se vincule un aporte; resolución S3-11 de Ricardo. |
| [S3-22 · Favoritos/seguimiento](https://trello.com/c/kbrLkB1M) | Tabla `campaign_bookmark` con tipos `FAVORITE` y `FOLLOW`; no hay API/UI funcional. | Guardar/quitar sin duplicados, lista paginada, persistencia entre sesiones, privacidad y tratamiento de campañas finalizadas/canceladas. | Definir semántica de guardar/seguir; integración S3-03 y estados S3-23. |
| [S3-25 · Panel administrativo/alertas](https://trello.com/c/vlHnwFl7) | Cola de revisión de campañas y acceso provisional a usuarios. | Contadores, pendientes y alertas reales por responsabilidad; enlaces a módulos y control de acceso también en agregaciones. | S3-16, módulos de cumplimiento/finanzas/soporte, auditoría S3-15 y parámetros S3-17. |

## Evidencia de las diferencias con el código

- [Rutas del frontend](../src/app/routes/router.tsx) y [módulos backend](../backend/src/app.module.ts): no registran todavía los módulos completos de aportes, favoritos, verificación, ejecución, rendición o soporte.
- [Detalle público](../src/features/public/project-detail/ProjectDetailPage.tsx): avisa expresamente que aportes, checkout y pagos no forman parte de la etapa actual. La API pública devuelve historia, impacto esperado y recompensas, pero no una galería ni actualizaciones del proyecto.
- [Archivos](../backend/src/files/application/files.ts): finalidades actuales `PROFILE_AVATAR`, `ORGANIZATION_DOCUMENT` y `CAMPAIGN_PUBLIC_IMAGE`; imágenes públicas PNG/JPEG/WebP hasta 2 MiB y documentos privados admitidos hasta 5 MiB. No existe todavía la autorización documental por caso KYC/KYB.
- [Organizaciones](../backend/src/organizations/infrastructure/organization.controller.ts): alta y consultas propias, tipos y pertenencia; esto no completa la administración de miembros/representación ni KYB.
- [Administración de creadores](../backend/src/roles/infrastructure/creator-administration.controller.ts): búsqueda y habilitación provisional de CREATOR; no equivale a S3-14 ni a la matriz completa de S3-16.
- [Parámetros](../backend/src/catalogs/domain/setting.ts): lista de claves admitidas vacía mientras las reglas no estén acordadas. La API de categorías ya existe y debe reutilizarse.
- [Estados de campaña](../backend/src/campaigns/domain/lifecycle.ts): implementación del alcance de Fase 3; no es el cierre integral del ciclo financiero/ejecución de S3-23.
- [SQL oficial](../infra/postgres-v2/official-schema.sql): contiene `verification`, `verification_document`, `payout_account`, `contribution`, `payment`, `support_case`, `campaign_update`, `evidence`, `accountability_report` y `campaign_bookmark`. Reutilizar su estructura tras contrastar contratos; no restaurar el SQL ni modificarlo para actualizar una instalación existente.

## Inconsistencias del tablero

1. **S1-11 figura marcada completa y con checklist 3/3**, pero su descripción vigente dice “reabierta” y está en Bloqueadas. Falta el contenido legal definitivo, y el código lo reconoce. Se cuenta como pendiente de Sprint 3.
2. Algunas descripciones históricas mantienen responsables anteriores: S2-06/S2-07/S2-09 nombran Alison en el antecedente, aunque el miembro actual es Santiago. Se usó la asignación vigente, coherente con el plan v2.4.
3. S3-22/S3-24/S3-25 conservan “responsable: por asignar” en la descripción, aunque tienen miembro asignado. Sus criterios están en el texto; no interpretar ausencia de items de checklist como trabajo completado.
4. Varias tarjetas de Sprint 2 conservan “Estado: pendiente” en texto histórico pese a estar cerradas y tener checklist 3/3. La evaluación combina lista, checklist, texto vigente y evidencia del repositorio.
5. Los IDs S2-01/S2-06/S2-07/S2-09/S2-18/S2-20 corresponden actualmente a Sprint 3. S1-11 también es un arrastre. No duplicar tarjetas ni contarlas otra vez dentro de Sprint 2.

Esta revisión registra las discrepancias; no las corrige en Trello sin revisar qué campos deben actualizarse.

## Decisiones y dependencias todavía abiertas

Las tarjetas D02–D10 mantienen decisiones pendientes. Hay acuerdos parciales de Fase 3 y ADR provisionales en el repositorio; no equivalen a aprobación de todas las reglas del MVP.

| Fuente | Decisión pendiente que afecta a este alcance |
| --- | --- |
| [D02](https://trello.com/c/H3kIcMkw) | Reglas de campaña, mínimos, cupos, modelos y límites. |
| [D03](https://trello.com/c/JXResoAl) | Datos/documentos KYC/KYB, cuentas destino, acceso, formatos/límites y retención. |
| [D04](https://trello.com/c/LbEF2I0u) | Proveedor, moneda, costos, custodia y autorizaciones financieras; no usar bancos o porcentajes de ejemplo como acuerdos. |
| [D05](https://trello.com/c/CnGwkc43) | Edición posterior, cierre, cancelación, incidencias, devolución, escalamiento y aprobación de rendición. |
| [D06](https://trello.com/c/kkAwBA9d) | Matriz de responsabilidades, compatibilidad de perfiles y representación. |
| [D07](https://trello.com/c/GwVgEtb1) | Información mínima de recompensas; el MVP excluye logística de paquetes. |
| [D08](https://trello.com/c/vsAI03Ln) | Textos legales, políticas de verificación/contacto y comunicaciones operativas. |
| [D09](https://trello.com/c/yoZWNskF) | Transiciones y etiquetas de aporte, pago, devolución, desembolso y disputas, conservando estados separados. |
| [D10](https://trello.com/c/bg81cnOO) | Vistas y acciones de ejecución, rendición, administración y parámetros. |

Los bloqueos no impiden toda implementación técnica. Impiden declarar terminado el criterio dependiente o inventar reglas, datos o integraciones para aparentar el cierre.

## Secuencia propuesta para implementar las 18 tarjetas

1. **Galería y favoritos/seguimiento — S2-01 y S3-22.** Extender los flujos actuales y reutilizar archivos/adjuntos y `campaign_bookmark`. Es el bloque con menor dependencia financiera y proporciona una primera entrega comprobable.
2. **Avances y panel del creador — S3-12 y S3-24.** Reutilizar planificación, indicadores y proyectos propios. Coordinar estados permitidos y separar los indicadores financieros todavía dependientes de Ricardo.
3. **Personas, organizaciones, KYC/KYB y parámetros — S3-14, S2-06, S2-07, S2-09 y S3-17.** Acordar datos, acceso y representación; construir captura/corrección y consumir las decisiones de cumplimiento de Ricardo.
4. **Selección, pago de prueba, historial y comprobantes — S2-18, S2-20, S3-04 y S3-05.** Acordar contratos con S2-19/S3-02. Mantener simulación separada de confirmaciones financieras reales.
5. **Panel patrocinador, incidencias y panel administrativo — S3-03, S3-10 y S3-25.** Consumir los módulos anteriores y los de Ricardo; no crear cifras de ejemplo ni exponer agregaciones sin permiso.
6. **Rendición y registro definitivo — S3-13 y S1-11.** Completar con las fuentes financieras, decisiones de aprobación y textos legales autorizados.

Cada bloque debe incluir dominio, API, persistencia, interfaz, pruebas negativas/propiedad, pruebas PostgreSQL y comprobación de navegador antes de considerarse terminado. Mantener regresiones S1/S2. No se incluyen commits, push, publicación ni movimientos de Trello sin la autorización correspondiente.

### Diseño inicial propuesto para el primer bloque

- **Galería:** integrar una sección en el constructor existente y su detalle público. Reutilizar `Files`, `file_attachment` y autorización de edición del borrador; guardar orden y leyendas, reemplazar asociaciones sin borrar archivos/datos históricos, y mostrar errores por recurso sin perder el resto del formulario. Conservar los límites técnicos actuales de imágenes mientras se acuerdan los adicionales. El contenido audiovisual debe usar URL HTTPS de proveedores explícitamente admitidos; formatos/proveedores adicionales quedan por definir, sin habilitar URLs arbitrarias ni descargas desde el servidor.
- **Favoritos y seguimiento:** propuesta de dos acciones distintas sobre la tabla existente: **guardar** para una lista personal y **seguir** para consultar novedades en el panel. No crear dos tablas ni duplicar los importes del proyecto. Mutaciones idempotentes por sesión/propietario, paginación, estado persistente y acceso denegado a selecciones ajenas; campañas cerradas conservan referencia y no habilitan apoyo. La semántica debe confirmarse porque la propia tarjeta la deja abierta.
- **Pruebas de aceptación del bloque:** dos usuarios, nueva sesión, recarga, concurrencia/doble clic, recurso privado/ajeno, carga fallida/reintento, campaña no pública o cerrada, orden de galería y uso móvil/teclado. Los cambios del esquema/permisos, si resultan necesarios, se aplican mediante migraciones o preparación explícita, sin restaurar la base ni tocar el SQL oficial.

Esta propuesta no resuelve por sí sola D03 ni autoriza documentos legales, movimientos financieros, roles nuevos o políticas del cliente. La siguiente implementación debe conservar esas dependencias como pendientes de cierre hasta contar con evidencia.
