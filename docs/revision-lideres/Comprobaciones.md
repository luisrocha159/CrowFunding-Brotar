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
