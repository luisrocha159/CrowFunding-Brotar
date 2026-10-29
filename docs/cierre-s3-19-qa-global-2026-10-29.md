# S3-19 · verificación del MVP y de la interfaz

**Ricardo · 29/10/2026 · RicardoDev local.** Sin push, cambios en DEV ni sincronización de Trello. El alcance es el MVP académico DEMO definido por el equipo; no certifica operaciones financieras reales ni cumplimiento jurídico externo.

**Estado: cierre técnico local de S3-19.** Se completó la matriz de 243 comprobaciones requeridas (81 casos × tres tamaños), que cubre los 73 patrones de ruta. En el último registro de cada caso: cero violaciones detectadas por axe, cero desbordamientos globales, cero excepciones de script y cero HTTP 5xx/conexiones fallidas inesperadas. Esto no equivale a ausencia de cualquier defecto futuro.

## Alcance y método

La matriz se obtiene del router real: 73 rutas, incluidas las de detalle y la página inexistente. Se preparan 81 casos concretos: esas rutas y los ocho pasos del constructor. Se revisan a 375, 768 y 1440 píxeles de ancho, con datos sintéticos, rutas de acceso, estados vacíos, registros disponibles y errores. La auditoría espera que terminen las peticiones y desaparezcan los indicadores de carga, para no aprobar únicamente un esqueleto vacío.

Se combina axe-core 4.14.0, inspección de estructura/desbordamientos, capturas y operaciones de teclado. La herramienta de diagnóstico registra únicamente rutas, códigos HTTP, reglas y selectores; no registra cuerpos de peticiones, valores de campos, contraseñas, cookies o tokens. Las cancelaciones por AbortController del modo de desarrollo se distinguen de fallos reales. Los 401 del visitante y los 403/404 de escenarios expresamente restringidos no son éxitos falsos ni fallos inesperados.

La aplicación bajo revisión utiliza la copia QA de PostgreSQL en 15448, API3198 y frontend5198, sin SMTP. Una segunda copia recién instalada, en15449, se utiliza para regresión de PostgreSQL/HTTP. No se prueban escrituras sobre la base original15433 ni se copian sus credenciales. El arranque de Docker requirió regenerar dos directorios de sockets temporales inaccesibles de Windows, conservando los anteriores mediante renombrado; no se eliminaron volúmenes ni se ejecutó Factory Reset. Los contenedores ajenos a Brotar no se modificaron.

## Hallazgos corregidos

| Hallazgo reproducido | Corrección y comprobación |
| --- | --- |
| Invitaciones y publicaciones administrativas anidaban otro `main`. | Se utiliza una sección dentro del único contenido principal del layout; comprobación de landmarks con axe y prueba de renderizado. |
| Estados vacíos/errores saltaban de h1 a h3; el catálogo empezaba sus categorías en h3 sin sección h2. | Jerarquía de encabezados corregida sin alterar el contenido de negocio. |
| Portada creaba un segundo h1 al estar embebida en el asistente. | Encabezado contextual h3 dentro del borrador; conserva h1 al abrirse como página independiente. |
| El título del navegador conservaba el encabezado de carga de una campaña. | Se actualiza cuando cambia el encabezado recibido con los datos, sin mover el foco durante la edición. |
| Menú de cuenta de escritorio sin cierre mediante Escape. | Escape cierra el desplegable y devuelve foco a su disparador. |
| Navegación administrativa móvil ocupaba casi toda la primera pantalla y Resumen aparecía activo en otras secciones. | Desplegable móvil, navegación semántica, selección exacta de Resumen, Escape y cierre al navegar; en escritorio permanece expandido inicialmente. |
| En móvil, la tabla de revisión comprimía los encabezados letra por letra. | Anchos mínimos legibles, columnas con scope y desplazamiento contenido en una región con nombre, ayuda y acceso mediante teclado; sin desbordar la página. |
| Categoría inválida enviaba el foco al segundo campo por el orden interno de validación. | Foco al primer campo con error según el orden visual del formulario; cancelación devuelve foco al encabezado. |
| Tab desde el último botón del diálogo de descarte podía salir a los controles del navegador. | Recorrido circular Tab/Shift+Tab, Escape, foco inicial en Conservar y restauración al disparador. No se elimina el borrador durante el ensayo. |
| El selector de portada refería una variable de color de foco inexistente. | Token de foco definido y borde visible de3px comprobado al tabular al archivo. |
| Asterisco obligatorio usaba aria-label sobre un span genérico. | Marca visual oculta solo al árbol accesible; el atributo required nativo conserva la obligatoriedad y el nombre del control queda limpio. |
| Aviso genérico de acceso negaba que existieran sesiones/correo conectados. | Texto coherente con la comprobación real del servidor, incluidos carga e indisponibilidad. |
| Algunos estados de campaña/avisos y categorías de soporte aparecían como códigos técnicos. | Se reutilizan etiquetas en español; los avisos históricos se presentan traducidos sin reescribir su registro. Se reutiliza también el catálogo de tipos de soporte en bandeja/detalle. Se conserva el código desconocido si no existe traducción. |
| Separador visual vacío cuando una campaña histórica no tenía ubicación. | El separador se muestra solo cuando hay una ubicación informada; no se inventa una dirección. |
| Un ensayo de publicaciones dependía de DEMO_PAYMENTS_ENABLED externo no documentado. | El propio test habilita/restaura su fixture DEMO; reproducción fallida y repetición aprobada sin esa variable externa. No cambia el comportamiento del servidor. |

| La vista previa de portada y el contador de recompensas tenían etiquetas ARIA sobre elementos genéricos. | Vista previa agrupada semánticamente y contador leído dentro del estado completo, sin etiqueta incompatible. Los nueve casos afectados se repitieron en los tres tamaños sin ese resultado incompleto. |

## Interacciones verificadas

- Inicio/cierre de sesión con cuentas sintéticas; redirección de Login/Registro a Mi cuenta si ya existe sesión.
- Menús de cuenta y administración con Enter/Escape, cierre al navegar y foco en el contenido nuevo.
- Categoría vacía: errores asociados y foco en el primer campo visible; cancelar conserva el catálogo.
- Diálogo de descarte: foco seguro, Tab/Shift+Tab contenidos, Escape y retorno al botón original sin borrar datos.
- Registro vacío: errores, foco en correo y comprobación de cuenta existente al salir del campo. La aceptación legal no se marca ni se envía durante estos ensayos inválidos.
- Perfil en blanco: rechazo y conservación de los datos previamente guardados.
- Plan/presupuesto: dos actividades vinculadas a un hito, importe calculado100×60=6000 y solo lectura, bloqueo si presupuesto supera meta, porcentajes0–100 y error asociado al escribir101, fechas planificadas no anteriores al día de Bolivia.
- Selector de portada alcanzable con teclado y foco visible; encabezado de portada correcto dentro y fuera del constructor.
- Auditor consulta sin controles de creación/guardado; usuario básico recibe el estado restringido al intentar rutas administrativas. Revisor, cumplimiento, soporte y finanzas se prueban con cuentas separadas.

- Soporte administrativo: el mensaje vacío no se envía y recibe foco/validación nativa; una respuesta sintética válida queda en la conversación y cambia Abierta → En atención con historial. Después de recargar, conserva respuesta e historial. No se utiliza SMTP en QA.

Las filas/estados de algunos registros financieros se prepararon como fixtures visuales, exclusivamente dentro de QA. Esas capturas no se usan como prueba de autorización o de pago: las reglas de negocio se demuestran mediante los escenarios HTTP/PostgreSQL independientes. Los importes, documentos y destinos son ficticios.

## Verificación automática

| Verificación | Resultado final |
| --- | --- |
| Frontend: lint, tipos, pruebas y build | Exit 0; 258 pruebas aprobadas |
| Backend: lint, tipos, pruebas y build | Exit 0; 239 pruebas aprobadas |
| Provisión ADMIN local | 8 pruebas aprobadas |
| Integración HTTP/PostgreSQL | 52 escenarios distintos aprobados mediante ejecución inicial y repeticiones dirigidas |
| Total sin contar repeticiones | **557 pruebas distintas aprobadas** |
| Navegador, seis perfiles principales | **243/243 casos medidos**, 73 patrones de ruta, 81 casos concretos, anchos 375/768/1440 |

Los resultados finales y hashes de evidencia están en [resumen.json](evidencias/s3-19/resumen.json), [matriz de rutas](evidencias/s3-19/matriz.md), [registros originales del navegador](evidencias/s3-19/audits-final.jsonl) y [hashes SHA-256](evidencias/s3-19/hashes-sha256.json). Los registros originales de ejecución permanecen privados en tmp/. Se cuentan escenarios distintos, sin sumar repeticiones como pruebas nuevas.

La ejecución general inicial de integración obtuvo47/52: cuatro escenarios se detuvieron antes de escribir porque el nombre del Compose no incluía la marca QA que exigen; otro rechazó el simulador desactivado. Los cuatro primeros se repitieron en el entorno QA permitido sin eliminar sus salvaguardas. El último se corrigió para gestionar su propia configuración DEMO y se repitió con la variable externa ausente. El informe final distingue ejecución inicial y comprobaciones posteriores.

## Capturas de comprobación

- [Finanzas, escritorio](evidencias/s3-19/finanzas-escritorio.png) y [móvil](evidencias/s3-19/finanzas-movil.png).
- [Soporte después de responder y recargar](evidencias/s3-19/soporte-final-escritorio.png).
- [Administración móvil y tabla legible](evidencias/s3-19/admin-movil.png).
- [Foco del selector de portada](evidencias/s3-19/portada-foco-escritorio.png).
- [Formulario inválido móvil](evidencias/s3-19/formulario-validaciones-movil.png).

## Repetir la auditoría visual

Usar una instalación de pruebas separada, con nombre de Compose que contenga `qa`, puerto propio y sin SMTP real. Preparar según README: SQL oficial,40 migraciones y preparación S2. No copiar el .env privado de un compañero.

Desde la raíz del repositorio, con la API de esa copia ya iniciada:

```powershell
$env:BACKEND_URL='http://127.0.0.1:3198'
$env:BROTAR_QA_AUDIT='true'
bun run dev --port 5198
```

Abrir las rutas de la matriz con cuentas de prueba. El resultado de axe se encuentra en el elemento no visual `#brotar-qa-report`, y el diagnóstico local de rendimiento en `#brotar-qa-performance`. El observador se inserta solo mediante la opción explícita de Vite en desarrollo: no forma parte de `bun run build` ni de la aplicación de producción.

Para repetir la regresión del código: `bun run check` en raíz y `corepack pnpm run check` en backend. La suite con escritura se ejecuta desde backend de la **copia QA** con `ALLOW_DB_TEST_WRITES=true`, `DB_TEST_RESTART=false` y las credenciales limitadas de su `.env.backend`, como indica README. No copiar esos flags a la configuración ordinaria de la API.

## Límites y cierre

Este cierre corresponde a la matriz concreta del MVP. Axe detecta una parte de las barreras; no sustituye una auditoría con lectores de pantalla. Los puntos de contraste marcados como incompletos requieren inspección adicional y se conservan en el registro, sin convertirlos en aprobados automáticamente. La revisión de capturas constituye la primera referencia visual de este corte; no existe una regresión pixel a pixel previa ni una conformidad exacta con Figma demostrada aquí. Las métricas de desarrollo local no representan Core Web Vitals de usuarios reales ni capacidad de producción. Una recarga local de soporte registró LCP 884 ms, CLS 0.5044 (pobre) e INP no disponible. Es un diagnóstico del servidor de desarrollo con contenido asincrónico; se documenta como pendiente de evaluación en un build representativo, sin declarar aprobado el rendimiento de producción. Se conserva la advertencia previa del tamaño del bundle; no se oculta cambiando el umbral.

S3-20 mantiene la entrega/documentación global y publicación autorizada; S3-21 la aceptación completa del recorrido entre roles; S3-26 la aceptación transversal de contactos, avisos y correo. No se cierran esas tarjetas por verificar la interfaz. El estado técnico local se registra por separado de la instantánea histórica de Trello.

**Resultado local:** S3-19 pasa de En curso a Cierre técnico DEMO. Sprint 3: 33 de 36 alcances con cierre técnico local; Ricardo 15/18. Quedan S3-20, S3-21 y S3-26; no se modifican los estados históricos del tablero ni se declara aceptado todo el MVP.
