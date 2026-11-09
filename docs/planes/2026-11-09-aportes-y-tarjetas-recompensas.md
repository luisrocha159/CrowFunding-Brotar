# Aporte por importe y elección de recompensa

Solicitud de Ricardo: reemplazar el desplegable por tarjetas que se habiliten según el importe y permitir aportar sin recompensa.

## Comportamiento

1. El importe se introduce primero. Se conserva el mínimo de campaña cuando esté definido y se rechazan cero, importes negativos y formatos no válidos.
2. En campañas de recompensa se puede elegir «Aportar sin recompensa». Una recompensa solo puede seleccionarse si el importe alcanza su mínimo y tiene cupo. Se muestra cuánto falta para habilitarla.
3. En preventa se mantiene la selección obligatoria de un producto. En donación no se ofrecen recompensas.
4. Si baja el importe y la elección deja de ser válida, se informa y se bloquea continuar hasta cambiarla o elegir sin recompensa. No se cambia la elección silenciosamente.
5. Cambiar el importe no concede una recompensa automáticamente. Las opciones conservan selección visible, navegación por teclado, foco y estados que no dependen solo del color.
6. Simulación y checkout integrado comparten la nueva regla de modalidad. El servidor vuelve a comprobar mínimos, disponibilidad, propiedad y cupos. Un aporte sin recompensa no ocupa unidades.

## Implementación y comprobación

- React y CSS del proyecto, sin dependencias nuevas. Importe arriba, tarjetas responsivas y resumen de elección antes de continuar.
- Regresión de validaciones frontend/backend para donación, recompensa opcional y preventa obligatoria.
- Integración con importe inferior al mínimo de recompensa, aportación sin recompensa, confirmación y comprobante, sin consumir cupos; selección de recompensa con mínimo/cupo y concurrencia.
- Navegador: importes vacío, inferior, exacto y superior; cambio de recompensa; disminución posterior; navegación por teclado y ancho móvil.
- Origen: `RicardoDev`; rama de entrega integrada: `DEV`.

Resultado: tarjetas integradas con el resumen del aporte y comprobaciones de importe, modalidad y cupos superadas. El QR del resumen se implementó por separado y añade sus propias dependencias; el diseño de tarjetas sigue usando React y CSS existentes. [Resultados y evidencia](../aportes-verificacion-qr-2026-11-09.md).
