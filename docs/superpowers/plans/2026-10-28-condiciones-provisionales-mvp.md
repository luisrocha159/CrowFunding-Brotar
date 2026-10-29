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

- Revisión única de 116d686..2ff1dff: 3 Important, 0 Critical/Minor. Se entra en una sola pasada de correcciones verificadas por pruebas; no habrá re-review.
- Final: fixed versión específica KYC — reproducción HTTP devolvía200 sin versión declarada; DTO/cliente/confirmación fijan legalVersion y servidor la exige, GREEN.
- Final: fixed recibo por reenvío — reproducción guardaba1 recibo para2 envíos; revisión de origen distingue cada envío e idempotencia, recibo/version/hash enlazados en snapshot. GREEN dirigido pendiente de consolidado.
- Final: fixed cuenta bloqueada tras espera — PostgreSQL reprodujo200 después del bloqueo; reutilizar transactionRegisteredAccess para rechazarlo con403. GREEN pendiente de consolidado.
- Final: Ruling: suficiencia jurídica/vigencia normativa no certificadas — las fuentes oficiales informan un acuerdo académico propio, no un dictamen — costo: revisión jurídica adicional antes de utilizarlo comercialmente.
- Final: Ruling: identidad/dinero reales y aprobación externa fuera del acuerdo — no se inventa autorización de terceros — costo: el cierre provisional no habilita producción real.
- Final: Ruling: obligaciones manuales no se declaran ejecutadas por escribirlas — revisión de datos/backups y atención de solicitudes quedan a cargo del operador, sin cron de eliminación — costo: dependen de seguimiento humano documentado.
- Final: Ruling: regresión y documentación solo se cierran tras evidencia — el resultado dirigido no se presenta como suite completa — costo: no cerrar entrega global del MVP por adelantado.
- Final: Ruling: comprobación visual/teclado no equivale a certificación de accesibilidad o comparación entre navegadores — no hay baseline ni auditoría axe completa — costo: esas comprobaciones transversales siguen en S3-19.
- Final: Ruling: no atribuir auditoría integral de módulos previos a esta revisión — se prueba compatibilidad mediante regresión y controles existentes — costo: no se garantiza ausencia de cualquier vulnerabilidad en todo el producto.
- Final: Ruling: DBA/infraestructura comprometidos fuera de la resistencia acreditada — la app impide escritura directa de textos/recibos y comprueba huellas, pero depende de administradores y secretos protegidos — costo: una toma privilegiada exige controles operativos adicionales.
