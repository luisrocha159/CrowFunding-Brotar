# Planificación de Brotar · ajuste Fase 3

Plan v2.3, actualizado el 30/09/2026 según [tarea oficial de campañas](requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf). El PDF define el alcance de esta entrega; el Figma orienta las pantallas. No se modifica la arquitectura ni se agregan historias duplicadas.

Se conservan **64 historias y 62 tareas**. Las tareas desglosan las historias: no sumar ambos conteos. Los estados técnicos que aparecen más abajo conservan el corte del 16–17/09/2026 y **no representan una auditoría actual del Sprint 1**; consultar sus evidencias posteriores y el estado actual en Trello.

| Agrupación | Tareas | M | L | Compromiso |
| --- | ---: | ---: | ---: | --- |
| Sprint 1 | 20 | 16 | 4 | Alcance conservado; estado histórico |
| Sprint 2 | 13 | 7 | 6 | Módulo de campañas de Fase 3 |
| Sprint 3 · inventario futuro | 29 | 14 | 15 | Por refinar; no cabe automáticamente en una iteración |
| Total | 62 | 37 | 25 | Sin duración ni capacidad acordadas |

M/L son tamaños preliminares, no horas ni puntos consensuados. **El Sprint 3 no se declara equilibrado ni comprometido:** reúne 29 tareas, muchas grandes y con dependencias externas. Seleccionar primero las desbloqueadas, refinar esfuerzo y repartir el resto en más iteraciones si hace falta.

## Cambios de alcance y asignación

Sprint 2 incluye planificación, presupuesto/riesgos, financiamiento, recompensas cuando correspondan, revisión final, envío, revisión administrativa, corrección, estados/publicación, proyectos propios, catálogo/detalle reales y pruebas integradas. Debe reutilizar acceso/roles existentes y validar permisos de creador, administrador y propiedad en backend.

Se trasladan ocho tareas sin duplicarlas: **S2-01, S2-06, S2-07, S2-08, S2-09, S2-18, S2-19, S2-20**. Sus IDs S2 se conservan como identificación histórica, pero la columna y etiqueta Sprint 3 indican su destino actual. Son galería multimedia adicional, KYC/KYB y aportes/checkout/pago simulado; quedan fuera de Fase 3, junto con pagos reales, finanzas y rendición.

Se añade el descarte de borradores propios a **BG-14 / S2-15**, no una historia nueva. Los estados de campaña serán borrador, pendiente de revisión, cambios solicitados, aprobada (aún no pública), publicada y rechazada. No condicionar esta entrega a KYC/KYB ni correo operativo. Las reglas no confirmadas continúan como decisiones pendientes.

Se conservan los responsables ya asignados: **Santiago 7, Alison 1 y Ricardo 5** tareas activas del Sprint 2. Este reparto deja de estar equilibrado al trasladar ocho tareas; **debe revisarse antes de empezar**, sin reasignación automática en este ajuste. Los miembros de las tareas trasladadas se mantienen.

[Datos del plan](planificacion-sprints.json) · [Mapa Trello](trello-sprints.json) · [Registro del ajuste](ajuste-sprint-2-fase-3-2026-09-30.md) · [Word histórico v2.2](entregables/general/03_Product_Backlog_General_Brotar.docx)

El Word anterior no se reescribe en este ajuste: la planificación vigente v2.3 es este documento, el JSON y Trello. El ajuste inicial se realizó sin publicar código; posteriormente el usuario solicitó incluir esta planificación en la actualización de DEV del 30/09/2026.

## Sprint 1 Base integrada y borrador inicial

Alcanzar acceso, perfil y organización persistentes, preparar los servicios compartidos y conservar un borrador con modalidad, información, portada e historia. No exige publicación completa ni aportes reales.

### E01 Preparar repositorio y backend

**Historias:** BG-57, BG-58, BG-63. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Aplicaciones separadas, arranque y configuración documentados; incremento publicado en main con commits 067f832 y dc7bcad, sin secretos.

Dependencias y validación: Autorización y revisión antes de publicar.

### E02 Restaurar y conectar PostgreSQL

**Historias:** BG-59. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Base provisional V2 restaurada de forma aislada y persistencia con TypeORM comprobada. No cierra las migraciones de BG-59.

Dependencias y validación: E01.

### E03 Conectar formularios y API

**Historias:** BG-60. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

HTTP real para acceso, perfil y organización, con validación y estados de carga, éxito y error. Las campañas públicas siguen simuladas.

Dependencias y validación: E01 y E02.

### E04 Registrar usuarios reales

**Historias:** BG-10. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Registro básico persistente, validaciones, contraseña protegida y rol básico. Texto legal y política definitiva siguen en S1-11.

Dependencias y validación: E02 y E03.

### E05 Iniciar y cerrar sesión

**Historias:** BG-09. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Ingreso, consulta de sesión, expiración y cierre probados contra API y PostgreSQL, bajo la política local ADR-002.

Dependencias y validación: E04.

### E06 Consultar y editar el perfil propio

**Historias:** BG-12. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Datos básicos propios consultables y editables, con persistencia. Guardados y compatibilidad de perfiles se completan después.

Dependencias y validación: E05.

### E07 Preparar roles y acceso privado

**Historias:** BG-53. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Roles iniciales y controles de autenticación y propiedad operativos. No equivale a toda la matriz de permisos del MVP.

Dependencias y validación: E05.

### E08 Registrar una organización vinculada

**Historias:** BG-26. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

Organización DRAFT persistida y relacionada con su usuario. Sin autoaprobación ni verificación KYB ficticia.

Dependencias y validación: E05 y E07.

### E09 Probar y entregar la integración básica

**Historias:** BG-62, BG-63. **Estado:** Cierre técnico. **Tamaño:** M. Responsable: Ricardo.

114 pruebas repetidas y guion publicados en main (067f832 y dc7bcad). Cierre técnico de la tarea; revisión y aceptación de líderes separadas.

Dependencias y validación: E01 a E08 y revisión de los responsables.

### S1-10 Preparar migraciones y recuperación

**Historias:** BG-59. **Estado:** Pendiente. **Tamaño:** L. Responsable: Santiago.

Versionar mecanismo de migración sobre la baseline oficial y ensayar respaldo y recuperación en copia aislada, conservando vistas, funciones y triggers.

Dependencias y validación: E02; D01 y VT.

### S1-11 Completar condiciones del registro

**Historias:** BG-10. **Estado:** Pendiente. **Tamaño:** M. Responsable: Alison.

Aplicar texto legal y datos por perfil aprobados; documentar y probar la política de verificación sin confundirla con KYC o KYB.

Dependencias y validación: E04; D03 y D08.

### S1-12 Implementar recuperación de contraseña

**Historias:** BG-11. **Estado:** Pendiente. **Tamaño:** L. Responsable: Alison.

Conectar un remitente autorizado y restablecimiento con caducidad y uso único; comprobar solicitud, error y enlace vencido sin afirmar envíos ficticios.

Dependencias y validación: E05; D08 y configuración del correo.

### S1-13 Preparar permisos del flujo creador

**Historias:** BG-53. **Estado:** Pendiente. **Tamaño:** M. Responsable: Santiago.

Refinar permisos de creador, revisor y cumplimiento; probar pertenencia y denegaciones en API. Las responsabilidades financieras se completan en S3-16.

Dependencias y validación: E07; D06.

### S1-14 Separar archivos públicos y privados

**Historias:** BG-61. **Estado:** Pendiente. **Tamaño:** L. Responsable: Alison.

Implementar almacenamiento autorizado, límites de carga, acceso por caso y rol, errores y limpieza de cargas fallidas; configurar privacidad y retención acordadas.

Dependencias y validación: E07; D03 y D08.

### S1-15 Preparar categorías y catálogos de campaña

**Historias:** BG-55. **Estado:** Pendiente. **Tamaño:** M. Responsable: Santiago.

API y edición autorizada de categorías necesarias, con referencias existentes protegidas. No crear parámetros de negocio todavía no aprobados.

Dependencias y validación: E07; D02 y D10.

### S1-16 Guardar y recuperar un borrador

**Historias:** BG-18. **Estado:** Pendiente. **Tamaño:** L. Responsable: Santiago.

Persistir datos y posición del asistente; recuperar después de cerrar sesión y comprobar propiedad, guardado, reintento y navegación entre pasos.

Dependencias y validación: E05, S1-10 y S1-13.

### S1-17 Elegir la modalidad de campaña

**Historias:** BG-15. **Estado:** Pendiente. **Tamaño:** M. Responsable: Santiago.

Guardar donación, recompensa o preventa, mostrar progreso y omitir recompensas en donación; confirmar cambios sin descartar datos silenciosamente.

Dependencias y validación: S1-16; D02.

### S1-18 Completar información general

**Historias:** BG-16. **Estado:** Pendiente. **Tamaño:** M. Responsable: Santiago.

Capturar nombre, categoría, ubicación y resumen con validaciones y límites acordados, reutilizando los datos de tarjeta y revisión.

Dependencias y validación: S1-15, S1-16 y S1-17; D02.

### S1-19 Cargar y reemplazar la portada

**Historias:** BG-17. **Estado:** Pendiente. **Tamaño:** M. Responsable: Alison.

Seleccionar, previsualizar, sustituir y persistir portada; validar en cliente y servidor y conservar formulario ante un fallo.

Dependencias y validación: S1-14 y S1-16; D03.

### S1-20 Describir historia e impacto

**Historias:** BG-19. **Estado:** Pendiente. **Tamaño:** M. Responsable: Santiago.

Guardar problema, solución, beneficiarios e indicadores esperados; distinguir metas de resultados y recuperar el contenido del borrador.

Dependencias y validación: S1-16.

## Sprint 2 Módulo de campañas · Fase 3

13 tareas. Completar el constructor iniciado en Sprint 1, administrar revisión/publicación y conectar la parte pública a PostgreSQL. No implementar aportes, checkout, pagos ni KYC/KYB.

### S2-02 Planificar actividades e hitos

**Historias:** BG-21. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Registrar actividades, responsables y cronograma; relacionar hitos cuando corresponda y validar fechas coherentes. Guardar y recuperar la planificación del borrador propio.

Dependencias y validación: S1-16; reglas de planificación y campos contrastados con PostgreSQL..

Criterios de cierre de esta etapa:

1. Registrar actividades, responsables y cronograma; relacionar hitos cuando corresponda y validar fechas coherentes. Guardar y recuperar la planificación del borrador propio.
2. Validar fechas coherentes, responsabilidades, persistencia al salir y volver, campos obligatorios y rechazo de edición por otro usuario.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-03 Registrar presupuesto y riesgos

**Historias:** BG-22. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Persistir gastos, partidas de presupuesto y riesgos del proyecto. Validar montos mayores a cero y mostrar totales sin imponer reglas de igualdad con la meta no confirmadas.

Dependencias y validación: S1-16 y S2-02; D02 para reglas adicionales de presupuesto..

Criterios de cierre de esta etapa:

1. Persistir gastos, partidas de presupuesto y riesgos del proyecto. Validar montos mayores a cero y mostrar totales sin imponer reglas de igualdad con la meta no confirmadas.
2. Validar montos, longitudes, riesgos y totales; conservar los datos ante errores y comprobar propiedad desde la API.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-04 Configurar el financiamiento

**Historias:** BG-23. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Guardar meta mayor a cero, moneda, duración y modelo de financiamiento admitidos por la base; validar fechas coherentes y explicar los datos requeridos.

Dependencias y validación: S2-03; D02 y revisión del esquema para moneda, duración y modelo. Sin pagos, proveedor ni checkout en esta fase..

Criterios de cierre de esta etapa:

1. Guardar meta mayor a cero, moneda, duración y modelo de financiamiento admitidos por la base; validar fechas coherentes y explicar los datos requeridos.
2. Probar meta positiva, moneda y modelo válidos, duración y fechas coherentes, guardado progresivo y respuestas de error por campo.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-05 Configurar recompensas y preventas

**Historias:** BG-24. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Santiago.

Gestionar tipo, descripción, aporte mínimo, disponibilidad y fecha estimada de recompensas según la modalidad. Omitir el paso cuando no corresponda; conservar cambios sin activar aportes ni pagos.

Dependencias y validación: S1-17 y S2-04; D02 y D07 para condiciones adicionales no confirmadas..

Criterios de cierre de esta etapa:

1. Gestionar tipo, descripción, aporte mínimo, disponibilidad y fecha estimada de recompensas según la modalidad. Omitir el paso cuando no corresponda; conservar cambios sin activar aportes ni pagos.
2. Probar importes positivos, disponibilidad y fechas, límites de texto y persistencia; omitir recompensas en donación y mantener coherencia al cambiar modalidad.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-10 Revisar la campaña antes del envío

**Historias:** BG-29. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Mostrar resumen y vista previa de la campaña persistida, indicar campos faltantes y enlazar al paso correspondiente. Cubrir tipo, información general con portada, historia e impacto, plan y presupuesto, financiamiento y recompensas aplicables.

Dependencias y validación: S1-17, S1-18, S1-19 y S1-20; S2-02 a S2-05. KYC/KYB, galería extra y checkout no son requisitos de envío de esta fase..

Criterios de cierre de esta etapa:

1. Mostrar resumen y vista previa de la campaña persistida, indicar campos faltantes y enlazar al paso correspondiente. Cubrir tipo, información general con portada, historia e impacto, plan y presupuesto, financiamiento y recompensas aplicables.
2. Comparar resumen con datos guardados; señalar exactamente los faltantes, volver al campo correspondiente y impedir envíos incompletos en frontend y backend. Revisar los siete pasos esperados por el PDF sin perder datos existentes.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-11 Enviar la campaña a revisión

**Historias:** BG-30. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Permitir al creador propietario enviar una campaña completa a pendiente de revisión. Controlar la transición y registrar usuario y fecha en backend; confirmar recepción y evitar envíos duplicados.

Dependencias y validación: S2-10; D05, D08 y D09 solo donde subsistan dudas sobre publicación o comunicaciones. Sin requisito KYC/KYB ni correo obligatorio para demostrar la fase..

Criterios de cierre de esta etapa:

1. Permitir al creador propietario enviar una campaña completa a pendiente de revisión. Controlar la transición y registrar usuario y fecha en backend; confirmar recepción y evitar envíos duplicados.
2. Probar campaña incompleta, envío válido, doble envío y acceso ajeno; comprobar el rol creador y la transición registrada en la API.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-12 Decidir sobre campañas recibidas

**Historias:** BG-42. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Ricardo.

Permitir al administrador consultar campañas pendientes y toda la información enviada; aprobar, rechazar con motivo o solicitar cambios con comentarios al creador. Registrar la decisión y su responsable.

Dependencias y validación: S2-11 y S1-13; D06 para provisión de roles y permisos. No depende de KYC/KYB ni de estadísticas administrativas completas..

Criterios de cierre de esta etapa:

1. Permitir al administrador consultar campañas pendientes y toda la información enviada; aprobar, rechazar con motivo o solicitar cambios con comentarios al creador. Registrar la decisión y su responsable.
2. Probar las tres decisiones, motivos y comentarios requeridos, historial y denegación en la API a usuarios sin permiso administrativo; aprobación no implica publicación.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-13 Corregir observaciones y reenviar

**Historias:** BG-31. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Mostrar al creador propietario los cambios solicitados; permitir corregir las secciones habilitadas y reenviar la campaña sin perder datos ni historial de decisiones.

Dependencias y validación: S2-12; reglas de edición por estado de S2-14..

Criterios de cierre de esta etapa:

1. Mostrar al creador propietario los cambios solicitados; permitir corregir las secciones habilitadas y reenviar la campaña sin perder datos ni historial de decisiones.
2. Probar lectura de observaciones, corrección persistente, reenvío y restricciones de estado y propiedad; no admitir modificaciones ajenas.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-14 Publicar y controlar estados de campaña

**Historias:** BG-32. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Ricardo.

Controlar y registrar en backend borrador, pendiente de revisión, cambios solicitados, aprobada, publicada y rechazada. Separar aprobación de publicación y hacer visible solo lo publicado; conservar motivo de rechazo e historial.

Dependencias y validación: S2-11 y S2-12; acordar el contrato de estados antes de integrar S2-13. D05 para quién ejecuta publicación y D09 para mapear los seis estados al esquema existente. Sin KYC/KYB, cierre financiero ni cancelaciones no definidas..

Criterios de cierre de esta etapa:

1. Controlar y registrar en backend borrador, pendiente de revisión, cambios solicitados, aprobada, publicada y rechazada. Separar aprobación de publicación y hacer visible solo lo publicado; conservar motivo de rechazo e historial.
2. Probar transiciones válidas y rechazadas, permisos de cada actor e historial; excluir de la API pública las campañas aprobadas pero no publicadas y las demás privadas.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-15 Gestionar proyectos propios y descartar borradores

**Historias:** BG-13, BG-14. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Ricardo.

Listar campañas propias con detalle y acciones según estado; continuar, consultar y actualizar el borrador. Permitir eliminar o descartar únicamente borradores propios con confirmación y control en backend.

Dependencias y validación: S1-16, S2-11 y S2-14; consultar el esquema antes de implementar el descarte. Estadísticas avanzadas del creador se posponen..

Criterios de cierre de esta etapa:

1. Listar campañas propias con detalle y acciones según estado; continuar, consultar y actualizar el borrador. Permitir eliminar o descartar únicamente borradores propios con confirmación y control en backend.
2. Probar lista vacía, detalle propio, continuación, acciones por estado y denegación a otro usuario. El descarte se verifica como criterio adicional de BG-14.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.
4. Probar descarte confirmado de borrador propio, rechazo de otro propietario y rechazo de estados no borrador; recuperar la lista sin datos descartados.

### S2-16 Conectar catálogo y detalle público con campañas reales

**Historias:** BG-01, BG-05, BG-06, BG-07, BG-08, BG-12. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Alison.

Sustituir campañas simuladas por la API pública. Mostrar solo publicadas con imagen, nombre, categoría, avance, meta y creador; buscar por texto y filtrar por categoría, ubicación y tipo. Incluir historia, problema, solución, beneficiarios, impacto y recompensas en el detalle.

Dependencias y validación: S2-14. Sin aportes, checkout ni KYC/KYB; guardados y favoritos se posponen sin eliminar su alcance del backlog general..

Criterios de cierre de esta etapa:

1. Sustituir campañas simuladas por la API pública. Mostrar solo publicadas con imagen, nombre, categoría, avance, meta y creador; buscar por texto y filtrar por categoría, ubicación y tipo. Incluir historia, problema, solución, beneficiarios, impacto y recompensas en el detalle.
2. Probar filtros, resultados vacíos y errores; comprobar contenido real y exclusión de campañas privadas. El avance debe proceder de datos reales, sin recaudaciones ficticias.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-17 Preparar acceso y cola administrativa de campañas

**Historias:** BG-41. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Ricardo.

Preparar navegación y acceso administrativo para listar campañas pendientes y abrir su detalle. Reutilizar la revisión de S2-12; no construir un panel completo con estadísticas ni colas KYC/KYB.

Dependencias y validación: S1-13 y S2-12; D06 para roles administrativos. La cola de campañas puede prepararse antes con el contrato acordado..

Criterios de cierre de esta etapa:

1. Preparar navegación y acceso administrativo para listar campañas pendientes y abrir su detalle. Reutilizar la revisión de S2-12; no construir un panel completo con estadísticas ni colas KYC/KYB.
2. Probar acceso permitido y denegado, lista vacía, carga y error. Diferenciar esta tarea de S2-12: navegación y cola frente a decisiones y registro de revisión.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

### S2-21 Verificar y documentar el segundo incremento

**Historias:** BG-04, BG-53, BG-60, BG-61, BG-62, BG-63. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Ricardo.

Probar y documentar el recorrido real de creador, borrador por pasos, continuidad, descarte, revisión administrativa, correcciones, aprobación, publicación y exploración pública. Actualizar README, contratos y evidencias sin cambiar la arquitectura.

Dependencias y validación: Las otras 12 tareas vigentes del Sprint 2 y la base del Sprint 1. Los ocho traslados a Sprint 3 no bloquean la entrega de campañas..

Criterios de cierre de esta etapa:

1. Probar y documentar el recorrido real de creador, borrador por pasos, continuidad, descarte, revisión administrativa, correcciones, aprobación, publicación y exploración pública. Actualizar README, contratos y evidencias sin cambiar la arquitectura.
2. Validar campos obligatorios, longitudes, montos positivos, fechas coherentes, carga/éxito/error y solicitudes duplicadas; comprobar autenticación existente, rol creador, propiedad, permiso administrativo, móvil y teclado. Checkout, pagos y KYC/KYB quedan fuera de estas pruebas de aceptación.
3. Adjuntar evidencia reproducible, pruebas y referencia de commit/PR; actualizar documentación y obtener revisión del alcance. No confundir cierre técnico con aceptación externa.

## Sprint 3 Inventario futuro por refinar

29 tareas, no un compromiso cerrado de sprint. Conservar el trabajo pendiente y sus decisiones; ordenar según dependencias y capacidad antes de escoger el siguiente incremento. Las ocho trasladadas se muestran primero por trazabilidad, no porque su número imponga el orden de ejecución.

### S2-01 Adjuntar multimedia de la campaña

**Historias:** BG-20. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Santiago.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Persistir galería y recursos admitidos, con orden, previsualización y errores; aplicar los límites de archivos acordados.

Dependencias y validación: S1-14 y S1-16; D03.

### S2-06 Registrar identidad y respaldos de persona

**Historias:** BG-25, BG-27. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Preparar caso KYC con datos, documentos y cuenta destino requeridos; conservar privacidad y distinguir documento cargado de validado.

Dependencias y validación: S1-14; D03.

### S2-07 Completar organización y respaldos KYB

**Historias:** BG-26, BG-27. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Ampliar el registro básico con representación, documentos y destino autorizado, vinculando usuario, organización y caso KYB.

Dependencias y validación: E08 y S1-14; D03 y D06.

### S2-08 Revisar casos KYC y KYB

**Historias:** BG-43, BG-44. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable: Ricardo.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Implementar colas, consulta privada y decisiones con motivo, responsable y fecha; impedir autoaprobación y exponer solo distintivos permitidos.

Dependencias y validación: S2-06, S2-07 y S1-13; D03, D06 y D09.

### S2-09 Mostrar y corregir la verificación

**Historias:** BG-28. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Mostrar estado y observaciones al titular y permitir completar o corregir respaldos sin perder historial.

Dependencias y validación: S2-08; D03 y D09.

### S2-18 Seleccionar el apoyo y su modalidad

**Historias:** BG-35. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Elegir monto y recompensa aplicable, comprobar mínimos y cupos y revalidar la selección antes del checkout.

Dependencias y validación: S2-05 y S2-14; D02.

### S2-19 Preparar el checkout

**Historias:** BG-36. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Mostrar resumen y condiciones aprobadas, permitir corrección y confirmar expresamente; separar visibilidad pública de identidad interna y recoger solo contacto autorizado.

Dependencias y validación: S2-18; D04 y D07.

### S2-20 Representar pagos de prueba

**Historias:** BG-37. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable: Alison.

Trasladada desde Sprint 2; conserva ID, responsable e historial. No es una tarea nueva.

Simulación rotulada de método, procesamiento, confirmado, pendiente, rechazado y expirado, con recuperación y reintento. Sin dinero real ni proveedor supuesto.

Dependencias y validación: S2-19; diseño y nomenclatura acordada.

### S3-01 Integrar el proveedor autorizado

**Historias:** BG-38. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Adaptador y confirmaciones verificables en sandbox, sin datos sensibles de tarjeta; activación en producción solo con aprobación explícita y configuración autorizada.

Dependencias y validación: S2-19 y S2-20; D04 y acceso al proveedor.

### S3-02 Asegurar importes y estados del aporte

**Historias:** BG-39. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Transacciones, cupos, idempotencia y notificaciones repetidas; aumentar recaudación solo con confirmación válida y conservar relación con devoluciones y disputas.

Dependencias y validación: S3-01; D02, D04 y D09.

### S3-03 Conectar el panel del patrocinador

**Historias:** BG-33. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Resumen real de aportes, proyectos apoyados o seguidos y novedades, con enlaces y vacíos; completar novedades al disponer de S3-12.

Dependencias y validación: S3-02 y S2-16.

### S3-04 Consultar mis aportes

**Historias:** BG-34. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Historial propio con filtros, estados, vínculos a comprobantes y devoluciones, sin exponer operaciones ajenas.

Dependencias y validación: S3-02; D04 y D09.

### S3-05 Consultar detalle y comprobante

**Historias:** BG-40. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Mostrar importe, método no sensible, fecha, estado y referencia verificable; ofrecer comprobante de pago según corresponda, no comprobante logístico.

Dependencias y validación: S3-02; D04 y D07.

### S3-06 Consultar operaciones financieras

**Historias:** BG-45. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Listado, filtros, totales y exportaciones con permisos y privacidad; distinguir los estados propios de pago, aporte y otros movimientos.

Dependencias y validación: S3-02 y permisos de S3-16; D04 y D09.

### S3-07 Conciliar operaciones

**Historias:** BG-46. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Comparar referencias e importes, detectar faltantes y duplicados y registrar resolución con responsable y motivo; reimportar sin duplicación.

Dependencias y validación: S3-06; D04.

### S3-08 Autorizar y seguir desembolsos

**Historias:** BG-47. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Implementar solicitud, autorización y seguimiento con bruto, costos y neto aprobados, cuenta y referencia; probar fallos y consulta del creador antes de operar.

Dependencias y validación: S3-07 y S2-08; D04, D06 y D09.

### S3-09 Gestionar devoluciones

**Historias:** BG-48. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Solicitud, autorización y resultado vinculados al aporte; impedir duplicados y excesos, conservar trazabilidad y mostrar estado al titular.

Dependencias y validación: S3-02 y S3-06; D04, D05 y D09.

### S3-10 Registrar incidencias

**Historias:** BG-49. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Tipo, descripción y evidencias permitidas vinculadas a campaña u operación; confirmar con referencia sin inventar plazos de atención.

Dependencias y validación: S1-14 y S3-04; D05.

### S3-11 Atender y resolver disputas

**Historias:** BG-50. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Bandeja, mensajes, estados y escalamiento con motivo e historial; ninguna resolución mueve dinero sin autorización financiera correspondiente.

Dependencias y validación: S3-10 y S3-09; D05 y D09.

### S3-12 Publicar avances y seguimiento

**Historias:** BG-07, BG-33, BG-51. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Capturar avances, hitos, responsables y evidencias; mostrar novedades y ausencia de ellas al público y patrocinador, sin construir seguimiento de paquetes.

Dependencias y validación: S2-02 y S2-14; D05, D07 y D10.

### S3-13 Registrar rendición y cierre

**Historias:** BG-52. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Comparar presupuesto y ejecución, fondos, saldo e indicadores; explicar variaciones y conservar evidencia final con permisos y aprobación acordados.

Dependencias y validación: S3-08 y S3-12; D05 y D10.

### S3-14 Administrar personas y organizaciones

**Historias:** BG-54. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Consulta y actualización autorizadas de datos y representación, separadas de verificación y permisos. Altas, restricciones y bajas solo bajo reglas aprobadas.

Dependencias y validación: E08 y S2-08; D06 y D10.

### S3-15 Consultar auditoría del sistema

**Historias:** BG-56. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Registrar y consultar actor, fecha, objeto, acción y resultado de decisiones y operaciones; verificar actor por transacción y excluir secretos.

Dependencias y validación: Instrumentar desde cada módulo; D03, D06 y VT.

### S3-16 Completar permisos por responsabilidad

**Historias:** BG-12, BG-41, BG-53. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Aplicar matriz aprobada a finanzas, soporte, administrador y auditor de lectura, así como perfiles compatibles; probar denegaciones y completar accesos del panel.

Dependencias y validación: S1-13; D06. Preparar cada permiso antes de exponer su módulo.

### S3-17 Completar parámetros acordados

**Historias:** BG-55. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Agregar solo parámetros de negocio aprobados, proteger referencias y auditar cambios; completar la interfaz acordada sin ampliar modalidades.

Dependencias y validación: S1-15; D02 y D10.

### S3-18 Cerrar contratos y persistencia integrados

**Historias:** BG-59, BG-60, BG-61. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Revisar contratos de todos los módulos, reemplazo controlado de mocks, privacidad y compatibilidad de migraciones; ensayar recuperación sobre el esquema final del incremento.

Dependencias y validación: Módulos S3 y S1-10; D01, D03, D09 y VT.

### S3-19 Verificar el MVP y la interfaz completa

**Historias:** BG-04, BG-62. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** L. Responsable por asignar.

Pruebas de reglas, API, persistencia, reintentos, cupos, permisos y transacciones; revisar todas las rutas en móvil, escritorio y teclado y corregir fallos.

Dependencias y validación: S2-21 y módulos S3.

### S3-20 Actualizar y publicar la entrega general

**Historias:** BG-63. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Revisar y publicar código, configuración sin secretos y documentación; actualizar backlog y explicativo y adjuntar enlace Figma y PDF general de pantallas finales.

Dependencias y validación: S3-18 y S3-19; autorización de publicación y acceso a Figma.

### S3-21 Validar el recorrido integral

**Historias:** BG-64. **Estado al corte histórico:** Pendiente. **Tamaño orientativo:** M. Responsable por asignar.

Demostrar registro, campaña, revisión, publicación, aporte, seguimiento y gestión interna, incluyendo fallos y límites; registrar aceptación de los responsables.

Dependencias y validación: S3-19 y S3-20; decisiones aplicables y revisión externa.

## Trazabilidad de las 64 historias

Los estados son históricos; la columna de sprint sí refleja el ajuste actual. Una historia puede abarcar varios incrementos. AP es un antecedente, no una tarea adicional.

| Historia | Estado al corte histórico | Sprints actuales | Tareas / antecedente |
| --- | --- | --- | --- |
| BG-01 Comunicar la propuesta de Brotar | Parcial | 1, 2 | S2-16 |
| BG-02 Explicar el ciclo de participación | Cierre técnico local | 1 |  |
| BG-03 Orientar a futuros creadores | Cierre técnico local | 1 |  |
| BG-04 Aplicar identidad y navegación compartidas | Parcial | 1, 2, 3 | S2-21, S3-19 |
| BG-05 Explorar campañas publicadas | Parcial | 1, 2 | S2-16 |
| BG-06 Buscar y combinar filtros | Parcial | 1, 2 | S2-16 |
| BG-07 Consultar el detalle público | Parcial | 1, 2, 3 | S2-16, S3-12 |
| BG-08 Resolver estados públicos alternativos | Parcial | 1, 2 | S2-16 |
| BG-09 Iniciar y cerrar una sesión real | Cierre técnico local | 1 | E05 |
| BG-10 Registrar una cuenta | Parcial | 1 | E04, S1-11 |
| BG-11 Recuperar el acceso | Parcial | 1 | S1-12 |
| BG-12 Administrar perfil y proyectos guardados | Parcial | 1, 2, 3 | E06, S2-16, S3-16 |
| BG-13 Consultar el panel del creador | Pendiente de desarrollo | 2 | S2-15 |
| BG-14 Gestionar mis proyectos | Pendiente de desarrollo | 2 | S2-15 |
| BG-15 Elegir el tipo de campaña | Pendiente de desarrollo | 1 | S1-17 |
| BG-16 Registrar la información general | Pendiente de desarrollo | 1 | S1-18 |
| BG-17 Cargar y reemplazar la portada | Pendiente de desarrollo | 1 | S1-19 |
| BG-18 Guardar y recuperar el borrador | Pendiente de desarrollo | 1 | S1-16 |
| BG-19 Describir historia e impacto esperado | Pendiente de desarrollo | 1 | S1-20 |
| BG-20 Adjuntar apoyo multimedia | Pendiente de desarrollo | 3 | S2-01 |
| BG-21 Planificar actividades e hitos | Pendiente de desarrollo | 2 | S2-02 |
| BG-22 Detallar presupuesto y riesgos | Pendiente de desarrollo | 2 | S2-03 |
| BG-23 Configurar las condiciones de financiamiento | Pendiente de desarrollo | 2 | S2-04 |
| BG-24 Gestionar recompensas y preventas | Pendiente de desarrollo | 2 | S2-05 |
| BG-25 Recopilar identidad de la persona | Pendiente de desarrollo | 3 | S2-06 |
| BG-26 Recopilar información de la organización | Parcial | 1, 3 | E08, S2-07 |
| BG-27 Registrar documentos y cuenta destino | Pendiente de desarrollo | 3 | S2-06, S2-07 |
| BG-28 Consultar y corregir la verificación | Pendiente de desarrollo | 3 | S2-09 |
| BG-29 Revisar el resumen y sus faltantes | Pendiente de desarrollo | 2 | S2-10 |
| BG-30 Enviar la campaña a revisión | Pendiente de desarrollo | 2 | S2-11 |
| BG-31 Corregir observaciones y reenviar | Pendiente de desarrollo | 2 | S2-13 |
| BG-32 Publicar y controlar el ciclo de campaña | Pendiente de desarrollo | 2 | S2-14 |
| BG-33 Consultar el panel del patrocinador | Pendiente de desarrollo | 3 | S3-03, S3-12 |
| BG-34 Consultar mis aportes | Pendiente de desarrollo | 3 | S3-04 |
| BG-35 Elegir monto y modalidad de apoyo | Pendiente de desarrollo | 3 | S2-18 |
| BG-36 Revisar y confirmar el checkout | Pendiente de desarrollo | 3 | S2-19 |
| BG-37 Representar métodos y resultados de pago | Pendiente de desarrollo | 3 | S2-20 |
| BG-38 Integrar el proveedor de pagos aprobado | Pendiente de desarrollo | 3 | S3-01 |
| BG-39 Mantener estados e importes consistentes | Pendiente de desarrollo | 3 | S3-02 |
| BG-40 Consultar detalle y comprobante del aporte | Pendiente de desarrollo | 3 | S3-05 |
| BG-41 Consultar pendientes administrativos | Pendiente de desarrollo | 2, 3 | S2-17, S3-16 |
| BG-42 Revisar y decidir sobre una campaña | Pendiente de desarrollo | 2 | S2-12 |
| BG-43 Gestionar colas y documentos KYC y KYB | Pendiente de desarrollo | 3 | S2-08 |
| BG-44 Registrar decisiones de verificación | Pendiente de desarrollo | 3 | S2-08 |
| BG-45 Consultar operaciones financieras | Pendiente de desarrollo | 3 | S3-06 |
| BG-46 Conciliar operaciones | Pendiente de desarrollo | 3 | S3-07 |
| BG-47 Autorizar y seguir desembolsos | Pendiente de desarrollo | 3 | S3-08 |
| BG-48 Gestionar devoluciones | Pendiente de desarrollo | 3 | S3-09 |
| BG-49 Reportar una incidencia | Pendiente de desarrollo | 3 | S3-10 |
| BG-50 Atender y resolver disputas | Pendiente de desarrollo | 3 | S3-11 |
| BG-51 Publicar avances y dar seguimiento | Pendiente de desarrollo | 3 | S3-12 |
| BG-52 Presentar rendición y cierre | Pendiente de desarrollo | 3 | S3-13 |
| BG-53 Aplicar permisos por responsabilidad | Parcial | 1, 2, 3 | E07, S1-13, S2-21, S3-16 |
| BG-54 Administrar personas y organizaciones | Pendiente de desarrollo | 3 | S3-14 |
| BG-55 Gestionar categorías y parámetros | Pendiente de desarrollo | 1, 3 | S1-15, S3-17 |
| BG-56 Consultar historial de auditoría | Pendiente de desarrollo | 3 | S3-15 |
| BG-57 Mantener el frontend por funcionalidades | Cierre técnico local | 1 | E01 |
| BG-58 Construir el backend modular | Cierre técnico local | 1 | E01 |
| BG-59 Integrar la base provisional y controlar migraciones | Parcial | 1, 3 | E02, S1-10, S3-18 |
| BG-60 Definir contratos e integrar las experiencias | Parcial | 1, 2, 3 | E03, S2-21, S3-18 |
| BG-61 Proteger archivos y datos privados | Parcial | 1, 2, 3 | S1-14, S2-21, S3-18 |
| BG-62 Probar reglas y recorridos | Parcial | 1, 2, 3 | E09, S2-21, S3-19 |
| BG-63 Mantener repositorio y documentación de entrega | Parcial | 1, 2, 3 | E01, E09, S2-21, S3-20 |
| BG-64 Validar el recorrido integral del MVP | Pendiente de desarrollo | 3 | S3-21 |

## Cierre y límites

Cerrar cada tarea con criterios, pruebas, evidencia y revisión; cerrar una historia solo cuando se satisfaga todo su alcance. No confundir cumplimiento de Fase 3 con cierre de extras aplazados (estadísticas, guardados o verificación de identidad). La aceptación externa se registra por separado.

BG-14, BG-29, BG-32 y BG-53 reciben un cuarto criterio acotado a Fase 3; los originales se conservan. La revisión final comprueba datos y recompensas aplicables, no exige KYC/KYB, galería extra ni checkout. El constructor existente separa Portada en una pantalla: revisar su alineación con los siete pasos del PDF, pudiendo integrarla en Información general sin perder datos guardados.

Mantener las decisiones pendientes aplicables, en especial provisión de roles, reglas de publicación y restricciones aún no confirmadas. No inventar plazos, reglas financieras ni permisos automáticos. El ajuste de planificación no certifica nueva implementación, no altera el Sprint 1 ni publica código.
