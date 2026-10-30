# Entrega final local de Brotar

> Informe histórico del corte local 3cc7b5f del 29/10/2026. Su indicación de no publicar y sus hashes describen ese commit. La autorización posterior del 30/10/2026 y los PDF vigentes se documentan en [entrega DEV](entrega-dev-2026-10-30.md); no usar este informe como estado remoto actual.

S3-20, RicardoDev, corte del 29/10/2026. El usuario pidió preparar toda la entrega sin subir código. El resultado local reúne instrucciones, configuración, backlog, explicativo y pantallas. **La publicación permanece pendiente por instrucción expresa**; no se confunde un ZIP local con un push o actualización de DEV/Trello.

## Contenido vigente

| Documento | Función |
| --- | --- |
| README.md | Instalación nueva, actualización, arranque diario, roles y correo |
| docs/README.md | Índice de fuentes y entregables finales |
| backend/README.md e infra/postgres-v2/README.md | Instrucciones coherentes con el arranque vigente |
| CONTRIBUTING.md | Trabajo de equipo, migraciones actuales y publicación separada |
| Manual_Instalacion_y_Correo_Brotar.pdf | Guía operativa imprimible derivada del README |
| Product_Backlog_Final_Brotar.pdf | 64 historias con criterios y 67 tareas sin duplicar arrastres |
| Documento_Explicativo_Final_Brotar.pdf | Arquitectura, módulos, validaciones, roles, pruebas y límites |
| Pantallas_Finales_MVP_Brotar.pdf | Inventario de 73 rutas y capturas representativas identificadas |

Los PDF están en output/pdf; sus fuentes son README, docs/explicativo-final-mvp.md, planificación e inventario de interfaz. Los README extensos anteriores se conservan como README_HISTORICO.md junto al original; los enlaces con anclas antiguas se redirigen cuando corresponde. Los informes fechados anteriores conservan su corte, no se reescribe su evidencia como si fuera nueva.

## Comprobaciones de instalación

Se clonó localmente RicardoDev adcb5b1 a una carpeta nueva sin node_modules. Bun y pnpm instalaron con lockfiles congelados, sin enlaces a dependencias de la copia original. Docker creó una base aislada en proyecto brotar-s320-qa-entrega-20261029, puerto 15456. Se ejecutaron los comandos de preparación, 40 migraciones, permisos, inventario y activate; ambas suites check terminaron con exit 0.

Se comprobaron API ready 200, cinco categorías desde el catálogo autenticado, documentos legales provisionales, registro y correo duplicado rechazado, concesión local explícita de ADMIN y dashboard autorizado, sesión conservada tras reiniciar API y proxy Vite hacia la API preparada. La primera sonda intentó el catálogo sin sesión y recibió el 401 correcto; se corrigió la sonda para autenticarse, sin cambiar permisos del producto.

Este turno repite 510 checks de frontend/backend/administrador. Las 55 integraciones completas de S3-21 ya estaban aprobadas sobre el mismo código funcional; no se presenta esa ejecución anterior como una repetición nueva. No hay modificaciones funcionales de API, esquema o frontend en S3-20. El cotejo conserva hashes originales y del clon; normaliza únicamente LF/CRLF de archivos de texto conocidos, sin ignorar otras diferencias. SQL oficial y binarios se comparan byte a byte. Se preserva la advertencia de bundle frontend mayor de 500 kB.

## Correo público y paquete interno

El repo contiene instrucciones y herramientas sin contraseña. Se exportó fuera del repo un archivo de solo correo desde la configuración autorizada; se importó en la copia nueva y se comprobó que DB_*, DATABASE_ENABLED, PORT y DEMO_PAYMENTS_ENABLED permanecieron intactos. Gmail confirmó TLS y autenticación sin enviar mensajes nuevos. Los procesos de la sonda funcional no cargaron SMTP.

El ZIP privado del equipo contiene correo-equipo.env, INSTRUCCIONES.md e Instalar-Correo.ps1. Incluye la contraseña de aplicación autorizada; se comparte únicamente por el canal privado del equipo. No se adjunta al ZIP público, Git o Trello. La guía indica cómo importarlo, comprobarlo y solicitar una prueba explícita al propio remitente. Los flujos de recuperación se dirigen al correo registrado del usuario de Brotar.

La recepción real del 24/10/2026 se conserva como evidencia anterior en correo-operativo-2026-10-24.md. Autenticación correcta hoy no demuestra recepción o lectura de un mensaje nuevo.

## Interfaz y referencia visual

Se mantiene el enlace CrownFundingV3 de coordinación. La consulta de metadatos confirmó acceso al nodo 12:2574, rotulado PÚBLICO Y REGISTRO. No se modificó Figma ni se atribuye una nueva auditoría visual completa del archivo.

El PDF de pantallas reúne capturas de la interfaz implementada de S3-19, S3-26, S3-21 y acceso vigente, con procedencia y recortes descritos. Incluye todos los patrones de ruta como inventario; **no afirma tener una captura única de cada ruta ni repetir las 243 comprobaciones UI de S3-19**. El prototipo histórico permanece separado.

## Estado y entrega pendiente

S3-21 tiene aceptación expresa de Ricardo del MVP académico DEMO y 565 pruebas distintas aprobadas. Las 35 tareas de alcance técnico/aceptación de Sprint 3 están cerradas; S3-20 tiene su preparación local completa. **El único paso diferido de S3-20 es publicar/compartir el corte en el destino autorizado**. No se declara publicación remota ni aceptación externa de líderes o cliente.

La preparación conserva 40 migraciones y 215 contratos HTTP. Pagos, QR, destinos y expedientes del ensayo son DEMO; condiciones legales provisionales, sin proveedor real ni SMS. Para uso comercial se necesita un alcance y revisión adicionales, fuera de esta entrega académica.

Los resultados, hashes y procedencia se consolidan en docs/evidencias/s3-20/resumen.json. El ZIP público final contiene únicamente archivos versionados; un manifiesto externo permite verificar su integridad. La configuración privada y los datos de prueba permanecen fuera del paquete público.

## Reproducir los documentos

Los PDF se generan con scripts/build-final-delivery.py, utilizando Python con reportlab, pypdf y Pillow. Son dependencias de documentación, no requisitos para ejecutar el frontend o backend. Los PDF ya están incluidos y se pueden consultar sin Python. La revisión de páginas se registra en la evidencia de entrega.

Para repetir funcionamiento se siguen README y la guía S3-21 de integración QA. Para actualizar una base existente no se restaura SQL ni se usa activate de nuevo. Para publicar en otro turno se revisan commit, manifiesto y diff; este documento no da permiso de push ni contiene credenciales.
