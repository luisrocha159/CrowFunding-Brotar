# Plan S1-11 / S2-06 / S2-07 · condiciones propias
Spec: ../specs/2026-10-28-condiciones-provisionales-mvp.md
Base: 116d686. Stack actual NestJS/React/PostgreSQL; sin dependencias nuevas.

## Review Focus
- Ninguna aceptación inferida o insertada retroactivamente; versión/textos exactos y origen protegido.
- Crear cuenta y aceptar, o enviar expediente y consentir, son atómicos; duplicados no crean nuevas concesiones.
- Textos consultables, privados recibos/expedientes; no autoaprobar ni atribuir aprobación externa.
- Migraciones preservan políticas/historial/datos; cambio legal no invalida identidades por accidente.

- [ ] Documentos inmutables, dominio y pruebas rojas de versión/aceptación.
- [ ] Migración 40, repositorio/controladores, integración registro y expedientes; pruebas PostgreSQL.
- [ ] Páginas legales, aceptación propia, enlaces registro/verificación/cuenta; cliente y pruebas UI.
- [ ] Regresión, revisión independiente única y correcciones verificadas; datos/instalación/README/estado local y commit sin push.

## Ledger
- Ruling: completar con criterio propio autorizado, sin pedir otra aprobación — petición expresa de Ricardo y decisiones ya delegadas — costo: condiciones válidas solo para el ensayo del equipo, no autorización comercial.
- Ruling: conservar los requisitos sintéticos y las políticas históricas existentes; enlazar un suplemento versionado al nuevo consentimiento — no hay un cambio material de documentos ni motivo para invalidar aprobaciones previas — costo: se conserva evidencia de consentimiento anterior, no se presenta como aceptación de los textos nuevos.
- Ruling: solicitudes de privacidad/retención por soporte y operación manual documentada — la app no posee borrado integral automático — costo: requiere intervención y no se promete eliminación instantánea ni automática.
