# E08 · Revisión de la entrega de integración

Actualización posterior: ver [cierre técnico y seguimiento](cierre-tecnico-backlog-2026-09-16.md). La nueva ejecución tiene 114 pruebas correctas y registra cierres técnicos; las cifras inferiores de esta revisión conservan su corte anterior. En Trello esta revisión se relaciona con E09, no con E08 (registro de organizaciones).

Corte local: 16/09/2026. Alcance: la tarea «Integración Backend - Base de datos - Frontend» compartida en cinco capturas (secciones 1–12), junto con la nueva base oficial provisional adoptada en E06. No es una evaluación de todo el MVP ni una nueva comparación visual con Figma.

## Dictamen

Los módulos de esta etapa están implementados y las pruebas locales pasan. El recorrido registro → login → perfil → organización en borrador ya admite cuentas pendientes, sin activación manual ni verificación ficticia. **La entrega todavía requiere publicar el incremento y revisión/aceptación del equipo**, pero la activación ya no bloquea el acceso básico. No es el cierre del MVP completo.

Actualización posterior autorizada: [ADR-002](decisiones/ADR-002-acceso-basico-sin-verificacion.md) separa acceso básico de verificación y sustituye la restricción ACTIVE-only que impusimos por precaución. Se actualizaron código, mensajes y pruebas. No se activaron cuentas preexistentes ni se modificaron el esquema oficial, Trello o documentos Word/PDF. Las pruebas crean y limpian sus propios datos temporales.

## Matriz de cumplimiento de la tarea

| Requisito | Estado comprobado | Evidencia y límite |
| --- | --- | --- |
| Frontend y backend separados | Cumple localmente | React en raíz; NestJS en `backend`; Bun y pnpm separados, con sus lockfiles |
| Variables de entorno e instrucciones | Cumple localmente | README y guía V2; credenciales y copias `.env` ignoradas por Git |
| Código organizado conforme a arquitectura | Estructura básica presente | Casos de uso y puertos en Application; HTTP y repositorios TypeORM en Infrastructure; interfaz organizada por funcionalidades |
| Repositorio propio y commits descriptivos | Pendiente de publicar este incremento | Último commit local `303e555`; los directorios `backend/` e `infra/` todavía no están versionados en esta copia. No se verificó un despliegue remoto |
| Comunicación frontend → API → PostgreSQL | Cumple localmente | Formularios reales; proxy `/api`; comprobación de salud a través del puerto del frontend |
| Registro con nombre, apellido, correo, contraseña y teléfono opcional | Cumple localmente | Usuario, perfil y rol básico en transacción; contraseña con hash; conserva `PENDING_VERIFICATION` sin bloquear acceso básico |
| Inicio de sesión y validación de credenciales | Cumple localmente | ACTIVE y PENDING_VERIFICATION admitidas; rechaza credenciales erróneas, cuentas suspendidas, cerradas, eliminadas y bloqueadas |
| Manejo de sesión y cierre | Cumple localmente | Cookie HttpOnly/SameSite; sesión persistida por hash, expiración y revocación; logout real |
| Consulta y actualización de perfil propio | Cumple alcance básico | Nombre, apellido, teléfono; correo solo lectura; no modifica estado, roles ni verificaciones desde el formulario |
| Roles iniciales | Cumple alcance básico | Catálogo oficial, rol REGISTERED_USER en registro, consulta de asignaciones vigentes y guardas; no administración completa de permisos |
| Registro de organización/empresa | Cumple alcance básico | Nombre legal/comercial, tipo activo oficial, correo y teléfono; borrador DRAFT y membresía OWNER vinculada al usuario |
| Rutas privadas y acceso | Cumple controles probados | API exige sesión; organizaciones exigen rol básico; frontend redirige al acceso; rechazo de organizaciones ajenas |
| Carga, éxito y error | Implementado y probado en contratos/recorridos principales | No se reemplazan fallos por éxito simulado; catálogo vacío y errores diferenciados; no supone prueba exhaustiva de todo estado visual |
| Persistencia con base suministrada | Cumple localmente | V2 oficial, sin sincronización automática del ORM; perfil y organización conservados tras reinicio de API en tests |
| No adelantar módulos fuera de esta etapa | Respetado | Sin campañas completas, aportes, pagos reales, recompensas, desembolsos, rendición ni pasarelas |

## Evidencia ejecutada en esta revisión

1. `pnpm run check`: lint, TypeScript, **44 pruebas backend** y compilación correctos, repetidos tras ADR-002.
2. `bun run check`: lint, TypeScript, **62 pruebas frontend** y compilación correctos, repetidos tras ADR-002.
3. `pnpm run test:integration` con `ALLOW_DB_TEST_WRITES=true`: **5 pruebas reales** de mapeo/persistencia, registro, sesiones, perfil y roles/organizaciones correctas, repetidas tras ADR-002. Total: **111 pruebas**, no 111 requisitos distintos. Incluyen registro → login → organización sin activar fixtures, perfil pendiente, estado y fechas de verificación intactos.
4. En esta repetición se utilizó `DB_TEST_RESTART=false` para no reiniciar la base que sirve a la aplicación abierta. Se comprobó reconexión; los tests de sesiones/organizaciones reinician sus propias APIs temporales. El reinicio del contenedor ya se había verificado en E06/E07, no se atribuye a esta ejecución.
5. Verificador V2, comprobado en el corte original E08: 59 tablas, 31 enums, 5 vistas, 16 funciones propias, 40 triggers, 8 secuencias y 134 claves foráneas; rol de conexión sin privilegios administrativos ni DDL. ADR-002 no altera esquema ni privilegios.
6. Comprobaciones HTTP sin sesión, a través de `http://127.0.0.1:5173`: `/api/health/live` y `/api/health/ready` devuelven 200; `/api/auth/me`, `/api/profile`, `/api/access/roles`, `/api/organizations` y `/api/organizations/types` devuelven 401.
7. Tras finalizar, no quedaron los usuarios temporales de las suites. No se borraron datos ajenos a las pruebas.
8. Los `.env` del backend, V2, candidato y respaldo anterior están excluidos de Git; `git diff --check` no reporta errores. Esto no equivale a una auditoría exhaustiva de secretos ni a una auditoría de seguridad productiva.

Las comprobaciones visuales positivas de login, perfil y organizaciones se realizaron en E06/E07 con fixtures activos desechables y quedaron documentadas allí. En esta revisión no se recreó una cuenta demo permanente ni se alteró el formulario abierto por el usuario.

## Estado del cierre y pendientes

### 1. Acceso básico resuelto; verificación futura separada

Ya no hace falta una cuenta ACTIVE preparada manualmente: registrar una cuenta ficticia mediante la interfaz permite entrar con sus credenciales, gestionar el perfil y crear una organización en borrador. La verificación de correo/identidad sigue pendiente, pero no impide este recorrido básico.

Decisiones futuras que deben seguir registradas como pendientes, sin bloquear esta entrega:

- Mecanismo definitivo de correo/teléfono e identidad, y transición de estado de cuenta.
- Requisitos exactos para aportar, publicar u otras operaciones futuras; el documento ya exige verificaciones aplicables para publicar.
- Recuperación real, textos legales definitivos y permisos avanzados antes de su uso real.

No se activan masivamente cuentas, no se cambia el default del SQL ni se marcan verificaciones inexistentes. El acceso básico no concede permisos avanzados.

### 2. Entrega del código al equipo

El incremento funciona en esta máquina, pero sus archivos nuevos no están incluidos en el último commit local. Antes de compartir la entrega: revisar el diff y los archivos nuevos, excluir secretos y backups, crear commits descriptivos y subir al repositorio acordado con la cuenta autorizada. No mezclar automáticamente las modificaciones previas del backlog Word con el cambio técnico. En esta revisión no se hizo commit, push ni cambio de cuenta Git.

### 3. Actualización del seguimiento

El backlog general y Trello no se cerraron ni actualizaron aquí. Registrar este incremento como implementado/probado localmente; separar el acceso básico resuelto de las verificaciones de operaciones futuras todavía pendientes. No marcar terminado el MVP completo. Tras publicar y demostrar el recorrido, revisar la entrega con los líderes.

## Guion de demostración

Prerrequisito: API, frontend y PostgreSQL V2 iniciados. Usar datos ficticios y una contraseña exclusiva de prueba, nunca publicarla en Git. El registro asigna REGISTERED_USER automáticamente; no requiere activar la cuenta desde la base.

1. Abrir `/registro`; mostrar validación y guardar datos ficticios. Enseñar la confirmación «pendiente de verificación». No afirmar que se envió un correo.
2. Pulsar «Iniciar sesión» desde la confirmación. Con la misma cuenta recién registrada, probar una credencial incorrecta y después entrar correctamente. Mostrar que el estado sigue pendiente y no se presenta como verificado.
3. Abrir `/mi-cuenta`; editar nombre, apellido y teléfono; guardar y recargar para comprobar persistencia.
4. Mostrar los roles vigentes. Explicar que Usuario registrado no significa creador, administrador ni empresa verificada.
5. Abrir «Mis organizaciones»; mostrar validación, elegir un tipo del catálogo y guardar. Mostrar estado Borrador y vínculo de titular del registro.
6. Recargar para comprobar que la organización persiste. No simular aprobación KYB ni creación de campañas.
7. Cerrar sesión y volver a una ruta privada: debe solicitar acceso. Presentar los resultados de las pruebas de aislamiento y revocación.

El recorrido ya es realizable sin activación manual. Las 5 suites de integración lo comprueban por HTTP contra PostgreSQL; no sustituyen la demostración final y aceptación del equipo.

## Arranque y reproducción

Instalación inicial y permisos: [guía V2](../infra/postgres-v2/README.md). Contratos funcionales: [E07](integracion-e07-roles-organizaciones.md).

Para un entorno V2 ya instalado, desde la raíz:

```powershell
docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait
./infra/postgres-v2/grant-e07.ps1
cd backend
pnpm run dev
```

En otra terminal, desde la raíz: `bun run dev`. No iniciar una segunda API/Vite si sus terminales ya están ejecutándose. No ejecutar de nuevo el SQL oficial ni borrar volúmenes.

La aceptación formal corresponde a los líderes. Este informe acredita las comprobaciones locales indicadas, no producción, cobertura total de seguridad, prueba completa de instalación en otra computadora ni finalización del proyecto Brotar.
