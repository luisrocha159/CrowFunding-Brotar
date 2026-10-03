# Ajuste de Sprint 2 a Fase 3 · 30/09/2026

## Fuente y criterio de alcance

Se leyó el documento completo [Brotar_Tarea_Fase3_Modulo_Campanas.pdf](requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf). Sus secciones 4–10 y 13 definen datos, CRUD, constructor, estados, revisión administrativa, consulta pública, validaciones y demostración. La sección 11 excluye aportes, pagos, checkout, desembolsos, reembolsos, finanzas, KYC/KYB y rendición. El Figma orienta el diseño, no autoriza ampliar el alcance de esta fase.

Se reutilizan autenticación, sesión, roles y organización de Sprint 1. El nuevo requisito de creador debe comprobarse en frontend y backend; no bastan opciones ocultas en la interfaz. La provisión concreta de roles y el actor de publicación se mantienen como decisiones pendientes. No conceder administrador mediante registro público.

## Conteos sin duplicados

| Agrupación | Antes | Ahora | Esfuerzo orientativo |
| --- | ---: | ---: | --- |
| Sprint 1 | 20 | 20 | 16 M / 4 L |
| Sprint 2 | 21 | 13 | 7 M / 6 L |
| Sprint 3 · inventario futuro | 21 | 29 | 14 M / 15 L |
| Total de tareas | 62 | 62 | 37 M / 25 L |

Las **64 historias BG** permanecen. Son el alcance funcional general; las **62 tareas** son su desglose de ejecución, no historias nuevas. Sprint 2 enlaza 24 BG (incluidas transversales y parcialmente cubiertas); eso no significa cerrar 24 historias completas con esta entrega.

## Trece tareas activas de Sprint 2

| ID | Resultado acotado | Responsable conservado |
| --- | --- | --- |
| S2-02 | Planificar actividades e hitos | Santiago |
| S2-03 | Registrar presupuesto y riesgos | Santiago |
| S2-04 | Configurar el financiamiento | Santiago |
| S2-05 | Configurar recompensas y preventas | Santiago |
| S2-10 | Revisar la campaña antes del envío | Santiago |
| S2-11 | Enviar la campaña a revisión | Santiago |
| S2-12 | Decidir sobre campañas recibidas | Ricardo |
| S2-13 | Corregir observaciones y reenviar | Santiago |
| S2-14 | Publicar y controlar estados de campaña | Ricardo |
| S2-15 | Gestionar proyectos propios y descartar borradores | Ricardo |
| S2-16 | Conectar catálogo y detalle público con campañas reales | Alison |
| S2-17 | Preparar acceso y cola administrativa de campañas | Ricardo |
| S2-21 | Verificar y documentar el segundo incremento | Ricardo |

Pruebas esperadas: iniciar como creador, crear y guardar borrador, recuperar datos tras volver, descartar solo borrador propio confirmado, completar secciones, enviar sin duplicación, revisar como administrador, corregir observaciones, publicar según permiso acordado y consultar únicamente campañas publicadas con datos reales. Probar también errores de campos, fechas, importes, estados de carga, accesos ajenos y acciones no permitidas.

S2-14 prepara el contrato de estados para S2-13; no se plantea una dependencia circular entre ambas. S2-21 verifica las otras doce tareas, no depende de sí misma. Las tareas de una misma persona tampoco son automáticamente independientes: acordar contratos tempranos para permitir trabajo paralelo de frontend y backend.

## Ocho tareas trasladadas, no eliminadas

| ID histórico | Trabajo futuro | Responsable conservado |
| --- | --- | --- |
| S2-01 | Adjuntar multimedia de la campaña | Santiago |
| S2-06 | Registrar identidad y respaldos de persona | Alison |
| S2-07 | Completar organización y respaldos KYB | Alison |
| S2-08 | Revisar casos KYC y KYB | Ricardo |
| S2-09 | Mostrar y corregir la verificación | Alison |
| S2-18 | Seleccionar el apoyo y su modalidad | Alison |
| S2-19 | Preparar el checkout | Alison |
| S2-20 | Representar pagos de prueba | Alison |

Se conserva cada ID S2 original, enlaces, miembros, checklist y estado. En Trello el prefijo **S3**, la etiqueta Sprint 3 y la columna **06 · Sprint 3 · Por refinar** muestran el destino actual. No se renumeran ni duplican.

## Criterios y extras ajustados

- **BG-14 / S2-15:** añadir descarte de borrador propio confirmado, persistente y controlado por propiedad/estado en backend. Mantener los tres criterios originales y añadir un cuarto.
- **BG-29 / S2-10:** revisar faltantes de campaña/recompensas aplicables sin exigir KYC/KYB, galería adicional ni checkout.
- **BG-32 / S2-14:** seis estados con transición e historial: borrador, pendiente de revisión, cambios solicitados, aprobada (todavía no pública), publicada y rechazada con motivo.
- **BG-53:** creador/propiedad para campañas y administrador para revisión; no autoasignar privilegios.
- **S2-16:** catálogo y detalle reales con filtros por texto, categoría, ubicación y tipo. No simular fondos recaudados como datos reales.
- **S2-17:** navegación/cola administrativa y reutilización de decisiones de S2-12, no estadísticas avanzadas ni cola KYC.
- Galería adicional, guardados/favoritos y estadísticas avanzadas conservan su alcance global, pero quedan pendientes de refinamiento futuro. Cumplir Fase 3 no autoriza cerrar esas partes de las BG.

El PDF espera siete pasos; el constructor existente separa Portada y tiene ocho. Revisar alineación, pudiendo integrar Portada en Información general sin perder datos guardados. No se modifica la aplicación en este ajuste.

## Capacidad y reparto: advertencia explícita

**29 tareas no constituyen un compromiso de un único Sprint 3.** El grupo acumula 15 tareas L y decisiones externas, por lo que no puede declararse equivalente en esfuerzo al Sprint 2. Primero refinar, estimar con el equipo, resolver dependencias y escoger un incremento viable; dividir el resto en más iteraciones si la capacidad lo exige. No se inventan fechas, velocidad ni nuevas asignaciones.

Se preservaron los miembros anteriores: Sprint 2 ahora queda **Santiago 7 / Alison 1 / Ricardo 5**. El reparto dejó de ser equilibrado al aplazar las ocho tareas. Debe revisarse antes del inicio; esta actualización no reasigna automáticamente a nadie.

## Verificación realizada

- Trello consultado mediante la conexión autorizada, sin abrir pestañas ni mostrar tarjetas en el navegador.
- 140 tarjetas conservadas: 14 generales/decisiones, 62 tareas y 64 BG.
- Columnas finales: Sprint 2 = 13; Sprint 3 por refinar = 29; Terminadas = 20 del Sprint 1, cuyo estado no fue reevaluado en esta operación.
- Sin cambios de miembros, fechas, cerrado/completado ni tarjetas del Sprint 1 frente a la captura inicial de esta operación.
- 25 checklists contrastadas: 21 de tareas originales S2 y cuatro BG. Los estados de los criterios existentes se conservaron; se añadió un criterio a S2-15 y a BG-14/29/32/53 sin duplicarlo.
- JSON válido; 62 IDs únicos de tarea, 64 IDs únicos BG; 62 entradas en el mapa y 62 apartados de tarea en Markdown. Correspondencias y agrupación actual conservadas.
- Copia del PDF idéntica al archivo recibido, comprobada por SHA-256.
- `git diff --check` sin errores. No se ejecutaron pruebas funcionales: solo se ajustó planificación, no implementación.

## Documentos vigentes y límites

[Plan legible v2.3](planificacion-sprints.md), [datos del plan](planificacion-sprints.json) y [mapa Trello](trello-sprints.json) reflejan esta organización. El Word general v2.2 y los documentos anteriores conservan su corte histórico; no se regeneraron como parte de este ajuste.

Los estados técnicos locales del Sprint 1 siguen siendo la instantánea histórica del 16–17/09/2026: no deben interpretarse como avance actual. Este ajuste no certifica nuevas funciones, no cambia arquitectura/código, no toca decisiones pendientes ajenas al alcance y no hace commit ni push a GitHub. Los cambios locales previos del usuario permanecen intactos.

Publicación posterior, solicitada por el usuario el 30/09/2026: este registro y la planificación se incluyen en la actualización de DEV junto con las mejoras de interfaz y los documentos de estudio del Sprint 1. El README principal documenta las comprobaciones de esa actualización y distingue las pruebas actuales del ensayo histórico. La frase anterior describe la operación inicial de ajuste, no la publicación posterior.
