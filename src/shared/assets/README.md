# Recursos visuales de Brotar

Referencia: [Figma final CrownFundingV3](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574). Lectura únicamente; no se modificó el archivo compartido.

- `brotar-logo.png`: recurso original entregado por Figma, asset `43fcc5d0-2afc-4969-89f3-b2bc993ebb2d`, presente en la cabecera de la landing (nodos `1:993` / `1:995`). Se conservaron los bytes originales; no es una recreación ni una imagen generada.
- `proyecto-reforestacion.png`: imagen ilustrativa de referencia de Figma, asset `e88289c8-bcf6-44ff-bc06-8fcc7f4d6b7b`. Sus metadatos originales indican `Made with Google AI` y `trainedAlgorithmicMedia`; no es evidencia fotográfica de una campaña real. Se utiliza temporalmente en las seis campañas ficticias.

Se conservan ambas imágenes PNG originales, sin modificarlas, para trazabilidad. La aplicación utiliza derivados WebP generados en fase 6 mediante compresión y redimensionamiento, sin recrear ni cambiar la escena o el logo:

| Archivo servido | Dimensiones | Bytes | Conversión |
| --- | --- | ---: | --- |
| `brotar-logo.webp` | 128 × 128 | 15.342 | Redimensionado proporcional; WebP sin pérdida sobre la versión reducida |
| `proyecto-reforestacion.webp` | 1344 × 768 | 288.270 | Resolución original; calidad 82; conserva metadatos XMP de origen IA |

Los originales suman 3.213.368 bytes y los derivados 303.612 bytes: aproximadamente 90,6 % menos peso para estos dos recursos, no para toda la aplicación. La conversión se realizó con Sharp del runtime local de herramientas, sin añadir dependencias al frontend. Solo es necesario ejecutar Bun para instalar o compilar el proyecto: los derivados están versionados.

Las versiones optimizadas se inspeccionaron como imágenes y en el navegador. El origen en Figma no constituye una licencia independiente para reutilizarlas fuera del proyecto. Las portadas específicas continúan pendientes de extracción o entrega: el conector Figma respondió con límite de consultas. El PDF exige una imagen en cada campaña, pero no seis fotografías distintas; no se declara fidelidad visual completa al Figma.

Poppins e Inter se incluyen mediante `@fontsource/poppins` y `@fontsource/inter`, versión 5.3.0. Los imports locales están en `src/shared/styles/global.css`; no se solicita Google Fonts en tiempo de ejecución. Sus licencias OFL se incluyen en los paquetes instalados (archivo `LICENSE`).

Los tokens mantienen el verde principal `#0E4B34`, fondo `#F8FAF8` y la combinación Poppins/Inter de la referencia. Los tonos auxiliares de error, aviso, información, foco y hover son extensiones funcionales de la implementación, no se presentan como valores oficiales adicionales del Figma.
