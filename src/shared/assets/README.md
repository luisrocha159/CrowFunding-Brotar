# Recursos visuales de Brotar

Referencia: [Figma final CrownFundingV3](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574). Lectura únicamente; no se modificó el archivo compartido.

- `brotar-logo.png`: recurso original entregado por Figma, asset `43fcc5d0-2afc-4969-89f3-b2bc993ebb2d`, presente en la cabecera de la landing (nodos `1:993` / `1:995`). Se conservaron los bytes originales; no es una recreación ni una imagen generada.
- `proyecto-reforestacion.png`: fotografía de referencia de Figma, asset `e88289c8-bcf6-44ff-bc06-8fcc7f4d6b7b`. Se utiliza en el ejemplo interno de tarjeta. No implica que los nombres, importes o entidades de la demostración sean reales.

Se conservan las imágenes originales para trazabilidad. Antes de la entrega final se puede generar una versión web optimizada, conservando estos originales y verificando su apariencia. El origen en Figma no constituye una licencia independiente para reutilizarlas fuera del proyecto.

Poppins e Inter se incluyen mediante `@fontsource/poppins` y `@fontsource/inter`, versión 5.3.0. Los imports locales están en `src/shared/styles/global.css`; no se solicita Google Fonts en tiempo de ejecución. Sus licencias OFL se incluyen en los paquetes instalados (archivo `LICENSE`).

Los tokens mantienen el verde principal `#0E4B34`, fondo `#F8FAF8` y la combinación Poppins/Inter de la referencia. Los tonos auxiliares de error, aviso, información, foco y hover son extensiones funcionales de la implementación, no se presentan como valores oficiales adicionales del Figma.
