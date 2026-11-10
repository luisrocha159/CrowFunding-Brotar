# Devoluciones automáticas y experiencia del aportante

Solicitud de Ricardo: al confirmarse la cancelación, devolver automáticamente el saldo no devuelto; recuperar solicitudes abiertas sin duplicarlas; mostrar importes, estado, motivos y siguiente paso con claridad. También aplicar la devolución total al terminar sin meta en todo o nada. Trabajo en RicardoDev.

## Reglas de implementación

- Solo simulador interno: cancelación confirmada por el rol autorizado o financiación finalizada con resultado REFUND_REQUIRED. No se opera un banco.
- La solicitud de cancelación no equivale a una cancelación confirmada. Se conservan los bloqueos/escalamiento por desembolsos; no se inventa saldo ni se ignoran disputas.
- Pagos y campaña se bloquean en la misma transacción que decide el ciclo. Se conservan historial, importes y confirmaciones originales.
- Por cada pago confirmado: descontar devoluciones completadas; completar solicitudes internas abiertas y devolver solo el remanente. No duplicar una devolución ya registrada. Cada transición conserva evento y auditoría del sistema.
- Rechazar registros pendientes ajenos al simulador, disputas/retenciones sin resolver o fondos insuficientes. Una decisión que no puede cumplir sus controles no deja dinero marcado como devuelto.
- Acción administrativa de recuperación para campañas antiguas ya canceladas o terminadas sin meta, sin crear reembolsos por consultar una pantalla.
- Consulta privada de elegibilidad y saldo: aporte original, devuelto, solicitado/en curso y pendiente. Una solicitud abierta impide repetir otra. La interfaz no confunde saldo pendiente con dinero libre.
- Total pendiente preseleccionado; parcial solo para otros motivos justificados. Cancelación y meta fallida no son importes arbitrarios elegidos por el usuario.
- Lista, detalle y formulario: tarjetas de importes, etapas, causas en español, aviso de siguiente paso y referencias técnicas plegadas. No mostrar una solicitud como devolución completada.

## Comprobación

Pruebas de saldo, parcial previo, solicitud abierta, pago ya devuelto, duplicados/reintentos y concurrencia; privacidad, roles y CSRF; bloqueo por compromisos, disputas y fondos desembolsados; cancelación y meta fallida completas en PostgreSQL aislado. Revisión de escritorio/móvil y accesibilidad, sin ejecutar devoluciones del usuario durante las pruebas.

## Ampliaciones solicitadas durante el trabajo

- Evidencias opcionales privadas (hasta 10, PDF/PNG/JPG/WebP, 5 MB por archivo), vínculo inmutable, autorización por solicitud y bloqueo de eliminación mientras esté vinculada.
- En Administración, «Panel de finanzas» sustituye el enlace personal «Mis aportes»; el enlace personal permanece en la vista del aportante.
