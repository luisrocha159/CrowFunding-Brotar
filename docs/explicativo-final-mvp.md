# Documento explicativo final de Brotar

Proyecto de Sistemas II. Equipo: Ricardo Núñez del Prado Justiniano, Santiago Rocha Mejia y Alison Pizarro Apaza. Corte de entrega DEV: 30 de octubre de 2026. Dirigido al docente y al equipo que instalará y revisará la aplicación.

## Resultado y alcance

Brotar integra el ciclo de una iniciativa de impacto: descubrir, preparar, revisar, publicar, apoyar, ejecutar, rendir cuentas y cerrar. La interfaz React se comunica con una API NestJS que persiste en PostgreSQL oficial mediante migraciones. La entrega permite demostrar ese ciclo entre responsabilidades separadas, con reglas, errores y datos durables.

El alcance aceptado por Ricardo es un MVP académico DEMO. Los movimientos económicos, QR, tarjetas, destinos y documentos de identidad del ensayo son ficticios; las condiciones son provisionales propias del equipo. Gmail es un canal real configurado de forma privada. No se presenta esta versión como operación bancaria, identidad comprobada externamente ni plataforma comercial autorizada.

La guía general del MVP original, de 24/08/2026, propone el producto completo. La planificación conserva 64 historias y 67 tareas únicas, incluidos los arrastres, sin duplicarlas. La entrega diferencia los criterios originales, la interpretación académica aplicada y el estado local comprobado; un estado histórico del tablero no equivale a evidencia nueva.

## Arquitectura y persistencia

El frontend se ejecuta con Vite y React; administra formularios, navegación, estados de carga/error y clientes HTTP. Vite reenvía /api a la API del anfitrión. NestJS aplica validación de entrada, sesión, origen, responsabilidad y pertenencia antes de invocar casos de uso y repositorios. PostgreSQL es el origen persistente de usuarios, campañas, operaciones, eventos y decisiones.

Docker ejecuta solo PostgreSQL. El puerto normal del anfitrión es 15433, distinto de 5432 dentro del contenedor. API y frontend usan normalmente 3000 y 5173. Una carpeta nueva no aísla Docker: otra instalación en la misma PC necesita proyecto Compose y puerto propios antes de generar configuración.

Se conserva el SQL oficial con hash verificado; las 40 migraciones acumulativas se aplican después de esa línea base. El ORM no sincroniza ni borra el esquema. El rol brotar_app tiene privilegios limitados; la administración del contenedor y las credenciales de instalación son independientes del rol de la API. Las categorías provisionales se cargan con la preparación normal, desde la base, sin listas incrustadas en el formulario.

Los archivos públicos y privados se registran en la base y se almacenan fuera del frontend público. La autorización de descarga depende del expediente y de la cuenta. La recuperación incluye base y archivos íntegros cuando se usa --with-files, contrastando tamaño y SHA-256. Conservar solo el volumen de PostgreSQL no sustituye el respaldo del almacén de archivos.

## Actores y separación de funciones

| Perfil | Función principal |
| --- | --- |
| Visitante | Explorar y consultar campañas publicadas e información pública |
| Usuario registrado | Administrar cuenta, preferencias, guardados y operaciones propias autorizadas |
| Creador | Preparar y gestionar campañas propias, avances, obligaciones y rendición |
| Organización | Campañas institucionales con miembros y representación autorizados |
| REVIEWER | Revisar campañas e informes, pedir cambios, aprobar o rechazar |
| COMPLIANCE | Capturar/revisar expedientes documentales KYC y KYB del ensayo |
| FINANCE | Operar y conciliar movimientos económicos exclusivamente DEMO |
| SUPPORT | Atender incidencias y comunicaciones sin heredar potestad financiera |
| ADMIN | Gobernar configuración, responsabilidades y publicación administrativa |
| AUDITOR | Consultar información autorizada sin mutaciones de negocio |

Los roles se revalidan en el servidor. Una sesión no conserva permisos revocados, vencidos o bloqueados. ADMIN no hereda operaciones de FINANCE; AUDITOR permanece en lectura incluso combinado con otros roles. La habilitación provisional CREATOR no verifica identidad ni sustituye KYC/KYB.

## Cuenta y protección de acceso

El registro sitúa el correo primero, comprueba disponibilidad, normaliza datos y valida campos obligatorios. Los mensajes junto a cada campo y los indicadores de contraseña ayudan antes del envío; la API vuelve a validar el contenido. La consulta de correo al salir del campo no sustituye el control de unicidad transaccional frente a peticiones simultáneas.

Las contraseñas se protegen mediante hash y no se guardan en texto. La sesión usa una cookie HttpOnly con token opaco revocable; los controles de origen y el encabezado de mutación complementan autenticación y permisos. Los datos de rol o actor enviados arbitrariamente por el cliente no conceden potestades.

La recuperación mantiene respuesta uniforme para no revelar por errores si una cuenta existe. El enlace dura una hora, se consume una sola vez y el cambio revoca sesiones anteriores. La verificación de contacto es otra operación: token propio temporal de 30 minutos, titular, cuotas y un uso. Abrir el enlace no confirma automáticamente el correo; verificarlo tampoco aprueba identidad ni habilita operaciones financieras.

El país/prefijo telefónico se presenta como selección separada del número nacional. El perfil revalida formato y cambios. No hay proveedor SMS ni se muestra una verificación telefónica ficticia.

## Organizaciones y confianza documental

Una organización comienza con datos y vínculo del usuario; declarar una entidad no la aprueba. La captura KYC/KYB usa documentos requeridos por una política versionada, aceptación específica y revisión independiente. Las observaciones y las nuevas versiones conservan trazabilidad; una revisión desactualizada no sobrescribe otra.

Invitar no concede acceso inmediato. El destinatario acepta su invitación; representación y facultades requieren el flujo de revisión aplicable. Se conservan historial, vencimientos, revocaciones y restricciones, sin convertir relaciones antiguas en permisos actuales.

Los distintivos indican exactamente la revisión documental DEMO. No garantizan identidad real, solvencia o éxito de la iniciativa. La publicación conserva la regla académica provisional de revisión aprobada y acción separada de ADMIN; no debe interpretarse como una certificación regulatoria. Ejecución y desembolsos aplican sus verificaciones y condiciones propias.

## Preparación y validaciones de campañas

La creación distingue donación, recompensa y preventa. Cada campaña tiene UUID y slug únicos; el nombre puede repetirse. Las semejanzas son información orientativa para revisión, no una prohibición automática por título. No se exige a las personas inventar una iniciativa/etapa adicional para guardar el borrador.

Los borradores se conservan por campaña; una cuenta puede retomar varios sin reemplazar visualmente el anterior. El propietario accede al borrador correcto, guarda secciones y revisa faltantes. Las respuestas incompletas o errores de red no se presentan como guardados correctos.

| Sección | Información y controles |
| --- | --- |
| Modalidad | Donación, recompensa o preventa; no exigir recompensas en donación |
| General | Título, resumen, categoría activa y ubicación con límites y normalización |
| Historia e impacto | Problema, solución, beneficiarios, resultados e indicadores con unidad y meta coherentes |
| Portada y galería | Archivos públicos permitidos, límites, orden, sustitución y texto alternativo |
| Plan | Actividades, responsables, fechas e hitos relacionados con una o más actividades |
| Presupuesto y riesgos | Cantidades/importes válidos, categorías de gasto y porcentajes dentro de 0 a 100 |
| Financiamiento | Meta, moneda, duración, modelo y fechas; meta superior al presupuesto según la regla académica adoptada |
| Recompensas | Aporte mínimo, cantidad disponible y fechas/condiciones aplicables |
| Revisión | Lista de faltantes, propiedad, estado editable, ronda y envío confirmado |

Las validaciones diferencian enteros, decimales monetarios, textos, catálogos y porcentajes. Fechas futuras/actuales se exigen donde corresponde a planificación; fechas reales de gastos o ejecución se evalúan con su período, no mediante una prohibición indiscriminada del pasado. Los límites exactos se conservan en validadores y contratos para evitar divergencias entre interfaz y API.

## Revisión y publicación

Enviar una campaña incompleta no la publica. REVIEWER registra una decisión, motivo y observaciones concretas; el creador corrige y reenvía una nueva ronda. Una aprobación es privada hasta que ADMIN publica mediante su acción propia habilitada. Una decisión con versión/ronda obsoleta se rechaza sin sobrescribir historial.

El catálogo público proyecta solo información autorizada; no devuelve documentos privados ni conversaciones administrativas. Campañas cerradas o canceladas conservan su historia y muestran que no admiten nuevos aportes.

## Aportes y operaciones económicas DEMO

El aportante elige campaña/modalidad, importe y recompensa cuando corresponde, revisa condiciones y confirma. El simulador produce boleto y QR ilustrativos no pagables. Solo una confirmación válida del simulador aumenta la recaudación; un intento pendiente o fallido no equivale a ingreso.

Los importes se manejan con precisión monetaria y se agrupan por moneda. Las claves de idempotencia evitan repetir aportes, eventos y decisiones al reintentar. Los cupos se revalidan transaccionalmente: dos solicitudes simultáneas no pueden vender dos veces la última recompensa.

El historial y comprobante son propios, con información DEMO visible. Un comprobante del ensayo no es factura, recibo bancario ni prueba de entrega física. La conciliación compara referencias, pendientes y diferencias del proveedor interno de pruebas; una compensación no crea un segundo ingreso ficticio.

Las devoluciones y disputas separan consulta, reclamación, recomendación y operación financiera. Soporte no devuelve dinero por cambiar un caso de estado. Se controlan importes, reservas y decisiones para impedir devolver o comprometer más saldo del disponible.

## Ejecución desembolsos y cierre

Al vencimiento, el ciclo calcula el resultado desde pagos confirmados y devoluciones según modelo todo-o-nada o flexible. Alcanzar la meta antes del plazo no termina por sí mismo la recaudación. Cancelación, ejecución y cierre requieren transición válida, responsabilidad y ausencia de bloqueos aplicables.

El creador declara un destino ficticio, otro responsable de FINANCE lo revisa y luego se solicita un desembolso. Solicitar reserva saldo; autorizar no equivale a completar. Se conservan versión de destino, historial, referencia DEMO, bruto, costos y neto. Los costos del ensayo son cero; no se deducen comisiones reales inexistentes.

El seguimiento registra actividades, hitos e indicadores, además de publicaciones con instantáneas del avance. La rendición relaciona períodos, gastos, categorías, evidencias y revisión. El cierre exige resolver obligaciones pendientes, documentar recompensas, presentar rendición final y contar con aprobación independiente. Un estado terminal no se reabre arbitrariamente.

En S3-21 una misma campaña recibió un aporte de 12.00 BOB, obtuvo un desembolso de 12.00 y rindió 12.00; terminó CLOSED con informe APPROVED. Dos actividades y un hito quedaron al 100 %, una familia como indicador y una recompensa cumplida DEMO. Reiniciar la API no perdió registros o sesiones. Las variantes de cancelación, devolución y meta no alcanzada están cubiertas por otras integraciones; no se atribuyen al mismo camino feliz.

## Soporte correo y auditoría

Las incidencias conservan referencia, propietario, contexto, mensajes y estados. El titular y SUPPORT pueden responder conforme a permisos; resolver o cerrar no crea una devolución financiera. Los avisos internos persisten aunque no exista canal de envío.

Los avisos opcionales por Gmail requieren dirección verificada y preferencia explícita. La cola duradera registra intentos y reintentos, sin simular entrega al fallar. Los mensajes remiten al detalle autenticado y no copian documentos, motivos privados o conversaciones completas. La configuración compartida se importa solo desde un paquete privado fuera de Git, conservando la base propia del integrante.

La auditoría registra actor, acción y referencia mínimos en la misma transacción que la operación. No concede UPDATE/DELETE del historial a la API ni almacena contraseñas, tokens o cuerpos privados. La retención de ensayo requiere mantenimiento explícito, respeta trabajo activo y conserva agregados mínimos; no se presenta como cumplimiento normativo certificado.

## Principios de implementación observables

Se separan dominio, casos de uso e infraestructura en módulos donde el problema lo requiere. En catálogos, application/categories.ts depende del contrato del repositorio, mientras infrastructure/typeorm-category.repository.ts realiza persistencia. Los guards y DTO HTTP atienden autorización y entrada, sin convertirse en reglas de pantalla.

La matriz común backend/src/roles/domain/access-policy.ts evita duplicar concesiones incompatibles. El cliente compartido src/shared/api/request.ts concentra solicitudes y errores de transporte; los clientes de cada módulo validan su respuesta antes de mostrar éxito. Es una aplicación concreta de separación de responsabilidades y reducción de duplicación, no una afirmación de que todo archivo deba tener una capa adicional.

KISS se refleja en el simulador explícito sin integrar un proveedor inexistente y en la separación clara entre aprobar y publicar. YAGNI limita el alcance a pagos de prueba, sin SMS, inversiones financieras, transportistas ni reglas comerciales inventadas. La idempotencia, transacciones, bloqueo/versiones y validación del servidor complementan esos principios para proteger consistencia y reintentos.

## Verificación y entrega

La pasada integral S3-21 aprobó 261 pruebas frontend, 241 backend, ocho del administrador local y 55 de integración: 565 distintas. La revisión global previa de interfaz cubrió 73 patrones/81 casos a tres anchos; el recorrido posterior revisó 12 combinaciones finales de siete rutas. No se certifica WCAG ni rendimiento de producción; se conserva una advertencia de bundle mayor de 500 kB.

S3-20 repite instalación y checks desde un clon local real, con dependencias congeladas nuevas y base aislada; verifica categorías desde una cuenta autenticada, registro/duplicado, provisión administrativa, sesión tras reinicio y proxy Vite hacia API preparada. Comprueba importación privada de correo y autenticación TLS sin enviar mensajes. La recepción real anterior conserva su fecha en el informe de correo; no se inventa una nueva.

El backlog final y los PDF son derivados de las fuentes canónicas del repositorio. El PDF de pantallas incluye el inventario completo y capturas representativas reales identificadas, separado del prototipo Figma histórico. Figma es referencia de coordinación, no evidencia de que todas las pantallas sean visualmente idénticas.

El corte del 30/10/2026 publica en DEV la entrega S3-20 por autorización expresa de Ricardo. Se conservan las evidencias fechadas de preparación local y aceptación S3-21. La publicación no atribuye a los compañeros pruebas manuales que todavía no han realizado: la guía nueva reparte las 73 rutas entre Alison, Santiago y Ricardo con resultados iniciales POR_PROBAR. El correo compartido sigue en un paquete privado independiente y Trello conserva su estado hasta una sincronización autorizada aparte.

## Fuentes de consulta

- README.md: instalación y configuración vigentes.
- docs/requisitos/Guia_Contexto_y_Alcance_MVP_Crowdfunding.pdf: contexto general original.
- docs/planificacion-sprints.json: historias, tareas, responsables y estado local trazable.
- docs/contratos-http-sprint3.json y docs/contratos-sprint-3.md: contratos implementados.
- docs/validacion-integral-s3-21-2026-10-29.md: recorrido, errores, pruebas y aceptación.
- docs/decisiones/ADR-016-condiciones-provisionales-del-equipo.md: alcance jurídico provisional del ensayo.
- docs/correo-equipo-entrega-final.md: configuración de correo y traslado privado.
- https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574: referencia visual accesible.
