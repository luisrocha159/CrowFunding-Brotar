# Sprint 1 · Reparto aprobado

Asignación aprobada por el responsable del equipo el 17/09/2026. Santiago corresponde a **Thiago Rocha (@thiagorocha13)** en Trello. Alison corresponde a **Alison B. Pizarro Apaza (@paa5002082)**. Ricardo corresponde a **RicardoNP5 01 (@ricardonp501)**.

## Tareas pendientes

| Persona | Rama | Tareas | Tamaño preliminar |
| --- | --- | --- | --- |
| Alison | AlisonDev | S1-11 registro; S1-12 recuperación; S1-14 archivos; S1-19 portada | 2 M + 2 L |
| Santiago | SantiagoDev | S1-10 migraciones; S1-13 permisos; S1-15 categorías; S1-16 borrador; S1-17 modalidad; S1-18 información; S1-20 historia/impacto | 5 M + 2 L |

No son horas ni puntos acordados. El reparto se hace por cohesión funcional y trabajo paralelo, no por número idéntico de tarjetas. Revisar capacidad real antes de comprometer fechas.

## Orden recomendado

- Alison: preparar S1-11/S1-12 (sujetas a D03/D08 y correo autorizado) y S1-14; después S1-19.
- Santiago: S1-10/S1-13/S1-15; luego S1-16; después S1-17, S1-18 y S1-20 según sus dependencias.
- No inventar textos legales, políticas de verificación, retención o permisos para cerrar tarjetas pendientes de confirmación. Avanzar la parte técnica desacoplada cuando sea posible y señalar el límite.

### Única dependencia técnica entre ambos bloques

S1-19 (portada, Alison) necesita S1-16 (borrador, Santiago), además de S1-14 del propio bloque de Alison. Acordar un contrato pequeño antes de implementar la integración. Se pueden desarrollar piezas en paralelo con adaptadores/fixtures identificados; para el cierre se exige persistencia real y comprobación conjunta. No se promete independencia total.

Santiago debe integrar el borrador probado a DEV pronto; Alison incorporará ese cambio a AlisonDev. Integración por PR, sin copiar carpetas de otra persona ni sobrescribir ramas.

## Historias y atribución

- Alison: BG-10, BG-11, BG-17; responsabilidad inicial de archivos en BG-61.
- Santiago: BG-15, BG-16, BG-18, BG-19; responsabilidad inicial en BG-53, BG-55 y BG-59.
- Ricardo: tareas base E01–E09; historias con cierre técnico BG-02, BG-03, BG-09, BG-57 y BG-58.
- Las BG transversales se mantienen abiertas y su miembro representa coordinación del alcance actual, no que deba ejecutar solo todo el MVP. E01–E09 se atribuyen a Ricardo; E09 conserva revisión externa pendiente si sus criterios la requieren.
- Resto de historias y sprints 2/3: sin asignación nueva; no se repartieron sin solicitud ni se cambiaron sus alcances.

Referencias: [plan completo](planificacion-sprints.md), [Trello](https://trello.com/b/37xCrdes/crowudfunding), [flujo de ramas](../CONTRIBUTING.md).
