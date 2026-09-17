# Entrega técnica de integración · 17/09/2026

Este informe complementa el corte histórico del 16/09 y el backlog v2.2. La revisión formal de los líderes no se presume.

## Alcance comprobado

- Frontend React/TypeScript conectado por HTTP al backend NestJS/TypeORM.
- PostgreSQL oficial provisional V2; configuración separada y rol de aplicación limitado.
- Registro real, usuario/perfil en transacción, contraseña protegida y rol básico.
- Inicio/cierre de sesión, datos del usuario autenticado y revocación.
- Consulta/edición del perfil propio y persistencia.
- Registro de organización en borrador y relación con su usuario.
- Roles iniciales, rutas privadas y controles básicos de acceso/propiedad.
- Validaciones y estados de carga, éxito y error.
- README principal reproducible, instalación inicial y arranques posteriores, guion para líderes y pruebas.
- Flujo de ramas y reparto aprobado del Sprint 1 documentados.

No se implementan aquí campañas completas, KYC/KYB completo, aportes, pagos reales, recompensas, desembolsos ni rendición. Las campañas públicas y recuperación siguen simuladas.

## Evidencia repetida

| Comprobación | Resultado |
| --- | --- |
| Frontend: bun run check | Lint, TypeScript, 64 pruebas y build correctos |
| Backend: pnpm run check | Lint, TypeScript, 45 pruebas y build correctos |
| Backend: pnpm run test:integration | 5 pruebas con PostgreSQL real correctas; 0 omitidas |
| Verificador V2 | 59 tablas, 31 enums, 5 vistas, 16 funciones, 40 triggers, 8 secuencias y 134 FK |
| Configuración | Plantilla sin contraseña; puerto V2 15433; archivos privados ignorados |
| Revisión de publicación | Comprobación del índice contra valores secretos locales y patrones de credenciales; sin coincidencias en el corte revisado |

Total: 114 pruebas. Se utilizó ALLOW_DB_TEST_WRITES=true y DB_TEST_RESTART=false. No se reinició el contenedor ni se borraron datos ajenos; los tests gestionan sus fixtures temporales. No equivale a una auditoría completa de seguridad ni a una instalación probada en las computadoras de los compañeros.

## E01 y E09

Push confirmado a main: [067f832 — implementación](https://github.com/luisrocha159/CrowFunding-Brotar/commit/067f832) y [dc7bcad — entrega, README y reparto](https://github.com/luisrocha159/CrowFunding-Brotar/commit/dc7bcad). E01 y E09 cerradas técnicamente en Trello con sus checklists originales 3/3. E09 no exige aprobar el MVP completo: su último criterio pide repositorio, instrucciones y límites explícitos. La aceptación de los líderes se mantiene separada.

Sprint 1 vigente: 20 tareas, 9 cierres técnicos y 11 pendientes (Alison 4, Santiago 7). No hay tareas parciales de la entrega básica después de este cierre; las historias transversales BG conservan sus pendientes. Las cinco historias previamente cerradas y las nueve tareas E se atribuyen a Ricardo.

## Trabajo posterior

[Asignación del Sprint 1](asignacion-sprint-1.md): Alison 4 tareas, Santiago 7. E01–E09 y las cinco historias previamente cerradas se atribuyen a Ricardo. La portada depende del borrador: ambos bloques pueden empezar en paralelo, pero la integración final necesita coordinación.

[CONTRIBUTING](../CONTRIBUTING.md): ramas personales → DEV → main, PR pequeños, pruebas y revisión. Las ramas ya existían; no se deben reemplazar ni forzar si aparecen cambios divergentes.

## Pendientes reales

- Aceptación/demostración con líderes y reproducción en las computadoras del equipo.
- Reglas definitivas de verificación, términos, recuperación, permisos por operación y demás decisiones D.
- Recuperación real y constructor ampliado del Sprint 1.
- Migraciones incrementales/recuperación de BG-59 y módulos de sprints posteriores.
- Actualizar el PDF explicativo general y exportar las pantallas finales de Figma en su etapa correspondiente.

Ni compartir el repositorio ni asignar miembros termina estas funcionalidades.
