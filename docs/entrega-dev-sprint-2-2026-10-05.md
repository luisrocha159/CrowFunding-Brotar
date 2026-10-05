# Entrega integrada del Sprint 2 a DEV

## Alcance

Código integrado de las 13 tareas de campañas, validaciones/refactorización, SQL oficial V2 y permisos/migración, tres guías PDF, README e instrucciones de instalación. `main`, las ramas remotas personales y Trello quedan fuera de esta publicación. Los documentos de corte local anteriores se conservan como evidencia histórica; no expresan la aceptación final del cliente.

## Método de verificación de la publicación

Se prepara una copia Git limpia, sin `node_modules`, compilados, `.env`, usuarios ni archivos privados de esta computadora. Dependencias se instalan con lockfiles congelados. Una instancia Compose exclusiva con puerto alternativo se usa para ensayar el procedimiento del README sin tocar el volumen habitual de desarrollo. Instalar, migrar, conceder permisos y activar son pasos distintos.

## Resultado comprobado antes de publicar

La copia limpia se creó desde el candidato `f0427aa`, sin dependencias ni configuración privada, y se incorporó por fast-forward sobre la punta remota de DEV. Se instaló una V2 nueva desde el SQL oficial, con proyecto Compose `brotar-dev-clean-20261005` y puerto 15434 solo para este ensayo. No se reutilizó el volumen habitual de desarrollo.

| Comprobación | Resultado |
| --- | --- |
| Frontend: `bun install --frozen-lockfile` | Instalación limpia aprobada, sin cambios del lockfile |
| Backend: `bun x --package pnpm@11.19.0 pnpm install --frozen-lockfile` | Instalación limpia aprobada; Express instalado explícitamente |
| `bun run check` en raíz | Lint, tipos, 130 tests y compilación aprobados |
| `bun x --package pnpm@11.19.0 pnpm run check` en backend | Lint, tipos, 128 tests y compilación aprobados |
| Instalación SQL V2, migraciones y permisos S2 | 59 tablas oficiales; dos migraciones aplicadas, `pending: false`; rol de aplicación limitado |
| Integraciones HTTP/PostgreSQL reales | 18 aprobadas, 0 fallidas, 0 omitidas; 276 tests en total |
| Activación de configuración nueva y repetida | Aprobada; la segunda no altera el `.env` ya activado |
| Repetir instalación, migración y permisos | Aprobado; sin restaurar encima ni borrar volumen |
| Arranque normal de API y Vite | `pnpm run dev` mediante versión fijada y `bun run dev`, aprobados |
| `/api/health/ready` en 3000 y a través de Vite en 5173 | HTTP 200 |
| Inicio, ruta del constructor y catálogo público a través de Vite | HTTP 200; contrato del catálogo válido |
| Proyectos propios/cola administrativa sin sesión | HTTP 401, no acceso anónimo a datos privados |
| Limpieza de fixtures en la base de ensayo | 0 usuarios y 0 campañas al finalizar |

Se ejecutó la suite secuencial con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=false` contra el candidato local. La integración incluye constructor, envío, corrección/reenvío, aprobación privada, publicación, rechazo, propiedad, sesiones y recuperación. La prueba negativa de línea base imprime un fallo intencional de migración y luego pasa: comprueba que no se marque migrada una base incompleta.

El ensayo de arranque valida HTTP/proxy y procesos, no sustituye un nuevo recorrido visual completo. La evidencia de escritorio/móvil anterior se conserva por separado; no se repitió aquí por la limitación de acceso del navegador. No se declara un nuevo ensayo de reinicio del contenedor: sí se repitieron las comprobaciones de reconexión/reinicio de API de la suite.

Antes de publicar se verifican además el árbol Git, documentos incluidos y exclusión de `.env`, archivos privados, `node_modules`, compilados y backups. El incremento todavía requiere revisión/aceptación de los líderes; pruebas aprobadas no constituyen garantía absoluta de ausencia de errores.

## Diagnóstico local de Docker, separado del repositorio

Docker Desktop estaba detenido y, al arrancarlo, volvió a fallar al acceder a `sailor-ingest.sock`. Tras inspeccionar los logs y el contenido de las carpetas temporales, con los procesos de Docker detenidos se conservaron `Docker/run` y `docker-secrets-engine` mediante sufijo `.stale-20261005-entregaDEV`; Docker regeneró los sockets y el motor 29.7.2 respondió. No se borraron volúmenes, configuración de la aplicación ni distribuciones WSL. Este diagnóstico específico de Windows no es un paso normal del README ni una garantía de que el problema local no recurra.

## Verificar lo descargado

En una copia limpia: `git switch DEV`, `git pull --ff-only origin DEV` y `git log -1 --oneline`. La rama de entrega es exactamente `DEV`; `main` y las ramas remotas personales no se actualizan mediante esta publicación. Los archivos de esta nota y los tres PDF deben estar presentes. Para primera instalación seguir la sección 3 del README; para V2 existente seguir la sección 15.

## Lo que cada computadora debe generar

- Docker Desktop operativo; infraestructura vigente `infra/postgres-v2`.
- Credenciales locales de PostgreSQL y `backend/.env` mediante `install` y `activate`, nunca copiados del equipo de Ricardo.
- Archivos/subidas y buzón de recuperación locales; no se descargan por Git.
- Para ensayo manual de envío/administración, cuentas ficticias con CREATOR/ADMIN concedidos por el responsable. No hay contraseña administrativa compartida; las pruebas automáticas usan fixtures efímeros aislados.

La publicación por ADMIN continúa bajo D05 provisional. Correo real, textos legales, KYC/KYB, pagos y provisión definitiva de roles D06 no se presentan como resueltos.

## Guías incluidas

- [Tareas, checklists y demostraciones](../output/pdf/Guia_Demostracion_y_Estudio_Sprint_2_Brotar.pdf).
- [Principios, patrones y defensa técnica](../output/pdf/Informe_Principios_y_Patrones_Sprint_2_Brotar.pdf).
- [Tutorial de siete flujos de inicio a fin](../output/pdf/Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf).

Para una instalación normal se sigue el README desde su sección 3. El ensayo aislado usa un puerto diferente exclusivamente para no interferir con una base preexistente; no se debe adoptar ese puerto en una instalación normal nueva.
