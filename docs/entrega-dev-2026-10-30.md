# Entrega del MVP académico en DEV - 30/10/2026

Ricardo autoriza publicar en **DEV** todo el corte integrado de RicardoDev, incluida la entrega S3-20 preparada en `3cc7b5f739e9337e82ac8fcab8ed938d6db3cd92`. Se conserva el historial de Alison, Santiago y Ricardo. No se reescriben commits ni se sincroniza Trello en este turno. La publicación se confirma comparando el commit local con `git ls-remote origin refs/heads/DEV`; una preparación local no se presenta como un push exitoso antes de esa comprobación.

## Contenido vigente

- [README](../README.md): clonación de DEV, instalación nueva, PostgreSQL V2, categorías, migraciones, actualización sin restaurar datos, arranque, roles, diagnóstico y correo.
- [Índice documental](README.md), [explicativo](explicativo-final-mvp.md), [backlog canónico](planificacion-sprints.json) y los cuatro PDF de output/pdf actualizados al 30/10/2026.
- [Tres recorridos manuales](pruebas-manuales-equipo-2026-10-30.md), [cobertura JSON](pruebas-manuales-equipo.json) y [plantilla CSV](pruebas-manuales-equipo.csv). Alison: 30 rutas; Santiago: 16; Ricardo: 27. Total: 73 patrones del router, sin omisiones ni doble responsable principal. Formularios de varios pasos y permisos tienen variantes adicionales, no solo una visita por URL.
- [Correo del equipo](correo-equipo-entrega-final.md): adaptador y herramientas en Git; siete variables reales e instrucciones de importación en un ZIP privado independiente. Gmail requiere importar esa configuración en cada computadora. No hay usuarios/contraseñas de cuenta precargados en la entrega pública.

## Comprobaciones ejecutadas antes de publicar

Se creó otro clon local real en una carpeta nueva, con instalación Bun/pnpm congelada, sin reutilizar node_modules de la copia de trabajo. Docker preparó una nueva base QA en el proyecto `brotar-s320-dev-release-qa-20261030`, puerto 15458. Se ejecutaron install, check/build, 40 migraciones, prepare-sprint2, verify y activate. No se borraron volúmenes ni se modificó la base de demostración.

Las suites terminaron con **261 pruebas frontend, 241 backend y ocho del administrador local: 510 aprobadas, cero fallos**; lint, tipos y builds con exit 0. La sonda adicional aprobó API ready 200, denegación correcta del catálogo anónimo, documentos provisionales, registro/duplicado, catálogo autenticado de cinco categorías, provisión ADMIN/dashboard, sesión persistente tras reinicio y frontend/proxy hacia API lista.

Después se repitió el flujo de actualización sobre la V2 ya migrada: Docker up --wait, migrate up, prepare-sprint2, status y verify. No quedaron migraciones pendientes; el .env con correo importado permaneció idéntico. No se repitió install/activate para actualizar.

Se importó el archivo privado autorizado en esa copia nueva y se verificó que conservó DB_*, puerto, base habilitada y simulador. **Gmail autenticó con TLS sin enviar ningún mensaje nuevo**. La prueba funcional no cargó SMTP personal. El envío/recepción previo conserva su fecha en el informe de correo y la nueva ronda humana podrá probarlo explícitamente.

El código funcional, lockfiles y configuración de ejecución coinciden con el corte comprobado `3cc7b5f`; este incremento modifica documentación, estado de entrega y generación de PDF. El cotejo de 462 archivos normaliza únicamente LF/CRLF en tipos de texto conocidos; SQL oficial y binarios se comparan byte a byte. Las 55 integraciones S3-21 y sus 565 pruebas distintas son evidencia anterior del mismo código funcional, no una nueva ejecución de 55 integraciones en este turno. La advertencia de bundle frontend mayor de 500 kB permanece documentada.

Se revisaron los 13 bloques PowerShell del README mediante parser, enlaces locales y las páginas renderizadas de los cuatro PDF. Antes del push se comprueban secretos tanto en el árbol final como en los commits que DEV recibirá. Los resultados y hashes están en [evidencia del corte](evidencias/entrega-dev-2026-10-30/resumen.json) y [manifiesto](evidencias/entrega-dev-2026-10-30/integridad.json). La evidencia S3-20 del 29/10 describe el commit `3cc7b5f`; sus hashes se consultan sobre ese commit, pues los PDF actuales tienen una nueva revisión.

## Estado y revisión manual adicional

S3-20 completa la entrega en DEV. La planificación registra 36/36 alcances de Sprint 3 para el MVP académico DEMO: Ricardo 18/18, Alison 9/9 y Santiago 9/9. La aceptación S3-21 sigue siendo la declaración expresa de Ricardo; no se atribuye una aceptación nueva a líderes, cliente ni compañeros.

**Los tres recorridos humanos adicionales permanecen POR_PROBAR.** Cada responsable registra URL real, rol, variante, resultado esperado/obtenido y evidencia; un fallo debe conservar pasos y datos para reproducirlo. Si falta campaña publicada, vencimiento o mes terminado, registrar la condición pendiente; no darlo por exitoso ni alterar la base de uso. El documento explica cómo coordinar datos compartidos o recrearlos en cada instalación independiente.

No hay integración bancaria: pagos, QR, destinos y expedientes del ensayo son DEMO. Las condiciones legales son provisionales propias; sin proveedor financiero real, SMS ni certificación comercial, jurídica o WCAG. Publicar el repositorio no elimina estos límites ni garantiza ausencia absoluta de defectos.
