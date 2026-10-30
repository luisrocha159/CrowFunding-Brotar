# Backend Brotar

API NestJS del MVP académico DEMO, corte local de RicardoDev del 29/10/2026. **40 migraciones y 215 rutas HTTP**. Código integrado del equipo y aceptación S3-21; preparación de entrega local S3-20, sin push.

## Instalar y arrancar

Seguir [README raíz](../README.md#3-primera-instalación-completa). Orden: dependencias congeladas → SQL oficial en contenedor nuevo → check/build → migraciones → prepare-sprint2 → verificar → activate una vez → opciones DEMO y correo privado → API/frontend. No copiar .env.example como conexión.

Desde esta carpeta: `corepack pnpm run dev`; compilado: `corepack pnpm run build` y `corepack pnpm run start`. API normal http://127.0.0.1:3000/api. Docker aloja PostgreSQL en 15433; la API no usa superusuario. [Actualizar una V2 existente](../README.md#5-actualizar-una-copia-existente).

## Configuración y correo

El instalador crea las credenciales locales en infra/postgres-v2/.env.backend; activate copia a backend/.env. SMTP se importa aparte mediante `node scripts/mail-config.mjs --import 'C:/ruta/privada/correo-equipo.env'`. Verificar con `node --env-file-if-exists=.env scripts/check-mail.mjs`, sin envío. [Guía de equipo](../docs/correo-equipo-entrega-final.md).

DEMO_PAYMENTS_ENABLED=true habilita simulación solo en desarrollo/pruebas; CAMPAIGN_ADMIN_PUBLICATION_ENABLED controla la publicación explícita. PUBLIC_WEB_ORIGIN debe coincidir con la interfaz y CORS_ORIGINS. Nunca poner SMTP o DB_PASSWORD en VITE_*.

## Contratos y módulos

[Inventario HTTP verificado](../docs/contratos-http-sprint3.json) · [Contratos de integración](../docs/contratos-sprint-3.md). Sesión opaca revocable con cookie HttpOnly, validación por objeto/responsabilidad y protección de origen en mutaciones. Contraseñas hasheadas; no se registran cuerpos, tokens o documentos en auditoría.

Módulos: acceso/perfiles/contactos; organizaciones/representación; archivos; borradores/campañas y revisión; identidad; aportes/simulador/finanzas; ciclo/desembolsos/devoluciones/disputas; avances/rendición; soporte; catálogos/parámetros/auditoría. Se conservan esquema oficial, migraciones aditivas y separación de responsabilidades.

## Comprobar

`corepack pnpm run check` ejecuta lint, tipos, 241 pruebas backend, ocho del administrador local y build. Las 55 integraciones con escritura se ejecutan únicamente en copia QA nueva según [S3-21](../docs/validacion-integral-s3-21-2026-10-29.md#repetir-la-validación-automática), sin SMTP de uso. `node scripts/check-http-contracts.mjs` valida contratos sin abrir puerto ni conectar a datos.

/health/live no acredita base; /health/ready debe devolver 200 y comprueba esquema/permisos. Sin .env la API puede responder live con base desactivada: no es una instalación funcional. [Antecedentes](README_HISTORICO.md) conservan sus fechas, roles y conteos históricos.
