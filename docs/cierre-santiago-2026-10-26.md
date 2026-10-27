# Santiago · ampliación y verificación del 26/10/2026

> Actualización del 27/10: el usuario autorizó publicar esta entrega en SantiagoDev. Las menciones a cambios locales sin commit/push corresponden al corte de verificación anterior. La integración legal posterior queda a cargo de Ricardo con la entrega de Alison; ver [traspaso](traspaso-ricardo-santiago-2026-10-27.md).
Base: `SantiagoDev`, merge `fa6753f` de RicardoDev. Cambios locales; no commit ni push solicitados. Este documento registra evidencia técnica del MVP DEMO; no acredita dinero real ni aprobación legal.

## Alcance

| Tarjeta | Ampliación |
|---|---|
| S3-12 | Corrección y retiro lógico de publicaciones con motivo, versión e historial privado; proyecciones públicas y de seguidores coherentes. Seguimiento de recompensas con evidencia privada, compartido con el cierre existente. |
| S3-13 | Informes periódicos, borradores/versiones, gastos y documentos privados, revisión independiente, corrección y devolución de remanentes DEMO sin reembolsar ficticiamente al patrocinador. |
| S3-14 | Miembros, representación, cambios permitidos en terceros, restricciones/restitución e historial; revocación de acceso institucional y renovación de KYB DEMO. |
| S3-24 | Panel paginado, indicadores de todo el ámbito autorizado, personal/institucional, recaudación real/DEMO separada por moneda y accesos al proyecto correcto. |
| S2-09 | Revalidar corrección/reenvío y avisos privados integrados. |
| S2-01 / S3-17 | Revalidar galería/multimedia y catálogos/parámetros acordados existentes, sin ampliar reglas comerciales no aprobadas. |
| S2-06 / S2-07 | Captura/revisión y representación DEMO; textos legales definitivos siguen siendo dependencia de S1-11 de Alison. No presentar documentos sintéticos como KYC/KYB real. |

No se implementan tareas de Alison: S1-11, S3-10 y S3-25 permanecen fuera de este incremento. El enlace compartido de navegación a rendición y el filtro de publicaciones retiradas en el feed son integración de las funciones de Santiago.

## Correo e instalación local

Se importó el TXT privado usando `backend/scripts/mail-config.mjs`. Verificación TLS/autenticación real aprobada mediante `check-mail.mjs`, sin envío de mensajes. Se comprobó programáticamente que todas las variables `DB_*` y `DATABASE_ENABLED` originales permanecen iguales; el buzón TXT queda desactivado y frontend/CORS mantienen el origen local de la instalación. No se publica contraseña, destinatario privado, token ni enlace de acceso.

Hay respaldo privado de base y configuración fuera de Git antes de los cambios. No se restauró el esquema oficial sobre la base existente. Las pruebas con escritura usan contenedores separados: `brotar-santiago-qa-20261026` (15435) para recorridos y `brotar-santiago-suite-qa-20261026` (15436) para regresión limpia. No comparten volumen con la instalación original en 15433.

El usuario pidió una cuenta local de prueba: se creó con dirección sintética de ejemplo y credenciales en archivo privado externo. No se creó un buzón de correo externo. Por ausencia de una bandeja controlada por el usuario, recepción real de recuperación/avisos queda sin acreditar. QA sustituye solamente el transporte al probar tokens, permisos y avisos; no envía a direcciones ficticias.

## Evidencia reunida

- Checks de base frontend y backend aprobados antes de editar.
- Tres recorridos nuevos PostgreSQL/HTTP iniciales aprobados: publicaciones/recompensas, panel con paginación y revocación institucional, y observaciones/corrección/reenvío/aprobación con correo verificado y avisos privados.
- Cinco regresiones existentes aprobadas: catálogos, correo, galería/guardados, recuperación y verificación.
- Dos regresiones de avances y ciclo/desembolsos/cierre aprobadas tras S3-12.
- La revisión independiente encontró que el feed de seguidores aún mostraba retiradas. La prueba reprodujo `2 != 1` antes del cambio; el filtro compartido de items/totales se corrigió y la repetición pasó 1/1. Revisión del arreglo aprobada.
- Navegador con API/DB reales: guardar/publicar/corregir/retirar novedad; versiones privadas 1/2/3; recompensa pendiente → preparación → cumplida con carga/descarga privada; cumplimiento inmutable; cancelación de salida conserva borrador y descarte explícito permite navegar.
- Panel y avances a 375×812 sin desbordamiento; filtros personal/institucional y accesos a ejecución/cierre comprobados. Capturas sintéticas externas: `/tmp/brotar-santiago-panel-mobile.png`, `/tmp/brotar-santiago-publication-history.png`, `/tmp/brotar-santiago-progress-mobile.png`.
- Rendición en navegador con API/PostgreSQL: recibir 100.30 DEMO, guardar/recuperar/corregir gasto de 80.10 con evidencia, presentar y aprobar desde otra cuenta. Solicitar remanente de 20.20 y autorizar/completar desde FINANCE con carga privada: disponible 0.00, sin crear reembolso al patrocinador. Capturas `/tmp/brotar-santiago-accountability-mobile.png` y `/tmp/brotar-santiago-remnant-completed.png`.
- Administración de terceros en navegador: datos básicos con antes/después, restricción/restauración, cuenta propia protegida; la sesión anterior devuelve 401 tanto tras restringir como después de restaurar. La cuenta restaurada puede iniciar una sesión nueva.
- Organización en navegador: alta de miembro, cambio a representante, transferencia de propietario y baja por el nuevo propietario; la relación finalizada conserva historial. A 375×812 sin desbordamiento. Captura `/tmp/brotar-santiago-memberships-mobile.png`.
- Revisión de rendición: corregidos acceso financiero de SUPPORT, protección contra borrado de evidencia de remanentes, continuidad entre representantes y capacidad del cierre acumulativo. Integración PostgreSQL/HTTP aprobó 120 gastos de dos períodos + 1 adicional, conservando los 121 identificadores/evidencias y cerrando realmente la campaña DEMO.
- Revisión de concurrencia de miembros: una prueba determinista reprodujo ciclo de bloqueos con respuesta 500. Orden de cuentas y bloqueo NOWAIT corrigieron el caso (200/200/200); ocupación devuelve 409 sin cambiar versión y una cuenta restringida no escribe. Revisión del arreglo aprobada.
- Revisión final detectó listas truncadas que podían ocultar una rendición antigua o miembros vigentes detrás del historial. Su corrección y los límites de navegación se verifican en el cierre siguiente.

## Decisiones de implementación

Se trabajó en SantiagoDev por indicación del usuario, conservando el merge base y todos los cambios locales sin commits. El alcance detallado de Ricardo se usó como requisitos: se mantuvo arquitectura y reglas DEMO existentes. Las migraciones, módulos y rutas compartidas se registraron de forma central; las implementaciones independientes tuvieron revisión separada. No se alteraron tareas de Alison ni se incorporaron textos legales supuestos. Un buzón controlado sigue siendo necesario para acreditar recepción real; no se enviaron mensajes a la dirección sintética.

## Verificación final

Terminada el 27/10/2026, conservando `SantiagoDev` en `fa6753f`, sin commit ni push:

| Comprobación final | Resultado |
| --- | --- |
| Frontend `bun run check` | 234 pruebas, tipos, lint y build aprobados. Advertencia conocida: bundle principal mayor de 500 kB. |
| Backend `pnpm run check` | 227 pruebas + 8 de administración local, tipos, lint y build aprobados. |
| Suite aislada PostgreSQL/HTTP completa | 45/45 aprobadas, 0 fallos y 0 omitidas; incluye instalación/migraciones, recuperación con archivos, permisos y los nuevos recorridos. |
| Regresión afectada por la última corrección | 4/4 aprobadas: rendición, miembros, bloqueo determinista y navegación de límites. No se suman al total de 45 como pruebas nuevas. |
| Inventario HTTP | 191 rutas verificadas. |
| Revisión de implementación | Revisiones por módulo y revisión general; los dos hallazgos finales se corrigieron y su única re-revisión acotada fue aprobada. |
| Instalación original | 32 migraciones, ninguna pendiente; inventario oficial verificado y contenido de las 94 tablas preexistentes idéntico antes/después de migrar. Readiness: `ok`, base conectada. |
| Correo local | TLS/autenticación SMTP reales verificados de nuevo, sin envío; recepción en una bandeja real sigue sin acreditar. |
| Cuenta local sintética | Inicio de sesión y panel vacío real comprobados; no concede ADMIN ni identidad verificada. Credenciales en archivo privado externo. |
| Secretos | 772 archivos de texto de fuentes/informes revisados por coincidencia de secretos privados, sin coincidencias. Artefactos de Playwright preservados fuera de Git. |

La regresión de navegación recorre 101 informes y 101 solicitudes en seis páginas, resuelve un informe/solicitud antiguos y conserva los saldos/bloqueos globales. También consulta 23 miembros vigentes independientemente de 205 vínculos finalizados y ejecuta cambios sobre el objetivo de la página 2. El navegador comprueba por separado: una devolución completada accesible en página 2 mientras informes/historial siguen en página 1; miembros vigentes seleccionables ante 211 vínculos históricos; cambiar de página borra selección/confirmación; ancho 375 sin desbordamiento. Los registros adicionales pertenecen exclusivamente a la copia QA sintética. Se comprobó además el UUID propio en Mi cuenta y la referencia automática a gastos aprobados en el cierre final.

El fallo anterior de recuperación se debía a tres metadatos activos de documentos KYB sintéticos que el fixture dejaba huérfanos. Se corrigió su limpieza y se retiraron lógicamente solo esos tres UUID exactos en QA, con condición de propietario nulo/clave exacta/conteo esperado. La guardia de recuperación de producción no se debilitó; la suite final completa pasó con recuperación de archivos incluida.

Logs completos fuera de Git: `/tmp/brotar-santiago-resume-frontend-check.log`, `/tmp/brotar-santiago-resume-backend-check.log`, `/tmp/brotar-santiago-resume-targeted.log` y `/tmp/brotar-santiago-resume-full-integration.log`. Respaldos privados previos al cambio y a la activación final incluyen base/configuración/archivos; las huellas de contenido se conservan junto al respaldo, sin datos personales en este documento.

## Estado verificado de Trello

Relectura del tablero tras actualizar: **23 tarjetas asignadas a Santiago, 21 realizadas y 2 abiertas**. Se conservaron todas las asignaciones, descripciones anteriores y las otras 122 tarjetas sin cambios.

- Pasaron a `SPRINT 3 · Terminadas · cierre técnico` y se marcaron realizadas: S3-12, S3-13, S3-14, S3-17, S3-24, S2-01 y S2-09.
- S2-02, S2-05, S2-10 y S2-11 ya estaban en Terminadas; se sincronizó la marca de completadas tras revalidarlas. Las otras diez tarjetas históricas realizadas se conservaron.
- [S2-06](https://trello.com/c/mXia80Q5) y [S2-07](https://trello.com/c/QzpTCGZ6) permanecen abiertas: parte técnica DEMO/representación verificada; falta resolución legal definitiva y su integración/aceptación dependiente de S1-11. No se modificó ninguna tarjeta de Alison ni se dio por cerrado el MVP global.

Las tarjetas describen evidencia local y la prohibición de commit/push; no contienen enlaces a commits nuevos inexistentes, credenciales ni afirmaciones de validación legal o recepción real de correo.

## Precisión de los pendientes S2-06/S2-07 · 27/10/2026

**Actualización posterior:** el circuito técnico de solicitud, aceptación y aprobación descrito abajo como pendiente ya se completó. Ver [cierre S2-07 del 27/10](cierre-s207-2026-10-27.md). Este apartado conserva el diagnóstico previo; la dependencia restante es la entrega legal de Alison.

El cierre anterior acredita las ampliaciones operativas DEMO; no significa que todo el alcance definitivo de identidad y representación esté terminado. Decir que únicamente falta pegar textos legales sería incompleto. La entrega de Alison no cierra por sí sola estas dos tarjetas: todavía hay que integrar su entrega, completar el circuito formal aplicable y volver a probarlo.

| Tarjeta | Verificado en DEMO | Pendiente de cierre definitivo |
| --- | --- | --- |
| S2-06 | Captura de persona, documentos privados, política de ensayo versionada, aceptación con titular/fecha, corrección e historial; revisión independiente. | Política definitiva aprobada: aviso/tratamiento y términos aplicables, campos/documentos exigidos, versión y evidencia de aprobación. Integración con la aceptación de S1-11 y pruebas de rechazo sin aceptación/documentos requeridos y de preservación de versiones anteriores. La revisión actual está expresamente acotada a políticas DEMO. |
| S2-07 | Registro/KYB sintético, permisos de miembros, cambio/transferencia/baja, respaldo y revisión documental DEMO, invalidación al cambiar representación. | Requisitos institucionales definitivos (datos/registro/NIT cuando corresponda, prueba de representación, titularidad/destino y documentos aplicables). Completar/verificar el circuito de solicitud por OWNER, aceptación autenticada del nuevo titular y revisión independiente de ADMIN previsto en ADR-013 D13-02; el cambio directo de membresía no implementa esas dos etapas. Integrar consentimiento/política aprobados y probar bloqueo/revalidación/historia del circuito completo. |

De Alison se necesita la entrega de **S1-11** con: (1) textos finales de términos/privacidad/tratamiento y aviso de identidad/representación que correspondan; (2) versión, fecha, responsable aprobador y referencia verificable de aprobación; (3) reglas de datos/documentos por perfil y de aceptación obligatoria; (4) integración de aceptación en interfaz/API/PostgreSQL con titular, versión y fecha, conservando evidencia anterior; (5) referencia a sus cambios y pruebas para integrar. S1-11 pide resolver D03/D08; las reglas institucionales D06/D13-02 requieren además la confirmación del responsable de esas decisiones, sin atribuir toda aprobación legal a Alison.

El trabajo posterior de Santiago es conectar las políticas/aceptaciones aprobadas a KYC/KYB, completar las etapas formales de representación y ejecutar los casos integrados válidos/negativos. Solo entonces se pueden marcar S2-06/S2-07 realizadas. La cuenta sintética y SMTP autenticado no acreditan identidad, aceptación legal ni recepción real de mensajes.

Fuente de la dependencia: [S1-11 de Alison](https://trello.com/c/Mk5I3PVJ); requisitos internos [ADR-013 D13-01/D13-02](decisiones/ADR-013-definiciones-integracion-mvp-demo.md). Se actualizaron las dos tarjetas abiertas y las siete tarjetas de cierre técnico del bloque de Santiago con esta precisión; no se modifican las tarjetas de Alison.

Para reproducir checks sin escritura: raíz `bun run check`, backend `pnpm run check`. Para integraciones con escritura, preparar exclusivamente una copia aislada con `.env` propio y `ALLOW_DB_TEST_WRITES=true`; no ejecutar la suite sobre la base de uso personal. El inventario HTTP, readiness y migraciones forman parte del cierre final.
