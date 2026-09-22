# Sprint 1: integración local de Ricardo, Alison y Santiago

Corte: 21/09/2026. Rama local `integracion-sprint1-local`. No publicada, sin cambios en Trello, main, DEV ni ramas personales. Conserva la historia de los tres aportes. Este informe tiene prioridad sobre las notas de implementación individuales anteriores.

## Cambios integrados

- Base Ricardo E01–E09, Alison `3a7ac3e` y Santiago `f06f824`.
- Formularios del constructor renderizan sin anidar controles dentro de un input; prueba de regresión de renderizado.
- Una etapa visible a la vez: modalidad, información, historia, portada, plan/presupuesto, financiamiento, recompensas y revisión. Los bloques de sprints posteriores se identifican como no implementados; avanzar no equivale a aprobarlos o publicar.
- Donación omite la posición de recompensas. Se guarda la etapa visible antes de navegar y se releen los datos actuales para no sobrescribir información con copias viejas. Resumen: límite uniforme de 500 caracteres.
- La modalidad conserva el modelo de financiamiento al no solicitar su cambio. Su modificación pasa por el caso de uso que exige reconocer recompensas afectadas.
- Categorías: normalización de la respuesta UPDATE RETURNING de TypeORM.
- Portadas por campaña real: `/api/campaigns/drafts/:id/cover`, `campaign.cover_file_id`, `file_asset` y `file_attachment.caption`. Sin cambios al esquema oficial. El texto alternativo usa caption y attachment_role COVER como convención técnica local.
- Los antiguos JSON/binarios locales no se borraron ni se importaron automáticamente: no se puede atribuir su portada a una campaña sin identificarla.
- Archivos: binarios en `backend/private/files`, metadatos/propiedad en PostgreSQL; tamaño, firma básica y acceso controlados. El límite HTTP permite las cargas de 2/5 MiB anunciadas. Las cargas fallidas intentan retirar sus temporales.
- Baja lógica de archivos no vinculados. No se elimina un archivo que figure como portada, adjunto o avatar. Retención definitiva y antivirus quedan pendientes: firma básica no es validación documental.
- Recuperación: adaptador SMTP configurado por entorno con TLS, expiración/uso único y revocación de sesiones. Sin configuración devuelve indisponibilidad, no una promesa de envío. La aceptación HTTP no prueba entrega al buzón; fallos SMTP se registran sin direcciones, tokens ni credenciales.
- Registro: el selector es orientación informativa y lo declara; no se afirma guardar una preferencia que la API no recibe ni conceder roles. Los términos legales definitivos no se inventan.
- Ensayos de recuperación con nombre de base único, sin borrar una copia preexistente con nombre fijo.

## Preparar una instalación V2 existente

No volver a restaurar el SQL oficial ni borrar volúmenes. Con Docker funcionando, desde `backend`:

```powershell
pnpm install --frozen-lockfile
pnpm run build
node scripts/prepare-sprint1.mjs
node scripts/migrate.mjs up
pnpm run dev
```

Se usa pnpm 11.19.0 y Node 24, como el proyecto. Si el pnpm global tiene otra versión, puede usarse `bun x --package pnpm@11.19.0 pnpm` en lugar de `pnpm`, sin cambiar la instalación global. `prepare-sprint1.mjs` concede únicamente los permisos técnicos versionados al rol limitado brotar_app en la V2 local 15433; no asigna roles a personas ni modifica datos.

En otra terminal, desde la raíz: `bun install --frozen-lockfile` y `bun run dev`. Abrir http://127.0.0.1:5173.

## Guion de comprobación

1. Registrar una cuenta ficticia e iniciar sesión. Se conserva el rol básico y el estado pendiente de verificación.
2. Mi cuenta → Mis borradores y portadas. Crear campaña; editar información, guardar y avanzar/volver. Comprobar título, resumen, ubicación y categoría sin pérdidas.
3. Guardar historia e indicadores. Las metas no son resultados conseguidos. Volver a entrar y comprobar recuperación.
4. Portada: cargar imagen válida, texto alternativo, guardar, volver al mismo borrador y sustituir. Crear otro borrador y comprobar que las portadas no se mezclan.
5. Donación omite recompensas. Los pasos de sprints posteriores se muestran como pendientes, sin simulación de publicación.
6. Comprobar errores de red y reintentos de cada operación. No considerar guardado lo que la API no confirma.
7. Probar recuperación solo con un remitente autorizado o el modo local explícito; reutilizar un enlace consumido no debe cambiar la contraseña otra vez.

## Correo

Copiar solo los nombres de variables de `backend/.env.example` a la configuración privada: `SMTP_HOST`, `SMTP_PORT` (587 o 465), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `PUBLIC_WEB_ORIGIN`. Requiere un remitente autorizado; nunca poner secretos en VITE, Git o Trello. La URL pública debe ser HTTPS fuera del desarrollo local. No se enviaron correos reales durante esta integración.

`PASSWORD_RESET_LOCAL_LINK=true` sirve únicamente para una prueba aislada en el propio equipo; entrega el enlace en la respuesta, no envía correo, no debe habilitarse en servidores compartidos y se ignora en producción. Mantener false por defecto. El adaptador sigue la [documentación SMTP de Nodemailer](https://nodemailer.com/smtp).

## Validación y límites de cierre

- Comprobaciones locales realizadas: lint, tipos y compilación de ambas aplicaciones correctos; 85 pruebas frontend y 86 backend correctas (171 en total). Incluye regresiones de renderizado, contratos, navegación y parser HTTP; no sustituye las pruebas con la base real.
- Ejecutar `bun run check` en la raíz y `pnpm run check` en backend.
- Con V2 preparada, ejecutar las pruebas de integración con `ALLOW_DB_TEST_WRITES=true` y `DB_TEST_RESTART=false`. Usan fixtures; revisar los scripts antes de ejecutarlos en un entorno compartido.
- Ejecutar `node scripts/drill-recovery.mjs` solo sobre la V2 local autorizada: crea un respaldo privado y una copia nueva con sufijo aleatorio. Nunca subir dumps.
- Actualización del 21/09/2026, 20:30 (Bolivia): Docker reparado y PostgreSQL V2 disponible. Se aplicaron las concesiones técnicas y la migración BaselineProvisionalV21789948800000. Las 13 pruebas de integración contra PostgreSQL pasaron, incluida la carga/sustitución de portada, su asociación a la campaña y recuperación después de otra sesión. También pasó la prueba de persistencia reiniciando el contenedor PostgreSQL.
- Falta verificar SMTP con el remitente autorizado y obtener decisiones D02/D03/D06/D08/D10 aplicables. Ninguna documentación local aprueba reglas del cliente.
- S1-11 no se cierra íntegramente sin términos/datos aprobados. S1-13 no equivale a matriz definitiva de permisos. S1-14 no define retención legal. Las historias BG transversales no se cierran por estos incrementos.

**Conclusión: integración y correcciones locales, no declaración de Sprint 1 aceptado ni de MVP terminado.**

## Evidencia de Docker y PostgreSQL

- Docker fallaba al reutilizar sockets temporales inaccesibles en `Docker/run` y `docker-secrets-engine`. Con sus procesos detenidos, se renombraron esas carpetas locales como respaldos con fecha y se dejaron regenerar. No se usó reset de fábrica, no se eliminaron volúmenes y no se reinstaló Docker. El motor responde con versión 29.7.2.
- Se inició el contenedor existente `brotar-provisional-v2-postgres-1`, conservando su volumen. PostgreSQL quedó healthy en `127.0.0.1:15433`; la base continúa siendo `brotar_db`.
- Verificación real: registro, sesiones, perfiles, organizaciones, roles/permisos, catálogos, borradores, modalidad, información/historia, archivos/portadas, transacciones y migraciones. 13/13 pruebas de integración correctas; adicionalmente, repetición de la prueba de persistencia con reinicio real del contenedor, correcta. Las 86 pruebas de backend y sus controles de lint, tipos y build también se volvieron a ejecutar sin fallos.
- Se corrigió una expectativa obsoleta de la prueba de modalidad: el modelo ALL_OR_NOTHING guardado debe recuperarse, no convertirse en null. Se restringió la limpieza del ensayo de borradores a los usuarios ficticios creados por su ejecución.
- Ensayo de recuperación correcto sobre una copia aislada: 59 tablas, 5 vistas, 8 secuencias, 31 enums, 16 funciones, 40 triggers y 134 claves foráneas conservadas. La copia temporal fue retirada; el respaldo recuperable se conserva fuera de Git en `C:/Users/rnune/Documents/brotar-privado/ensayos/brotar-drill-2026-09-22T00-29-07-815Z.dump`. Contiene datos privados: no publicar.
- Frontend en `http://127.0.0.1:5173` y API en `http://127.0.0.1:3000`. `/api/health/ready` responde `status: ok, database: connected` tanto directamente como a través del proxy del frontend. Las rutas principales sirven la aplicación. Esto confirma HTTP/proxy y persistencia; no sustituye una revisión visual completa en navegador.
- Sin push ni cambios en Trello. Continúan pendientes SMTP autorizado y decisiones del cliente; estos resultados no los dan por aprobados.
