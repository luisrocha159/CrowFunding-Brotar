# Tres recorridos de prueba manual del equipo

Corte DEV del 30/10/2026. Esta guía reparte las 73 rutas actuales sin omisiones ni duplicación de responsable principal. Las validaciones transversales se repiten en cada recorrido. **La asignación no significa que ustedes ya las hayan probado.** Registrar resultados en una copia de [la plantilla CSV](pruebas-manuales-equipo.csv). [Cobertura exacta por ruta](pruebas-manuales-equipo.json).

## Preparación común

1. Clonar/actualizar DEV y ejecutar README completo. Cada PC tiene base y archivos propios: una campaña creada en la PC de Santiago no aparecerá en la de Alison automáticamente. Para trabajar juntos en una sola instalación QA necesitan una dirección compartida y orígenes configurados; 127.0.0.1 siempre apunta a la PC de quien lo abre. No cambiar SQL ni entregar .env de base ajenos para compartir datos.
2. Verificar /api/health/ready = 200, catálogo autenticado con cinco categorías y pagos DEMO habilitados. Importar el paquete privado de correo siguiendo README; cada instalación necesita ese paso para Gmail real. No adjuntar contraseñas a los reportes.
3. Crear cuentas distintas para visitante/usuario aportante, creador, ADMIN, REVIEWER, COMPLIANCE, FINANCE, SUPPORT y AUDITOR. Una persona del equipo puede probar varias cuentas; usar perfiles separados del navegador para no mezclar sesiones. No asignar AUDITOR a una cuenta operadora: bloquea sus escrituras. No hacer que el creador se revise o desembolse a sí mismo.
4. Registrar primero la cuenta ADMIN y conceder ADMIN con el comando local de README. Desde /administracion/usuarios gestionar CREATOR y responsabilidades internas de las otras cuentas; /administracion/personas gestiona identidades, vínculos y restricciones. No introducir roles por registro público.
5. Usar campañas y documentos ficticios: una campaña A para éxito/ejecución/cierre; B para fallo, vencimiento, cancelación y devoluciones; C para organizaciones. Una campaña cerrada no sirve para demostrar un pago nuevo. Guardar UUID de campaña, slug, ID de aporte, intento, desembolso, caso y verificación por separado: no son intercambiables.
6. En la tabla de rutas, sustituir :id, :campaignId y :slug por el identificador que abre el enlace de la propia pantalla. No pegar literalmente los dos puntos. Entrar al checkout desde el botón de apoyo; conserva ?campaignId=, ?seleccion= o ?pago= según el paso. Abrir /crear-campana?borrador=UUID para recuperar un borrador concreto.

## Ruta 1 - Alison: visitante, cuenta, aportante y solicitudes

**Objetivo:** comprobar que una persona descubre una campaña, accede, aporta DEMO, consulta lo suyo y comunica un problema sin obtener acceso ajeno.

1. Sin sesión: inicio → Cómo funciona → Para creadores → Explorar → búsqueda → detalle público → rendición pública. Combinar filtros, vaciar búsqueda y probar cero resultados. Un borrador o campaña aprobada sin publicar no aparece al público; la cerrada conserva historia y no acepta aportes. Abrir una URL inexistente debe mostrar página de no encontrado.
2. Registro: correo primero, formato y disponibilidad al salir del campo, correo duplicado con distinta capitalización, nombres con Ñ/tildes, campos vacíos/espacios, prefijo separado y teléfono válido/inválido, contraseña y confirmación. Probar una frase de 15 o más caracteres y Ñ, sin introducir la contraseña en capturas. Términos/privacidad deben abrir la versión provisional y exigir aceptación declarada. El fallo no debe aparentar registro exitoso.
3. Login → Mi cuenta → editar perfil. Con sesión vigente, entrar por “ya tengo cuenta” o /iniciar-sesion y /registro no debe exigir otra autenticación. Recargar, volver atrás, cerrar sesión y probar una ruta privada. Una sesión anterior a cambio de contraseña deja de servir.
4. Recuperar acceso con un correo registrado cuyo buzón controlen: recibir enlace, abrirlo, cambiar contraseña, iniciar sesión con la nueva y rechazar enlace reutilizado/vencido. Con correo inexistente se conserva respuesta uniforme. Correo verificado: solicitar desde Mi cuenta, abrir /verificar-correo con su enlace y confirmar en la cuenta correcta; otra cuenta no consume el token. Comprobar preferencias y nueva verificación si cambia el correo.
5. Guardar/seguir una campaña; visitar Mis guardados y panel patrocinador; repetir clic y recargar. No deben aparecer favoritos ni aportes de otra cuenta. Probar estados vacíos con una cuenta nueva.
6. Elegir campaña publicada con recaudación vigente → selección de monto/recompensa → simulación aislada → checkout DEMO integrado. La simulación aislada no aumenta recaudación. Confirmar el consentimiento DEMO; crear intento, dejar pendiente y confirmar. Abrir Mis aportes, detalle y comprobante. Recargar/reintentar no crea un segundo aporte confirmado.
7. En otra campaña/intento: monto 0/negativo, texto o demasiados decimales, mínimo incumplido, cupo agotado y sesión vencida. Probar fallo/expiración y reintentar el mismo aporte. El QR es ilustrativo y nunca debe pagarse. Un aviso tardío no vuelve a sumar el aporte.
8. Crear incidencia con descripción y evidencia ficticia → abrir detalle → recibir respuesta de SUPPORT → contestar → consultar estado. Intentar vacío, texto corto, archivo inválido, ID ajeno y respuesta a un caso cerrado. Revisar correo solo con dirección verificada/preferencia aplicable; no confundir registro en cola con recepción.
9. Sobre un aporte confirmado de la campaña B: solicitar devolución y consultar su detalle; sobre otro caso válido crear disputa, aportar información y consultar resolución. Probar monto superior al disponible, duplicación, falta de motivo y acceso ajeno. Solicitar no ejecuta el dinero: coordinar con Ricardo para la respuesta FINANCE/SUPPORT y revisar saldos antes/después.

**Entrega a Ricardo:** ID de aporte confirmado, intento pendiente/fallido, solicitudes/casos y resultados de correo. **Necesita de Santiago/Ricardo:** una campaña publicada válida y una variante para devoluciones. Si cada uno usa base propia, recrear esos datos con cuentas de apoyo locales.

## Ruta 2 - Santiago: creador, organización y ejecución

**Objetivo:** comprobar creación, revisión/corrección y ejecución con persistencia, datos completos y separación entre proyecto personal e institucional.

1. Con CREATOR, abrir panel creador y Mis proyectos. Crear dos borradores, alternar entre ellos, cerrar navegador/reingresar y recuperar ambos. El segundo nunca reemplaza visualmente ni en la base al primero. Probar título igual en dos campañas: está permitido, pero UUID/slug deben ser distintos; semejanza informa a revisión, no impone bloqueo automático por nombre.
2. Completar el asistente: modalidad → información general/categoría/ubicación → historia e indicadores → imágenes/portada → plan → presupuesto/riesgos → financiación → recompensas cuando aplican → revisión. Visitar también la portada independiente y recuperar su borrador. Guardar cada sección y esperar confirmación; recargar comprueba persistencia real.
3. Validar todos los formularios con campos vacíos/espacios, mínimos/máximos, texto Unicode, enteros frente a importes decimales y selecciones de catálogo. Resumen corto de más de diez caracteres; cantidad × precio coherente con importe; meta superior al presupuesto; porcentaje entre 0 y 100; fechas planificadas no pasadas y ordenadas. Los gastos históricos reales admiten pasado dentro del período: no se rechazan indiscriminadamente todas las fechas anteriores a hoy.
4. Crear un hito con dos actividades, guardar y recuperarlo sin perder relaciones. Probar fecha final anterior al inicio, responsable ausente, indicador/unidad/meta incompatibles, archivo de tipo/tamaño inválido, más elementos que el límite y cambio de modalidad con/sin recompensas. Los errores indican campo y preservan lo escrito; ninguna respuesta incompleta figura como guardado correcto.
5. Mi verificación: documentos sintéticos requeridos, consentimiento de política vigente y envío. Recibir observaciones COMPLIANCE, corregir y reenviar conservando historial. No autoaprobarse ni asumir identidad por tener rol CREATOR. Confirmar que documentos privados no aparecen al público.
6. Mis organizaciones: crear entidad ficticia con tipo de catálogo y contacto válidos; expediente KYB y representación/destino DEMO cuando corresponda. Invitar a otra cuenta como MEMBER/ADMIN, aceptar desde Mis invitaciones en esa otra sesión y probar rechazo/cancelación/vencimiento. Pendiente no concede acceso; revocar/demover debe quitarlo inmediatamente, sin convertir membresía en un rol global.
7. Revisar faltantes → enviar campaña → REVIEWER pide cambios → corregir → reenviar → REVIEWER aprueba → ADMIN publica. Antes de publicar no aparece en Explorar. Creador ajeno no puede leer/editar borrador ni publicar. Confirmar estados en panel, Mis proyectos y detalle.
8. Campaña A: consultar ciclo y detalle, solicitar inicio de ejecución al cumplir reglas y preparar destino ficticio desde desembolsos de campaña. Coordinar revisión FINANCE; solicitar importe permitido y seguir lista/detalle de desembolsos. Destino no aprobado, importes excesivos, duplicados y fechas no válidas deben rechazarse; solicitar/autorizar no significa completar.
9. Con ejecución autorizada y fondos DEMO desembolsados: registrar avances de actividades/hitos/indicadores, publicar novedad y corrección referenciada, documentar cumplimiento de recompensa, rendir gastos con archivos de evidencia y presentar revisión. Probar 101 %, fecha futura de gasto, gasto fuera del período, saldo insuficiente, importe con tres decimales y documento ajeno.
10. Consultar rendición mensual de meses terminados, observaciones y corrección; el resumen público requiere aprobación/consentimiento específico y no muestra documentos ni destino privado. Preparar informe final acumulativo, completar obligaciones y pedir cierre. ADMIN cierra tras revisión independiente; el cierre es terminal. No editar ni aportar después; revisar que el historial público permanece.

**Entrega a Ricardo:** UUID/slug de campañas A/B/C, borradores, expedientes, destino y solicitudes de cierre/rendición. **Necesita de Alison:** aportes DEMO y casos. Los pasos por vencimiento o mes terminado requieren esperar su fecha o usar una QA aislada con fixtures del procedimiento S3-21; no alterar el reloj/SQL de una instalación de uso para fingir éxito. Registrar POR_PROBAR si falta esa condición.

## Ruta 3 - Ricardo: revisión, finanzas y controles internos

**Objetivo:** validar operaciones privilegiadas con cuentas separadas, historial auditable y consistencia de dinero DEMO.

1. ADMIN: abrir panel administrativo, usuarios y personas; conceder/revocar CREATOR y responsabilidades con motivo. Probar cambios propios no autorizados, combinaciones incompatibles y AUDITOR. Bloquear/restringir una cuenta y comprobar que una sesión ya abierta pierde la operación prohibida. Asegurar que totales, accesos y pendientes cambian según el rol, sin mostrar datos ajenos.
2. Catálogos/parámetros: verificar cinco categorías tras instalación nueva; crear/editar/desactivar una categoría de prueba y comprobar el catálogo del asistente. No romper referencias usadas ni aceptar tipos, mínimos/máximos o claves de parámetros inválidos. El frontend usa catálogo de la base, no una lista inventada local.
3. COMPLIANCE: cola/detalle persona y organización → abrir evidencia privada autorizada → pedir documento/rechazar con motivo → revisar reenvío y aprobar. Decisiones versionadas sin sobreescribir original; probar autoverificación, archivo ajeno, cambio concurrente y cuenta bloqueada. La aprobación no concede automáticamente rol CREATOR ni autoriza dinero.
4. REVIEWER: cola/detalle de campañas → ver todas las secciones → pedir cambios con motivo → aprobar el reenvío válido. ADMIN publica aparte. Probar campaña incompleta, doble decisión y versión desactualizada. Un REVIEWER no publica ni opera finanzas.
5. FINANCE: ver operaciones y filtros; comparar aporte confirmado con recaudación. Conciliación: lista/detalle, referencia, diferencia y resolución motivada; importar/reintentar no duplica ingreso. ADMIN sin FINANCE y AUDITOR no deben poder operar dinero; monedas no se suman como si fueran una sola.
6. En desembolsos, revisar destino ficticio y separarse del solicitante/beneficiario; autorizar, procesar y completar con referencia DEMO. Comparar bruto/costos/neto/saldo reservado. Probar sin verificación, saldo insuficiente, doble clic, fecha adelantada y referencia duplicada; fallo/rechazo no descuenta como pago completado.
7. Resolver devoluciones totales/parciales autorizadas: confirmar saldo/reservas y efecto en recaudación. Resolver disputas con SUPPORT, pero ejecutar una compensación solo desde FINANCE y con su autorización. No restar dos veces ni permitir devolver más de lo confirmado. Revisar casos con operación fallida y reintento.
8. SUPPORT: bandeja/detalle → asignar → responder al titular → pedir información/escalar/resolver/reabrir según estado. Probar motivo vacío, texto inválido, doble envío, ID ajeno y cierre. Confirmar correo al titular verificado/preferencia y ausencia de documentos/textos privados en avisos. Un operador de soporte no hace devolución financiera desde una respuesta.
9. ADMIN: ciclo de campañas y detalle, vencimiento, resultado todo-o-nada/flexible, meta no alcanzada, cancelación e inicio de ejecución. Calcular desde confirmados menos devoluciones completadas; antes del vencimiento no simular un cierre exitoso. Usar campañas diferentes para éxito/cancelación/fallo, sin reabrir estados terminales.
10. REVIEWER revisa rendición y cierre final; ADMIN aprueba publicación/retira un resumen/novedad pública y cierra la campaña cuando corresponde. Probar bloqueos por recompensas, actividades o evidencias pendientes; una aprobación financiera no sustituye revisión de rendición. Gastos aprobados periódicos no se suman dos veces en el final.
11. AUDITOR: revisar filtros/paginación/exportación autorizada del historial de las acciones anteriores. Deben figurar actor, referencia, fecha y acción, sin contraseñas/tokens/documentos/cuerpos privados. Probar escritura con AUDITOR, denegación a usuario básico, recargar y reiniciar API; estados/importes/historial deben persistir.

**Cierre entre los tres:** comparar aporte → recaudación → devolución/desembolso → gasto/rendición y estado público. Ninguno marca OK por abrir solo la pantalla; comprobar guardado, efecto y permiso esperado. S3-21 ya tiene aceptación académica de Ricardo; esta ronda adicional no se atribuye a Alison/Santiago antes de que la ejecuten.

## Validaciones que repite cada responsable

- Caso válido; campos obligatorios marcados; vacío, solo espacios, min/max, tildes/Ñ, número donde corresponde y selección fuera de catálogo. El servidor también rechaza datos inválidos; no basta la validación HTML.
- Fechas según su significado: planificación presente/futuro; gasto real pasado/presente dentro de período; inicio/fin coherentes; porcentajes 0-100; dinero positivo y precisión permitida; cupo entero no negativo según el campo.
- Usuario sin sesión, cuenta básica, dueño, tercero y rol habilitado. Probar enlace directo y cambio de ID. Un error 401/403/404 esperado puede ser un resultado correcto, sin filtrar información privada.
- Doble clic, reintento, volver atrás, recargar, pérdida de red y recuperación. No declarar guardado, pago o correo confirmado sin su resultado; preservar los datos y mostrar carga/error/reintento.
- Escritorio, móvil 375 px, tableta 768 px, teclado Tab/Enter/Espacio, foco visible, mensajes legibles, * obligatorios y navegación sin desbordamiento accidental. Las tablas permiten desplazamiento anunciado.
- Anotar variante probada por ruta (éxito, vacío, error y permiso); repetir tras reinicio para registros importantes. Sin credenciales en capturas. Correos nuevos durante estas pruebas son acciones humanas del equipo, no envíos hechos al preparar esta guía.

## Registrar resultados

Por cada patrón del inventario completar URL real, rol/cuenta sintética, variante, esperado, obtenido y evidencia. Estados: POR_PROBAR, OK, FALLO o BLOQUEADO_POR_DATOS. Si una ruta tiene un defecto en una variante, no marcarla íntegramente OK. Repetir fila para variantes adicionales manteniendo el ID de ruta. En bugs registrar pasos reproducibles, severidad, captura y UUID sin secretos. La plantilla original permanece vacía como evidencia honesta de lo que falta ejecutar manualmente.

## Inventario de la ruta 1 - Alison (30 patrones)

| ID | Patrón | Resultado inicial |
| --- | --- | --- |
| M-01 | `/` | POR_PROBAR |
| M-02 | `/condiciones` | POR_PROBAR |
| M-15 | `/como-funciona` | POR_PROBAR |
| M-16 | `/para-creadores` | POR_PROBAR |
| M-17 | `/explorar` | POR_PROBAR |
| M-18 | `/explorar/buscar` | POR_PROBAR |
| M-19 | `/campanas/:id/rendicion-publica` | POR_PROBAR |
| M-20 | `/proyectos/:slug` | POR_PROBAR |
| M-21 | `/iniciar-sesion` | POR_PROBAR |
| M-22 | `/mi-cuenta` | POR_PROBAR |
| M-23 | `/verificar-correo` | POR_PROBAR |
| M-24 | `/mis-incidencias` | POR_PROBAR |
| M-25 | `/mis-incidencias/nueva` | POR_PROBAR |
| M-26 | `/mis-incidencias/:id` | POR_PROBAR |
| M-29 | `/mis-aportes` | POR_PROBAR |
| M-30 | `/mis-aportes/:id` | POR_PROBAR |
| M-31 | `/mis-aportes/:id/comprobante` | POR_PROBAR |
| M-32 | `/panel-patrocinador` | POR_PROBAR |
| M-33 | `/simulacion-apoyo` | POR_PROBAR |
| M-34 | `/apoyo-demo` | POR_PROBAR |
| M-38 | `/mis-devoluciones` | POR_PROBAR |
| M-39 | `/mis-devoluciones/nueva` | POR_PROBAR |
| M-40 | `/mis-devoluciones/:id` | POR_PROBAR |
| M-43 | `/mis-disputas` | POR_PROBAR |
| M-44 | `/mis-disputas/nueva` | POR_PROBAR |
| M-45 | `/mis-disputas/:id` | POR_PROBAR |
| M-57 | `/mis-guardados` | POR_PROBAR |
| M-71 | `/registro` | POR_PROBAR |
| M-72 | `/recuperar-contrasena` | POR_PROBAR |
| M-73 | `*` | POR_PROBAR |

## Inventario de la ruta 2 - Santiago (16 patrones)

| ID | Patrón | Resultado inicial |
| --- | --- | --- |
| M-03 | `/mis-proyectos/:id/cierre` | POR_PROBAR |
| M-06 | `/mis-campanas/ciclo` | POR_PROBAR |
| M-07 | `/mis-campanas/ciclo/:id` | POR_PROBAR |
| M-10 | `/mis-desembolsos` | POR_PROBAR |
| M-11 | `/mis-desembolsos/:id` | POR_PROBAR |
| M-12 | `/mis-proyectos/:campaignId/desembolsos` | POR_PROBAR |
| M-35 | `/mi-verificacion` | POR_PROBAR |
| M-48 | `/panel-creador` | POR_PROBAR |
| M-49 | `/mis-proyectos/:id/rendicion` | POR_PROBAR |
| M-54 | `/mis-proyectos/:id/avances` | POR_PROBAR |
| M-58 | `/mis-organizaciones` | POR_PROBAR |
| M-59 | `/crear-campana` | POR_PROBAR |
| M-60 | `/mis-invitaciones` | POR_PROBAR |
| M-61 | `/mis-proyectos` | POR_PROBAR |
| M-62 | `/mis-proyectos/:id` | POR_PROBAR |
| M-70 | `/mi-campana/portada` | POR_PROBAR |

## Inventario de la ruta 3 - Ricardo (27 patrones)

| ID | Patrón | Resultado inicial |
| --- | --- | --- |
| M-04 | `/administracion/cierre-campanas` | POR_PROBAR |
| M-05 | `/administracion/cierre-campanas/:id` | POR_PROBAR |
| M-08 | `/administracion/ciclo-campanas` | POR_PROBAR |
| M-09 | `/administracion/ciclo-campanas/:id` | POR_PROBAR |
| M-13 | `/administracion/desembolsos` | POR_PROBAR |
| M-14 | `/administracion/desembolsos/:id` | POR_PROBAR |
| M-27 | `/administracion/soporte` | POR_PROBAR |
| M-28 | `/administracion/soporte/:id` | POR_PROBAR |
| M-36 | `/administracion/verificaciones` | POR_PROBAR |
| M-37 | `/administracion/verificaciones/:id` | POR_PROBAR |
| M-41 | `/administracion/devoluciones` | POR_PROBAR |
| M-42 | `/administracion/devoluciones/:id` | POR_PROBAR |
| M-46 | `/administracion/disputas` | POR_PROBAR |
| M-47 | `/administracion/disputas/:id` | POR_PROBAR |
| M-50 | `/administracion/rendicion` | POR_PROBAR |
| M-51 | `/administracion/rendicion/:id` | POR_PROBAR |
| M-52 | `/administracion/publicaciones` | POR_PROBAR |
| M-53 | `/administracion` | POR_PROBAR |
| M-55 | `/administracion/catalogos` | POR_PROBAR |
| M-56 | `/administracion/personas` | POR_PROBAR |
| M-63 | `/administracion/campanas` | POR_PROBAR |
| M-64 | `/administracion/campanas/:id` | POR_PROBAR |
| M-65 | `/administracion/usuarios` | POR_PROBAR |
| M-66 | `/administracion/finanzas` | POR_PROBAR |
| M-67 | `/administracion/conciliacion` | POR_PROBAR |
| M-68 | `/administracion/conciliacion/:id` | POR_PROBAR |
| M-69 | `/administracion/auditoria` | POR_PROBAR |

La ruta `*` se prueba con una URL inexistente, no escribiendo un asterisco en el navegador. Los accesos comunes pueden repetirse; cada patrón tiene un responsable principal en este inventario.
