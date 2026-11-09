# Ajustes locales de presentación y verificación · 09/11/2026

Rama de trabajo: `RicardoDev`. Estos cambios se preparan en local; este registro no acredita su publicación en DEV.

## Cambios de interfaz

- Las pantallas, menús, acciones, avisos y mensajes de correo operativo utilizan «de prueba», «simulado» o «simulación» en lugar del rótulo anterior. Se conserva la indicación de que los QR y las operaciones económicas no usan dinero real.
- Mi cuenta muestra un botón **Administración** a quienes tienen el permiso efectivo `dashboard.read`. El servidor sigue comprobando por separado cada operación. Una consulta de permisos fallida no habilita el acceso; ofrece reintentar.
- La captura KYC/KYB muestra errores junto al texto, documento o consentimiento correspondiente. Valida al salir de un campo y antes de guardar/enviar, conserva los valores y distingue los conflictos de versión de una respuesta no confirmada.
- Los nombres e identificadores ficticios ya no requieren un prefijo. Siguen vigentes los campos obligatorios, los máximos de longitud, el texto Unicode válido, la privacidad y propiedad de archivos, los límites de carga y la revisión independiente. Guardar un borrador no aprueba la identidad.
- Los nuevos destinos ficticios utilizan ejemplos como `PRUEBA-HUERTO` y `PRUEBA Huerto Ñandú`. Frontend y backend comparten esa validación; las referencias antiguas siguen siendo compatibles. No se admiten números de cuentas bancarias reales.

## Publicación y datos existentes

La migración `PresentationWording1794182400000` añade la publicación de condiciones **1.1 del 09/11/2026** y actualiza la presentación de las tres políticas sintéticas. La instalación pasa de 40 a **41 migraciones**.

La versión anterior de las condiciones, su huella y sus aceptaciones permanecen archivadas. No se atribuye una aceptación nueva a cuentas existentes. Para un nuevo envío KYC/KYB se debe leer y aceptar la publicación vigente desde **Mi cuenta → Condiciones y privacidad** y confirmar el tratamiento del expediente.

Las políticas de captura conservan los mismos campos, documentos y máximos. La compatibilidad declarada mantiene las verificaciones anteriores ya aprobadas y vigentes para las consultas que las utilizan; no concede una aprobación a borradores ni a expedientes pendientes. Un expediente antiguo todavía pendiente puede necesitar corrección/reenvío para confirmar los requisitos actuales antes de aprobarse.

Los identificadores técnicos, contratos API, claves de configuración, registros previos y documentación histórica se conservan para no romper integraciones ni reescribir evidencias. El cambio de presentación no autoriza dinero ni identidades reales.

## Actualizar esta instalación

Desde `backend`, después de obtener estos cambios cuando se publiquen:

```powershell
corepack pnpm run check
node scripts/migrate.mjs up
node scripts/migrate.mjs status
node scripts/verify-provisional-v2.mjs
corepack pnpm run dev
```

Desde la raíz, en otra terminal:

```powershell
bun run check
bun run dev
```

No reinstalar la base, eliminar volúmenes ni sustituir el `.env`. La configuración privada de correo se conserva. La instalación nueva usa los mismos pasos del README; las 41 migraciones incluyen este ajuste.

## Comprobaciones

- Pruebas de regresión: captura vacía, valores sin prefijo, borrador incompleto, documentos y consentimiento al enviar, caracteres inválidos, máximos, errores HTTP por campo y conflicto 409.
- Prueba del controlador con el filtro público de errores: los mensajes de campo se conservan sin exponer datos del servidor.
- Condiciones: publicación nueva y hash distinto, archivo anterior intacto y documentos vigentes sin el rótulo eliminado.
- Navegador: errores específicos sin petición de guardado, conservación del archivo, confirmación del borrador y envío válidos, acceso administrativo condicionado y fallo de permisos sin conceder acceso.
- Base separada: instalación desde el SQL oficial, migraciones, catálogos, privilegios y regresión de integración.

Resultado local comprobado: **265 pruebas de frontend, 243 de backend y 8 de herramientas de administración**; lint, tipos y compilación aprobados. Se verificaron **56 casos distintos de integración**, combinando la ronda general de 55 con la repetición final de seis casos que incluye la nueva prueba de conservación/compatibilidad. Esta repetición terminó con seis aprobados y cero fallos. Las nueve comprobaciones en navegador también pasaron. Total: **572 pruebas automatizadas**, más las comprobaciones de navegador. La base de uso tiene 41 migraciones y ninguna pendiente; API y proxy de la interfaz responden 200 a readiness.

El único aviso de compilación es el tamaño del paquete JavaScript, ya existente; no impide compilar ni arrancar. Estos resultados no sustituyen la revisión manual de aceptación del equipo.

Durante la regresión se actualizaron fechas fijas de pruebas que ya estaban vencidas. Las fechas válidas se calculan respecto al día de ejecución; las pruebas negativas siguen rechazando fechas pasadas. También se aisló explícitamente el proyecto Compose del test de arranque para que una variable heredada no sustituya el contenedor de ensayo.
