# Verificación y guía de demostración del Sprint 1 de Brotar

> Publicación de estas guías en DEV solicitada el 30/09/2026. El contenido inferior conserva su corte histórico. Para preparar el entorno y consultar nombres actuales de botones/ramas, seguir el [README principal](../README.md), no la referencia antigua a `integracion-sprint1-local`. Los Word mantienen su fecha original.

> Complemento posterior: [ensayo final y buzón local](ensayo-final-sprint-1.md). Las menciones inferiores
> a catálogo vacío y 198 pruebas corresponden al corte anterior; ahora se cargaron cinco categorías
> provisionales y se aprobaron 200 casos. Los pendientes legales y de verificación permanecen abiertos.

Guía de estudio para Ricardo, Alison y Santiago. Corte local del 21 de septiembre de 2026. El Sprint 1 tiene 20 tareas, de E01 a E09 y de S1-10 a S1-20. Estas tareas desglosan historias BG; no equivalen a 20 historias independientes ni completan por sí solas las historias transversales de todo el MVP.

El incremento funciona con PostgreSQL para cuentas, perfiles, organizaciones y borradores. La verificación interna aprobó 93 pruebas frontend, 91 backend y 14 de integración, 198 en total, además de lint, tipos y compilación. Esto no es una certificación externa ni una garantía de ausencia de errores. El cierre de negocio y la aceptación del docente o líderes siguen separados de las pruebas técnicas.

## Cómo leer los checklists

Cada tarea tiene objetivo, alcance BG, checklist, recorrido y evidencia. C significa comprobado técnicamente en el alcance indicado; P significa pendiente de aprobación, configuración o comprobación externa. Un C obtenido con pruebas automatizadas no afirma que también se haya probado toda la pantalla a mano. Los pasos de demostración son un guion para repetir, no una afirmación de que todos se ejecutaron en navegador durante esta revisión.

La fuente del alcance es docs/planificacion-sprints.json y el reparto es docs/asignacion-sprint-1.md. Los checklists de esta guía operacionalizan esos requisitos y las notas de integración; no son una nueva lectura ni actualización de las tarjetas de Trello. Los documentos históricos conservan sus fechas. Esta guía describe el estado de la integración local actual.

## Preparar la demostración

1. Trabajar en la carpeta brotar-frontend, rama integracion-sprint1-local. Esta revisión no se publicó en GitHub ni cambió Trello. No afirmar que main contiene estas últimas correcciones.

2. Confirmar Docker y el contenedor brotar-provisional-v2-postgres-1 healthy. La V2 usa PostgreSQL en 127.0.0.1:15433, base brotar_db. No restaurar encima, borrar volúmenes ni mostrar contraseñas del archivo .env.

3. Abrir dos terminales. En backend ejecutar pnpm run dev con pnpm 11.19.0 y Node 24. Si el pnpm global no coincide, usar bun x --package pnpm@11.19.0 pnpm run dev. Desde la raíz ejecutar bun run dev. Si ya están corriendo, no iniciar copias en los mismos puertos.

4. Abrir http://127.0.0.1:5173. Consultar /api/health/ready mediante ese mismo origen: se espera status ok y database connected. Usar siempre 127.0.0.1 durante el recorrido, sin alternarlo con localhost para no confundir las cookies.

5. Usar cuentas y contenido ficticios. Para registrar una nueva cuenta, elegir un correo único de prueba, por ejemplo ensayo-equipo-fecha@example.invalid. La contraseña de ensayo debe tener entre 15 y 128 caracteres y no consistir solo en espacios. No usar credenciales personales.

6. Bloqueo observado: hay cero categorías activas y cero entradas en permission. El borrador inicial se crea, pero no puede completarse Información general sin una categoría. Las integraciones prueban esa etapa con categorías temporales que retiran después. Antes de una demostración completa hay que acordar y configurar el catálogo; no inventarlo durante la exposición.

7. Para repetir los controles, ejecutar bun run check en la raíz y pnpm run check en backend. Para las integraciones, únicamente en esta base local de ensayo, definir en PowerShell $env:ALLOW_DB_TEST_WRITES='true' y $env:DB_TEST_RESTART='false', y ejecutar pnpm run test:integration en backend. Los ensayos crean y retiran sus propios fixtures. No apuntarlos a una base compartida o productiva.

## E01 Preparar repositorio y backend

Historias BG-57, BG-58 y BG-63. Responsable original Ricardo. Se pedía separar frontend y backend, ordenar el código y documentar configuración y arranque. Estado: base técnica comprobada; esta integración local todavía no está publicada.

- C: React y NestJS están separados y cada aplicación compila con su configuración.
- C: README, ejemplos de entorno y comandos permiten preparar el entorno sin incluir secretos.
- C: las pruebas de arquitectura comprueban separación de dominio y aplicación frente a HTTP y ORM.
- P: publicar esta versión y obtener aceptación externa cuando se autorice.

Demostración paso a paso

1. Abrir README.md y mostrar los requisitos de Node, Bun y pnpm.
2. Mostrar src, backend/src, backend/test e integration dentro de backend; explicar qué contiene cada parte.
3. Mostrar .env.example, nunca .env. Identificar puertos y la separación de configuración privada.
4. Ejecutar los dos check y mostrar sus resultados; después abrir la aplicación local.

Evidencia: README.md, backend/package.json, backend/test/architecture.test.ts. Explicación: compilar no prueba todas las funciones, pero detecta errores de tipos y dependencias antes de la presentación.

## E02 Restaurar y conectar PostgreSQL

Historia BG-59. Responsable original Ricardo. Se pedía utilizar la base oficial provisional con persistencia real. Estado: comprobado en V2; no se declara cerrado todo el mantenimiento futuro de BG-59.

- C: PostgreSQL V2 está disponible y TypeORM consulta la estructura oficial.
- C: se probaron commit, rollback y reconexión con datos ficticios.
- C: synchronize está desactivado; arrancar no recrea tablas automáticamente.

Demostración paso a paso

1. Mostrar docker ps y el estado healthy del contenedor de Brotar, sin intervenir otros proyectos.
2. Abrir http://127.0.0.1:5173/api/health/ready y explicar que comprueba conexión y tablas base.
3. Registrar una cuenta ficticia, volver a entrar y recuperar su perfil.
4. Mostrar backend/integration/database.integration.test.ts y ejecutar la suite de integración para probar transacciones.

Evidencia: backend/src/shared/infrastructure/database y backend/integration/database.integration.test.ts. Un health correcto no acredita todos los catálogos ni todas las reglas de negocio.

## E03 Conectar formularios y API

Historia BG-60. Responsable original Ricardo. Se pedía enviar formularios por HTTP y representar carga, éxito y error. Estado: comprobado para el incremento; el catálogo público de campañas conserva datos simulados.

- C: registro, acceso, perfil, organizaciones y borradores usan API real.
- C: se conservan estados de error y no se transforma un fallo de red en éxito.
- C: el transporte compartido y las respuestas incompletas tienen pruebas de regresión.

Demostración paso a paso

1. Abrir /registro y enviar vacío: aparecen errores, no un mensaje de cuenta creada.
2. Completar datos ficticios válidos y enviar una vez; observar el estado de carga y después la confirmación.
3. En un borrador de ensayo, detener únicamente la API local y guardar. Debe aparecer que no se confirmó el guardado y conservarse el texto.
4. Reiniciar la API y reintentar. Los requisitos de categoría y país siguen aplicándose: recuperar conexión no debe aprobar datos incompletos.

Evidencia: src/shared/api/request.ts, tests/api-request.test.ts y tests/input-boundaries.test.ts. Durante esta revisión se comprobó el fallo de conexión en navegador y se dejó la API nuevamente iniciada.

## E04 Registrar usuarios reales

Historia BG-10. Responsable original Ricardo. Se pedía persistir usuario y perfil básico con validaciones, contraseña protegida y rol inicial. Estado: comprobado; los términos definitivos se tratan en S1-11.

- C: se guardan usuario y perfil de forma atómica y se normaliza el correo.
- C: se validan nombres, correo, contraseña, confirmación y teléfono opcional completo.
- C: solo se asigna Usuario registrado; el selector informativo no concede roles.

Demostración paso a paso

1. En /registro probar Nombre 12345, correo sin arroba y confirmación distinta. Mostrar mensajes junto a cada campo.
2. Corregir a María y D’Ávila, correo ficticio único y contraseña de ensayo de 15 o más caracteres. Dejar ambos campos telefónicos vacíos o completarlos juntos.
3. Marcar el aviso de datos de prueba y crear. Mostrar Cuenta guardada y estado pendiente de verificación.
4. Intentar otra vez el mismo correo: debe rechazarse sin crear un duplicado. El ensayo automatizado también comprueba solicitudes simultáneas.
5. Entrar a Mi cuenta y mostrar que no hay permisos administrativos nuevos.

Evidencia: backend/integration/registration.integration.test.ts, backend/test/input-boundaries.test.ts y tests/registration.test.ts. Los números siguen permitidos en títulos y razones sociales; la regla de nombres personales no se aplica indiscriminadamente.

## E05 Iniciar y cerrar sesión

Historia BG-09. Responsable original Ricardo. Se pedía acceso, consulta y cierre de sesión persistentes. Estado: comprobado bajo ADR-002, sin equivaler a verificación de identidad.

- C: credenciales correctas abren sesión y las incorrectas no la crean.
- C: cookies y tokens de sesión tienen caducidad y revocación comprobadas.
- C: la cuenta pendiente tiene acceso básico sin modificar su estado a ACTIVE.

Demostración paso a paso

1. Abrir /iniciar-sesion y probar un correo ficticio con contraseña incorrecta.
2. Corregir la contraseña; esperar Sesión iniciada y pulsar Ir a mi cuenta.
3. Mostrar Pendiente de verificación y el rol básico. Explicar que ingresar no autoriza pagos ni publicación.
4. Pulsar Cerrar sesión y volver a /mi-cuenta: se debe solicitar acceso otra vez.
5. Para expiración, mostrar la prueba automatizada; no modificar relojes ni estados de usuarios reales en la presentación.

Evidencia: backend/integration/sessions.integration.test.ts y docs/decisiones/ADR-002-acceso-basico-sin-verificacion.md. La política definitiva de verificación sigue pendiente del cliente.

## E06 Consultar y editar el perfil propio

Historia BG-12. Responsable original Ricardo. Se pedía consultar y actualizar datos personales básicos del usuario autenticado. Estado: comprobado para esos campos; guardados y otros perfiles del MVP no se incluyen.

- C: consulta y modificación usan la identidad de la sesión.
- C: nombre, apellido y teléfono persisten; correo, contraseña y roles no se editan aquí.
- C: un teléfono incompleto se rechaza y los campos ajenos al formulario se conservan.

Demostración paso a paso

1. Entrar a /mi-cuenta y localizar Editar datos básicos.
2. Escribir 1234 en Nombre y +591 sin teléfono. Guardar y mostrar ambos errores.
3. Corregir a María José y dejar ambos teléfonos vacíos. Guardar: se espera Perfil guardado correctamente.
4. Recargar la página y comprobar que conserva el nombre. Probar Descartar cambios antes de otro guardado.

Evidencia: backend/integration/profile.integration.test.ts, tests/profile.test.ts y src/features/access/session/ProfileForm.tsx. En esta revisión se comprobó en navegador el rechazo y posterior guardado válido.

## E07 Preparar roles y acceso privado

Historia BG-53. Responsable original Ricardo. Se pedía estructura inicial de roles y protección de rutas privadas. Estado: comprobado para el acceso básico, no para la matriz completa del MVP.

- C: los roles mostrados provienen del servidor, no de lo seleccionado al registrarse.
- C: las rutas privadas requieren sesión y las operaciones validan propiedad o rol.
- P: aprobar y poblar la matriz definitiva de permisos en S1-13.

Demostración paso a paso

1. En Mi cuenta mostrar Mis roles y explicar Usuario registrado.
2. Cerrar sesión y abrir /crear-campana: se debe pedir iniciar sesión.
3. Mostrar la prueba de permisos y organizaciones, donde dos cuentas ficticias no comparten recursos privados.
4. Explicar que esconder un botón no es suficiente: la API es quien deniega la operación.

Evidencia: backend/integration/permissions.integration.test.ts y backend/integration/organizations.integration.test.ts. No asignar ADMIN a compañeros solo para aparentar un flujo terminado.

## E08 Registrar una organización vinculada

Historia BG-26. Responsable original Ricardo. Se pedía crear una organización con información básica y relacionarla con el usuario. Estado: comprobado como borrador, sin KYB completo.

- C: nombre legal, comercial, tipo y contacto se validan y persisten.
- C: la organización queda vinculada al usuario autenticado.
- C: crearla no verifica la empresa ni concede administración de la plataforma.

Demostración paso a paso

1. Entrar a Mi cuenta y pulsar Mis organizaciones, ruta /mis-organizaciones.
2. Enviar el formulario vacío para mostrar requisitos.
3. Completar Organización Ensayo 2026, un nombre comercial ficticio, un tipo existente y contacto de prueba.
4. Guardar y recargar; mostrar el estado de borrador y la relación de membresía.
5. Usar la integración automatizada para demostrar separación entre usuarios, sin mostrar datos de terceros.

Evidencia: backend/integration/organizations.integration.test.ts y tests/organizations.test.ts. La demostración necesita tipos de organización existentes; no inventa tipos ni documentos legales.

## E09 Probar y entregar la integración básica

Historias BG-62 y BG-63. Responsable original Ricardo. Se pedía comprobar el incremento y documentar su ejecución. Estado: verificación técnica actual aprobada; publicación de estos cambios y aceptación externas pendientes.

- C: lint, tipos, pruebas y build pasan en ambas aplicaciones.
- C: hay pruebas contra PostgreSQL y guion de demostración por tarea.
- P: revisión del equipo, publicación autorizada y aceptación de los líderes.

Demostración paso a paso

1. Mostrar los comandos de preparación de esta guía y el README.
2. Ejecutar bun run check y el check del backend, sin presentar resultados de otra versión.
3. Ejecutar las integraciones locales: se esperan 14 pruebas aprobadas en este corte.
4. Explicar los 198 casos totales y distinguirlos de cobertura porcentual o garantía de cero errores.
5. Mostrar al final los pendientes de configuración, sin cambiar tarjetas a completadas desde esta guía.

Evidencia: suites tests, backend/test y backend/integration. El mensaje de baseline incompleta dentro de una prueba negativa es esperado: la prueba pasa cuando la migración rechaza esa base de ensayo.

## S1 10 Preparar migraciones y recuperación

Identificador S1-10, historia BG-59. Responsable original Santiago. Se pedía versionar migraciones sobre la base oficial y ensayar respaldo y restauración aislada. Estado: mecanismo comprobado; respaldo y restauración tienen evidencia previa del mismo incremento.

- C: baseline versionada y control de migraciones separado de public.
- C: una base incompleta se rechaza, no se marca falsamente migrada.
- C: el ensayo anterior recuperó tablas, vistas, funciones, secuencias y triggers en una copia aislada.

Demostración paso a paso

1. Abrir backend/src/shared/infrastructure/database/migrations y mostrar la baseline V2.
2. Ejecutar la integración de migraciones; mostrar que no quedan migraciones pendientes en la V2 preparada.
3. Abrir docs/integracion-local-sprint-1.md y explicar el respaldo aislado ya realizado: 59 tablas, 5 vistas y 40 triggers conservados.
4. Si solicitan repetir la restauración, revisar antes backend/scripts/drill-recovery.mjs y ejecutarlo solo con la configuración local autorizada. No restaurar sobre brotar_db durante la defensa.

Evidencia: backend/integration/migrations.integration.test.ts y docs/integracion-local-sprint-1.md. En esta revisión se repitió la suite de migraciones, no otro ensayo completo de restauración.

## S1 11 Completar condiciones del registro

Identificador S1-11, historia BG-10. Responsable original Alison. Se pedían términos y datos por perfil aprobados, además de una política clara de verificación. Estado: parcial por decisiones externas.

- C: el registro distingue aviso de prueba de aceptación legal y no simula KYC o KYB.
- C: la orientación Usuario, Creador u Organización se declara informativa y no guardada.
- P: texto legal, campos definitivos por perfil y política de verificación aprobados.

Demostración paso a paso

1. Abrir /registro y cambiar la orientación inicial; leer la ayuda que cambia.
2. Mostrar la advertencia que indica que el selector no asigna roles ni se guarda.
3. Mostrar el aviso de datos de prueba, separado del texto legal aún pendiente.
4. Explicar ADR-002: se permite acceso básico conservando el estado pendiente; publicación y pagos no se desbloquean.
5. Señalar D03 y D08 como decisiones por confirmar, no como fallos que se solucionen escribiendo un texto legal inventado.

Evidencia: src/features/access/register/RegisterPage.tsx y backend/integration/registration.integration.test.ts. No cerrar esta tarea íntegramente solo porque el formulario registra usuarios.

## S1 12 Implementar recuperación de contraseña

Identificador S1-12, historia BG-11. Responsable original Alison. Se pedía solicitud, entrega autorizada, expiración y uso único del enlace. Estado: mecanismo probado; correo real pendiente.

- C: validación de solicitud y restablecimiento, token con caducidad y uso único.
- C: PostgreSQL comprobó cambio de contraseña, rechazo de enlace usado o vencido y revocación de sesión anterior.
- P: configurar remitente SMTP autorizado y comprobar recepción real en buzón.

Demostración paso a paso

1. Abrir /recuperar-contrasena desde Recuperar acceso en el login.
2. Probar correo vacío o mal formado y mostrar el mensaje.
3. Sin canal configurado, explicar la indisponibilidad; no decir que se envió un correo.
4. Mostrar backend/integration/password-recovery.integration.test.ts: genera tokens para su cuenta ficticia, deja vencer uno y comprueba el cambio una sola vez. No utiliza correo externo.
5. Después de configurar SMTP, repetir el recorrido completo con un buzón autorizado. Abrir el enlace, elegir una contraseña de ensayo, ingresar con ella y comprobar que reutilizar el enlace falla.

Evidencia: la integración de recuperación y backend/test/password-recovery.test.ts. Un HTTP aceptado no demuestra que el mensaje haya llegado al buzón. No habilitar enlaces locales de recuperación en servidores compartidos.

## S1 13 Preparar permisos del flujo creador

Identificador S1-13, historia BG-53. Responsable original Santiago. Se pedía preparar responsabilidades, pertenencia y denegaciones en API. Estado: estructura comprobada, matriz definitiva pendiente.

- C: se consultan roles almacenados y se comprueba pertenencia a organizaciones.
- C: los ensayos verifican denegaciones y auditor en lectura.
- P: catálogo y asignaciones de permisos aprobados; permission contiene cero entradas en el corte actual.

Demostración paso a paso

1. Abrir backend/test/permissions-membership.test.ts y explicar separación entre rol de plataforma y membresía de organización.
2. Ejecutar la integración de permisos con fixtures temporales; mostrar que las peticiones no autorizadas se rechazan.
3. Explicar que el auditor conserva lectura incluso al combinar roles bajo la regla provisional actual.
4. Mostrar docs/integracion-s1-13-permisos.md y la decisión D06 pendiente. No describir el mecanismo como matriz productiva ya configurada.

Evidencia: backend/integration/permissions.integration.test.ts. No hay pantalla administrativa completa de permisos en este sprint; la evidencia de esta tarea es técnica, no un botón escondido.

## S1 14 Separar archivos públicos y privados

Identificador S1-14, historia BG-61. Responsable original Alison. Se pedía almacenar archivos según su finalidad, autorizar acceso y manejar cargas fallidas. Estado: incremento técnico comprobado, políticas definitivas pendientes.

- C: imágenes públicas y documentos privados tienen finalidades y límites distintos.
- C: metadatos y propiedad se guardan en PostgreSQL; binarios en almacenamiento local privado.
- C: se prueban formato, tamaño y acceso; un archivo vinculado no se elimina por la baja genérica.
- P: privacidad, retención, infraestructura final y decisiones de D03/D08.

Demostración paso a paso

1. Mostrar los límites actuales: imagen pública hasta 2 MiB, documento privado hasta 5 MiB.
2. En Portada, seleccionar un tipo no permitido o archivo demasiado grande y mostrar el rechazo.
3. Elegir una imagen de ensayo permitida y pasar a la demostración S1-19.
4. Mostrar backend/test/files.test.ts y la integración de portadas para explicar acceso privado y persistencia sin exponer documentos personales.

Evidencia: backend/src/files/application/files.ts, backend/test/files.test.ts y backend/integration/cover-files.integration.test.ts. La firma básica no equivale a antivirus. La interfaz documental de organizaciones y un sistema integral de limpieza/retención no se dan por terminados.

## S1 15 Preparar categorías y catálogos de campaña

Identificador S1-15, historia BG-55. Responsable original Santiago. Se pedía catálogo autorizado con referencias protegidas y parámetros acordados. Estado: API comprobada, catálogo de negocio pendiente.

- C: lectura de categorías y edición administrativa validadas.
- C: una categoría referenciada no se desactiva dejando campañas o subcategorías incoherentes.
- P: categorías y parámetros aprobados por D02/D10. Actualmente no hay categorías activas.

Demostración paso a paso

1. Entrar al paso Información general del constructor y mostrar Catálogo pendiente de configuración.
2. Explicar que este estado no es una lista simulada ni una aprobación para inventar categorías.
3. Mostrar backend/integration/catalogs.integration.test.ts: crea datos temporales, prueba la edición autorizada y las referencias, y los retira.
4. Tras aprobar el catálogo, un responsable autorizado deberá poblarlo mediante la API prevista. Recargar el constructor y verificar las opciones.

Evidencia: docs/integracion-s1-15-catalogos.md y backend/integration/catalogs.integration.test.ts. La gestión administrativa está en API; no se promete una pantalla de administración completa en este incremento.

## S1 16 Guardar y recuperar un borrador

Identificador S1-16, historia BG-18. Responsable original Santiago. Se pedía conservar datos y posición, recuperar el borrador y manejar errores. Estado: núcleo técnico comprobado.

- C: se crea un borrador propio con modalidad, título y resumen.
- C: datos y posición se recuperan después de volver a entrar.
- C: navegación y errores de guardado tienen pruebas; no se interpreta avanzar como publicar.

Demostración paso a paso

1. En /mi-cuenta pulsar Mis borradores y portadas, ruta /crear-campana.
2. Crear Ensayo Sprint 1 2026 con resumen ficticio y Donación. Los números en el título son válidos.
3. Pulsar Siguiente y observar que pasa de Modalidad a Información general.
4. Volver a la lista recargando, pulsar Continuar y comprobar título y posición. Cerrar y abrir sesión para repetir la recuperación.
5. Para completar pasos de contenido, resolver antes las categorías. Un error mantiene los campos y no confirma guardado.

Evidencia: backend/integration/drafts.integration.test.ts y tests/campaigns.test.ts. En navegador se comprobaron creación y paso a información; la recuperación tras otra sesión está cubierta por la integración.

## S1 17 Elegir la modalidad de campaña

Identificador S1-17, historia BG-15. Responsable original Santiago. Se pedía guardar Donación, Recompensa o Preventa y evitar pérdidas silenciosas al cambiar. Estado: comportamiento técnico comprobado; reglas financieras definitivas pendientes.

- C: la modalidad se persiste y se valida contra los valores admitidos.
- C: Donación omite la etapa de recompensas.
- C: cambiar a Donación con recompensas existentes requiere reconocer su efecto, sin borrarlas.
- P: condiciones de negocio definitivas de D02.

Demostración paso a paso

1. Abrir un borrador en el paso Modalidad y leer la explicación de las tres opciones.
2. Elegir Recompensa, recargar y confirmar la opción persistida; volver después a Donación.
3. Mostrar la nota de que Donación omite recompensas y explicar que eso no crea un sistema de pagos.
4. Mostrar backend/integration/modality.integration.test.ts para el caso con recompensas: en Sprint 1 no hay editor completo de recompensas para fabricarlo desde pantalla.

Evidencia: backend/test/modality.test.ts y backend/integration/modality.integration.test.ts. Los pasos posteriores pueden estar rotulados como pendientes aunque sean posiciones navegables del asistente.

## S1 18 Completar información general

Identificador S1-18, historia BG-16. Responsable original Santiago. Se pedía nombre, categoría, ubicación, resumen, errores por campo y reutilización de datos. Estado: probado con catálogo temporal; demostración completa bloqueada por catálogo vacío.

- C: límites técnicos de título 200, resumen 500 y localidad 160 caracteres.
- C: referencias de país/categoría y ubicación estructurada se validan antes de guardar.
- C: la revisión devuelve contenido guardado sin recaudación ni verificación inventadas.
- P: categorías activas y confirmación de reglas de D02.

Demostración paso a paso

1. Abrir Información general. Poner país 12 y guardar: se espera error de código de dos letras.
2. Corregir país a BO y elegir una categoría aprobada cuando esté disponible.
3. Completar resumen, localidad, dirección y referencia ficticios; guardar y recargar.
4. Mostrar que nombre y resumen conservan valores. Revisar el contenido desde la revisión del borrador cuando el recorrido lo permita.
5. Sin categorías configuradas, mostrar el aviso y las pruebas automatizadas; no saltarse la validación para aparentar cumplimiento.

Evidencia: backend/integration/general-story.integration.test.ts y backend/test/input-boundaries.test.ts. La revisión del borrador no es la futura publicación pública conectada.

## S1 19 Cargar y reemplazar la portada

Identificador S1-19, historia BG-17. Responsable original Alison, integrada con el borrador de Santiago. Se pedía seleccionar, previsualizar, validar, sustituir y persistir portada por campaña. Estado: integración técnica comprobada.

- C: PNG, JPEG y WebP admitidos dentro del límite, con texto alternativo.
- C: portada asociada a una campaña real; sustituirla no cambia la portada de otra campaña.
- C: carga y asociación persisten después de otra sesión; fallos no se anuncian como guardados.

Demostración paso a paso

1. Con las categorías resueltas, avanzar el borrador hasta Portada. No confundirlo con una campaña publicada.
2. Intentar guardar sin imagen y sin texto: deben aparecer mensajes.
3. Seleccionar una imagen ficticia permitida, revisar la vista previa, describirla y guardar.
4. Volver al mismo borrador y comprobar que se recupera. Reemplazar con otra imagen y guardar nuevamente.
5. Abrir otro borrador para demostrar que no comparte la portada por accidente. Si no se puede recorrer la UI aún, ejecutar la integración de portadas, que crea dos campañas temporales y comprueba este caso.

Evidencia: backend/integration/cover-files.integration.test.ts, tests/cover-draft.test.ts y src/features/campaign-drafts/CoverDraftPage.tsx. La política final de retención de imágenes antiguas sigue en S1-14.

## S1 20 Describir historia e impacto

Identificador S1-20, historia BG-19. Responsable original Santiago. Se pedía problema, solución, beneficiarios e indicadores esperados recuperables desde el borrador. Estado: persistencia y validación comprobadas; recorrido UI depende del catálogo previo.

- C: historia y conjunto de indicadores se guardan transaccionalmente.
- C: metas con unidad, máximo técnico de 20 indicadores y 5000 caracteres por texto.
- C: números ajustados a numeric(14,2); no se admite un resultado conseguido desde el asistente.

Demostración paso a paso

1. Después de guardar Información general, avanzar a Historia e impacto.
2. Describir un problema, solución, beneficiarios y resultados esperados ficticios.
3. Añadir indicador Familias con meta 120 sin unidad: debe rechazarse. Completar unidad familias.
4. Probar 1.234 y una cifra mayor que 999999999999.99: deben rechazarse sin convertirlas en null ni redondearlas al guardar. Corregir a 120.25.
5. Guardar, recargar y confirmar recuperación. Explicar que 120.25 es una meta esperada, no un logro acreditado.

Evidencia: backend/integration/general-story.integration.test.ts, tests/input-boundaries.test.ts y backend/test/input-boundaries.test.ts. No se inventa una regla universal de solo valores positivos: hay indicadores cuyo punto inicial puede ser negativo.

## Registro de hallazgos y correcciones de esta revisión

QA01. Nombres personales aceptaban entradas numéricas y símbolos sin letras. Se agregó validación coherente en registro y perfil, tanto cliente como DTO de servidor, conservando acentos, letras internacionales, apóstrofes, puntos y guiones. No se limita por ello un título como Proyecto 2026.

QA02. Una contraseña de solo espacios pasaba el alta o restablecimiento pero el login la trataba como vacía. Se rechaza ahora en ambos extremos, sin recortar contraseñas válidas ni cambiar sus caracteres.

QA03. La ubicación anidada no exigía presencia de un objeto antes de acceder a sus campos. Se agregó IsDefined e IsObject al DTO; las integraciones comprueban respuesta 400 para estructuras incompletas, no error interno.

QA04. Los indicadores solo comprobaban números finitos, no la precisión real numeric(14,2) de PostgreSQL. Se validan rango y dos decimales en frontend y dominio. También se limita texto de descripción en dominio, se muestra el límite de 20 indicadores y se impide añadir más desde la pantalla.

QA05. Respuestas de historia e información se convertían a tipos sin revisar todos sus campos. Se valida su estructura antes de mostrarla. Además, un número no finito no llega a JSON.stringify para convertirse inadvertidamente en null.

QA06. Un fallo al crear o abrir un borrador, sin borrador activo, podía no mostrar el aviso de error. Se agregó mensaje visible conservando los campos.

QA07. El catálogo vacío no explicaba por qué el usuario no podía completar la etapa. Ahora muestra un aviso de configuración pendiente, sin crear categorías automáticamente.

QA08. El aviso Avance guardado permanecía después de editar algunos campos. Ahora se retira al modificar el formulario o agregar/quitar indicadores. El siguiente guardado necesita confirmación nueva de la API.

QA09. El enlace de recuperación aún decía todavía simulada aunque el mecanismo ya estaba conectado. Se cambió a Recuperar acceso; el módulo conserva sus mensajes de indisponibilidad cuando no hay correo configurado.

## Evidencia y alcance de las pruebas

Automatizado: 93 casos frontend, 91 backend y 14 integraciones. Se añadieron siete casos unitarios/de contrato y una integración de recuperación frente al corte anterior, además de ampliar la integración de información e historia con entradas inválidas. Los casos recorren múltiples entradas, por lo que 198 no es el número de campos ni de combinaciones posibles.

Navegador: registro vacío; nombres numéricos y correo inválido; cuenta ficticia creada; login; perfil con nombre inválido y teléfono incompleto; guardado correcto de perfil; borrador sin nombre; borrador con título numérico válido; avance a Información general; categoría ausente y país numérico; apagado temporal de API con formulario conservado. La API se volvió a iniciar. No se recorrió manualmente toda la campaña porque faltan categorías configuradas; el contenido posterior se verificó con integraciones y fixtures.

La cuenta ficticia qa-sprint1-20260921-2241@example.invalid y su borrador Ensayo Sprint 1 2026 se conservaron localmente como evidencia de la revisión de pantalla. No representan usuarios del cliente. La guía no publica contraseñas. Los fixtures de las integraciones se retiran automáticamente.

Pruebas de recuperación: la primera preparación del fixture vencido violó la restricción expires_at mayor que created_at. Se corrigió el ensayo para emitir un token válido de vida corta y esperar su vencimiento real. También se corrigió la ruta del ensayo a /api/auth/me. Fueron ajustes del test, no fallos de negocio atribuidos falsamente a la aplicación.

No se efectuó una certificación de seguridad, auditoría exhaustiva, prueba de carga, validación de correo externo ni aceptación visual completa en todos los dispositivos. Las verificaciones de formato de archivo son básicas. Los escenarios de ediciones simultáneas, reintentos ambiguos y limpieza definitiva de archivos requieren ampliación antes de producción.

## Decisiones para la próxima conversación

1. D02 y D10: aprobar categorías, catálogo y parámetros permitidos. Es el bloqueo inmediato para recorrer toda la demostración de contenido.
2. D08: elegir remitente SMTP autorizado, origen web y buzón de prueba; comprobar entrega sin compartir claves en chat ni Git.
3. D03 y D08: confirmar textos legales, campos por perfil y política de verificación. No confundir acceso básico con KYC o KYB.
4. D06: aprobar matriz de permisos, responsabilidades y tratamiento de roles combinados antes de poblar el catálogo.
5. D03: acordar privacidad, retención, almacenamiento y tratamiento de archivos antiguos o huérfanos.
6. Acordar revisión final, publicación de esta integración y aceptación del equipo. Las historias BG transversales mantienen alcance en sprints posteriores.

## Orden de estudio y defensa

Primero ensayar E01 a E09 para explicar la base. Después estudiar S1-10, S1-13, S1-14 y S1-15 como soporte técnico. Finalmente demostrar S1-16 a S1-20 y explicar los pendientes S1-11 y S1-12. Abrir a mano los archivos de evidencia antes de presentar y repartir la explicación según el reparto original, sin atribuir a una sola persona toda la integración.

Para cada tarea responder tres preguntas: qué debía permitir, cómo sabemos que funciona y qué no incluye todavía. Si el docente pregunta por SOLID, DRY, KISS, YAGNI o patrones, complementar con el informe de calidad anterior; sus referencias de líneas corresponden al corte de esa refactorización y pueden desplazarse con estos cambios. Esta guía sirve para funcionalidad y aceptación, no para sustituir la explicación de diseño del código.
