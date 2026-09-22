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
- En este corte Docker no pudo iniciar su motor; no se aplicaron concesiones ni migraciones ni se ejecutaron las pruebas contra PostgreSQL. El código de persistencia nuevo no tiene aún verificación integrada real en este equipo.
- Falta verificar SMTP con el remitente autorizado y obtener decisiones D02/D03/D06/D08/D10 aplicables. Ninguna documentación local aprueba reglas del cliente.
- S1-11 no se cierra íntegramente sin términos/datos aprobados. S1-13 no equivale a matriz definitiva de permisos. S1-14 no define retención legal. Las historias BG transversales no se cierran por estos incrementos.

**Conclusión: integración y correcciones locales, no declaración de Sprint 1 aceptado ni de MVP terminado.**
