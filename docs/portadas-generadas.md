# Portadas generadas · Brotar

Fecha: 10 de septiembre de 2026. Modo: generador integrado de imágenes (`image_gen`), una llamada por portada; no se utilizó CLI ni una clave API.

## Archivos y procedencia

Cinco portadas nuevas para el prototipo; no son exportaciones oficiales de Figma ni documentos de campañas reales. El logo oficial y la portada de reforestación se conservan sin reemplazar.

Originales PNG con metadatos del generador: `C:/Users/rnune/OneDrive/Documentos/CROUDWFUNDING/output/imagegen/brotar-portadas/`. Se conservaron también los archivos del generador en `.codex/generated_images`. Los PNG no son necesarios para ejecutar la aplicación; los WebP están versionados dentro del repositorio.

| Tema | Original conservado | Archivo de la aplicación |
| --- | --- | --- |
| huertos | `huertos-original.png` | `src/shared/assets/campaigns/huertos.webp` |
| textiles | `textiles-original.png` | `src/shared/assets/campaigns/textiles.webp` |
| biblioteca | `biblioteca-original.png` | `src/shared/assets/campaigns/biblioteca.webp` |
| agua | `agua-original.png` | `src/shared/assets/campaigns/agua.webp` |
| cacao | `cacao-original.png` | `src/shared/assets/campaigns/cacao.webp` |

Derivados WebP: ancho 1344 px, proporción conservada, calidad 82; conversión con Sharp del runtime local, sin nuevas dependencias del proyecto. Solo se optimizaron tamaño y codificación, sin cambiar las escenas. El código identifica el origen IA mediante aviso general, textos alternativos y pies de imagen. Las ubicaciones son inspiración visual, no afirmaciones de que estas escenas existan realmente.

## Verificación

- `bun run check`: lint, TypeScript, 51 pruebas y build completados correctamente.
- Catálogo: revisión visual de las seis tarjetas en ambas páginas, con portadas distintas y encuadres correctos.
- Detalle de Agua segura: comprobado en escritorio y a 375 px de ancho; imagen y aviso ilustrativo visibles, sin desbordamiento observado.
- Logo oficial y portada original de reforestación sin modificaciones.

## Prompts finales completos

### huertos

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 crowdfunding campaign cover for Brotar, a Bolivian social, environmental and productive project demonstration. Generate one standalone landscape image, preferably 1536x864 or another 16:9 resolution, not a collage or a website mockup.
Style: photorealistic editorial illustration, natural believable materials, calm warm daylight, restrained forest greens, earth and neutral tones, soft contrast, everyday authenticity rather than glossy stock posing. Cohesive with a sustainable community website. The output will be clearly labeled AI-generated and illustrative by the website.
Composition: an immediately recognizable main subject, useful at a small thumbnail as well as a large cover, central crop-safe framing, keep important subjects away from all edges. No need for copy space.
Constraints: no added text, no typography, no numbers, no logos, no watermarks, no interface, no collage; no recognizable real individuals or claims to depict an actual organization or completed funded project. Respectful contemporary Bolivian context, no stereotypes or dramatic poverty imagery.
Scene: a modest thriving neighborhood vegetable garden in the Cochabamba valley, Bolivia-inspired setting, low brick boundary walls and softly distant Andean hills. Main subject: orderly raised garden beds of leafy greens and seedlings, with two fictional adult community gardeners in ordinary contemporary work clothing tending plants, naturally focused on their activity rather than posing. A watering can and rich soil reinforce sustainable urban cultivation. Wide eye-level framing; garden rows lead toward the middle distance. Warm late-afternoon light with natural greens.
```

Archivo original del generador: `exec-3c3b4f6d-31bc-471d-9fe3-d98328e8ad07.png`.

### textiles

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 crowdfunding campaign cover for Brotar, a Bolivian social, environmental and productive project demonstration. Generate one standalone landscape image, preferably 1536x864 or another 16:9 resolution, not a collage or a website mockup.
Style: photorealistic editorial illustration, natural believable materials, calm warm daylight, restrained forest greens, earth and neutral tones, soft contrast, everyday authenticity rather than glossy stock posing. Cohesive with a sustainable community website. The output will be clearly labeled AI-generated and illustrative by the website.
Composition: an immediately recognizable main subject, useful at a small thumbnail as well as a large cover, central crop-safe framing, keep important subjects away from all edges. No need for copy space.
Constraints: no added text, no typography, no numbers, no logos, no watermarks, no interface, no collage; no recognizable real individuals or claims to depict an actual organization or completed funded project. Respectful contemporary Bolivian context, no stereotypes or dramatic poverty imagery.
Scene: a small contemporary circular-textile workshop in a La Paz-inspired setting, daylight coming through a simple window. Main subject: beautifully practical unbranded reusable tote bags constructed from recovered fabric offcuts, olive green, cream and muted terracotta, arranged on a worn wooden worktable beside neatly grouped fabric remnants and a sewing machine. One fictional adult artisan can be softly visible working in the background, but make the bags and fabric textures the readable focal point. Medium-wide editorial framing, soft warm daylight. Bags should look handmade, functional and attainable, not luxury retail. No readable labels on anything.
```

Archivo original del generador: `exec-2ec9dd63-0964-4af0-87c9-67346a3aeaee.png`.

### biblioteca

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 crowdfunding campaign cover for Brotar, a Bolivian social, environmental and productive project demonstration. Generate one standalone landscape image, preferably 1536x864 or another 16:9 resolution, not a collage or a website mockup.
Style: photorealistic editorial illustration, natural believable materials, calm warm daylight, restrained forest greens, earth and neutral tones, soft contrast, everyday authenticity rather than glossy stock posing. Cohesive with a sustainable community website. The output will be clearly labeled AI-generated and illustrative by the website.
Composition: an immediately recognizable main subject, useful at a small thumbnail as well as a large cover, central crop-safe framing, keep important subjects away from all edges. No need for copy space.
Constraints: no added text, no typography, no numbers, no logos, no watermarks, no interface, no collage; no recognizable real individuals or claims to depict an actual organization or completed funded project. Respectful contemporary Bolivian context, no stereotypes or dramatic poverty imagery.
Scene: a welcoming modest community reading room inspired by Potosi, Bolivia, with daylight through an unadorned window and simple plaster walls. Main subject: wooden bookshelves containing varied books with plain unlettered spines, and a central reading table with open books and a few colorful chairs for a community learning space. No people are needed. Warm, human, approachable rather than an extravagant library; cared-for everyday furniture, subtly warm stone and wood tones with muted green details. Eye-level wide view, enough depth to distinguish shelves and table at thumbnail size. Avoid legible writing on books.
```

Archivo original del generador: `exec-f7176a37-801e-4cb4-a691-034dcfa88c67.png`.

### agua

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 crowdfunding campaign cover for Brotar, a Bolivian social, environmental and productive project demonstration. Generate one standalone landscape image, preferably 1536x864 or another 16:9 resolution, not a collage or a website mockup.
Style: photorealistic editorial illustration, natural believable materials, calm warm daylight, restrained forest greens, earth and neutral tones, soft contrast, everyday authenticity rather than glossy stock posing. Cohesive with a sustainable community website. The output will be clearly labeled AI-generated and illustrative by the website.
Composition: an immediately recognizable main subject, useful at a small thumbnail as well as a large cover, central crop-safe framing, keep important subjects away from all edges. No need for copy space.
Constraints: no added text, no typography, no numbers, no logos, no watermarks, no interface, no collage; no recognizable real individuals or claims to depict an actual organization or completed funded project. Respectful contemporary Bolivian context, no stereotypes or dramatic poverty imagery.
Scene: a small rural community water-collection setting inspired by the green valleys around Tarija, Bolivia. Main subject: a clean covered rainwater storage tank beside a modest tiled-roof building with a simple connected gutter, and a sturdy communal tap over a small masonry basin in the foreground. Softly distant cultivated hills and restrained green foliage. No people are needed. This is an illustrative concept of community water access, not a technical engineering diagram. Natural warm daylight, calm optimistic atmosphere, realistic unbranded materials, credible connected plumbing, no open unsafe drinking-water reservoirs and no visible claims or certifications.
```

Archivo original del generador: `exec-09b94016-bd79-4168-8d83-2bfd4c76d05f.png`.

### cacao

```text
Use case: photorealistic-natural.
Asset type: wide 16:9 crowdfunding campaign cover for Brotar, a Bolivian social, environmental and productive project demonstration. Generate one standalone landscape image, preferably 1536x864 or another 16:9 resolution, not a collage or a website mockup.
Style: photorealistic editorial illustration, natural believable materials, calm warm daylight, restrained forest greens, earth and neutral tones, soft contrast, everyday authenticity rather than glossy stock posing. Cohesive with a sustainable community website. The output will be clearly labeled AI-generated and illustrative by the website.
Composition: an immediately recognizable main subject, useful at a small thumbnail as well as a large cover, central crop-safe framing, keep important subjects away from all edges. No need for copy space.
Constraints: no added text, no typography, no numbers, no logos, no watermarks, no interface, no collage; no recognizable real individuals or claims to depict an actual organization or completed funded project. Respectful contemporary Bolivian context, no stereotypes or dramatic poverty imagery.
Scene: a lush lowland agroforestry plot inspired by Beni, Bolivia. Main subject: cacao pods in yellow, rust red and green growing naturally on the trunk and stout branches of a cacao tree, with a small woven harvest basket in the lower middle ground and mixed shade trees softly behind. Make the cacao pods unmistakable at thumbnail size while retaining the sense of a shaded productive forest. No people needed. Warm filtered tropical daylight, restrained rich greens and earth tones, botanical plausibility, realistic pod surfaces. No mountains, no coffee cherries, no commercial labels, no plantation industrial machinery.
```

Archivo original del generador: `exec-5a93c425-b72d-43ae-bc68-e194dd14ce8f.png`.
