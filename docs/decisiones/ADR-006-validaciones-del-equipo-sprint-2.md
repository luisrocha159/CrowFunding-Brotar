# Reglas de validación del equipo para el Sprint 2

Fecha: 13 de octubre de 2026. Estado: decisiones de implementación autorizadas por Ricardo para continuar el MVP con criterio del equipo. Estas reglas no se presentan como confirmación de los líderes o del cliente. No cambian los roles, la revisión administrativa ni la distinción entre aprobación y publicación.

## Política vigente de identificación · 15/10/2026

La aclaración de los líderes compartida por Santiago y aceptada por Ricardo permite campañas con nombres iguales o parecidos; solo UUID/slug deben ser únicos. La semejanza de contenido informa al administrador, pero no impide enviar, aprobar o publicar ni exige justificarla. ADMIN puede solicitar ajustes mediante las observaciones normales si hay confusión.

Se retiraron el editor y las rutas experimentales de iniciativa/etapa, las comprobaciones obligatorias de identidad/reserva y el bloqueo global de admisión. Las tablas, migraciones y declaraciones anteriores se conservan; no se hizo rollback destructivo. COPY es solo un código de evidencia fuerte, no fraude confirmado. Las decisiones auditan la evidencia actual sin requerir un token adicional del navegador.

Se mantienen idempotencia de creación, cuotas PostgreSQL por cuenta/IP, todas las validaciones de datos, autenticación, propiedad, roles, CSRF/origen y aprobación separada de publicación. La sección 20 del README reemplaza los antiguos guiones de bloqueo. Los apartados históricos de abajo describen el ensayo anterior, **no requisitos vigentes de admisión**.

## Alcance y motivo

El incremento refuerza registro, información de campaña, historia e indicadores, planificación, presupuesto, riesgos, financiamiento, recompensas, portada y revisión administrativa. El objetivo es rechazar datos incoherentes antes de persistirlos y explicar los errores junto al campo correspondiente. El navegador ofrece ayuda inmediata; la API conserva la autoridad y vuelve a validar los datos guardados al enviar, aprobar y publicar.

La aclaración de Ricardo descarta crear formularios diferentes por materiales. Los controles se adaptan a las necesidades reales: modalidad de campaña, unidad del indicador, disponibilidad de preventas y obligatoriedad del comentario administrativo.

## Reglas de los campos

Los límites de texto cuentan puntos de código Unicode después de recortar espacios de los extremos. Se conservan Ñ y acentos. Los textos de campaña no admiten etiquetas HTML, controles invisibles ni contenido compuesto exclusivamente por espacios o símbolos. No se aplica esa normalización a contraseñas: se conservan exactamente como se escriben.

| Dato | Regla y obligatoriedad |
| --- | --- |
| Correo de registro | Primer campo; formato válido y máximo 254 caracteres. Al salir se consulta disponibilidad en PostgreSQL. |
| Nombre y apellido de cuenta | Obligatorios; 1–120 caracteres, letras y signos admitidos por la validación de nombres existente. Un nombre real puede tener un solo carácter. |
| Teléfono de cuenta y perfil | Opcional como pareja. Prefijo `+` y 1–3 dígitos; número nacional de 4–15 dígitos. Máximo conjunto de 15 dígitos, sin letras ni espacios. No verifica titularidad. |
| Contraseña | 15–128 puntos de código, no solo espacios; confirmación exacta. La política y scrypt existentes se conservan. |
| Título de campaña | Obligatorio; 5–200 caracteres. |
| Resumen corto | Obligatorio desde el alta del borrador; 11–500 caracteres. |
| Categoría y país | Obligatorios; opciones de los catálogos activos de PostgreSQL, sin códigos escritos libremente. |
| Localidad | Obligatoria; 2–160 caracteres. Dirección y referencia son opcionales: vacías o de 5–500 caracteres. |
| Problema, solución, beneficiarios y resultados esperados | Obligatorios al guardar el bloque de historia; cada uno de 20–5000 caracteres. |
| Indicadores | Entre 1 y 20. Nombre de 5–200 caracteres; descripción opcional, vacía o de 10–5000. Unidad y meta esperada obligatorias. Línea base opcional. |
| Unidad del indicador | Lista del equipo: personas, familias, unidades, kg, litros, m², ha, %, BOB. Personas, familias y unidades requieren enteros; las demás admiten hasta dos decimales. Valores no negativos; porcentajes de 0–100. |
| Actividades e hitos | Al menos una actividad; hasta 50 actividades y 50 hitos. Nombre de 5–200 caracteres; responsable de 2–160. Fechas válidas, no anteriores a hoy, y final igual o posterior al inicio. Cada hito puede vincular hasta 50 actividades distintas de su campaña; vínculo opcional. Como resultado de cierre, termina el mismo día o después de la última relacionada y no comienza antes del inicio más temprano de ellas. No repetir nombres dentro de actividades ni dentro de hitos. |
| Partidas de presupuesto | Entre 1 y 50. Categoría activa; descripción de 10–300 caracteres. Cantidad positiva hasta 9999999999.99; precio e importe positivos hasta 999999999999.99, con dos decimales como máximo. Notas opcionales: vacías o de 5–5000 caracteres. |
| Importe planificado | Calculado como cantidad × precio unitario, redondeado a céntimos; solo lectura en la interfaz. La API rechaza un importe distinto. La cantidad puede ser fraccionaria: no se inventa una unidad física que el esquema no recoge. |
| Riesgos | Bloque opcional de hasta 50 riesgos. Al añadir uno, título de 5–200, descripción y mitigación de 10–5000. Probabilidad numérica entre 0–100, con dos decimales y sin `%`; impacto seleccionable Bajo, Medio o Alto. |
| Financiamiento | Meta positiva y estrictamente mayor al presupuesto total; ambos expresados en la moneda elegida. Moneda activa, modelo disponible y duración entera de 1–365 días. |
| Periodo de financiamiento | Fechas opcionales como pareja: ambas vacías o ambas presentes. No anteriores a hoy; fin posterior al inicio; duración coincidente con los días entre ambas fechas. No se inicia un calendario automático ni se procesan pagos. |
| Recompensas | Donación omite el bloque. Recompensa/preventa exige al menos una al enviar; se puede vaciar durante la edición. Hasta 50 entradas; títulos de 5–200, descripción de 10–5000 y tipo correspondiente a la modalidad. Aporte positivo, dos decimales como máximo y no mayor a la meta. |
| Disponibilidad y entrega | Disponibilidad entera positiva hasta 2147483647; opcional sin límite en recompensa y obligatoria en preventa. Entrega obligatoria, no pasada y no anterior al cierre si se fijó un periodo. No repetir títulos de recompensas. |
| Portada | Imagen PNG/JPG/WebP hasta 2 MiB, autorizada para la campaña; texto alternativo obligatorio de 10–180 caracteres. El backend conserva la comprobación de contenido y acceso a archivos. |
| Comentarios administrativos | Motivo obligatorio en rechazo/cambios; opcional en aprobación. Si se escribe, 5–5000 caracteres. Observaciones opcionales, pero cada entrada añadida exige sección disponible y mensaje de 5–5000 caracteres. |

La fecha mínima usa el día calendario de `America/La_Paz`, no la zona horaria predeterminada del navegador o del servidor. No se aplica a fechas históricas del sistema, auditoría, revisiones realizadas ni campañas publicadas que solo se están consultando. Un borrador cuyo plan quedó en el pasado debe actualizarse antes de enviarlo; una campaña pendiente con fechas vencidas no puede aprobarse o publicarse sin corrección.

## Coherencia y concurrencia (duplicidad semántica histórica sustituida el 15/10)

La comparación entre meta y presupuesto se ejecuta al guardar cualquiera de ambos bloques, antes de enviar y al decidir aprobación/publicación. Dentro de PostgreSQL, las escrituras de secciones bloquean la misma fila de campaña y vuelven a comprobar la regla, por lo que dos solicitudes paralelas no pueden dejar una meta inferior o igual al gasto. Para aumentar un presupuesto que rebasaría la meta actual, primero debe aumentarse la meta.

**Actualización autorizada el 14/10:** se sustituye la definición por título/resumen por «misma iniciativa, propósito y etapa», incluso entre cuentas. El encabezado ya no bloquea por sí solo un borrador ni reserva una causa. Se buscan referencias ya enviadas, no borradores privados ni campañas canceladas/rechazadas/descartadas. Se comparan ubicación, cuatro campos de historia, meta/moneda, partidas e importes, actividades y solapamiento del periodo de ejecución. La coincidencia completa produce bloqueo `422` antes de admitir a revisión, aprobar o publicar. Cambiar cuenta, modalidad o título no diferencia la iniciativa. La edición propia se excluye de la comparación.

La evidencia parcial o la semejanza de palabras produce una coincidencia posible, no un bloqueo automático por porcentaje. ADMIN debe comprobarla, confirmar y justificar una iniciativa o etapa distinta antes de aprobar y otra vez antes de publicar. Se auditan actor, operación, ronda, motivos y referencias; el token de evidencia invalida una lectura obsoleta. No se puede exceptuar una copia que conserva evidencia completa. Un periodo distinto se considera posible etapa, no identidad nueva demostrada. La API del creador no expone títulos/IDs ni detalles de referencias privadas.

Las tres transiciones toman un bloqueo de admisión de PostgreSQL antes del bloqueo de su campaña y vuelven a calcular la evidencia en la transacción. Dos envíos simultáneos de copias completas admiten uno y rechazan el otro sin perder su borrador. Las creaciones privadas pueden coexistir; la evolución del 15/10 utiliza una cuota compartida en PostgreSQL, no la cuota local de la primera versión. No se confunde esa creación con publicación. Las escrituras directas por un operador SQL están fuera de algunas validaciones de API; las restricciones de base siguen aplicándose. Se usan reglas del MVP y `pg_trgm`, no aprendizaje ni certeza universal; las secciones 20–21 del README distinguen los cortes y sus límites.

Los datos existentes no se eliminan ni corrigen automáticamente. Los borradores antiguos pueden consultarse, pero el informe de revisión señala las nuevas infracciones con campo y paso. El envío, la aprobación y la publicación vuelven a evaluar contenido guardado, referencias, importes y fechas. Las campañas ya publicadas no se despublican por esta actualización.

## Seguridad y experiencia de registro

`POST /api/auth/email-availability` recibe solo un correo y devuelve ese correo normalizado y su disponibilidad. No crea usuarios, calcula hashes, abre sesiones ni verifica que la persona controle el buzón. El registro conserva la restricción única final de PostgreSQL: la disponibilidad puede cambiar entre la consulta y el envío.

Mostrar disponibilidad revela si un correo está registrado. Es una decisión explícita de esta revisión de UX, no una protección contra enumeración. El endpoint usa `no-store`, no devuelve identidad y comparte el límite local de 20 solicitudes por minuto e IP con el registro. Antes de exponerlo en un despliegue público deben reevaluarse este comportamiento, el límite compartido entre instancias y las medidas contra automatización. Recuperación de contraseña conserva su respuesta genérica.

Los formularios muestran * en obligatorios, límites y unidades antes del envío, controles nativos adecuados y errores por campo al salir. El prefijo y teléfono tienen separación visible y se apilan en móvil. El guardado rechaza dobles solicitudes locales, conserva campos ante errores y mantiene la confirmación real del backend; no simula éxitos.

## Ubicación de la implementación

- `backend/src/campaigns/domain/input-policy.ts`: mínimos, unidades, texto, día de Bolivia y cálculos monetarios.
- `backend/src/campaigns/domain/{draft,general,story,sections,lifecycle,administrative-review}.ts`: reglas específicas del constructor y revisión.
- `src/features/campaigns/sectionValidation.ts` y `campaignsClient.ts`: reutilización del dominio puro, sin importar NestJS, TypeORM, credenciales ni persistencia al navegador.
- `backend/src/campaigns/domain/duplication.ts`: normalización y comparación multiseñal pura, criterios de copia/coincidencia y prioridad.
- `backend/src/campaigns/infrastructure/campaign-duplicates.ts`: candidatos PostgreSQL, token de evidencia y bloqueo de admisión; reutilizados por envío, aprobación y publicación.
- `typeorm-sections.repository.ts` y `typeorm-submission.repository.ts`: revalidación transaccional y comprobación de datos antiguos en revisión, envío, aprobación y publicación.
- `backend/src/shared/domain/phone.ts` y registro/perfil: formato de teléfono común.
- `src/features/access/register/` y formularios de campañas: orden de correo, comprobación al salir, mensajes, tipos, selección y estados.
- `backend/src/shared/infrastructure/http/`: errores anidados con rutas de campo y respuesta `422` conservada para volver al paso concreto; sin exponer SQL, credenciales o payloads.

La evolución del 15/10 añade índices GIN de localidad/solución y un índice de ubicación normalizada. El planificador decide su uso; se conserva el bloqueo global como techo conocido que requiere medición antes de ampliar tráfico. Se añade identidad declarada de iniciativa/etapa, **sin afirmar que el UUID o los campos constituyan verificación de identidad real**. No se modificó el SQL oficial ni se activó sincronización automática de TypeORM.

El ajuste posterior de hitos múltiples añade una tabla propia en `brotar_extension` mediante `MilestoneActivities1791849600000`, preservando el inventario oficial y copiando las relaciones anteriores. Las listas `activityIndexes` se validan en ambos lados; revisión y administración muestran todos los vínculos. La selección usa casillas nativas con etiquetas y errores de grupo; quitar una actividad conserva los otros vínculos. Esta relación y el criterio de cierre responden a la solicitud de Ricardo del 13/10, no a una confirmación del cliente. El procedimiento está en la sección 19 del README.

## Comprobación y límites

El botón «Siguiente» comprueba los faltantes de la etapa actual antes de avanzar, sin exigir los campos de etapas futuras. La revisión completa y las decisiones administrativas mantienen su validación en backend; la navegación del asistente no sustituye esos controles.

Casos reproducibles añadidos en `tests/sprint2-validation-policy.test.tsx`, `backend/test/sprint2-email-validation.test.ts` y la integración real `backend/integration/campaign-sections-submission.integration.test.ts`. Se conservan las pruebas existentes de permisos, propiedad, archivos, sesiones, revisión y publicación. Sus ejemplos válidos se ajustan a las reglas nuevas; las expectativas de rechazo no se eliminan.

La comprobación automatizada y visual del corte se registra en el README. No constituye aceptación del docente o de los líderes ni demuestra ausencia absoluta de fallos. Pagos reales, correo externo, KYC/KYB, textos legales definitivos, reglas financieras de aportes y tareas fuera del Sprint 2 siguen con su alcance propio. Los informes docentes anteriores conservan su fecha y no incorporan retroactivamente estas reglas.

## Antecedente experimental de identidad · sustituido por la aclaración del 15/10/2026

La política se representa mediante iniciativa → etapa → campaña. Se registra propósito/ámbito y objetivo/periodo separados del texto publicitario. La selección exige propiedad personal o representación organizacional vigente y correspondiente a la campaña. Se detecta el registro repetido de la misma iniciativa propia; las coincidencias entre cuentas no revelan datos privados al creador.

La reserva `stage_claim` tiene unicidad por etapa/campaña y referencia compuesta al vínculo real. Se adquiere en la transacción de admisión; aprobación y publicación revalidan identidad, ubicación, periodo de actividades y evidencia. Otra etapa de la misma iniciativa exige revisar su alcance; no se asume legítima solo por otra fecha. El rechazo explícito libera la reserva; una corrección o cierre no lo hace.

Antes de admitir una iniciativa se puede corregir la declaración sin crear otros identificadores. El cambio afecta a los borradores vinculados y se informa al usuario. Si alguna etapa está admitida, no se reescribe la identidad para eludir controles. La auditoría conserva actor, declaración anterior/nueva y marca que no es KYC. Datos antiguos no se fusionan ni se clasifican automáticamente: necesitan identificación antes de volver a enviar/aprobar/publicar; lo ya publicado sigue visible.

La creación y la identificación aceptan una clave UUID v4 de idempotencia por actor. Se serializa el mismo intento y se persiste su huella con la referencia del recurso en la transacción. Reutilizar una clave con otros datos produce conflicto. Los reintentos de la pantalla conservan la clave mientras no cambien los datos; recargar consulta el recurso persistido, no garantiza la conservación de formularios sin guardar.

La cuota compartida de creación/envío es 20 solicitudes/minuto por IP y cuenta; identificación tiene una cuota independiente del mismo tamaño. PostgreSQL aplica incrementos atómicos entre instancias y conserva la cuota al reiniciar la API. No se confía en una IP enviada por cabecera sin un proxy autorizado. Se mantienen autenticación, roles, origen, límites de carga y publicación administrativa. No se presenta esto como sistema completo antibots o protección de producción de todos los endpoints.

Las categorías provisionales viajan con migraciones, sin listas alternativas en frontend. El componente telefónico compartido por registro/perfil separa país/prefijo y número nacional. Se conserva el estilo de Brotar y se pliega la lista completa de borradores cuando hay uno abierto, sin ocultar el selector ni eliminar campañas. La separación de transporte/parsers (`identityClient`), reglas puras compartidas y vista evita repetir validación o introducir librerías nuevas; aplica DRY/SRP/KISS donde resuelve estos problemas concretos.

La recuperación conserva el historial restaurado; no lo borra para simular migraciones pendientes. La instalación nueva se prueba por separado sobre SQL oficial y una copia limpia. Las regresiones incluyen permisos, reintentos simultáneos, cambios de datos con clave repetida, reserva única, cuota entre dos API y búsqueda sintética. Los resultados y las limitaciones quedan en la sección 21 del README.
