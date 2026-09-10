# Brotar · Frontend público

Primera implementación del frontend público de Brotar y del acceso básico simulado. Cada equipo mantiene su versión independiente.

## Estado actual: fase 1

Proyecto configurado con React, TypeScript, Vite, React Router y Bun. Las nueve rutas muestran contenido **provisional** para comprobar la navegación. Todavía no representan las pantallas terminadas del Figma.

Incluido: TypeScript estricto, ESLint, rutas de navegador, ruta 404, estructura Feature-First, estilos base responsive y scripts de desarrollo y compilación.

Pendiente: logo y recursos oficiales, diseño definitivo, componentes de campaña, al menos seis campañas mock, búsqueda y filtros funcionales, detalle de campaña, formularios simulados y variantes de carga/vacío/error/éxito. La URL de detalle acepta un slug, pero la validación de campaña existente se incorporará con los mocks.

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
bun run build
bun run preview
```

`bun run check` ejecuta lint y build (incluido TypeScript). El resultado de build queda en `dist/`. La vista previa usa http://127.0.0.1:4173.

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

Para comprobar el parámetro de detalle en esta fase: `/proyectos/proyecto-demo`.

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
```

Cada feature conserva sus componentes, estilos y lógica propios. Solo lo utilizado por varias funcionalidades debe ir en `shared/`. Los datos mock estarán separados de las vistas para sustituirlos por una API posteriormente.

`PhasePlaceholder` y los enlaces de comprobación de la página inicial son temporales: se reemplazarán a medida que se implementen las pantallas reales.

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
