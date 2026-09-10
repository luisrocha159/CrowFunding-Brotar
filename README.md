# Brotar · Frontend público

Primera implementación del frontend público de Brotar y del acceso básico simulado. Cada equipo mantiene su versión independiente.

## Estado actual: fase 5

Proyecto configurado con React, TypeScript, Vite, React Router y Bun. Las seis pantallas públicas presentan contenido e interacciones con datos simulados. Las tres pantallas de acceso (inicio de sesión, registro y recuperación) ya incluyen formularios, validación local y respuestas simuladas.

Incluido: TypeScript estricto, ESLint, rutas de navegador, ruta 404, estructura Feature-First y scripts de desarrollo y compilación. La fase 2 incorpora el logo original, fuentes locales Poppins e Inter, tokens visuales, encabezado y pie compartidos, menú móvil y componentes reutilizables.

La fase 3 añadió seis campañas centralizadas y consultas locales. La fase 4 las conecta con portada, páginas informativas, catálogo, búsqueda y detalle. La fase 5 añade acceso simulado. Hay 46 pruebas automáticas de datos, validación, navegación y servicios simulados. Ver `docs/fase-4.md` y `docs/fase-5.md` para alcance, pruebas de navegador y limitaciones.

Incluido: destacados, búsqueda por texto, filtros combinables con chips removibles, ordenamiento, dos páginas de tres campañas, detalle correcto por slug, actualizaciones y estados de campaña. Los filtros se conservan en la URL al recargar; el encabezado conduce a los resultados de búsqueda. El CTA de apoyo de una campaña activa lleva al acceso; las cerradas no admiten aportes.

Pendiente: portadas específicas para cada campaña, optimización de imágenes y revisión final de entrega. Las campañas comparten temporalmente la fotografía ilustrativa local. El texto legal definitivo debe proporcionarlo el equipo responsable; solo se presenta una aceptación de demostración. No es una réplica píxel a píxel del Figma ni una plataforma con operaciones reales.

## Probar el recorrido público

1. Abrir `/` y entrar a Explorar proyectos.
2. Cambiar de página o entrar en Búsqueda y filtros. Buscar `POTOSI` para comprobar que se ignoran mayúsculas y tildes.
3. Combinar categoría, ubicación y modalidad; quitar filtros individualmente o limpiar todos.
4. Abrir una tarjeta y consultar historia, impacto, creador y actualizaciones.
5. En una campaña activa, Apoyar lleva al acceso simulado y permite volver al proyecto tras la confirmación. Las campañas de Tarija y Beni demuestran cierre y cancelación.

Al final de portada, catálogo, búsqueda y detalle, desplegar **Probar estados de la muestra**: normal, carga lenta, vacío o error. También se puede añadir `?estado=carga`, `?estado=vacio` o `?estado=error`. La carga normal dura 350 ms y la lenta 1,8 s. El reintento elimina el error de muestra y recupera los datos. Para repetir la carga lenta, volver a normal y seleccionar carga lenta nuevamente.

## Probar el acceso simulado

1. Abrir `/iniciar-sesion`, `/registro` o `/recuperar-contrasena`.
2. Enviar el formulario vacío para revisar campos obligatorios y foco en el primer error.
3. Desplegar **Probar esta pantalla** y pulsar **Usar datos de prueba**. En registro, aceptar las condiciones manualmente: el botón de prueba no las marca.
4. Elegir la respuesta simulada y enviar. Se muestran carga y bloqueo temporal, luego éxito o error. Cualquier formulario válido usa el resultado elegido: no se consulta ninguna cuenta ni se verifica una contraseña real.
5. En recuperación, elegir error y después **Reintentar solicitud**: la segunda solicitud muestra éxito simulado. No se envía correo.

Datos ficticios incluidos: `demo@example.com` y `Brotar2026!`. La regla de contraseña de registro (8 caracteres, mayúscula y número) es provisional para esta muestra, no una política definitiva. Las contraseñas se limpian tras una respuesta. Los formularios solo mantienen estado en memoria mientras la vista está montada; no escriben credenciales en almacenamiento, URL ni solicitudes de red.

El parámetro `continuar` conserva únicamente destinos públicos permitidos; registro e inicio de sesión también conservan el perfil de muestra. No abre paneles privados ni inicia pagos.

## Componentes y vista de desarrollo

Con `bun run dev`, abrir http://127.0.0.1:5173/?vista=componentes para probar la base visual. Es una vista interna, no una pantalla adicional del alcance: su código se excluye de la compilación de producción. Sus tarjetas ya consumen las campañas centralizadas de la fase 3 y muestran un aviso explícito de demostración.

| Componente | Responsabilidad |
| --- | --- |
| `Brand` | Logo original y nombre Brotar, con variante para fondo oscuro |
| `PublicLayout` | Encabezado, navegación responsive, búsqueda por URL y pie |
| `Button` / `ButtonLink` | Acciones y navegación; variantes, deshabilitado y carga |
| `FormField` | Input, select o textarea con etiqueta, ayuda y error asociado |
| `ProjectCard` | Presentación de campaña y estados activa/finalizada/cancelada |
| `Badge` / `ProgressBar` | Etiquetas semánticas y progreso accesible |
| `Message`, `EmptyState`, `ErrorState`, `ProjectCardSkeleton` | Información, éxito, vacío, error y carga |

Usar `ButtonLink` para cambiar de página y `Button` para acciones. La lógica de negocio y la validación corresponden a cada feature; `FormField` presenta el resultado. Las vistas consumen los tokens de `src/shared/styles/tokens.css` y no deben duplicar colores arbitrarios. Ver `docs/fase-2.md` para alcance y comprobaciones.

## Requisitos

- Node.js 24 LTS, versión 24.13.0 o posterior de la rama 24.
- Bun 1.4.2 (versión utilizada para este proyecto).
- Git.

Instala Bun siguiendo https://bun.com/docs/installation. En Windows, abre una terminal nueva después de instalarlo para que se actualice el PATH.

El gestor exclusivo del frontend es **Bun**. No utilizar npm, yarn ni pnpm para instalar dependencias aquí. Versionar `bun.lock`; no subir `node_modules` ni `dist`.

## Instalar y ejecutar

Desde la carpeta raíz de este repositorio:

```sh
bun install --frozen-lockfile
bun run dev
```

Abrir http://127.0.0.1:5173. El servidor usa un puerto fijo; si está ocupado, cerrar el proceso anterior o elegir otro puerto explícitamente. Detenerlo con Ctrl+C.

## Verificar y compilar

```sh
bun run typecheck
bun run lint
bun run test
bun run build
bun run preview
```

`bun run check` ejecuta lint, TypeScript (aplicación y pruebas), los tests con Bun y build. El resultado de build queda en `dist/`. La vista previa usa http://127.0.0.1:4173.

Se fija TypeScript 5.9.3 para mantener compatibilidad con las herramientas de lint seleccionadas; no actualizar las dependencias automáticamente sin ejecutar las comprobaciones.

## Rutas

| Pantalla | Dirección |
| --- | --- |
| Landing | `/` |
| Cómo funciona | `/como-funciona` |
| Para creadores | `/para-creadores` |
| Explorar proyectos | `/explorar` |
| Búsqueda y filtros | `/explorar/buscar` |
| Detalle público | `/proyectos/:slug` |
| Iniciar sesión | `/iniciar-sesion` |
| Crear cuenta | `/registro` |
| Recuperar contraseña | `/recuperar-contrasena` |
| Dirección inexistente | Cualquier ruta no definida muestra 404 |

Detalle de ejemplo: `/proyectos/reforestacion-chiquitana`. Un slug desconocido muestra una campaña no disponible con salida hacia Explorar.

## Organización

```text
src/
  app/                 # Aplicación y rutas
  features/
    public/
      home/
      how-it-works/
      for-creators/
      explore-projects/ # Listado y búsqueda comparten funcionalidad
      project-detail/
    access/
      login/
      register/
      recover-password/
  shared/
    components/
    layout/
    assets/
    styles/
    types/
  mocks/
    projects/
    access/
```

Cada feature conserva sus componentes, estilos y lógica propios. Solo lo utilizado por varias funcionalidades debe ir en `shared/`. Los datos mock están separados de las vistas para sustituirlos por una API posteriormente. Las consultas de búsqueda pertenecen a `features/public/explore-projects/projectQuery.ts`; los tipos y el cálculo compartido de progreso están en `shared/types` y `shared/utils`.

Las nueve pantallas del alcance ya tienen implementación; no quedan pantallas provisionales. Los formularios comparten presentación, validación y control de solicitudes dentro de `features/access`; el servicio simulado está en `mocks/access` y no recibe datos personales.

## Alcance de la etapa

Frontend estático interactivo con campañas simuladas, navegación, búsqueda, filtros, detalle público y formularios de acceso con validación local. El alcance final incluye estados de carga, vacío, error y éxito, así como diseño adaptable.

Quedan fuera backend, base de datos, autenticación o sesiones reales, paneles privados, KYC/KYB, checkout, pagos y operaciones financieras. Los destinos privados se representarán como puntos de conexión futuros.

## Referencias

- `Brotar_Definicion_Stack_Tecnologico_y_Arquitectura.pdf`.
- `Brotar_Tarea_Desarrollo_Frontend_Publico.pdf`.
- Figma final: https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574

El documento técnico define React + TypeScript + Bun y arquitectura por funcionalidades. El documento de tarea delimita la experiencia pública y el acceso; el Figma guía su presentación visual.

## Repositorio y despliegue

Este repositorio se inicializa localmente; todavía no tiene un remoto de GitHub ni está publicado. Antes de compartirlo, añadir el remoto del equipo y subir los commits.

Para alojarlo como SPA, el hosting debe redirigir las rutas de frontend a `index.html` conservando los archivos estáticos. Así funcionará también recargar una ruta profunda. Vite ya resuelve esto durante desarrollo y vista previa.

No se necesitan variables de entorno en esta fase. No agregar credenciales ni archivos `.env` reales al repositorio.
