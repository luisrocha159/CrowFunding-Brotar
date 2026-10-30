# Correo para el equipo

La entrega pública incluye transporte Gmail, verificación, recuperación, avisos, importador y diagnóstico. La contraseña de aplicación existente se entrega **en un ZIP privado independiente, fuera del repositorio**, por autorización de Ricardo. El ZIP público no contiene esta configuración. No hay que copiar la base de datos o el .env completo de Ricardo.

## Instalar en otra computadora

1. Instalar la entrega siguiendo README y activar la base propia. Compilar backend. Mantener API detenida durante la importación.
2. Extraer el ZIP privado fuera del repositorio. Incluye correo-equipo.env, INSTRUCCIONES.md e Instalar-Correo.ps1. El archivo contiene únicamente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_FROM, SMTP_PASSWORD, PUBLIC_WEB_ORIGIN y PASSWORD_RESET_LOCAL_FILE.
3. Desde backend: `node scripts/mail-config.mjs --import 'C:/ruta/privada/correo-equipo.env'`. Conserva DB_*, puertos, simulador y archivos de esta instalación.
4. Verificar: `node --env-file-if-exists=.env scripts/check-mail.mjs`. Debe confirmar TLS/autenticación. No envía correo. Reiniciar API tras importar o editar.
5. Para un mensaje real de prueba solo a la cuenta remitente: añadir --send-self-test al diagnóstico. Revisar bandeja/spam; aceptación SMTP no acredita recepción.
6. Probar recuperar acceso con una cuenta registrada cuyo buzón controle el equipo. El mensaje llega a su correo registrado, no siempre al remitente. Probar el enlace una vez, acceso con contraseña nueva y rechazo de reutilización. Para verificación, solicitar enlace desde Mi cuenta y confirmar en la misma cuenta/origen. Los avisos de cambios necesitan correo verificado y preferencia elegida.

## Puertos y direcciones

El paquete se prepara para frontend http://127.0.0.1:5173. Si cambia el puerto, editar PUBLIC_WEB_ORIGIN y CORS_ORIGINS en backend/.env. Vite usa BACKEND_URL si la API no está en 3000. La dirección 127.0.0.1 del mensaje apunta a la PC donde se abre; no probar el enlace local desde un teléfono como si fuera un servidor publicado.

## Alcance de la configuración compartida

PASSWORD_RESET_LOCAL_FILE=false activa el canal SMTP; el buzón TXT sirve solo para ensayos locales explícitos y no demuestra posesión de correo. Gmail usa contraseña de aplicación, TLS y el mismo USER/FROM. La contraseña puede revocarse desde Google cuando termine la prueba compartida. No se sube a Git/Trello ni se pega en capturas o conversaciones públicas.

El script privado también puede usarse desde una consola: `./Instalar-Correo.ps1 -RepoPath 'C:/ruta/Brotar'`. La opción -EnviarPrueba añade el envío a la cuenta remitente; sin ella solo autentica. Las instrucciones para agentes están en INSTRUCCIONES.md del ZIP privado.

El informe de S3-20 distinguirá conexión SMTP comprobada en este corte de la recepción real previamente confirmada el 24/10/2026. No se inventa una recepción nueva. [Evidencia anterior](correo-operativo-2026-10-24.md).
