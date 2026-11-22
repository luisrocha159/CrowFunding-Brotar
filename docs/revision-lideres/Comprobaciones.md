# Comprobaciones del paquete de revisión

Corte del 9 de noviembre de 2026. Alcance: instalación dedicada y datos preparados para los líderes. Este registro distingue las comprobaciones aprobadas de la batería adicional que no terminó en verde.

## Resultados aprobados

| Comprobación | Resultado |
|---|---|
| Instalación en carpeta sin .env ni dependencias | Completó setup-review desde cero, con PostgreSQL y volumen nuevos |
| Dependencias | Instalación congelada con bun.lock y pnpm-lock.yaml |
| Base | Línea base oficial, 43 migraciones y cinco categorías utilizables |
| Carga | 18 cuentas, nueve roles y 20 campañas independientes |
| Repetir setup-review | Terminó sin duplicar ni restablecer escenarios, roles o contraseñas |
| Verificación inicial del paquete | 139 comprobaciones aprobadas por verify-review.mjs |
| Adjuntos | 35 binarios presentes, tamaño y SHA-256 coincidentes con la base |
| Sesiones y responsabilidades | 17 accesos válidos, cuenta restringida denegada y roles exactos |
| Visibilidad | Borradores/revisión/aprobadas no publicados; campañas públicas consultables |
| Publicación | REV-18 devuelve 409 PUBLICATION_REQUIREMENTS por identidad pendiente |
| Rendición | REV-20 tiene un mes cerrado y gasto de 300 BOB presentado para revisar |
| Correo local | 13 comprobaciones HTTP aprobadas; verificación, recuperación, enlace de un uso y revocación de sesiones |
| Frontend | Lint, tipos, 281 pruebas y compilación aprobados |
| Backend | Lint, tipos, 251 pruebas, ocho pruebas de administrador local, cuatro del preparador y compilación aprobados |
| Navegador | Inicio de sesión como creador, perfil y lista de campañas con REV-01 y REV-20; sin desbordamiento horizontal en el ancho reducido comprobado |
| Manual | 27 páginas PDF revisadas como imágenes; DOCX y Markdown con el mismo contenido |
| Privacidad de Git | Sin coincidencias de las contraseñas privadas locales de SMTP y base en los archivos de entrega |

La comprobación de correo crea una cuenta técnica nueva en la copia QA; no cambia ninguna de las 18 cuentas del paquete. No envía mensajes externos. Los avisos de estado se conservan en el buzón local privado y sus mensajes no se publican.

## Reproducir las comprobaciones

Instale según el manual y arranque la API. Desde backend, ejecute:

```powershell
node scripts/verify-review.mjs
```

Esta verificación exige los estados iniciales del paquete. Después de avanzar campañas manualmente, un estado diferente no demuestra un error de instalación. Para comprobar desde cero use otra carpeta, otro proyecto Docker y otros puertos.

Prueba opcional del canal de correo, desde backend con la API encendida:

```powershell
node scripts/check-review-mail.mjs
```

Crea una cuenta técnica @brotar.test y conserva sus mensajes privados. No modifica las credenciales de la guía. Espere un minuto si repite muchas veces los accesos, porque el límite por IP sigue activo.

## Batería de integración adicional y límites

También se intentó la batería HTTP/PostgreSQL completa. **No quedó aprobada en su conjunto y no se presenta como evidencia de cero fallos.** Algunas pruebas requieren una base sin casos activos, por lo que no se deben ejecutar sobre los escenarios precargados. Se repitieron comprobaciones en otra base vacía; la ejecución adicional tuvo fallos de fixtures y temporización, entre ellos la prueba de caducidad de rol durante un bloqueo, que recibió 409 en vez del 403 esperado. Esta diferencia queda pendiente de diagnóstico separado; no se relajó la autorización ni se cambió la expectativa para declarar éxito.

Durante la carga inicial también se observaron ajustes de reloj de Docker Desktop que dejaban sellos unos segundos por delante de clock_timestamp(). El preparador espera de manera acotada los sellos de asignación/roles antes de continuar y solo reintenta ante ese desfase observado. Si persiste, se detiene y conserva los pasos terminados. No se retiraron restricciones de fechas de la base. La última instalación completa pasó desde cero y su repetición también terminó correctamente.

La revisión manual de los líderes sigue siendo necesaria. Pagos, KYC/KYB y documentos son sintéticos; no hay proveedor bancario real ni aprobación legal externa. El Gmail privado del equipo no forma parte de este paquete reproducible.

## Cómo se prepara el historial

El cargador usa la API real para registro, aceptación, identidad, campañas, revisión, pagos, soporte y movimientos. El bootstrap SQL queda limitado a la base dedicada: roles sintéticos, slugs legibles, vencimientos para escenarios y anclaje temporal de REV-20 a un mes ya cerrado. No exporta la base personal ni fabrica comprobantes bancarios. El manifiesto privado registra los pasos y el origen sintético; repetir la preparación conserva el avance del revisor.

## Comprobación local para la defensa del 22 de noviembre de 2026

En RicardoDev pasaron 310 pruebas del frontend y 251 pruebas unitarias del backend. También pasaron las ocho pruebas de administración local y las cuatro del preparador, el análisis de código, la comprobación de tipos y ambas compilaciones.

En una instalación independiente, un patrocinador aportó 20 BOB por QR en escritorio y repitió el recorrido en móvil. En cada caso salió con el pago pendiente, volvió desde Mis aportes, autorizó en la billetera de práctica y recuperó el comprobante después de recargar. Los paneles de patrocinador, creador y administración se revisaron a 320, 375 y 1366 píxeles de ancho.

El 22 de noviembre de 2026 se verificó la entrega final. La diapositiva 44 del corte anterior mostraba 54 de 56. En el siguiente corte pasaron 55 y falló el envío de la campaña a revisión en S3-21. Para la prueba integral se comprobó en PostgreSQL la vigencia de los roles concedidos por la API antes de usarlos. Se conservaron el inicio de sesión original y las respuestas HTTP esperadas. Tras las correcciones, la ejecución completa en una base PostgreSQL dedicada aprobó **56 de 56**, con cero fallos, cancelaciones u omisiones. Incluye las rutas HTTP y el recorrido completo de campaña S3-21. En ejecuciones anteriores se observaron fallos intermitentes de vigencia y de orden de fechas. La ejecución aprobada se realizó en una máquina virtual independiente con PostgreSQL 18.6 y datos aislados. En el entorno compartido de WSL2, una medición de 800 muestras registró cuatro retrocesos del reloj de la base, de hasta 3,48 segundos. Allí hubo pruebas dependientes del tiempo que fallaron. El reloj compartido conservó su configuración. La corrida aprobada duró 16 min 44 s con Node.js 24.13.0 y un procesador virtual activo.

| Caso | Qué se verificó |
|---|---|
| Auditoría | Una misma sesión recibe HTTP 403 con una concesión ADMIN futura y HTTP 200 al adquirir vigencia. |
| Identidad | La petición llegó al bloqueo del expediente. Al vencer el permiso antes de liberarlo, la API respondió HTTP 403 y el expediente continuó pendiente. Con permiso vigente, la fecha registrada de revisión respetó la fecha de envío. |
| Ciclo y rendición | La ejecución comprobó los permisos vigentes, el cierre de plazo, la transferencia de representación y la presentación de la rendición. |

Para repetir la batería, utilice una instalación de integración dedicada con su archivo de entorno y la base inicializada. Desde `backend`, ejecute `corepack pnpm run build`, establezca `$env:ALLOW_DB_TEST_WRITES='true'` y ejecute `corepack pnpm run test:integration`. La batería realiza escrituras y prepara sus propios escenarios.

El resultado figura en la diapositiva 44, en sus notas y en el guion de Ricardo. [Material de defensa](../entregables/defensa-final/)
