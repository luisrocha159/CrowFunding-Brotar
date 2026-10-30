# Recorrido integral local · S3-21 · 29/10/2026

[Escenario entre roles, validaciones, instalación nueva, pruebas y aceptación](validacion-integral-s3-21-2026-10-29.md). Una misma campaña conecta registro, revisión, publicación, aporte DEMO, soporte, desembolso, avance, rendición y cierre. **S3-21 completada para el corte académico DEMO:565 pruebas aprobadas y aceptación expresa de Ricardo registrada por separado.** Queda S3-20; sin push ni cambios en DEV/Trello. El resto de este índice conserva sus cortes históricos.

# S3-10 / S3-25 - corte local - 25/10/2026

**Ampliación posterior de este mismo corte:** [Cierre local de panel, conversación y correo de soporte](cierre-alison-panel-soporte-correo-2026-10-25.md), contrato 0.12, 32 migraciones y 182 rutas. Completa los pendientes de panel y respuesta/correo encontrados en la revisión siguiente. Legal y aceptación integral siguen pendientes; sin push ni cambios en DEV/Trello.

[Revisión de la rama de Alison e integración local](revision-integracion-alison-sprint3-2026-10-25.md): registro de incidencias comprobado; S3-25 parcial por contadores financieros pendientes. Sin push ni cambios en DEV/Trello. Los cortes históricos siguientes conservan su fecha.

La implementación añade reportes de terceros sobre campañas públicas y bandeja general de soporte para casos no financieros. Los reportes de información incorrecta y aparente falta de ejecución se limitan a campañas publicadas; pagos, devoluciones y disputas financieras conservan su flujo separado. La atención usa asignación de equipo, respuestas compartidas, transiciones permitidas, auditoría y descarga de evidencias privadas solo desde el expediente autorizado.

El panel administrativo muestra agregados reales de campañas, catálogos, partes, identidad, soporte, rendición y cierre según permisos vigentes. Las metas operativas se presentan como alertas internas DEMO, no SLA ni correo. La migración 30 habilita el resumen por responsabilidad sin modificar cuentas o roles existentes. La migración 31 conserva motivos y fechas de cambios de estado de incidencias en una tabla aditiva, sin alterar los casos existentes.

La base de datos permanece en el esquema PostgreSQL oficial y las migraciones son acumulativas. Para ejecutar la validación completa, seguir el README principal y las instrucciones de PostgreSQL V2; no usar 5432 ni copiar secretos locales.

# Documentación de Brotar

## Incremento de correo · RicardoDev · 24/10/2026

[Flujos, contrato, pruebas y pendientes del correo](correo-operativo-2026-10-24.md) · [Reglas ADR-014](decisiones/ADR-014-correo-operativo-mvp.md) · [Configuración y traslado privado en README §35–36](../README.md). El incremento no aprueba legal ni cierra la integración/aceptación global del MVP. No buscar claves en este repositorio.

Este índice separa el producto general de la entrega pública que ya puede ejecutarse. Para instalar y abrir la aplicación, utiliza el [README principal](../README.md).

## Integración transversal local S3-15 a S3-18 · 24 de octubre de 2026

[Criterios, implementación, pruebas y límites del corte transversal](cierre-transversal-s3-15-18-2026-10-24.md), [169 contratos HTTP comprobados](contratos-http-sprint3.json) y README §34. **28 migraciones**, RicardoDev sin publicar (corte histórico; la actualización S3-10/S3-25 vigente está descrita arriba). S3-17 conserva autoría de Santiago y se revalida; los módulos funcionales completos de compañeros, correo y legal no se dan por terminados mediante este documento. Los apartados siguientes conservan sus cortes históricos.

## Ampliación local del cierre S3-23 · 24 de octubre de 2026

[Contrato mínimo, tutorial y validaciones de cierre](cierre-s3-23-2026-10-24.md). **27 migraciones**, README §33; rendición final revisada, cumplimiento con evidencia y resolución mínima de incidencias para el ciclo DEMO. No completa informes periódicos, logística, administración de terceros ni soporte general de compañeros. Sin publicación, correo real ni aprobación legal. Los cortes siguientes conservan su fecha histórica.

## Integración local vigente · 23 de octubre de 2026

Actualización posterior del mismo día: [cierre de S2-08, S3-09, S3-11 y S3-02](cierre-cuatro-tareas-ricardo-2026-10-23.md). **24 migraciones** y README §31 sustituyen el conteo del corte integrado anterior. Revisión sintética, devoluciones/disputas DEMO y estados enlazados; sin publicación, correo real ni aceptación legal. El informe integrado siguiente conserva su corte de 20 migraciones.

[Integración de Ricardo + Santiago, evidencia y tareas](integracion-local-sprint-3-2026-10-23.md) y [ADR-013: seis acuerdos del MVP DEMO](decisiones/ADR-013-definiciones-integracion-mvp-demo.md). Veinte migraciones, checkout DEMO conectado al historial y parámetros tipados con consumidor operativo. Solo RicardoDev local, sin publicar ni modificar Trello; legal y correo reales pendientes. Los informes siguientes conservan su fecha histórica, no sustituyen el estado de este corte. README §30 contiene los pasos vigentes.

## Cierre local de S3-07 · registrado el 23 de octubre de 2026

[Conciliación DEMO: criterios, implementación, pruebas y pendientes](cierre-s3-07-conciliacion-2026-10-23.md). Pantalla, API y PostgreSQL; consulta de pendientes, referencias, resolución trazable y cierre protegido. Ensayo completo/visual del 22/10: 373 casos distintos, perfiles y adaptación móvil. Mantiene catorce migraciones y no publica cambios en DEV. README §29 contiene el recorrido. S3-06 y S3-07 tienen cierre técnico local; el resto conserva sus dependencias. Las fechas de evidencia no significan que los servidores QA sigan encendidos.

## Incremento local del 21 de octubre de 2026

[Pagos DEMO: implementación, evidencia y pendientes](avance-pagos-demo-2026-10-21.md), [contrato HTTP DEMO 0.5](contrato-pagos-demo-0.5.md) y [contratos generales 0.5](contratos-sprint-3.md). Backend de checkout, boleto no pagable, simulación, reintentos/expiración y conciliación con compensación exclusivamente de prueba. Catorce migraciones; no hay proveedor bancario ni publicación. UI integral/QR de Alison, correo, KYC y operaciones dependientes siguen pendientes. README §28 explica el uso. Los cortes siguientes conservan su fecha histórica.

## Incremento local del 20 de octubre de 2026

[Reglas del MVP de pruebas y estado de aplicación](decisiones/ADR-012-reglas-mvp-pruebas.md), [contratos vigentes 0.4](contratos-sprint-3.md) y [evidencia del incremento](avance-reglas-ricardo-2026-10-20.md). Gestión de responsabilidades, reintentos/expiración internos y mantenimiento manual de retención, con trece migraciones. README §27 explica los pasos. Todo permanece en RicardoDev sin publicar; correo y módulos dependientes no se cierran. Los cortes anteriores conservan sus resultados históricos.

## Avance local de Ricardo · Sprint 3 · 19/10/2026

[S3-15/16/18: avance de auditoría, demostración y límites](avance-auditoria-s3-15-16-18-2026-10-19.md). Consulta restringida de acciones y estados, instrumentación transaccional de campañas/núcleo sandbox, contrato 0.3 y once migraciones. No se cierran estas tres historias ni se publica el incremento. README §26 explica el recorrido.

[S3-06: consulta financiera completa y demostración](cierre-s3-06-finanzas-2026-10-19.md). Pantalla, filtros, totales por moneda/estado y CSV seguro con permisos, sin mover dinero. Su corte de cierre técnico registró 351 casos, diez migraciones y regresión con reinicio; el avance de auditoría enlazado arriba conserva el corte posterior. La aceptación global y las otras tareas siguen pendientes. README §25 explica el recorrido.

[S3-16/S3-02/base S3-18: implementación y evidencia inicial](avance-ricardo-sprint-3-2026-10-19.md) y [contratos 0.3 para el equipo](contratos-sprint-3.md). Permisos por responsabilidad, núcleo sandbox interno y lectura propia paginada de aportes; no hay proveedor conectado ni cobros reales. Las tres tareas iniciales siguen en curso. El plan y el mapa de Trello conservan su captura de reparto del 15/10; no sustituyen la evidencia técnica del avance local.

## Entrega actualizada de DEV · 16/10/2026

[Registro de instalación y comprobaciones](entrega-dev-2026-10-16.md). Incluye las validaciones, siete migraciones, categorías automáticas, hitos con varias actividades y semejanzas orientativas, sin unicidad del título. La guía operativa vigente es el README; las frases «local/sin push» de los apartados fechados siguientes corresponden a esos cortes históricos.

[Plan v2.4 y reparto del Sprint 3](plan-sprint-3-cierre-mvp-2026-10-15.md): 36 tareas, Ricardo 18 / Santiago 9 / Alison 9; 64 historias y 67 tareas globales sin duplicados. Cierre integral condicionado a pruebas, decisiones y aceptación, no a un conteo de tarjetas.

Documentos para el docente (conservan el corte de su elaboración; no sustituyen las instrucciones actuales):

- [Informe detallado del Sprint 2 — Word](entregables/sprint-2/Informe_Detallado_Sprint_2_Brotar.docx).
- [Principios y patrones del Sprint 2 — Word](entregables/sprint-2/Principios_y_Patrones_Sprint_2_Brotar.docx).
- [Guía de defensa de pruebas de integración — Word](entregables/sprint-2/Guia_Defensa_Pruebas_Integracion_Sprint_2_Brotar.docx).

## Cierre local ampliado del Sprint 2 · 15 de octubre de 2026

La política vigente está en las secciones 20–21 del README: nombres iguales/parecidos permitidos, UUID y slug únicos y semejanzas solo orientativas para ADMIN. Se retiraron el formulario de iniciativa/etapa y sus requisitos de admisión; los datos anteriores se conservan. Categorías automáticas, validaciones, reintentos y cuotas siguen activos. **338 casos aprobados** (162 frontend, 147 backend, 8 ADMIN local, 21 PostgreSQL), instalación nueva y readiness por API/proxy comprobados. La sección 22 contrasta el Sprint 2 con la guía general del MVP. [ADR-006](decisiones/ADR-006-validaciones-del-equipo-sprint-2.md) registra la sustitución de la política experimental. El ajuste sigue local en DEV, sin commit/push ni cambios en Trello.

## Validaciones del equipo actualizadas el 13 de octubre de 2026

[Reglas de validación del Sprint 2](decisiones/ADR-006-validaciones-del-equipo-sprint-2.md): correo primero y consulta de disponibilidad, mínimos y máximos, campos obligatorios, fechas no pasadas, porcentajes, importes calculados, meta mayor al presupuesto y reintentos idempotentes y unicidad técnica de campañas. La política posterior del 15/10 sustituye los bloqueos semánticos de aquel ensayo. Es un cambio local en DEV, autorizado como criterio del equipo; no representa confirmación del cliente ni modifica los informes docentes de cortes anteriores. Los resultados de pruebas del nuevo corte están en el README principal.

## Avance local del Sprint 2

El [cierre técnico local del 5 de octubre](cierre-tecnico-sprint-2-2026-10-05.md) completa S2-12/S2-14 y la verificación/documentación de S2-21: **13 tareas implementadas**, **263 casos aprobados** (122 frontend, 123 backend, 18 PostgreSQL), más ensayo de interfaz escritorio/móvil y teclado. La revisión, corrección, aprobación privada y publicación administrativa funcionan con datos reales. La copia sigue local en `RicardoDev`, sin commit/push ni Trello; publicación del incremento y aceptación externa pendientes. [ADR-005](decisiones/ADR-005-publicacion-administrativa-provisional.md) registra la autorización provisional de publicación por ADMIN, no una decisión definitiva del cliente.

La [revisión de Santiago e integración local del 5 de octubre](revision-integracion-santiago-sprint-2-2026-10-05.md) conserva el corte previo al cierre de Ricardo: siete tareas de secciones, revisión, envío y correcciones sobre lo de Alison/Ricardo; 116 pruebas frontend, 115 backend y 17 PostgreSQL. La [nota original de Santiago](implementacion-sprint-2-santiago.md) mantiene su antecedente.

La [revisión de Alison e integración local del 4 de octubre](revision-integracion-alison-s2-16-2026-10-04.md) documenta S2-16 adaptada sobre `RicardoDev`, 106 pruebas frontend, 104 backend y 16 PostgreSQL aprobadas. El catálogo público ya consulta datos publicados reales en esta copia. Los cambios de esa integración no se han publicado ni trasladado a DEV/Trello; publicación y recorrido integral siguen pendientes.

La [nota de Ricardo del 1 de octubre](avance-ricardo-sprint-2-2026-10-01.md) documenta S2-15 y S2-17 en revisión técnica parcial, S2-12/S2-14/S2-21 en curso, el contraste de sus pantallas con Figma y las pruebas con PostgreSQL tras recuperar Docker. El incremento se entrega en `RicardoDev`, no en DEV/main, y no declara cerrado el Sprint 2. Los cortes históricos siguientes se conservan.

## Actualización de DEV · 30/09/2026

La planificación vigente es v2.3: **20 tareas de Sprint 1, 13 de Sprint 2 y 29 en el inventario futuro de Sprint 3 por refinar**. Se conservan 62 tareas y 64 historias; no se suman ambos conteos. La cantidad futura no equivale a un compromiso de capacidad. Las asignaciones del Sprint 2 se revisarán con el equipo; esta publicación no implementa todavía el módulo completo de campañas.

- [Planificación vigente](planificacion-sprints.md), [datos](planificacion-sprints.json), [mapa Trello](trello-sprints.json) y [registro del ajuste](ajuste-sprint-2-fase-3-2026-09-30.md).
- [Tarea oficial de campañas · Fase 3](requisitos/Brotar_Tarea_Fase3_Modulo_Campanas.pdf).
- [Informe detallado del Sprint 1 — Word](entregables/sprint-1/Informe_Detallado_Sprint_1_Brotar.docx).
- [Principios y patrones para el docente — Word](entregables/sprint-1/Principios_y_Patrones_Sprint_1_Brotar.docx).
- [Guía de calidad y defensa](calidad-sprint-1.md) y [Word](entregables/sprint-1/Informe_Calidad_y_Defensa_Sprint_1_Brotar.docx).
- [Guía de tareas y demostración](verificacion-sprint-1.md), [Word](entregables/sprint-1/Guia_Verificacion_y_Demostracion_Sprint_1_Brotar.docx) y [ensayo final](ensayo-final-sprint-1.md).

Los informes y guías mantienen sus fechas originales, conteos y referencias del código de ese momento. Para instalación, ramas, nombres de botones y configuración prevalece el README principal. Los generadores de dos guías están en `scripts/`; requieren Python y `python-docx` solo si se desea regenerar documentos, no para ejecutar la aplicación.

## Integración del Sprint 1 en DEV · 21/09/2026

El [README principal](../README.md) contiene instalación, recorrido de prueba, catálogo provisional y recuperación mediante buzón local. Se aprobaron 200 casos automatizados y el ensayo local de los flujos implementados. Los textos legales, correo real y reglas finales siguen pendientes. En aquella publicación no se incluyeron las guías personales; se incorporan en la actualización del 30/09. Los estados de las secciones históricas siguientes corresponden a sus fechas originales.

## Entrega de integración y trabajo en equipo · 17/09/2026

La etapa vigente incluye acceso, perfil y organizaciones reales. Ver [informe de entrega](entrega-integracion-2026-09-17.md), [asignación del Sprint 1](asignacion-sprint-1.md) y [ramas/PR](../CONTRIBUTING.md). El reparto aprobado es Alison 4 tareas y Santiago 7; los documentos Word/PDF conservan sus cortes anteriores. Los registros fechados abajo son históricos; este informe complementa su estado.

## 1. Proyecto general y Figma final

El Word del backlog conserva la versión 2.2 y el corte técnico del 16 de septiembre de 2026; la distribución actualizada de sprints está en el plan v2.3 enlazado arriba. El PDF explicativo conserva su versión 2.0, con corte del 10 de septiembre. Son una planificación del MVP completo, no una declaración de que todo el software esté desarrollado.

- [Product Backlog General — Word](entregables/general/03_Product_Backlog_General_Brotar.docx): 64 historias, 192 criterios de aceptación y continuidad de las 33 historias anteriores. Actualiza el estado técnico y distribuye 62 tareas en tres sprints propuestos de 20, 21 y 21 tareas. Mantiene las decisiones pendientes separadas del desarrollo.
- [Planificación por sprints](planificacion-sprints.md): catálogo vigente v2.3 y trazabilidad completa. Sus estados técnicos conservan el corte histórico del 16–17/09 y no son una auditoría del avance actual del Sprint 1. Para el trabajo posterior consultar informes y ensayo enlazados arriba. Referencias históricas del 17/09: [entrega](entrega-integracion-2026-09-17.md) y [organización](organizacion-trello-sprints-2026-09-17.md).
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

Incremento local vigente del Sprint 3: [ciclo y desembolsos DEMO](ciclo-y-desembolsos-demo-2026-10-24.md), con contratos, recorridos, validaciones y dependencias explícitas; instalación en README principal §32. Requiere 26 migraciones, no está publicado y no cierra correo/legal ni módulos pendientes de compañeros.

Para el Sprint 2 vigente: [guía de demostración y tareas](../output/pdf/Guia_Demostracion_y_Estudio_Sprint_2_Brotar.pdf), [principios/patrones para defensa](../output/pdf/Informe_Principios_y_Patrones_Sprint_2_Brotar.pdf) y [tutorial de siete flujos paso a paso](../output/pdf/Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf). Los PDF conservan el corte local del 05/10/2026; se incluyen en la [entrega integrada de DEV](entrega-dev-sprint-2-2026-10-05.md). La aceptación externa sigue pendiente. No reemplazan las guías históricas del Sprint 1.

En GitHub, entra al archivo PDF para previsualizarlo o descargarlo. Los documentos Word se descargan con **Download raw file / Descargar** y se abren con un editor compatible. También puedes clonar el repositorio o descargar su ZIP para tener todos los archivos localmente.

No se incluyen credenciales, dependencias instaladas, compilaciones, temporales ni capturas de conversaciones privadas. Las campañas y sus recursos son ejemplos de demostración; no deben presentarse como operaciones reales.
