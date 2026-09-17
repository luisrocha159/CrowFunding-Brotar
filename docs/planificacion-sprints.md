# Planificación de los tres sprints de Brotar

Corte técnico: 16/09/2026. Propuesta ampliada: no hay duración, fechas ni capacidad confirmadas. El reparto del Sprint 1 fue aprobado el 17/09; ver [asignación](asignacion-sprint-1.md). Sincronizada con Trello el 17/09/2026; ver [organización y comprobaciones](organizacion-trello-sprints-2026-09-17.md).

Se conservan 64 historias: 5 con cierre técnico local, 16 parciales y 43 pendientes. El catálogo de **62 tareas** desglosa esas historias; no se suman ambos conteos.

| Sprint | Tareas | Cierre técnico | Parciales | Pendientes |
| --- | ---: | ---: | ---: | ---: |
| 1 | 20 | 9 | 0 | 11 |
| 2 | 21 | 0 | 0 | 21 |
| 3 | 21 | 0 | 0 | 21 |
| Total | 62 | 9 | 0 | 53 |

El Sprint 1 conserva E01 a E09 y agrega S1-10 a S1-20; sigue abierto. El antecedente público AP no es otra tarea E. La cantidad similar de tareas no implica esfuerzo idéntico: finanzas conserva mayor complejidad externa. M/L son tamaños orientativos, no estimaciones acordadas. Refinar tareas L y dividir en más iteraciones si la capacidad lo exige.

[Word actualizado](entregables/general/03_Product_Backlog_General_Brotar.docx) · [Datos del plan](planificacion-sprints.json) · [Evidencia del corte](cierre-tecnico-backlog-2026-09-16.md)

Estado de entrega actualizado el 17/09/2026: E01 y E09 cerradas técnicamente tras publicar 067f832 y dc7bcad en main. [Evidencia y límites](entrega-integracion-2026-09-17.md). La aceptación externa sigue pendiente.

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

## Sprint 2 Campañas y checkout de prueba

Completar preparación, verificación, revisión y publicación; conectar la experiencia pública con campañas reales y dejar el apoyo y pago de prueba claramente identificados.

### S2-01 Adjuntar multimedia de la campaña

**Historias:** BG-20. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Persistir galería y recursos admitidos, con orden, previsualización y errores; aplicar los límites de archivos acordados.

Dependencias y validación: S1-14 y S1-16; D03.

### S2-02 Planificar actividades e hitos

**Historias:** BG-21. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Registrar actividades, fechas y responsables, relacionar hitos y validar coherencia temporal; recuperar todo desde el borrador.

Dependencias y validación: S1-16; reglas de planificación aprobadas.

### S2-03 Registrar presupuesto y riesgos

**Historias:** BG-22. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Persistir partidas y riesgos y comprobar totales y coherencia con la meta, sin inventar el tratamiento de diferencias.

Dependencias y validación: S1-16 y S2-02; D02.

### S2-04 Configurar el financiamiento

**Historias:** BG-23. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Guardar meta, plazo y condiciones permitidas, con validaciones y explicación visible del modelo aprobado.

Dependencias y validación: S2-03; D02 y D04.

### S2-05 Configurar recompensas y preventas

**Historias:** BG-24. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Gestionar niveles, importes, cupos y condiciones según modalidad, con validación y reglas aprobadas; excluir logística no autorizada.

Dependencias y validación: S1-17 y S2-04; D02 y D07.

### S2-06 Registrar identidad y respaldos de persona

**Historias:** BG-25, BG-27. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Preparar caso KYC con datos, documentos y cuenta destino requeridos; conservar privacidad y distinguir documento cargado de validado.

Dependencias y validación: S1-14; D03.

### S2-07 Completar organización y respaldos KYB

**Historias:** BG-26, BG-27. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Ampliar el registro básico con representación, documentos y destino autorizado, vinculando usuario, organización y caso KYB.

Dependencias y validación: E08 y S1-14; D03 y D06.

### S2-08 Revisar casos KYC y KYB

**Historias:** BG-43, BG-44. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Implementar colas, consulta privada y decisiones con motivo, responsable y fecha; impedir autoaprobación y exponer solo distintivos permitidos.

Dependencias y validación: S2-06, S2-07 y S1-13; D03, D06 y D09.

### S2-09 Mostrar y corregir la verificación

**Historias:** BG-28. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Mostrar estado y observaciones al titular y permitir completar o corregir respaldos sin perder historial.

Dependencias y validación: S2-08; D03 y D09.

### S2-10 Revisar la campaña antes del envío

**Historias:** BG-29. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Resumen y vista previa con datos persistidos, faltantes y enlaces al paso correspondiente; impedir envío incompleto según requisitos aprobados.

Dependencias y validación: S2-01 a S2-09; D03 y D05.

### S2-11 Enviar la campaña a revisión

**Historias:** BG-30. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Crear solicitud y transición válidas, confirmar recepción y evitar envíos duplicados con trazabilidad y comunicación acordada.

Dependencias y validación: S2-10; D05, D08 y D09.

### S2-12 Decidir sobre campañas recibidas

**Historias:** BG-42. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Listar y examinar contenido e historial; aprobar, rechazar o pedir cambios por sección, con motivos y notificación por canal acordado.

Dependencias y validación: S2-11 y S1-13; D05, D06 y D08.

### S2-13 Corregir observaciones y reenviar

**Historias:** BG-31. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

El creador recibe observaciones, modifica lo permitido y reenvía una versión trazable; conservar historial de revisiones.

Dependencias y validación: S2-12; D05.

### S2-14 Publicar y controlar estados de campaña

**Historias:** BG-32. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Separar aprobación y publicación; aplicar transiciones, restricciones de edición, cierre y cancelación acordadas sin activar operaciones financieras no implementadas.

Dependencias y validación: S2-12 y S2-13; D02, D05 y D09.

### S2-15 Conectar panel y proyectos del creador

**Historias:** BG-13, BG-14. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Mostrar indicadores y proyectos propios con acciones por estado, continuación de borrador, observaciones y lista vacía; rechazar accesos ajenos.

Dependencias y validación: S1-16, S2-11 y S2-14.

### S2-16 Conectar experiencia pública y guardados

**Historias:** BG-01, BG-05, BG-06, BG-07, BG-08, BG-12. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Sustituir campañas simuladas por API pública: destacados, catálogo, búsqueda, filtros, paginación, detalle y estados; persistir guardados. Excluir borradores y datos privados.

Dependencias y validación: S2-14; BG-51 añade novedades en S3-12.

### S2-17 Crear el panel administrativo inicial

**Historias:** BG-41. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Mostrar pendientes e indicadores reales de revisión y cumplimiento, con accesos por permiso; finanzas y disputas se incorporan al existir sus módulos.

Dependencias y validación: S2-08 y S2-12; D06.

### S2-18 Seleccionar el apoyo y su modalidad

**Historias:** BG-35. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Elegir monto y recompensa aplicable, comprobar mínimos y cupos y revalidar la selección antes del checkout.

Dependencias y validación: S2-05 y S2-14; D02.

### S2-19 Preparar el checkout

**Historias:** BG-36. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Mostrar resumen y condiciones aprobadas, permitir corrección y confirmar expresamente; separar visibilidad pública de identidad interna y recoger solo contacto autorizado.

Dependencias y validación: S2-18; D04 y D07.

### S2-20 Representar pagos de prueba

**Historias:** BG-37. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Simulación rotulada de método, procesamiento, confirmado, pendiente, rechazado y expirado, con recuperación y reintento. Sin dinero real ni proveedor supuesto.

Dependencias y validación: S2-19; diseño y nomenclatura acordada.

### S2-21 Verificar y documentar el segundo incremento

**Historias:** BG-04, BG-53, BG-60, BG-61, BG-62, BG-63. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Versionar contratos y probar registro, borrador, revisión, publicación, consulta y checkout de prueba, con permisos, carga, errores, teclado y móvil; registrar evidencia y actualizar documentación.

Dependencias y validación: Tareas S2 y revisión de los responsables.

## Sprint 3 Aportes y operación completa

Integrar el proveedor autorizado y la trazabilidad de aportes; completar administración, finanzas, seguimiento, rendición y aceptación del MVP.

### S3-01 Integrar el proveedor autorizado

**Historias:** BG-38. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Adaptador y confirmaciones verificables en sandbox, sin datos sensibles de tarjeta; activación en producción solo con aprobación explícita y configuración autorizada.

Dependencias y validación: S2-19 y S2-20; D04 y acceso al proveedor.

### S3-02 Asegurar importes y estados del aporte

**Historias:** BG-39. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Transacciones, cupos, idempotencia y notificaciones repetidas; aumentar recaudación solo con confirmación válida y conservar relación con devoluciones y disputas.

Dependencias y validación: S3-01; D02, D04 y D09.

### S3-03 Conectar el panel del patrocinador

**Historias:** BG-33. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Resumen real de aportes, proyectos apoyados o seguidos y novedades, con enlaces y vacíos; completar novedades al disponer de S3-12.

Dependencias y validación: S3-02 y S2-16.

### S3-04 Consultar mis aportes

**Historias:** BG-34. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Historial propio con filtros, estados, vínculos a comprobantes y devoluciones, sin exponer operaciones ajenas.

Dependencias y validación: S3-02; D04 y D09.

### S3-05 Consultar detalle y comprobante

**Historias:** BG-40. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Mostrar importe, método no sensible, fecha, estado y referencia verificable; ofrecer comprobante de pago según corresponda, no comprobante logístico.

Dependencias y validación: S3-02; D04 y D07.

### S3-06 Consultar operaciones financieras

**Historias:** BG-45. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Listado, filtros, totales y exportaciones con permisos y privacidad; distinguir los estados propios de pago, aporte y otros movimientos.

Dependencias y validación: S3-02 y permisos de S3-16; D04 y D09.

### S3-07 Conciliar operaciones

**Historias:** BG-46. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Comparar referencias e importes, detectar faltantes y duplicados y registrar resolución con responsable y motivo; reimportar sin duplicación.

Dependencias y validación: S3-06; D04.

### S3-08 Autorizar y seguir desembolsos

**Historias:** BG-47. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Implementar solicitud, autorización y seguimiento con bruto, costos y neto aprobados, cuenta y referencia; probar fallos y consulta del creador antes de operar.

Dependencias y validación: S3-07 y S2-08; D04, D06 y D09.

### S3-09 Gestionar devoluciones

**Historias:** BG-48. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Solicitud, autorización y resultado vinculados al aporte; impedir duplicados y excesos, conservar trazabilidad y mostrar estado al titular.

Dependencias y validación: S3-02 y S3-06; D04, D05 y D09.

### S3-10 Registrar incidencias

**Historias:** BG-49. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Tipo, descripción y evidencias permitidas vinculadas a campaña u operación; confirmar con referencia sin inventar plazos de atención.

Dependencias y validación: S1-14 y S3-04; D05.

### S3-11 Atender y resolver disputas

**Historias:** BG-50. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Bandeja, mensajes, estados y escalamiento con motivo e historial; ninguna resolución mueve dinero sin autorización financiera correspondiente.

Dependencias y validación: S3-10 y S3-09; D05 y D09.

### S3-12 Publicar avances y seguimiento

**Historias:** BG-07, BG-33, BG-51. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Capturar avances, hitos, responsables y evidencias; mostrar novedades y ausencia de ellas al público y patrocinador, sin construir seguimiento de paquetes.

Dependencias y validación: S2-02 y S2-14; D05, D07 y D10.

### S3-13 Registrar rendición y cierre

**Historias:** BG-52. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Comparar presupuesto y ejecución, fondos, saldo e indicadores; explicar variaciones y conservar evidencia final con permisos y aprobación acordados.

Dependencias y validación: S3-08 y S3-12; D05 y D10.

### S3-14 Administrar personas y organizaciones

**Historias:** BG-54. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Consulta y actualización autorizadas de datos y representación, separadas de verificación y permisos. Altas, restricciones y bajas solo bajo reglas aprobadas.

Dependencias y validación: E08 y S2-08; D06 y D10.

### S3-15 Consultar auditoría del sistema

**Historias:** BG-56. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Registrar y consultar actor, fecha, objeto, acción y resultado de decisiones y operaciones; verificar actor por transacción y excluir secretos.

Dependencias y validación: Instrumentar desde cada módulo; D03, D06 y VT.

### S3-16 Completar permisos por responsabilidad

**Historias:** BG-12, BG-41, BG-53. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Aplicar matriz aprobada a finanzas, soporte, administrador y auditor de lectura, así como perfiles compatibles; probar denegaciones y completar accesos del panel.

Dependencias y validación: S1-13; D06. Preparar cada permiso antes de exponer su módulo.

### S3-17 Completar parámetros acordados

**Historias:** BG-55. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Agregar solo parámetros de negocio aprobados, proteger referencias y auditar cambios; completar la interfaz acordada sin ampliar modalidades.

Dependencias y validación: S1-15; D02 y D10.

### S3-18 Cerrar contratos y persistencia integrados

**Historias:** BG-59, BG-60, BG-61. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Revisar contratos de todos los módulos, reemplazo controlado de mocks, privacidad y compatibilidad de migraciones; ensayar recuperación sobre el esquema final del incremento.

Dependencias y validación: Módulos S3 y S1-10; D01, D03, D09 y VT.

### S3-19 Verificar el MVP y la interfaz completa

**Historias:** BG-04, BG-62. **Estado:** Pendiente. **Tamaño:** L. Responsable por asignar.

Pruebas de reglas, API, persistencia, reintentos, cupos, permisos y transacciones; revisar todas las rutas en móvil, escritorio y teclado y corregir fallos.

Dependencias y validación: S2-21 y módulos S3.

### S3-20 Actualizar y publicar la entrega general

**Historias:** BG-63. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Revisar y publicar código, configuración sin secretos y documentación; actualizar backlog y explicativo y adjuntar enlace Figma y PDF general de pantallas finales.

Dependencias y validación: S3-18 y S3-19; autorización de publicación y acceso a Figma.

### S3-21 Validar el recorrido integral

**Historias:** BG-64. **Estado:** Pendiente. **Tamaño:** M. Responsable por asignar.

Demostrar registro, campaña, revisión, publicación, aporte, seguimiento y gestión interna, incluyendo fallos y límites; registrar aceptación de los responsables.

Dependencias y validación: S3-19 y S3-20; decisiones aplicables y revisión externa.

## Trazabilidad de las 64 historias

Las apariciones en varios sprints no duplican historias. AP identifica el antecedente público ya realizado. Las tareas E completas solo cierran su alcance acotado.

| Historia | Estado técnico | Sprints con contribución | Tareas o antecedente |
| --- | --- | --- | --- |
| BG-01 Comunicar la propuesta de Brotar | Parcial | 1, 2 | AP, S2-16 |
| BG-02 Explicar el ciclo de participación | Cierre técnico local | 1 | AP |
| BG-03 Orientar a futuros creadores | Cierre técnico local | 1 | AP |
| BG-04 Aplicar identidad y navegación compartidas | Parcial | 1, 2, 3 | AP, S2-21, S3-19 |
| BG-05 Explorar campañas publicadas | Parcial | 1, 2 | AP, S2-16 |
| BG-06 Buscar y combinar filtros | Parcial | 1, 2 | AP, S2-16 |
| BG-07 Consultar el detalle público | Parcial | 1, 2, 3 | AP, S2-16, S3-12 |
| BG-08 Resolver estados públicos alternativos | Parcial | 1, 2 | AP, S2-16 |
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
| BG-20 Adjuntar apoyo multimedia | Pendiente de desarrollo | 2 | S2-01 |
| BG-21 Planificar actividades e hitos | Pendiente de desarrollo | 2 | S2-02 |
| BG-22 Detallar presupuesto y riesgos | Pendiente de desarrollo | 2 | S2-03 |
| BG-23 Configurar las condiciones de financiamiento | Pendiente de desarrollo | 2 | S2-04 |
| BG-24 Gestionar recompensas y preventas | Pendiente de desarrollo | 2 | S2-05 |
| BG-25 Recopilar identidad de la persona | Pendiente de desarrollo | 2 | S2-06 |
| BG-26 Recopilar información de la organización | Parcial | 1, 2 | E08, S2-07 |
| BG-27 Registrar documentos y cuenta destino | Pendiente de desarrollo | 2 | S2-06, S2-07 |
| BG-28 Consultar y corregir la verificación | Pendiente de desarrollo | 2 | S2-09 |
| BG-29 Revisar el resumen y sus faltantes | Pendiente de desarrollo | 2 | S2-10 |
| BG-30 Enviar la campaña a revisión | Pendiente de desarrollo | 2 | S2-11 |
| BG-31 Corregir observaciones y reenviar | Pendiente de desarrollo | 2 | S2-13 |
| BG-32 Publicar y controlar el ciclo de campaña | Pendiente de desarrollo | 2 | S2-14 |
| BG-33 Consultar el panel del patrocinador | Pendiente de desarrollo | 3 | S3-03, S3-12 |
| BG-34 Consultar mis aportes | Pendiente de desarrollo | 3 | S3-04 |
| BG-35 Elegir monto y modalidad de apoyo | Pendiente de desarrollo | 2 | S2-18 |
| BG-36 Revisar y confirmar el checkout | Pendiente de desarrollo | 2 | S2-19 |
| BG-37 Representar métodos y resultados de pago | Pendiente de desarrollo | 2 | S2-20 |
| BG-38 Integrar el proveedor de pagos aprobado | Pendiente de desarrollo | 3 | S3-01 |
| BG-39 Mantener estados e importes consistentes | Pendiente de desarrollo | 3 | S3-02 |
| BG-40 Consultar detalle y comprobante del aporte | Pendiente de desarrollo | 3 | S3-05 |
| BG-41 Consultar pendientes administrativos | Pendiente de desarrollo | 2, 3 | S2-17, S3-16 |
| BG-42 Revisar y decidir sobre una campaña | Pendiente de desarrollo | 2 | S2-12 |
| BG-43 Gestionar colas y documentos KYC y KYB | Pendiente de desarrollo | 2 | S2-08 |
| BG-44 Registrar decisiones de verificación | Pendiente de desarrollo | 2 | S2-08 |
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
| BG-57 Mantener el frontend por funcionalidades | Cierre técnico local | 1 | AP, E01 |
| BG-58 Construir el backend modular | Cierre técnico local | 1 | E01 |
| BG-59 Integrar la base provisional y controlar migraciones | Parcial | 1, 3 | E02, S1-10, S3-18 |
| BG-60 Definir contratos e integrar las experiencias | Parcial | 1, 2, 3 | E03, S2-21, S3-18 |
| BG-61 Proteger archivos y datos privados | Parcial | 1, 2, 3 | S1-14, S2-21, S3-18 |
| BG-62 Probar reglas y recorridos | Parcial | 1, 2, 3 | AP, E09, S2-21, S3-19 |
| BG-63 Mantener repositorio y documentación de entrega | Parcial | 1, 2, 3 | AP, E01, E09, S2-21, S3-20 |
| BG-64 Validar el recorrido integral del MVP | Pendiente de desarrollo | 3 | S3-21 |

## Cierre y límites

Cerrar cada tarea con evidencia y pruebas del alcance; cerrar una historia solo cuando pasen todos sus criterios. La revisión externa se registra por separado. Mantener D01 a D10 y VT donde subsista una duda concreta. No activar pagos ni inventar reglas pendientes para aparentar cierre.

El tablero se reorganizó y sincronizó el 17/09/2026, sin publicar código ni cambiar los cierres técnicos anteriores. El PDF explicativo conserva su corte anterior. El Word v2.2 mantiene el corte de planificación previo a esta sincronización; este registro documenta el cambio posterior en Trello. La versión 2.1 del Word se preservó en output/versiones_backlog fuera del repositorio.
