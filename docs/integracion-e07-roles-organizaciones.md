# E07 · Roles iniciales y registro de organizaciones

> Actualización posterior: [ADR-002](decisiones/ADR-002-acceso-basico-sin-verificacion.md) sustituye la restricción de login descrita en este corte histórico. Las cuentas pendientes ya pueden iniciar sesión y registrar organizaciones DRAFT con su rol básico, sin activación manual.

Incremento local sobre PostgreSQL provisional V2. No implementa campañas, pagos, administración completa ni verificación KYB.

## Roles iniciales

El registro ahora guarda usuario, perfil y vínculo `REGISTERED_USER` en una sola transacción. El estado continúa siendo `PENDING_VERIFICATION`: tener este rol **no activa la cuenta ni permite iniciar sesión**. Si falta el catálogo básico, la transacción falla sin dejar una cuenta parcial.

`GET /api/access/roles` devuelve solo los roles vigentes del usuario autenticado: asignación iniciada, no revocada y no vencida. La fuente es `role` + `user_role`, no el formulario, localStorage ni una lista dentro de la cookie. Los roles de referencia del SQL (usuario, creador, patrocinador, administrador y los internos adicionales) se conservan sin redefinirlos.

`RoleGuard` y `RequireRoles` preparan las restricciones por rol. Las rutas de organizaciones exigen sesión activa y `REGISTERED_USER` vigente. No existe excepción automática para ADMIN ni un endpoint para concederse roles. Un nuevo login no restituye roles revocados. La matriz avanzada de `permission`/`role_permission` sigue sin inventarse ni rellenarse.

Las cuentas creadas antes de E07 no se modifican automáticamente. Si carecen del rol básico, la pantalla lo indica; su regularización debe aprobarse y ejecutarse de forma revisada. No se asignan automáticamente CREATOR, SPONSOR, ADMIN ni roles internos.

## Organizaciones conectadas

Desde `/mi-cuenta`, una cuenta habilitada con rol básico ve «Mis organizaciones», que abre `/mis-organizaciones`.

| API | Función |
| --- | --- |
| GET `/api/organizations/types` | Tipos activos oficiales de PostgreSQL, sin catálogo hardcodeado |
| GET `/api/organizations` | Organizaciones con membresía vigente del usuario actual |
| GET `/api/organizations/:id` | Datos de una organización vinculada; 404 igual para ajena o inexistente |
| POST `/api/organizations` | Organización y membresía propia creadas en una transacción |

El formulario recoge nombre legal, nombre comercial, tipo, correo de contacto y teléfono opcional. Nombres de 1–200 caracteres, correo válido hasta 254 y teléfono de hasta 40. Prefijos, espacios, paréntesis y guiones telefónicos son admitidos. El tipo debe existir y estar activo; se valida de nuevo en el servidor. Puede repetirse el nombre legal como nombre comercial. Estos límites son de entrada, no reglas de verificación legal.

El servidor genera UUID y slug técnico (`org-<uuid>`), toma `created_by` de la sesión y crea una membresía `OWNER`. Esta significa titular del registro dentro de Brotar, **no representación legal verificada ni administrador global**. La organización conserva el valor oficial `DRAFT`. No se asignan roles globales por registrar una empresa. Se rechazan campos adicionales como usuario, estado, membresía o verificaciones.

La UI tiene carga, vacío real, error, validación, guardado y confirmación. Ante respuesta incierta advierte revisar el listado antes de reenviar; no hay idempotencia completa ni deduplicación legal en esta etapa. No se exige NIT, documentos, actividad económica ni criterios KYB aún no confirmados. No incluye edición de organización, invitaciones, gestión de miembros, eliminación ni publicación.

## Permisos e instalación

Si V2 ya estaba instalada, ejecutar desde la raíz, con Docker iniciado:

```powershell
./infra/postgres-v2/grant-e07.ps1
cd backend
pnpm run check
pnpm run start
```

Detener primero la API existente si ocupa el puerto 3000. El script verifica el proyecto Compose de destino. Los permisos son idempotentes y se aplican solo a `brotar_app`: SELECT de roles/asignaciones/tipos, INSERT de asignaciones y SELECT/INSERT de organizaciones/membresías. No concede UPDATE/DELETE de roles u organizaciones, DDL ni permisos administrativos. El instalador V2 incorpora estos permisos para instalaciones nuevas. No reinstalar el SQL oficial sobre una base poblada.

La consulta y escritura de estos módulos usan SQL parametrizado dentro de los repositorios TypeORM de Infrastructure. El esquema oficial no se alteró, y siguen desactivados `synchronize`, `dropSchema` y migraciones automáticas.

## Verificación reproducible

Resultado local: **43 pruebas backend**, **61 frontend** y **5 de integración** superadas; lint, TypeScript y compilaciones correctas. En navegador se verificaron rol visible, formulario vacío con validación, catálogo real, guardado como borrador, persistencia al recargar y cierre de sesión. Se eliminaron la cuenta, organización y relaciones temporales de la comprobación.

```powershell
# Desde backend, con la configuración local V2:
pnpm run check
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='true'
try { pnpm run test:integration }
finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
}
# Desde la raíz, en otra terminal:
bun run check
```

La prueba E07 comprueba rol básico con cuenta pendiente, tipos oficiales y rechazo de tipo inexistente/inactivo, datos inválidos, cabecera/origen de mutación, borrador con membresía propia, aislamiento entre dos usuarios, persistencia tras reiniciar API, retirada de membresía, vencimiento/revocación de roles y no restitución por login. Una falla inyectada exclusivamente en el adaptador de prueba al crear la membresía verifica rollback del INSERT real de la organización. No crea triggers de prueba ni modifica el esquema.

La suite utiliza administración por `docker exec` únicamente para preparar/revocar/eliminar fixtures de ESTA ejecución, identificados por UUID, en el contenedor y puerto V2 verificados. Esos permisos no existen en la API. No usar sobre producción. Tras terminar elimina organizaciones, usuarios, sesiones, roles asignados y el tipo inactivo temporales; una interrupción brusca puede requerir limpieza revisada.

## Pendientes de la entrega

- Confirmar activación/verificación de nuevos usuarios: sigue siendo el bloqueo del recorrido autónomo registro → login; no se ha simulado su resolución.
- Revisión integral de la entrega, observaciones de los líderes y preparación de una demostración con cuentas de prueba habilitadas mediante un procedimiento acordado.
- Reglas avanzadas de roles/KYB y módulos del crowdfunding pertenecen a etapas posteriores.
- Este incremento no cambia Trello ni regenera el backlog Word/PDF, no hace commit ni push y no constituye un despliegue productivo.
