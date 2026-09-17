# Documentación de Brotar

Este índice separa el producto general de la entrega pública que ya puede ejecutarse. Para instalar y abrir la aplicación, utiliza el [README principal](../README.md).

## Entrega de integración y trabajo en equipo · 17/09/2026

La etapa vigente incluye acceso, perfil y organizaciones reales. Ver [informe de entrega](entrega-integracion-2026-09-17.md), [asignación del Sprint 1](asignacion-sprint-1.md) y [ramas/PR](../CONTRIBUTING.md). El reparto aprobado es Alison 4 tareas y Santiago 7; los documentos Word/PDF conservan sus cortes anteriores. Los registros fechados abajo son históricos; este informe complementa su estado.

## 1. Proyecto general y Figma final

El backlog se actualiza a la versión 2.2, con planificación propuesta y corte técnico del 16 de septiembre de 2026. El PDF explicativo conserva su versión 2.0, con corte del 10 de septiembre. Son una planificación del MVP completo, no una declaración de que todo el software esté desarrollado.

- [Product Backlog General — Word](entregables/general/03_Product_Backlog_General_Brotar.docx): 64 historias, 192 criterios de aceptación y continuidad de las 33 historias anteriores. Actualiza el estado técnico y distribuye 62 tareas en tres sprints propuestos de 20, 21 y 21 tareas. Mantiene las decisiones pendientes separadas del desarrollo.
- [Planificación por sprints](planificacion-sprints.md): catálogo de tareas y trazabilidad completa de historias. El Sprint 1 tiene 9 cierres técnicos (E01–E09) y 11 tareas pendientes asignadas (Alison 4, Santiago 7), por lo que sigue abierto. Estado posterior a la publicación del 17/09: [entrega](entrega-integracion-2026-09-17.md), [organización histórica](organizacion-trello-sprints-2026-09-17.md), [mapa de tarjetas](trello-sprints.json).
- [Documento Explicativo General — PDF](entregables/general/04_Documento_Explicativo_General_Brotar.pdf): 9 páginas sobre alcance, recorridos, arquitectura, avance, fases y decisiones pendientes.
- [Enlace al Figma final — texto](entregables/general/01_Enlace_Figma_Final.txt).
- [Abrir CrownFundingV3 en Figma](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574).

**Pendiente:** exportar las pantallas del Figma final completo a un PDF general. El PDF histórico del creador que aparece más abajo no sustituye ese archivo.

Las prioridades son propuestas; estimaciones, responsables individuales y fechas se refinan con el equipo. Las diez decisiones abiertas deben validarse con los líderes. El enlace de Figma no concede permisos de acceso automáticamente.

La base oficial provisional V2 ya está restaurada de forma aislada y conectada mediante TypeORM. Hay acceso, perfil y organizaciones básicos con persistencia. D01 mantiene pendientes de migración y recuperación; D06 y D09 requieren completar permisos y reglas. Tener tablas no acredita todos los módulos del MVP. El backup con datos iniciales no se publica aquí. El Word v2.2 y el registro de cierre técnico prevalecen sobre las menciones antiguas del PDF explicativo relativas a base de datos, integración y remoto.

## 2. Requisitos del proyecto

Copias de consulta de los documentos utilizados para delimitar el trabajo:

- [Guía de contexto y alcance del MVP](requisitos/Guia_Contexto_y_Alcance_MVP_Crowdfunding.pdf).
- [Experiencia pública — equipos 1A y 1B](requisitos/Brotar_Equipos_1A_y_1B_Experiencia_Publica.pdf).
- [Experiencia del creador — equipos 1C y 2](<requisitos/Brotar_Equipos_1C_y_2_Experiencia_Creador (1).pdf>).
- [Patrocinador y administración — equipo 3](requisitos/Brotar_Equipo_3_Patrocinador_y_Administracion.pdf).
- [Definición del stack tecnológico y arquitectura](<requisitos/Brotar_Definicion_Stack_Tecnologico_y_Arquitectura (1).pdf>).
- [Tarea de desarrollo del frontend público](requisitos/Brotar_Tarea_Desarrollo_Frontend_Publico.pdf).

La guía define el MVP; la tarea del frontend define el incremento público con datos simulados. Las propuestas alternativas o descartadas de Figma no amplían automáticamente el alcance. Ante discrepancias de reglas, consultar las decisiones pendientes del backlog.

## 3. Implementación pública actual

- [Matriz de cumplimiento y escenarios para probar](cumplimiento-frontend-publico.md).
- [Fase 2 — identidad y componentes](fase-2.md).
- [Fase 3 — datos simulados](fase-3.md).
- [Fase 4 — experiencia pública](fase-4.md).
- [Fase 5 — acceso simulado](fase-5.md).
- [Fase 6 — verificación de entrega](fase-6.md).
- [Origen de las portadas ilustrativas](portadas-generadas.md).

Las notas de fases y los documentos generales conservan el estado de su fecha de corte. Las menciones antiguas a un remoto pendiente deben leerse como antecedentes; el código y los documentos ya se comparten en el repositorio indicado en el README principal.

## 4. Antecedente del Equipo 2

Estos archivos corresponden al prototipo histórico de la experiencia del creador. Se conservan sin sobrescribir ni presentar sus estados de diseño como desarrollo completo:

- [Enlace del prototipo histórico](entregables/historico-equipo-2/01_Enlace_Prototipo_Figma.txt).
- [Diez pantallas del creador — PDF histórico](entregables/historico-equipo-2/02_Pantallas_Exportadas_Equipo_2_Brotar.pdf).
- [Backlog del Equipo 2 — Word histórico](entregables/historico-equipo-2/03_Product_Backlog_Equipo_2_Brotar.docx).
- [Explicativo del Equipo 2 — PDF histórico](entregables/historico-equipo-2/04_Documento_Explicativo_Equipo_2_Brotar.pdf).

## Cómo abrir los archivos

En GitHub, entra al archivo PDF para previsualizarlo o descargarlo. Los documentos Word se descargan con **Download raw file / Descargar** y se abren con un editor compatible. También puedes clonar el repositorio o descargar su ZIP para tener todos los archivos localmente.

No se incluyen credenciales, dependencias instaladas, compilaciones, temporales ni capturas de conversaciones privadas. Las campañas y sus recursos son ejemplos de demostración; no deben presentarse como operaciones reales.
