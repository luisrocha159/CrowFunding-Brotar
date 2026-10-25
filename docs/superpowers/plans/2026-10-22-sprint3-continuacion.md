# Continuación Sprint 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for independent tasks; coordinate shared registrations and database/browser tests in the parent.

**Goal:** Implementar el alcance viable de las 18 tarjetas Santiago/Alison y registrar con evidencia las decisiones que Ricardo debe resolver.

**Architecture:** Extender los módulos Nest/React existentes y reutilizar SQL oficial. No inventar estados, fuentes financieras ni obligaciones legales. Las consultas de operaciones existentes pueden implementarse aunque la creación/decisión financiera corresponda a Ricardo.

**Tech Stack:** React, NestJS, TypeORM y PostgreSQL instalados, sin nuevas dependencias.

**Spec:** docs/revision-sprint-3-santiago-alison-2026-10-22.md; tarjetas completas en /tmp/brotar-trello-audit-2026-10-22.json. Usuario autorizó continuar todo el 22/10; pide informar al final lo que falte para Ricardo.

## Global Constraints

- SantiagoDev; no commit/push/deploy/Trello. No borrar datos preexistentes ni modificar official-schema.sql.
- Propiedad validada en SQL y API; roles vigentes y AUDITOR solo lectura.
- Pruebas de comportamiento antes de implementar; no cerrar tareas bloqueadas con fixtures o estadísticas ficticias.
- Leer decisiones/ADR y requisitos originales; distinguir decisiones técnicas reversibles de aprobación de reglas de negocio.
- Padre modifica router.tsx, app.module.ts, campaign.module.ts y registro de migraciones; agentes entregan instrucciones de conexión.
- Pruebas PostgreSQL y navegador coordinadas por padre para preservar datos y evitar interferencia.

## Review Focus

- Datos privados de cuentas/organizaciones y agregaciones por responsabilidad.
- Distinción entre intención de apoyo, pago real, simulación, devolución y disputa.
- Fechas y dinero con precisión; referencias ajenas y campañas cerradas.
- Fallos de red, recarga, doble envío y edición concurrente.
- Documentos requeridos/aprobación legal ausentes: capacidad configurable no equivale a política aprobada.

### Task 1: Consultas de aportes y panel patrocinador

**Owner:** agente financial_read. **Files:** backend/src/contributions/**, src/features/contributions/**, pruebas propias y migración de permisos. No modificar registros globales.

**Interfaces:** GET /me/contributions (page, status, from, to), GET /me/contributions/:id, GET /me/contributions/:id/receipt (solo pago confirmado verificable), GET /me/sponsor-summary. DTOs con estados separados, importes como decimal string, páginas acotadas, usuario de sesión.

- [x] Contrastar SQL/ADR/Trello S3-03/04/05 y escribir pruebas de privacidad/filtros/estado.
- [x] Consultas reales, historial tras cierre y comprobante informativo autenticado sin datos de tarjetas ni datos logísticos.
- [x] UI de lista/detalle/panel con estados y enlaces solo a rutas implementadas.
- [x] Evaluar S2-18/20; implementar selección/simulación solo con contratos explícitos y aislamiento total de dinero real. Documentar decisiones que faltan.

### Task 2: Catálogos administrativos

**Owner:** agente catalogs_ui. **Files:** src/features/catalogs/**, backend/src/catalogs/** si es necesario; pruebas y docs propias.

**Interfaces:** consumir contratos existentes de categorías/settings; no poblar AGREED_SETTINGS sin aprobación. Reportar ruta /administracion/catalogos para registro en padre.

- [x] Pruebas de formularios/cliente y protección de referencias/roles existentes.
- [x] UI crear/editar/activar/desactivar categorías, consultar parámetros acordados, auditor solo lectura; no modificar deliberadamente catálogos al reejecutar preparación.
- [x] Evidencia de alcance S3-17 y claves/reglas bloqueadas para Ricardo.

### Task 3: Identidad, organizaciones y legal

**Owner:** agente identity_policy. **Files:** nuevos backend/src/verifications/** y src/features/verifications/**; organizaciones/perfil solo tras informar archivos; docs/pendientes-ricardo-identidad.md.

**Interfaces:** por definir tras revisar documentos; casos propios por usuario y organización administrada, tipo de verificación vigente, estados y observaciones existentes, ningún autoaprobado. Documentos privados; requisitos exactos leídos de configuración/decisión, nunca inventados.

- [x] Buscar acuerdos D03/D06/D08 en docs, requisitos DOCX/PDF y Trello; registrar evidencia exacta.
- [x] Implementar partes autorizadas de S2-06/07/09 y S3-14 con pruebas; si falta política necesaria, entregar límite concreto sin inventarla.
- [x] S1-11 solo con texto legal aprobado/versionado; si no existe, registrar bloqueo y mantener consentimiento provisional explícito.

### Task 4: Avances y panel del creador

**Owner:** padre. **Files:** backend/src/campaign-progress/**, src/features/campaign-progress/**, src/features/dashboards/** y registro global.

**Interfaces:** GET de planificación/avance propios, PUT avance por campaña con versión y referencias propias; novedades en borrador con publicación autorizada y lectura pública separada. Capturar valores logrados distintos de metas. Panel usa campañas propias y pagos confirmados netos por moneda, excluyendo sandbox, nunca suma monedas distintas.

- [x] Pruebas de propiedad, fechas, resultados, evidencias y edición permitida.
- [x] Implementar gestión y consulta con permisos explícitos; preservar historial y no alterar ciclo financiero.
- [x] Panel con pendientes y enlaces a funciones disponibles; indicar dependencias restantes de S3-23.

### Task 5: Incidencias, administración y rendición

**Owner:** padre, después de integrar contratos anteriores.

- [x] Revisar D05/D10 y fuentes; crear incidencias propias con referencia y evidencia autorizada, sin inventar plazos ni resolver casos (S3-11 de Ricardo).
- [x] Panel administrativo: agregaciones autorizadas de módulos existentes y aviso de módulo aún no disponible, sin cero ficticio.
- [x] Rendición: trabajar desde registros reales y reglas autorizadas; no aprobar ni cerrar financieramente campañas sin contrato.

### Task 6: Integración y evidencia

- [x] Revisión por tarea y revisión final, pruebas frontend/backend/PG/navegador, resolver hallazgos importantes.
- [x] Actualizar documentación con estado de cada tarjeta y lista accionable para Ricardo. No marcar 18/18 completo si falta criterio.

## Registro

El primer bloque (galería/favoritos) implementado y verificado separadamente. Esta continuación conserva todos sus cambios sin commit. No se solicitó nuevamente aprobación; la autorización del usuario incluye completar lo que falta e informar acuerdos ausentes al final.

## Entrega

Implementación local integrada, conservando las dependencias de negocio. Ver [estado de las 18 tarjetas y pendientes de Ricardo](../../entrega-sprint3-santiago-alison-2026-10-22.md). Los checks completados corresponden al trabajo técnico definido en este plan; no declaran cerradas las tarjetas parciales o bloqueadas.
