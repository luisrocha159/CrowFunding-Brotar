# Calidad de código y defensa técnica del Sprint 1 de Brotar

Guía de estudio del equipo de Ricardo, Alison y Santiago. Preparación para la defensa del miércoles 23 de septiembre de 2026. Corte técnico local del 21 de septiembre de 2026.

El Sprint 1 dispone de una base integrada con React, TypeScript, NestJS, TypeORM y PostgreSQL. La refactorización conserva sus funciones y mejora puntos concretos de reutilización, separación de responsabilidades y pruebas. No cambia el lenguaje ni incorpora pagos, publicación completa o módulos de sprints posteriores.

La idea central para la defensa es mostrar una decisión, abrir el código donde se tomó y demostrar su beneficio con una prueba. No basta con recitar las siglas. Tampoco corresponde afirmar que el sistema aplica perfectamente todos los principios en todos sus archivos o que las aprobaciones pendientes ya están resueltas.

## 01 Cómo usar esta guía y qué evalúa la rúbrica

La rúbrica distribuye la nota entre puntualidad de la presentación (15 %), calidad del trabajo (20 %), aplicación de SOLID (25 %), patrones de diseño (25 %) y defensa técnica (15 %). SOLID y patrones suman la mitad: conviene explicar ejemplos reales antes de enumerar definiciones.

Para estudiar, revisa primero KISS, DRY y YAGNI; después las cinco secciones SOLID; finalmente IoC, composición, patrones y pruebas. En cada sección se indica qué significa el concepto, dónde verlo y por qué se usa. Las rutas son relativas a la raíz del repositorio brotar-frontend. El Word incluye líneas obtenidas del código al generar esta versión; si el código cambia, busca también el nombre de la función o clase.

La puntualidad depende del ensayo del equipo y del tiempo que asigne el docente, no de una refactorización. La calidad se sustenta con funcionamiento, pruebas y límites declarados. Los criterios de la rúbrica no autorizan a inventar permisos, políticas legales o datos del cliente.

Lenguaje, paradigma, principio, patrón y metodología son conceptos distintos. TypeScript es el lenguaje; POO y programación funcional son formas de organizar el programa; SOLID, DRY, KISS y YAGNI orientan decisiones; Repository y Adapter resuelven problemas de diseño recurrentes; Scrum organiza el trabajo. Usar React o NestJS por sí solo no demuestra ninguno de los principios.

## 02 Arquitectura y formas de programación

El backend separa infraestructura, aplicación y dominio. Un controlador recibe HTTP; un caso de uso coordina la operación; el dominio expresa reglas; un repositorio realiza la persistencia. No todos los módulos necesitan la misma cantidad de archivos: archivos y portadas tienen contratos pequeños en application y adaptadores en infrastructure.

En registro, RegistrationController recibe el formulario, RegisterUser utiliza PasswordHasher y UserRegistrationRepository, y TypeormRegistrationRepository escribe con una transacción. La función newUser construye los datos de usuario sin conocer NestJS ni SQL. La autenticación, los perfiles y las organizaciones conservan módulos separados.

@code backend/src/users/application/register-user.ts | export class RegisterUser
@code backend/src/users/domain/registration.ts | export function newUser
@code backend/src/users/infrastructure/persistence/typeorm-registration.repository.ts | export class TypeormRegistrationRepository

Usamos POO en clases que reúnen estado y operaciones, como RegisterUser, Files y PasswordRecovery. Usamos funciones puras para reglas como allowsStepMove: reciben valores y devuelven un resultado sin consultar la red. React expresa la interfaz de forma declarativa: DraftReview describe qué mostrar a partir de sus props. async y await coordinan operaciones de entrada y salida; no hacen que una operación sea automáticamente paralela.

@code backend/src/campaigns/domain/draft.ts | export function allowsStepMove
@code src/features/campaigns/DraftReview.tsx | export function DraftReview

Respuesta para la defensa: “Combinamos clases para los casos de uso y adaptadores, funciones para reglas simples y componentes para presentar datos. Elegimos según la responsabilidad, no para forzar un único paradigma”.

## 03 KISS

KISS consiste en elegir la solución más sencilla que cumpla correctamente el requisito. No significa quitar validaciones o escribir todo en una función. Un código corto pero difícil de leer tampoco es necesariamente simple.

Ejemplo 1. La comprobación básica de firmas de archivos ahora usa matchesSignature con condiciones explícitas por formato. Sustituye una cadena de operadores ternarios anidados. Se puede leer cada caso sin reconstruir la precedencia de varias expresiones. No se creó una jerarquía de clases por cada extensión, porque los cuatro formatos actuales no la necesitan.

@code backend/src/files/application/files.ts | function matchesSignature

Ejemplo 2. DraftReview recibe información general, historia e indicadores y solo los presenta. No consulta la base ni publica campañas. Extraer esta vista del constructor permite revisar su salida sin montar el flujo entero. La prueba comprueba que muestra metas y no ofrece acciones de publicación.

@code src/features/campaigns/DraftReview.tsx | export function DraftReview
@code tests/draft-review.test.ts | test(

Ejemplo 3. allowsStepMove expresa la navegación del asistente como una función de dominio, incluida la omisión de recompensas en donación. Esta regla acotada no justifica instalar una biblioteca de máquinas de estados ni construir un motor de flujos genérico.

@code backend/src/campaigns/domain/draft.ts | export function allowsStepMove

Beneficio: lectura directa, pruebas pequeñas y menor esfuerzo para modificar el comportamiento. Límite: el constructor conserva bastante coordinación de estado; extraer la vista de revisión no significa que toda la pantalla haya quedado reducida a una única responsabilidad.

Respuesta breve: “Aplicamos KISS al hacer explícitas las firmas de archivos y separar una vista sencilla; evitamos introducir clases o motores que el problema actual no requiere”.

## 04 DRY

DRY busca que una misma decisión tenga una representación coherente. El problema no es únicamente repetir texto: si varias copias del transporte HTTP divergen, cada módulo puede manejar cookies, tiempos de espera o errores de forma distinta.

Antes, sesión, campañas, archivos y portadas construían por separado opciones de fetch muy similares. Ahora requestApi reúne credenciales same-origin, caché, redirecciones, JSON, cancelación, plazo de 15 segundos y cabecera de mutación. Cada cliente sigue validando su propio contrato. La función no conoce el significado de una campaña o una portada.

@code src/shared/api/request.ts | export async function requestApi
@code src/features/access/session/sessionClient.ts | async function send
@code src/features/campaigns/campaignsClient.ts | async function request
@code src/features/files/fileClient.ts | export async function uploadFile
@code src/features/campaign-drafts/coverDraftClient.ts | export async function readCoverDraft

readJson centraliza el tratamiento de JSON inválido y permite cuerpos vacíos solamente cuando el contrato lo indica. Esto corrige la consulta de una portada aún no cargada: NestJS devuelve un cuerpo vacío para null, mientras el cliente anterior intentaba analizarlo siempre como JSON. Una respuesta mal formada sigue siendo un error.

@code src/shared/api/request.ts | export async function readJson
@code tests/api-request.test.ts | test('portada nueva

El límite de tamaño de portada reutiliza FILE_LIMITS en lugar de repetir el número dentro del cliente de portada. Se retiró una segunda llamada consecutiva a validateFileUpload, porque uploadFile ya la realiza. FormField también permite reutilizar etiquetas, ayudas y errores sin copiar esa estructura en cada formulario.

No se unificaron indiscriminadamente todos los clientes del proyecto. Las validaciones del navegador y servidor tienen fronteras de confianza distintas: no se elimina la validación del servidor para aparentar DRY. Compartir lógica solo es útil cuando conserva el significado y la claridad.

Respuesta breve: “Centralizamos el transporte que estaba repetido, pero dejamos la validación de cada respuesta en su módulo”.

## 05 YAGNI

YAGNI significa no implementar funciones sin una necesidad actual que las justifique. Se aplica al alcance y a las abstracciones, no como excusa para omitir seguridad básica, pruebas o requisitos ya acordados.

Ejemplo 1. El constructor identifica plan, presupuesto, financiamiento y recompensas completos como etapas posteriores. No inventa un pago exitoso ni presenta la revisión local como publicación. El Sprint 1 persiste el borrador y sus datos iniciales.

@code src/features/campaigns/CampaignBuilderPage.tsx | Etapa de un sprint posterior

Ejemplo 2. Se retiró LocalFileStorage, el adaptador JSON antiguo que no tenía consumidores activos. El módulo usa TypeormFileStorage para metadatos en PostgreSQL y binarios locales. Mantener una segunda implementación obsoleta habría aumentado la superficie de mantenimiento sin cubrir un requisito vigente. Solo se retiró código; no se borraron manifiestos ni archivos del usuario. La versión anterior sigue recuperable en Git.

@code backend/src/files/files.module.ts | export class FilesModule
@code backend/src/files/infrastructure/typeorm-file-storage.ts | export class TypeormFileStorage

Ejemplo 3. La refactorización no agregó microservicios, colas, proveedores de pago ni canales SMS. El punto de extensión de correo ya responde a una necesidad concreta: separar el envío SMTP del restablecimiento de contraseña. No se implementaron canales hipotéticos.

La base oficial contiene tablas de futuras funcionalidades. Conservar ese esquema compartido no significa haber construido todos los módulos. También es válido conservar contratos pequeños que facilitan las pruebas actuales: YAGNI no prohíbe las interfaces.

Respuesta breve: “Eliminamos un adaptador sin uso y no ampliamos el sprint. Las interfaces que conservamos tienen consumidores y pruebas actuales”.

## 06 SOLID S de responsabilidad única

SRP pide separar responsabilidades que cambian por razones diferentes. No equivale a imponer un solo método por clase.

Ejemplo principal. RegisterUser coordina el registro; PasswordHasher protege la contraseña; UserRegistrationRepository define la escritura; TypeormRegistrationRepository conoce las tablas. Un cambio de SQL no debería obligar a modificar el caso de uso, mientras un cambio de política de registro sí podría hacerlo.

@code backend/src/users/application/register-user.ts | export class RegisterUser
@code backend/src/users/infrastructure/persistence/typeorm-registration.repository.ts | export class TypeormRegistrationRepository
@code backend/src/users/infrastructure/scrypt-password-hasher.ts | export class ScryptPasswordHasher

Ejemplo refactorizado. requestApi resuelve transporte y readJson interpretación básica del cuerpo; parseCover comprueba la forma de una portada. Antes, cada cliente mezclaba esos niveles dentro de su propia función de petición. No movimos las reglas específicas de negocio al helper compartido.

@code src/shared/api/request.ts | export async function requestApi
@code src/features/campaign-drafts/coverDraftClient.ts | function parseCover

Ejemplo visual. DraftReview se responsabiliza de presentar datos guardados; CampaignBuilderPage sigue coordinando las acciones del asistente. La separación permite probar el HTML de revisión de forma independiente.

Beneficio: las razones de cambio quedan más localizadas. Si cambia un encabezado HTTP, no hay que editar cuatro clientes. Si cambia el texto de la revisión, no es necesario tocar la persistencia de campañas.

Respuesta breve: “Separamos coordinación, presentación y detalles técnicos. SRP se justifica por la razón de cambio, no solo porque los archivos sean pequeños”.

## 07 SOLID O de abierto y cerrado

OCP propone puntos de extensión para variar comportamientos sin reescribir la lógica estable que los consume. No significa que el código nunca se pueda corregir o refactorizar.

PasswordRecovery depende de RecoveryDelivery. El adaptador SmtpRecoveryDelivery implementa el envío. Cambiar la infraestructura de entrega requiere una implementación compatible y ajustar el ensamblaje del módulo, sin meter detalles SMTP en el caso de uso. Actualmente solo existe un canal productivo; no afirmamos haber implementado SMS o múltiples proveedores.

@code backend/src/auth/application/password-recovery.ts | export interface RecoveryDelivery
@code backend/src/auth/infrastructure/smtp-recovery-delivery.ts | export class SmtpRecoveryDelivery
@code backend/src/auth/auth.module.ts | provide: PasswordRecovery

Otro punto de extensión es requestApi: acepta errorFromResponse. Campañas lo utiliza para producir DraftFieldError a partir de los errores por campo. El transporte compartido no contiene una condición especial para saber si se está creando una campaña.

@code src/shared/api/request.ts | interface ApiRequest
@code src/features/campaigns/campaignsClient.ts | errorFromResponse:

Beneficio: el comportamiento variable se conecta desde fuera y el código común mantiene un contrato pequeño. Coste: cada implementación nueva necesita pruebas; una interfaz por sí sola no garantiza compatibilidad ni facilita cualquier migración automáticamente.

Respuesta breve: “Podemos sustituir el detalle de entrega de correo sin introducir SMTP en PasswordRecovery. En el frontend, especializamos los errores por una función inyectada, no duplicando el transporte”.

## 08 SOLID L de sustitución de Liskov

LSP exige que una implementación o subtipo respete el contrato que espera su consumidor. Compilar no basta: también importan resultados, errores y efectos observables.

Ejemplo directo de herencia. DraftFieldError extiende SessionError. Conserva status igual a 400 y añade fields. El manejo general de errores puede tratarlo como SessionError; quien necesite errores por campo puede consultar la información adicional. La nueva prueba comprueba esta sustitución y que requestApi conserva el mismo error especializado.

@code src/shared/api/sessionError.ts | export class SessionError
@code src/features/campaigns/campaignsClient.ts | export class DraftFieldError
@code tests/api-request.test.ts | test('LSP

Ejemplo de contrato. CampaignCoverDrafts utiliza AuthorizedFileReader. En ejecución recibe Files; en pruebas, un doble que implementa privateDownload. Ambos deben devolver FileDownload o comunicar los errores definidos. El doble dejó de forzarse con as unknown as Files: ahora el compilador comprueba el contrato pequeño.

@code backend/src/files/application/files.ts | export interface AuthorizedFileReader
@code backend/test/cover-draft.test.ts | const files: AuthorizedFileReader

No sería correcto sustituir un error de base de datos por una lista vacía y decir que ambas implementaciones son equivalentes. Tampoco es correcto crear métodos que lanzan “no implementado” para satisfacer una interfaz que no corresponde.

Límite de la evidencia: estas pruebas cubren los escenarios declarados, no una demostración matemática de LSP para todo el proyecto. No se añadió herencia artificial entre usuarios solo para mostrar el principio.

Respuesta breve: “DraftFieldError puede manejarse como SessionError sin perder su estado HTTP. Sustituir una implementación exige respetar el comportamiento, no solamente el nombre de los métodos”.

## 09 SOLID I de segregación de interfaces

ISP evita que un consumidor dependa de operaciones que no necesita. Las interfaces deben ser pequeñas por el papel que cumplen, no dividirse mecánicamente hasta resultar incomprensibles.

Antes, CampaignCoverDrafts recibía la clase concreta Files, que también permite subir, descargar públicamente y eliminar archivos. Para asociar una portada solo necesita leer un archivo con autorización. Ahora recibe AuthorizedFileReader, cuyo único método es privateDownload.

@code backend/src/files/application/files.ts | export interface AuthorizedFileReader
@code backend/src/campaign-drafts/application/cover-draft.ts | constructor(

Files implementa esa interfaz sin perder sus operaciones propias. El caso de uso de portada ya no tiene un contrato que le permita eliminar o subir archivos. La prueba necesita construir únicamente la operación que consume, sin métodos ficticios ni conversiones forzadas.

Otro ejemplo existente es PasswordHasher en el registro: solo exige hash. RegisterUser no tiene por qué conocer la verificación de una contraseña de inicio de sesión ni las opciones internas de scrypt.

@code backend/src/users/application/register-user.ts | export interface PasswordHasher

Beneficio observable: menor acoplamiento y dobles de prueba más claros. Si el servicio general de archivos incorpora una operación que no usa la portada, su interfaz de lectura no necesita cambiar.

Respuesta breve: “La portada solo depende de lectura autorizada. ISP nos permitió retirar la dependencia del servicio completo y probarla con una interfaz real de un método”.

## 10 SOLID D de inversión de dependencias

DIP pide que la lógica de alto nivel dependa de contratos y que los detalles técnicos implementen esos contratos. No significa que todos los archivos del proyecto deban depender únicamente de interfaces.

RegisterUser recibe UserRegistrationRepository y PasswordHasher. Esos contratos pertenecen a application; TypeormRegistrationRepository y ScryptPasswordHasher los implementan en infrastructure. El caso de uso no crea un DataSource ni conoce nombres de tablas.

@code backend/src/users/application/register-user.ts | constructor(
@code backend/src/users/infrastructure/persistence/typeorm-registration.repository.ts | implements UserRegistrationRepository

La refactorización aplica la misma idea a CampaignCoverDrafts. El caso de uso recibe CoverDraftRepository y AuthorizedFileReader. La composición concreta con TypeormCoverDraftRepository y Files está en CampaignDraftsModule, donde corresponde conocer la infraestructura.

@code backend/src/campaign-drafts/application/cover-draft.ts | export class CampaignCoverDrafts
@code backend/src/campaign-drafts/campaign-drafts.module.ts | provide: CampaignCoverDrafts

La prueba de arquitectura comprueba que domain y application no importen NestJS, TypeORM, Express ni infrastructure. Se amplió la comprobación a archivos y portadas. Es una alarma automatizada para dependencias prohibidas; no sustituye revisar manualmente todas las decisiones de arquitectura.

@code backend/test/architecture.test.ts | test('archivos y portadas

Beneficio: los casos de uso se prueban sin levantar PostgreSQL y los detalles de persistencia quedan localizados. Migrar a otro motor todavía requeriría adaptar consultas, restricciones y pruebas: no se promete que cambiar una interfaz migre una base entera.

Respuesta breve: “El negocio pide guardar mediante un contrato; TypeORM implementa ese pedido. La dependencia se dirige hacia el contrato del caso de uso”.

## 11 IoC e inyección de dependencias

IoC invierte quién controla la construcción y coordinación de los componentes. La inyección de dependencias es una técnica para lograrlo. DIP explica hacia qué abstracciones conviene dirigir las dependencias; no es sinónimo de IoC.

NestJS actúa como contenedor. UsersModule declara proveedores, inject identifica las dependencias y useFactory construye RegisterUser con las implementaciones elegidas. RegistrationController recibe su caso de uso por constructor. No construye manualmente un repositorio SQL cada vez que llega una petición.

@code backend/src/users/users.module.ts | useFactory:
@code backend/src/users/infrastructure/http/registration.controller.ts | constructor(

CampaignDraftsModule hace lo mismo con portada y archivos. En una prueba unitaria se construye el caso de uso directamente con dobles compatibles; no hace falta arrancar el contenedor Nest para probar una regla.

@code backend/src/campaign-drafts/campaign-drafts.module.ts | useFactory:
@code backend/test/cover-draft.test.ts | return new CampaignCoverDrafts

El uso de new en un módulo de composición no incumple DIP. Precisamente en ese lugar se eligen y conectan los objetos concretos. Tampoco hay que prohibir new Error, new Date u objetos simples como si toda construcción fuera acoplamiento indebido.

Respuesta breve: “Nest construye y entrega los colaboradores. El caso de uso los recibe; no los busca en un contenedor global ni los crea internamente”.

## 12 Composición y regla del Boy Scout

Composición significa construir una solución usando colaboradores, en lugar de heredar solo para reutilizar código. CampaignCoverDrafts tiene un repositorio y un lector de archivos: no es un archivo ni un repositorio. RegisterUser tiene un generador de hash; no hereda de él. En React, CampaignBuilderPage compone CoverDraftEditor y DraftReview.

@code backend/src/campaign-drafts/application/cover-draft.ts | constructor(
@code src/features/campaigns/CampaignBuilderPage.tsx | <DraftReview

Se conserva herencia cuando sí existe una relación válida: DraftFieldError es un SessionError especializado. Favorecer composición no equivale a prohibir extends.

La regla del Boy Scout propone mejorar el código al intervenirlo, manteniendo el cambio acotado. En esta revisión se centralizó el transporte repetido, se simplificó una condición difícil de leer, se retiró el adaptador inactivo, se hizo explícito el contrato de lectura y se agregó la regresión de portada vacía.

No se cambió el diseño gráfico ni el esquema de la base por motivos cosméticos. No se reescribió toda la aplicación ni se introdujo un patrón para cada función. El historial anterior permite comparar los cambios y recuperar el adaptador retirado si alguna vez se necesita estudiar la versión antigua.

Respuesta breve: “Dejamos mejor los módulos que tocamos y protegimos sus contratos con pruebas. La composición nos permite conectar piezas pequeñas sin fabricar jerarquías artificiales”.

## 13 Patrones de diseño utilizados

### Repository

UserRegistrationRepository y CoverDraftRepository expresan operaciones de persistencia desde el punto de vista del caso de uso. Sus implementaciones TypeORM traducen esas operaciones a SQL y transacciones. Es un patrón de acceso a datos, no un patrón GoF creacional.

@code backend/src/campaign-drafts/application/cover-draft.ts | export interface CoverDraftRepository
@code backend/src/campaign-drafts/infrastructure/typeorm-cover-draft.repository.ts | export class TypeormCoverDraftRepository

Problema resuelto: evitar SQL dentro del caso de uso y permitir pruebas con un repositorio controlado. Ejemplo para mostrar: save actualiza portada y adjunto dentro de una transacción. Beneficio: el consumidor pide guardar una portada, no ejecuta cada sentencia por separado.

### Adapter

SmtpRecoveryDelivery adapta el contrato RecoveryDelivery al cliente SMTP de Nodemailer. TypeormCoverDraftRepository adapta CoverDraftRepository a PostgreSQL. La lógica de aplicación conoce la operación solicitada; el adaptador conoce la biblioteca y sus detalles.

@code backend/src/auth/infrastructure/smtp-recovery-delivery.ts | export class SmtpRecoveryDelivery

Problema resuelto: conectar una API técnica con la forma de operar del caso de uso. No se debe afirmar que el correo está validado en producción: el adaptador existe, pero el remitente autorizado sigue pendiente.

### Strategy mediante una función

requestApi recibe errorFromResponse para variar la interpretación de errores. Campañas aporta una función que produce DraftFieldError, mientras otros clientes usan el error HTTP general. Es una aplicación funcional de Strategy: el consumidor recibe un comportamiento sustituible, sin una jerarquía de clases innecesaria.

@code src/shared/api/request.ts | errorFromResponse?:
@code src/features/campaigns/campaignsClient.ts | errorFromResponse:

Si el docente pide un ejemplo GoF, explica primero Adapter y después esta variante de Strategy. El patrón se justifica por el comportamiento intercambiable, no por su nombre en un comentario.

### Fábricas de proveedores e inyección

useFactory es una función de creación para el contenedor de Nest. Es correcto llamarla fábrica de proveedor. No corresponde llamarla automáticamente Factory Method de GoF, que tiene una estructura más específica. No agregamos Singleton manual, Observer, Abstract Factory ni Decorator solo para aumentar la lista. Los decoradores de TypeScript no demuestran por sí solos el patrón Decorator.

## 14 Pruebas y evidencia de calidad

Después de refactorizar se ejecutaron lint, comprobación de tipos, pruebas y compilación. El frontend pasó 90 pruebas y el backend 87. La suite real de integración con PostgreSQL pasó 13 pruebas. Total: 190 casos aprobados entre esas tres ejecuciones; no es un porcentaje de cobertura ni una garantía de ausencia de errores.

@code tests/api-request.test.ts | test('DRY
@code tests/draft-review.test.ts | test(
@code backend/test/architecture.test.ts | test('archivos y portadas
@code backend/integration/cover-files.integration.test.ts | test(

Las pruebas pequeñas comprueban reglas, contratos y presentación sin depender de PostgreSQL. Las de integración levantan la API con la base local y verifican persistencia, registro, sesiones, perfiles, organizaciones, permisos, catálogos, borradores, modalidad, información, historia y portada. La prueba de portada utiliza datos ficticios y retira sus filas al terminar.

En el bloque anterior también se comprobó persistencia reiniciando PostgreSQL y se restauró un respaldo en una copia aislada. Esa evidencia está documentada en docs/integracion-local-sprint-1.md. No se repitió una restauración por cada cambio de presentación: las 13 integraciones sí se volvieron a ejecutar tras esta refactorización.

Comandos de defensa desde la raíz: bun run check. Desde backend: bun x --package pnpm@11.19.0 pnpm run check. Para la integración local, definir ALLOW_DB_TEST_WRITES=true y DB_TEST_RESTART=false, y ejecutar el mismo pnpm fijado con run test:integration. Requiere la V2 local preparada; no ejecutar estas pruebas de escritura contra una base compartida sin revisión.

No afirmamos haber practicado TDD en todo el desarrollo. Las pruebas de regresión de esta intervención se añadieron para proteger cambios concretos. Tampoco el número de pruebas prueba la calidad visual: se requiere revisar las pantallas y ensayar el recorrido de presentación.

## 15 Cambios de esta intervención y límites

Cambios nuevos: requestApi y readJson reutilizados en cuatro clientes; SessionError trasladado a shared con una reexportación compatible; AuthorizedFileReader y eliminación del cast forzado en la prueba de portada; extracción de DraftReview; matchesSignature simplificada; retiro del adaptador LocalFileStorage inactivo; cinco pruebas adicionales de frontend y una comprobación adicional de arquitectura backend.

Se conserva el registro público de SessionError desde sessionClient para no romper importaciones existentes. La mejora es incremental. Los demás clientes con contratos distintos no se migraron automáticamente; una siguiente revisión puede evaluar si comparten realmente el mismo transporte.

SOLID y patrones ya estaban presentes en la separación de capas, repositorios, contratos de registro y entrega de correo. Esta intervención los reforzó y documentó; no se atribuye toda la arquitectura a la refactorización actual.

Sigue pendiente para el cierre completo del Sprint 1: texto legal y datos por perfil aprobados; política definitiva de verificación; remitente autorizado y prueba de correo real; permisos definitivos; privacidad y retención; categorías y límites confirmados. No resolver esas decisiones dentro de una refactorización evita inventar negocio.

El constructor todavía concentra coordinación de varios estados, algunos límites del navegador y servidor deben mantenerse alineados y la validación de firma de archivo es básica, no antivirus. Estos límites deben explicarse sin presentar la solución como perfecta.

La refactorización no publica la rama ni cambia Trello. La evidencia técnica ayuda a sustentar la rúbrica, pero la calificación y aceptación corresponden al docente y a los responsables del proyecto.

## 16 Guion de defensa y preguntas de repaso

Orden recomendado: explicar alcance; demostrar registro y acceso; abrir borrador y guardar información, historia y portada; cerrar sesión y recuperar; enseñar los puntos de diseño; terminar con pruebas y pendientes. Ajustar la duración al tiempo asignado y ensayar con el mismo equipo que se usará el miércoles.

Pregunta: ¿Dónde se ve SOLID? Respuesta: abrir RegisterUser para SRP y DIP; RecoveryDelivery para OCP; DraftFieldError y su prueba para LSP; AuthorizedFileReader para ISP. Mostrar siempre la ubicación, el consumidor y el beneficio.

Pregunta: ¿Qué mejoró DRY? Respuesta: cuatro clientes usan requestApi para el transporte común. Las reglas de cada respuesta permanecen en su módulo.

Pregunta: ¿Por qué hay validación en ambos lados? Respuesta: el navegador ayuda al usuario; el servidor decide qué puede persistirse. El cliente no es una frontera de confianza.

Pregunta: ¿Qué patrón se aplicó y para qué? Respuesta: Repository aísla persistencia; Adapter conecta correo o base de datos con un contrato; la función de interpretación de errores actúa como Strategy. No son nombres intercambiables.

Pregunta: ¿Cómo sabes que refactorizar no rompió lo anterior? Respuesta: se mantuvieron contratos, se agregaron regresiones y pasaron los controles y la integración real. Esto reduce riesgo, no sustituye la aceptación funcional.

Pregunta: ¿Qué harías si cambia PostgreSQL? Respuesta: revisar adaptadores, consultas, restricciones y migraciones. Los contratos ayudan a aislar impacto; no hacen desaparecer la migración.

Pregunta: ¿Ya está cerrado todo el Sprint 1? Respuesta: existe un incremento integrado y probado; quedan las aprobaciones y verificaciones concretas enumeradas. El correo no se presenta como entregado si no se comprobó.

Antes de exponer: comprobar Docker, API y frontend; preparar datos ficticios; no mostrar .env ni contraseñas; tener abiertas las funciones indicadas y los resultados de pruebas; ensayar el tiempo; repartir explicación y demostración entre los tres integrantes sin inventar autorías individuales.

## 17 Material de referencia

Rúbrica e instrucciones de Sprint 1 proporcionadas en las dos capturas: entrega el 23/09/2026 a las 23:59; pesos 15, 20, 25, 25 y 15 por ciento. La fecha es la entrega indicada, no una hora inventada para la exposición.

APUNTES DE PROYECTO DE SISTEMAS II Teams.docx: unidad I; sección 1.2 y subsecciones SOLID, DRY, YAGNI, KISS, IoC, Boy Scout y composición; apartados 3.1 y 3.2 de pruebas. Los ejemplos del material en C# se aplicaron conceptualmente al proyecto TypeScript; no se cambió el stack por el lenguaje de los ejemplos.

SOLID.pdf, Lic. M.Sc. Benjamín H. Buitrago Conde: SRP en páginas 5 y 6; OCP en 7 y 8; LSP en 9 y 10; ISP en 11 y 12; DIP en 13 a 15.

DRY.pdf, mismo autor: definición en página 2, ejemplo de extracción de lógica en 5 y 6. YAGNI.pdf, mismo autor: definición y alcance en páginas 2 a 5. Se utiliza el contenido conceptual; no se necesita memorizar atribuciones históricas para defender estas decisiones.

Evidencia del proyecto: archivos y pruebas localizados en esta guía; docs/planificacion-sprints.md para alcance; docs/integracion-local-sprint-1.md para integración y pendientes. Los ejemplos descritos como nuevos corresponden a esta intervención; los demás se identifican como arquitectura existente.
