# S3-10 · Incidencias · actualización 25/10/2026

Se implementa registro, lista paginada y consulta de incidencias propias sobre una campaña administrada o un aporte del titular, además de reportes de terceros para campañas publicadas. Cada alta devuelve la referencia real `BRT-S-…` y el estado `OPEN` del esquema oficial. La pantalla conserva los campos ante errores, permite reintentar la misma solicitud y bloquea nuevas ediciones si la confirmación de una escritura es desconocida. El detalle conserva descripción, adjuntos privados y mensajes de seguimiento no internos.

## Contratos y conservación

- Frontend: `/mis-incidencias`, `/mis-incidencias/:id` y `/mis-incidencias/nueva?campaignId=…&contributionId=…`. El aporte puede omitirse en incidencias no financieras de una campaña propia/administrada; los casos de pago, devolución o recompensa exigen un aporte propio. Sin contexto, se ofrecen accesos a los aportes y al panel del creador para seleccionarlo.
- API: `GET /api/me/support-cases?page=1`, `GET /:id`, `GET /context?campaignId=…&contributionId=…` y `POST /api/me/support-cases`.
- El POST recibe `requestId`, contexto, `category`, `subject`, `description`, `evidenceFileIds` y `confirmed`. No recibe propietario, estado, prioridad, decisión ni importe. El usuario siempre proviene de la sesión.
- Tipos procedentes de BG-49/S3-10: pago no reconocido, consulta sobre devolución, información incorrecta, recompensa no recibida, proyecto aparentemente no ejecutado y otra incidencia. `REFUND_REQUEST` registra una consulta de soporte: no crea una devolución financiera ni garantiza su aprobación.
- Pago no reconocido, consulta sobre devolución y recompensa no recibida requieren vincular un aporte del propio titular; el servidor comprueba titularidad y coincidencia con la campaña. Información incorrecta y aparente falta de ejecución se pueden reportar sobre una campaña publicada sin aporte. Los reportes públicos se limitan a esas dos categorías. `OTHER` requiere contexto propio o de gestión autorizado.
- Los límites técnicos son 200 caracteres de asunto, 10000 de descripción y 10 archivos. Los archivos reutilizan `SUPPORT_EVIDENCE`, privacidad `PRIVATE`, tipos PDF/PNG/JPG/WebP y máximo existente de 5 MB. Se verifica dueño, propósito, privacidad y disponibilidad en PostgreSQL antes de vincularlos.
- La migración `SupportCases1792627200004` conserva las tablas oficiales. Añade `brotar_extension.support_case_context` para el aporte y la idempotencia, y `brotar_extension.support_case_evidence` para los adjuntos; no modifica `official-schema.sql` ni `file_attachment`.
- La eliminación de archivos consulta los vínculos de evidencia; un adjunto usado no admite baja. No se fija política de retención ni se elimina documentación existente.

## Privacidad y reintentos

Toda lectura filtra `support_case.user_id` por la sesión. Un aporte debe pertenecer al usuario y coincidir con la campaña enviada. Para una campaña institucional se exige membresía vigente OWNER, LEGAL_REPRESENTATIVE o ADMIN; haber creado la campaña no sustituye esa membresía. La vista del contexto evita revelar el título actual de una campaña ajena privada, aunque conserve una fecha histórica de publicación.

El historial excluye `is_internal=true`, no devuelve identidad del personal ni documentos de otras cuentas. Los adjuntos se abren por el endpoint autenticado existente; no se generan enlaces públicos.

Los POST tienen comprobación de roles y origen, y AUDITOR mantiene lectura aunque acumule ADMIN. El repositorio revalida el rol después de esperar por el bloqueo de idempotencia y antes de escribir, y vuelve a comprobar el contexto tras bloquear los archivos. La interfaz bloquea una escritura si el servidor informa que sus permisos cambiaron.

`user_id + request_id` es único. Un bloqueo transaccional serializa los reintentos: el mismo contenido recupera la referencia, y un contenido distinto con la misma clave produce 409. La operación y su auditoría se confirman juntas. Auditoría guarda identificadores, categoría, estado y número de adjuntos; no duplica el texto privado, nombres de archivos, cookies, contraseñas o datos de tarjeta.

Las claves de reintento se conservan durante el formulario activo. Tras abandonar o recargar un formulario sin confirmación, debe consultarse la lista de casos antes de crear un reporte nuevo; no se persiste texto privado del formulario en el navegador.

## Bandeja y atención administrativa vigente

La bandeja `/administracion/soporte` consulta casos no financieros y excluye expedientes que pertenecen al módulo de disputas. `SUPPORT` puede leer expedientes y evidencia autorizada; solo `support.resolve` permite asignar a personal SUPPORT, enviar mensajes compartidos y avanzar estados con motivo. Se mantienen las transiciones permitidas por el flujo implementado, con auditoría y eventos append-only de estado/actor/motivo/fecha en `brotar_extension.support_case_event` (migración 31). Las evidencias se descargan autenticadas, con auditoría de lectura; no se generan enlaces públicos. Las solicitudes `REFUND_REQUEST` no ordenan reembolsos ni sustituyen el módulo de disputas.

**D05 sigue pendiente:** esta implementación no fija prioridades, plazos de atención, escalamiento automático ni una política universal de cierre; tampoco autoriza movimientos financieros. El equipo responsable debe aprobar y registrar esas reglas antes de ampliar el flujo. No se concede acceso a evidencias privadas fuera del permiso y expediente autorizados.

## Decisiones pendientes para el equipo responsable

Fuente principal: [S3-10](https://trello.com/c/wOJdAFK4), captura Trello 22/10/2026, BG-49 del backlog general y sección 11 de `docs/requisitos/Brotar_Equipo_3_Patrocinador_y_Administracion.pdf`.

1. **[D05 · Revisión y resolución](https://trello.com/c/CnGwkc43):** acordar quién atiende, transiciones, prioridades, escalamiento y plazos. La aprobación parcial de Fase 3 trata revisión de campañas; no resuelve todas las reglas de soporte. No se inventaron SLA ni cierres automáticos.
2. **S3-11 y operaciones financieras:** las disputas mantienen su flujo y permisos separados. Las consultas pueden señalar el aporte, pero autorizar o mover dinero pertenece a S3-09/S3-11 y requiere D04/D05/D09 y autorización financiera.
3. **Datos sensibles:** acordar retención y reglas institucionales de representación conforme D03/D06. El personal SUPPORT solo accede a evidencia autorizada del expediente y queda registro de lectura.

La implementación técnica no cierra las decisiones ni acredita aceptación de S3-21.

## Evidencia reproducible

Desde la raíz: `bun run typecheck`, `bun run test`, `bun run build`. Desde `backend`: `pnpm run typecheck`, `pnpm run test`, y:

```sh
pnpm exec tsc -p tsconfig.test.json
ALLOW_DB_TEST_WRITES=true DB_TEST_RESTART=false node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/support-cases.integration.test.js
```

Resultado final del corte: suite backend 174/174 y prueba PostgreSQL de incidencias 1/1. Frontend: typecheck, build y suite 188/188 pasan. El lint de los archivos de catálogos e incidencias pasa. Vite advierte que el paquete principal excede 500 kB.

La prueba real crea fixtures con UUID aleatorios, usa almacenamiento temporal de archivos y limpia únicamente esos fixtures. Cubre propiedad, contexto mismatched, título privado tras retirar publicación, membresía degradada/revocada, evidencia ajena/propósito incorrecto, idempotencia con envíos concurrentes, conflicto de clave, historial sin mensajes internos, descarga privada, protección de eliminación, auditoría y veto AUDITOR+ADMIN. Comprueba también que las tablas financieras no cambian.

El primer ensayo detectó una preparación de membresía incompatible con el trigger oficial; se corrigió el fixture creando con OWNER y degradando después. Una prueba adicional reprodujo la exposición indebida del título de un borrador con `published_at` histórico; se restringió el contexto a estados públicos/históricos permitidos y la prueba pasó.

El agente padre coordina el navegador compartido (móvil, teclado, carga/vacío/error/reintento). No se afirma su verificación desde este documento. Los ensayos backend que abren `127.0.0.1` necesitan ejecución permitida fuera del sandbox de sockets; el primer intento devolvió EPERM y se reejecutó con ese permiso.
