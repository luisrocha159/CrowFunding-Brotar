# Simular apoyo con fechas opcionales · 09/11/2026

Se corrigió un bloqueo observado con una cuenta `FINANCE` que también tiene el rol básico `REGISTERED_USER`. La campaña estaba publicada, tenía una recompensa activa y sus fechas de financiación estaban vacías.

El constructor admite dejar ambas fechas vacías. El checkout integrado también interpreta una fecha ausente como un límite no configurado. Sin embargo, el selector de simulación exigía ambas fechas y devolvía `eligible: false`, ocultando el formulario con el mensaje «El período de apoyo no está definido».

Se alineó el selector con la regla existente del checkout: una campaña publicada admite apoyo si su inicio no está configurado o ya llegó y su fin no está configurado o todavía no venció. No se inventaron fechas, mínimos ni recompensas, ni se modificaron los datos de la campaña. Los permisos, la privacidad, las restricciones del auditor, las validaciones del importe/recompensa y los cupos se conservan.

Comprobaciones:

- La regresión falló antes de la corrección al comprobar una campaña publicada sin fechas.
- La misma prueba ahora pasa con `FINANCE`: las fechas futuras y vencidas siguen bloqueando; las fechas vacías permiten seleccionar, guardar y confirmar una simulación. El ensayo aislado no añade aportes ni pagos al libro financiero.
- El flujo integrado también pasó: creación, confirmación, historial, comprobante, idempotencia, expiración y conciliación, en una base separada.
- Backend: lint, tipos, 243 pruebas, ocho comprobaciones del administrador local y compilación aprobados. Dos escenarios de integración focalizados aprobados.
- En la instalación de uso, el endpoint de opciones de la campaña devuelve `eligible: true`; la recompensa conserva su mínimo de 50 BOB y su disponibilidad.

No requiere migración ni cambios en `.env`. Cambios locales en `RicardoDev`, sin publicar.
