# Integración de resultados y buenas prácticas

## Mejora desarrollada

La rama `docs-mejora-proyecto` nace del corte `8c8223e` de `DEV`. Actualiza la guía de contribución para eliminar instrucciones históricas presentadas como vigentes, documenta un flujo de cambios pequeños y agrega una plantilla reutilizable. Incluye el cálculo de importe restante de una campaña con pruebas de límites.

## Prácticas integradas

| Práctica | Evidencia verificable |
| --- | --- |
| Ramas y commits | Rama separada desde DEV, commits descriptivos y diff acotado; sin cambios directos en main. |
| Revisión colaborativa | PR a DEV y solicitud a una integrante distinta del autor. La revisión y sus correcciones se registrarán cuando existan. |
| Seguridad | Siete verificaciones y recomendaciones justificadas en `seguridad.md`, con límites explícitos. |
| Permisos | Matriz de las cinco cuentas consultadas y propuesta de privilegios mínimos en `permisos.md`. |
| Trazabilidad | Tres commits, historial y blame de CONTRIBUTING.md en `trazabilidad.md`; el PR vincula la mejora actual. |
| Pruebas con IA | Propuesta inicial revisada, diez casos y versión final de la utilidad; registros y resultados disponibles. |

Se integran al menos cinco prácticas con resultados locales verificables. El [PR #1](https://github.com/luisrocha159/CrowFunding-Brotar/pull/1) está abierto hacia DEV y solicita revisión a `AlisonPizarro1`. La solicitud de revisión no se presenta como una revisión humana ya terminada; no se fusionó el cambio.

## Validación ejecutada

- `bun run check`: lint, comprobación de tipos, 291 pruebas aprobadas y compilación; código de salida 0. Vite advierte de un paquete mayor de 500 kB; la compilación termina correctamente.
- `corepack pnpm run check`, desde backend: lint, tipos, 251 pruebas unitarias, 8 pruebas de administración local, 4 del preparador de revisión y compilación; código de salida 0.
- `bun audit --json` y `corepack pnpm audit --prod --json`: reportan hallazgos preexistentes y finalizan con código 1. Se documentan como riesgos pendientes, no como verificaciones de seguridad aprobadas.
- No se ejecutaron pruebas de integración con base de datos ni recorridos visuales en esta actividad. La función nueva es pura y no modifica persistencia ni API.

## Conclusión propuesta para el equipo

Conviene mantener ramas separadas, commits que expliquen su propósito y revisión por otra persona antes de integrar. La documentación debe remitir a una fuente vigente para evitar instrucciones contradictorias. Las pruebas deben cubrir límites del dominio y los resultados generados con IA deben revisarse y ejecutarse. La seguridad requiere tanto reglas escritas como protección efectiva de ramas, accesos mínimos y atención a dependencias. Se propone adoptar estas prácticas durante el resto del semestre para que cada entrega pueda comprenderse, reproducirse y rastrearse; la adopción es una propuesta, no un acuerdo del equipo ya confirmado.
