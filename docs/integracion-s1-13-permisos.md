# S1-13 · Permisos del flujo creador (BG-53)

Refinamiento de permisos y pertenencia sobre la base V2. Responsable: Santiago (rama `SantiagoDev`). Depende de E07, cerrada técnicamente, y de **D06, que sigue abierta**.

## Qué se implementó

**Responsabilidades separadas (CA 1).** Las ocho responsabilidades se declaran en `src/roles/domain/responsibility.ts` y coinciden con el catálogo oficial: `CREATOR`, `SPONSOR`, `REVIEWER`, `COMPLIANCE`, `FINANCE`, `SUPPORT`, `ADMIN`, `AUDITOR`. `REGISTERED_USER` queda fuera a propósito: no es una responsabilidad, es lo único que entrega el registro público.

**Permisos comprobados en la API (CA 2).** `PermissionAccess` resuelve contra `public.role_permission` considerando solo roles vigentes (concedidos, no revocados, no caducados). El decorador `RequirePermissions` declara lo que exige cada endpoint; `RoleGuard` lo aplica. Un requisito vacío deniega: un endpoint sin declarar su permiso no queda abierto por omisión.

**Pertenencia comprobada en la API (CA 2).** `Memberships` responde qué rol tiene el usuario en una organización, leyendo la membresía vigente sobre organización no eliminada. `GET /api/organizations/:id/membership` lo expone para el flujo creador de S1-16. Un no miembro recibe 404, sin distinguir entre inexistente y ajena.

**Auditor en lectura (CA 3).** `deniesMutation` rechaza `POST`, `PUT`, `PATCH` y `DELETE` a quien ostenta `AUDITOR`. La prueba cubre el caso de acumular `AUDITOR` y `ADMIN`: la restricción **no** se levanta.

**Sin privilegios por registro público (CA 3).** Ya estaba: el registro concede solo `REGISTERED_USER` exigiendo `is_internal=false`. Queda cubierto por prueba.

## Concesión de lectura añadida

`infra/postgres-v2/grant-s1-13.sql` concede a `brotar_app` **solo `SELECT`** sobre `public.permission` y `public.role_permission`. Sin ella la comprobación de permisos falla en ejecución con `permission denied for table role_permission`; se detectó al probar contra la base real, no en revisión. No concede escritura sobre el catálogo, no define permisos de negocio y no activa usuarios. El instalador la aplica y el manifiesto la registra junto a `grant-e07.sql`.

## Decisión conservadora que conviene revisar

`AUDITOR` bloquea toda escritura **aunque el usuario acumule otros roles**. El criterio dice «mantener al auditor en lectura» sin precisar qué ocurre con perfiles combinados. Se eligió denegar porque restringir es reversible y conceder no lo es. Si D06 resuelve que un `ADMIN` que también audita debe poder escribir, se ajusta `READ_ONLY_ROLES` y su prueba.

## Lo que NO cierra la historia

- **`permission` y `role_permission` están vacías.** El mecanismo existe y está probado con una concesión temporal que la prueba crea y retira; el catálogo real de permisos depende de **D06** y no se inventa aquí.
- El conjunto `ORGANIZATION_MANAGERS` (`OWNER`, `LEGAL_REPRESENTATIVE`, `ADMIN`) es un valor conservador de partida, no un reparto aprobado. `MEMBER` queda fuera de la gestión mientras D06 no lo confirme.
- Las responsabilidades financieras se completan en **S3-16**, fuera de este sprint y de este reparto.
- Ningún endpoint declara todavía `RequirePermissions`: hacerlo sin catálogo dejaría el módulo inaccesible. Se aplicará módulo por módulo según el plan, que pide preparar cada permiso antes de exponer su módulo.

## Comprobación

Desde `backend`, con la base V2 levantada:

```bash
pnpm run check
ALLOW_DB_TEST_WRITES=true DB_TEST_RESTART=false node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
```

Cubren esta historia `test/permissions-membership.test.ts` (dominio) y `integration/permissions.integration.test.ts` (denegaciones reales contra la API). Los fixtures se identifican por UUID de cada ejecución y se eliminan al terminar.

Referencias: [reparto](asignacion-sprint-1.md), [plan](planificacion-sprints.md), [alcance E07](integracion-e07-roles-organizaciones.md).
