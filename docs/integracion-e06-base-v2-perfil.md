# E06 · Adopción de la nueva base y edición del perfil

> Actualización posterior: [ADR-002](decisiones/ADR-002-acceso-basico-sin-verificacion.md) permite acceso básico y edición de perfil también a cuentas pendientes, sin alterar su estado ni verificaciones. Las referencias siguientes a ACTIVE-only describen el corte histórico.

Fecha: 16/09/2026. Alcance: incremento local del proyecto; no implica despliegue, push, cierre del backlog ni finalización de toda la entrega.

## Decisión y compatibilidad

Se adopta el SQL provisional nuevo de coordinación, sin modificar su contenido. [Instalación, arranque y conservación](../infra/postgres-v2/README.md). Base anterior intacta, V2 separada en 15433; no se trasladaron datos de la anterior. La API usa la nueva conexión y conserva el respaldo de la anterior fuera de Git.

Cambios relevantes: 59 tablas frente a 54; nuevas actividades de campaña, evaluación de confianza, eventos de pago, cumplimiento de recompensas, adjuntos y eventos de producto. `file_attachment` sustituye a `file_link`. Cambian vistas de confianza/reputación y validaciones relacionales. Se añadieron validaciones temporales para tokens. Esto no significa que esos módulos estén implementados.

Se ajustó `UserProfileSchema` a las 15 columnas, incluida `administrative_area_id` nullable. Usuarios conservan 15 columnas y tokens 10. Una prueba adicional tenía un conteo incorrecto de 11 tokens: se corrigió contrastándolo con el SQL y la base real, sin inventar una columna. La revocación usa el reloj de PostgreSQL para respetar sus validaciones temporales. TypeORM mantiene desactivadas sincronización, eliminación y migraciones automáticas.

El SQL nuevo mantiene correo único por cuenta no eliminada, pero no el índice único de teléfono anterior. Se conserva validación de formato y pareja prefijo/número en la API; no se impone unicidad telefónica no definida por esta base.

## Perfil propio conectado

`GET /api/profile`: devuelve exclusivamente correo, nombre, apellido, prefijo y teléfono del usuario autenticado.

`PATCH /api/profile`: recibe los cuatro campos básicos (correo solo lectura):

```json
{"firstName":"Ana","lastName":"Prueba","phoneCountryCode":"+591","phoneNumber":"70001234"}
```

- Nombre y apellido: 1–120 caracteres tras recortar espacios exteriores.
- Teléfono opcional: ambos campos vacíos lo eliminan; de otro modo prefijo `+` con 1–5 dígitos y número con 4–30 dígitos. Son límites técnicos provisionales, no una verificación telefónica.
- Cookie de sesión válida y cuenta activa; el servidor obtiene la identidad, nunca acepta un `userId` del formulario.
- Mutaciones con cabecera `X-Brotar-Request: 1`, comprobación de origen y SameSite.
- Rechazo de atributos extra: estado, roles, correo, contraseña y verificaciones no se cambian aquí.
- Actualización transaccional; conserva bio, ciudad, área administrativa y otros campos. Cambiar/quitar teléfono invalida únicamente su verificación anterior; conservar el mismo no la elimina.
- Respuestas sin caché. 400 datos inválidos; 401 sesión/cuenta no disponible; 403 origen/cabecera no permitidos; errores internos sin SQL ni datos privados.

`/mi-cuenta` carga los datos reales y permite guardar/descartar cambios. Maneja carga, validación, guardado, error y sesión vencida. No muestra éxito si el servidor no lo confirma ni almacena sesiones en localStorage. Los nombres se muestran como texto React, no como HTML.

## Verificación ejecutada

- Backend: ESLint, TypeScript, compilación y **41 pruebas** sin base superadas.
- Frontend: ESLint, TypeScript, compilación y **58 pruebas** superadas.
- PostgreSQL: **4 pruebas de integración** superadas (mapeo/persistencia, registro, sesiones, perfil).
- Persistencia comprobada tras reiniciar el contenedor V2 y la API.
- Perfil: rechazo anónimo, campos inválidos, aislamiento entre dos cuentas propias de prueba, conservación de campos, cambios/borrado de teléfono y rechazo después de logout.
- Credenciales/entornos nuevos y respaldo anterior excluidos de Git.
- Navegador: redirección sin sesión, login con fixture activo temporal, validación de teléfono incompleto, guardado correcto, persistencia visible tras recargar y logout. La cuenta temporal y sus sesiones fueron eliminadas después de comprobar el flujo.

## Pendientes reales

1. Manejo inicial de roles y asignación conforme a las decisiones confirmadas; no autoasignar roles internos.
2. Registro de organizaciones y relación con su usuario, más sus pruebas.
3. Confirmar con coordinación la activación/verificación de cuentas. Nuevos registros siguen `PENDING_VERIFICATION`; no se envían correos ni se activa automáticamente.
4. Verificación final de la entrega integrada y actualización coordinada del seguimiento.

Campañas públicas y recuperación siguen siendo demostraciones. Pagos, crowdfunding completo y reglas de negocio no confirmadas no se incorporan a este incremento. Los Word/PDF del backlog y Trello no se modificaron en este paso; este documento registra el avance técnico.
