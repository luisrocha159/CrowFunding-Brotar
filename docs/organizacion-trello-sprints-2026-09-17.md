# Organización de Trello por sprints

Fecha: 17/09/2026. [Tablero Brotar](https://trello.com/b/37xCrdes/crowudfunding).

Se aplicó el plan v2.2 al mismo tablero. BG significa **Backlog General**: una historia de producto. Las tarjetas E y S son tareas que desarrollan esas historias; no son historias adicionales.

## Estructura verificada

| Columna | Tarjetas |
| --- | ---: |
| 00 · General y decisiones | 14 |
| 01 · Sprint 1 · Pendientes | 11 |
| 02 · En curso | 1 |
| 03 · En revisión | 1 |
| 04 · Terminadas · cierre técnico | 7 |
| 05 · Sprint 2 · Planificado | 21 |
| 06 · Sprint 3 · Planificado | 21 |
| 07 · Backlog general · 64 historias | 64 |

140 tarjetas = 64 historias + 62 tareas + 14 tarjetas de guía/decisión. Las 87 tarjetas anteriores conservan su ID y estado de completado. No se archivaron tarjetas: solo la antigua lista de decisiones, después de vaciarla; puede recuperarse desde los elementos archivados.

## Plan y avance

| Sprint | Tareas | Tamaño M | Tamaño L | Cierre técnico | Parciales | Pendientes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 20 | 16 | 4 | 7 | 2 | 11 |
| 2 | 21 | 12 | 9 | 0 | 0 | 21 |
| 3 | 21 | 9 | 12 | 0 | 0 | 21 |

M = medio; L = grande. Son tamaños preliminares de tareas, no horas ni puntos consensuados. No se suman como estimaciones definitivas de historias transversales. El Sprint 3 concentra más tareas L y dependencias externas: antes de asignar hay que revisar capacidad, refinar las L y ajustar la distribución o cantidad de iteraciones si corresponde.

64 historias: 5 con cierre técnico local, 16 parciales y 43 pendientes. Tenerlas planificadas no significa tener implementado el sistema. Las decisiones del cliente siguen pendientes donde se indica.

## Uso del tablero

1. Consultar las BG en el backlog general, que permanece completo y ordenado del 01 al 64.
2. Elegir tareas del sprint activo según sus dependencias, acordar responsable, revisor y estimación. Los números son identificadores, no un orden que permita ignorar dependencias.
3. Mover las tareas por En curso → En revisión → Terminadas. Conservar etiqueta de sprint y ID. Cada tarea enlaza sus BG; cada BG enumera sus tareas y tamaños.
4. Registrar evidencias, pruebas, commit/PR y bloqueos en comentarios. Verificación pendiente no equivale a bloqueo total. Si una duda impide avanzar, indicar motivo, responsable de resolverla y próximo paso.
5. Cerrar una BG solamente cuando cumpla todo su alcance. No cerrarla solo porque una tarea relacionada haya terminado.
6. Después de presentación y aceptación, archivar solamente las tareas terminadas del sprint. Replanificar lo pendiente. Mantener las BG visibles y los enlaces históricos.

No se asignaron integrantes ni fechas. La capacidad, horas/puntos y revisión externa deben acordarse con el equipo. No se publicaron cambios de código ni se cambió la implementación.

## Verificación realizada

- Ocho columnas con nombres y orden correctos; 64 BG únicas, 62 tareas únicas y ninguna tarjeta anterior perdida.
- Etiquetas Sprint 1/2/3 en las 62 tareas, además del ID y tamaño visible en el título.
- 42 tareas nuevas con dependencias directas D01–D10 llevan Verificación pendiente. Se conservaron las etiquetas previas.
- 53 tareas nuevas con tres casillas cada una: 159 ítems creados sin marcar; comprobación de IDs únicos y respuestas de creación, más lectura de muestras S1-10, S2-10 y S3-21.
- Lectura de las nueve checklists E: E02–E08 mantienen 3/3; E01 mantiene 1/3; E09 mantiene 2/3. No se añadieron criterios que alteren su cierre anterior.
- Cinco historias BG y siete tareas E conservan el indicador de cierre técnico. No hay cierres nuevos.
- Las descripciones originales de las 64 BG se conservaron, añadiendo solamente la referencia al plan. Los criterios de aceptación no se modificaron.
- Comprobación automática final sin discrepancias. [Mapa de IDs y enlaces](trello-sprints.json).

El Word v2.2 conserva el corte de planificación previo a esta sincronización; este registro y el plan Markdown documentan el estado posterior del tablero. El PDF explicativo conserva su corte anterior.

## Índice de tareas para asignación

| ID | Sprint | Tamaño preliminar | Historia(s) | Tarjeta |
| --- | ---: | --- | --- | --- |
| E01 | 1 | M | BG-57, BG-58, BG-63 | [Preparar repositorio y backend](https://trello.com/c/3FKHa1Di) |
| E02 | 1 | M | BG-59 | [Restaurar y conectar PostgreSQL](https://trello.com/c/fded62s5) |
| E03 | 1 | M | BG-60 | [Conectar formularios y API](https://trello.com/c/hhbNHNoQ) |
| E04 | 1 | M | BG-10 | [Registrar usuarios reales](https://trello.com/c/dAsZpxd9) |
| E05 | 1 | M | BG-09 | [Iniciar y cerrar sesión](https://trello.com/c/byJiVP4l) |
| E06 | 1 | M | BG-12 | [Consultar y editar el perfil propio](https://trello.com/c/5ePv0ef8) |
| E07 | 1 | M | BG-53 | [Preparar roles y acceso privado](https://trello.com/c/JfdXTdBb) |
| E08 | 1 | M | BG-26 | [Registrar una organización vinculada](https://trello.com/c/4YcePqWB) |
| E09 | 1 | M | BG-62, BG-63 | [Probar y entregar la integración básica](https://trello.com/c/qMbzt3ok) |
| S1-10 | 1 | L | BG-59 | [Preparar migraciones y recuperación](https://trello.com/c/IeRMDahq) |
| S1-11 | 1 | M | BG-10 | [Completar condiciones del registro](https://trello.com/c/Mk5I3PVJ) |
| S1-12 | 1 | L | BG-11 | [Implementar recuperación de contraseña](https://trello.com/c/Y6mwzal0) |
| S1-13 | 1 | M | BG-53 | [Preparar permisos del flujo creador](https://trello.com/c/Mb98mxDE) |
| S1-14 | 1 | L | BG-61 | [Separar archivos públicos y privados](https://trello.com/c/xnSwoQwP) |
| S1-15 | 1 | M | BG-55 | [Preparar categorías y catálogos de campaña](https://trello.com/c/N3JGR5CO) |
| S1-16 | 1 | L | BG-18 | [Guardar y recuperar un borrador](https://trello.com/c/Kytz8JbS) |
| S1-17 | 1 | M | BG-15 | [Elegir la modalidad de campaña](https://trello.com/c/5ELH7FaQ) |
| S1-18 | 1 | M | BG-16 | [Completar información general](https://trello.com/c/8BhXXJUD) |
| S1-19 | 1 | M | BG-17 | [Cargar y reemplazar la portada](https://trello.com/c/MDQ8Sz16) |
| S1-20 | 1 | M | BG-19 | [Describir historia e impacto](https://trello.com/c/sHj2kFal) |
| S2-01 | 2 | M | BG-20 | [Adjuntar multimedia de la campaña](https://trello.com/c/aW8N2PsG) |
| S2-02 | 2 | M | BG-21 | [Planificar actividades e hitos](https://trello.com/c/GvQVAEEo) |
| S2-03 | 2 | M | BG-22 | [Registrar presupuesto y riesgos](https://trello.com/c/C3c5lbVP) |
| S2-04 | 2 | M | BG-23 | [Configurar el financiamiento](https://trello.com/c/Q4m8tguD) |
| S2-05 | 2 | L | BG-24 | [Configurar recompensas y preventas](https://trello.com/c/mQ72WcrQ) |
| S2-06 | 2 | L | BG-25, BG-27 | [Registrar identidad y respaldos de persona](https://trello.com/c/mXia80Q5) |
| S2-07 | 2 | L | BG-26, BG-27 | [Completar organización y respaldos KYB](https://trello.com/c/QzpTCGZ6) |
| S2-08 | 2 | L | BG-43, BG-44 | [Revisar casos KYC y KYB](https://trello.com/c/iN5WZPEd) |
| S2-09 | 2 | M | BG-28 | [Mostrar y corregir la verificación](https://trello.com/c/f2wKElZK) |
| S2-10 | 2 | M | BG-29 | [Revisar la campaña antes del envío](https://trello.com/c/M7WEue5G) |
| S2-11 | 2 | M | BG-30 | [Enviar la campaña a revisión](https://trello.com/c/39GELv0D) |
| S2-12 | 2 | L | BG-42 | [Decidir sobre campañas recibidas](https://trello.com/c/BC2tZad4) |
| S2-13 | 2 | M | BG-31 | [Corregir observaciones y reenviar](https://trello.com/c/3zokcK8z) |
| S2-14 | 2 | L | BG-32 | [Publicar y controlar estados de campaña](https://trello.com/c/b0SfOnc0) |
| S2-15 | 2 | L | BG-13, BG-14 | [Conectar panel y proyectos del creador](https://trello.com/c/tdYcbrv3) |
| S2-16 | 2 | L | BG-01, BG-05, BG-06, BG-07, BG-08, BG-12 | [Conectar experiencia pública y guardados](https://trello.com/c/6YyGoAQU) |
| S2-17 | 2 | M | BG-41 | [Crear el panel administrativo inicial](https://trello.com/c/DUoK6ILY) |
| S2-18 | 2 | M | BG-35 | [Seleccionar el apoyo y su modalidad](https://trello.com/c/Fb0YQnbF) |
| S2-19 | 2 | M | BG-36 | [Preparar el checkout](https://trello.com/c/jn96M3kd) |
| S2-20 | 2 | M | BG-37 | [Representar pagos de prueba](https://trello.com/c/UMGYVbmE) |
| S2-21 | 2 | L | BG-04, BG-53, BG-60, BG-61, BG-62, BG-63 | [Verificar y documentar el segundo incremento](https://trello.com/c/5Phzs40B) |
| S3-01 | 3 | L | BG-38 | [Integrar el proveedor autorizado](https://trello.com/c/003Q6udE) |
| S3-02 | 3 | L | BG-39 | [Asegurar importes y estados del aporte](https://trello.com/c/ONoYcbCB) |
| S3-03 | 3 | M | BG-33 | [Conectar el panel del patrocinador](https://trello.com/c/GhSvBSpq) |
| S3-04 | 3 | M | BG-34 | [Consultar mis aportes](https://trello.com/c/yH3AVvNa) |
| S3-05 | 3 | M | BG-40 | [Consultar detalle y comprobante](https://trello.com/c/mAYpejK5) |
| S3-06 | 3 | M | BG-45 | [Consultar operaciones financieras](https://trello.com/c/YyzU54ve) |
| S3-07 | 3 | L | BG-46 | [Conciliar operaciones](https://trello.com/c/JWVj9Mjh) |
| S3-08 | 3 | L | BG-47 | [Autorizar y seguir desembolsos](https://trello.com/c/Bl3KhxK4) |
| S3-09 | 3 | L | BG-48 | [Gestionar devoluciones](https://trello.com/c/TPFXEeaS) |
| S3-10 | 3 | M | BG-49 | [Registrar incidencias](https://trello.com/c/wOJdAFK4) |
| S3-11 | 3 | L | BG-50 | [Atender y resolver disputas](https://trello.com/c/IyIZIgso) |
| S3-12 | 3 | L | BG-07, BG-33, BG-51 | [Publicar avances y seguimiento](https://trello.com/c/GfwdpFM3) |
| S3-13 | 3 | L | BG-52 | [Registrar rendición y cierre](https://trello.com/c/qbBmvUPd) |
| S3-14 | 3 | M | BG-54 | [Administrar personas y organizaciones](https://trello.com/c/Tx8F84Ts) |
| S3-15 | 3 | L | BG-56 | [Consultar auditoría del sistema](https://trello.com/c/sLKDJe4q) |
| S3-16 | 3 | L | BG-12, BG-41, BG-53 | [Completar permisos por responsabilidad](https://trello.com/c/hNo1pl1D) |
| S3-17 | 3 | M | BG-55 | [Completar parámetros acordados](https://trello.com/c/RNolTk1j) |
| S3-18 | 3 | L | BG-59, BG-60, BG-61 | [Cerrar contratos y persistencia integrados](https://trello.com/c/rNXI5zUy) |
| S3-19 | 3 | L | BG-04, BG-62 | [Verificar el MVP y la interfaz completa](https://trello.com/c/Uvg6Lvlq) |
| S3-20 | 3 | M | BG-63 | [Actualizar y publicar la entrega general](https://trello.com/c/91EYkwLi) |
| S3-21 | 3 | M | BG-64 | [Validar el recorrido integral](https://trello.com/c/S2ULIrQD) |
