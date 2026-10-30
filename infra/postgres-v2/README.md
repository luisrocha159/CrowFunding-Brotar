# PostgreSQL V2 vigente

Infraestructura de la entrega DEV, 30/10/2026. Docker ejecuta **PostgreSQL 18.6**; API y frontend se ejecutan en el anfitrión. Instalar con [README principal](../../README.md#3-primera-instalación-completa).

- Esquema oficial: official-schema.sql; SHA-256 5b02741f228469b06e3758708d341e63c31fa3039ac664032602fbdb0b72fc88. No sustituir por un dump poblado.
- Proyecto normal brotar-provisional-v2; base brotar_db; puerto 127.0.0.1:15433; rol de aplicación limitado brotar_app.
- **40 migraciones acumulativas**, después de la línea base. migrate up y prepare-sprint2 preparan categorías y permisos automáticamente; no crean cuentas personales, administradores ni pagos.
- El healthcheck espera el servidor TCP final, evitando confundir el servidor Unix temporal de initdb con disponibilidad para el instalador.
- install solo prepara una base nueva. Para una V2 existente, respaldar y aplicar migrate up/prepare/verificar sin repetir restauración ni activate.
- .env y .env.backend son credenciales locales ignoradas por Git; nunca compartirlas como configuración del correo. SMTP usa su archivo privado independiente.
- Otra copia en la misma PC necesita proyecto y puerto libres antes del primer install. La carpeta por sí sola no aísla Docker.
- No borrar volúmenes ni usar down -v para corregir errores. [Migraciones y recuperación](MIGRACIONES.md).

[Evidencia integral](../../docs/validacion-integral-s3-21-2026-10-29.md) · [Entrega final](../../docs/entrega-final-s3-20-2026-10-29.md) · [Cortes históricos](README_HISTORICO.md). infra/postgres es legado; no arrancar su contenedor.
