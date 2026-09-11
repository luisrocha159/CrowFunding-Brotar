# Brotar · Frontend público

Primera implementación del frontend público de Brotar y del acceso básico simulado. Cada equipo mantiene su versión independiente.

Repositorio de destino: [luisrocha159/CrowFunding-Brotar](https://github.com/luisrocha159/CrowFunding-Brotar).

Este código permite **abrir y demostrar la experiencia pública**, no ejecutar todavía todo el sistema Brotar. No requiere base de datos, servidor backend, cuentas reales, claves de API ni pagos.

## Documentación para el equipo

El repositorio reúne el código ejecutable, los documentos generales, el antecedente del Equipo 2 y los PDF de requisitos. Consulta el [índice de documentación](docs/README.md) para saber qué corresponde a cada etapa.

- [Product Backlog general en Word](docs/entregables/general/03_Product_Backlog_General_Brotar.docx): 64 elementos para el MVP completo.
- [Documento explicativo general en PDF](docs/entregables/general/04_Documento_Explicativo_General_Brotar.pdf): alcance, arquitectura, avance y decisiones pendientes.
- [Figma final unificado](https://www.figma.com/design/uHGCxK6bJk3JKba65HzDFu/CrownFundingV3?node-id=12-2574): guía visual del producto; requiere los permisos de acceso correspondientes.
- [Matriz de cumplimiento del frontend](docs/cumplimiento-frontend-publico.md): nueve pantallas y 39 variantes de la entrega simulada.

En GitHub, los PDF pueden abrirse en la vista del archivo. Para Word, pulsa **Download raw file / Descargar** y abre el `.docx` en Word o un editor compatible. No hace falta arrancar la aplicación para leer los documentos. Los PDF generales describen el proyecto completo; eso no significa que todo su backlog esté implementado.

## Inicio rápido

Con Git, Node.js 24 y Bun instalados, abre PowerShell o una terminal y ejecuta los comandos uno por uno:

```sh
git clone https://github.com/luisrocha159/CrowFunding-Brotar.git
cd CrowFunding-Brotar
bun install --frozen-lockfile
bun run dev
```

Después abre **http://127.0.0.1:5173/** en tu navegador. Mantén abierta la terminal mientras utilizas la aplicación; `Ctrl+C` detiene el servidor.

Los comandos de clonación estarán disponibles cuando se complete la primera subida al repositorio de destino. Si ya tienes la copia local del proyecto, no la clones otra vez: entra en la carpeta que contiene `package.json` y utiliza los dos comandos de Bun.

Para una primera instalación, consulta las instrucciones detalladas de abajo. No abras `index.html` haciendo doble clic y no uses Live Server: este proyecto necesita Vite para procesar React y TypeScript.

## Estado actual: fase 6 · Revisión de entrega

Proyecto configurado con React, TypeScript, Vite, React Router y Bun. Las seis pantallas públicas presentan contenido e interacciones con datos simulados. Las tres pantallas de acceso (inicio de sesión, registro y recuperación) ya incluyen formularios, validación local y respuestas simuladas.

Incluido: TypeScript estricto, ESLint, rutas de navegador, ruta 404, estructura Feature-First y scripts de desarrollo y compilación. La fase 2 incorpora el logo original, fuentes locales Poppins e Inter, tokens visuales, encabezado y pie compartidos, menú móvil y componentes reutilizables.

La fase 3 añadió seis campañas centralizadas y consultas locales. La fase 4 las conecta con portada, páginas informativas, catálogo, búsqueda y detalle. La fase 5 añade acceso simulado. La fase 6 contrasta las nueve pantallas y las 39 variantes mínimas con el PDF, optimiza los recursos locales y comprueba la entrega. Hay 51 pruebas automáticas de datos, validación, navegación, servicios simulados y recursos. Ver [matriz de cumplimiento](docs/cumplimiento-frontend-publico.md) para cada requisito y cómo probarlo; las notas de fases 4 y 5 conservan su contexto histórico.

Incluido: destacados, búsqueda por texto, filtros combinables con chips removibles, ordenamiento, dos páginas de tres campañas, detalle correcto por slug, actualizaciones y estados de campaña. Los filtros se conservan en la URL al recargar; el encabezado conduce a los resultados de búsqueda. El CTA de apoyo de una campaña activa lleva al acceso; las cerradas no admiten aportes.

Pendiente para compartir: completar la primera subida al repositorio del equipo con una cuenta autorizada. Pendiente de contenido: texto legal definitivo; solo se presenta una aceptación de demostración. Las seis campañas ya tienen portadas diferentes: reforestación conserva la referencia y las otras cinco utilizan imágenes generadas con IA a petición del usuario. Todas tienen versiones WebP optimizadas y avisos de uso ilustrativo. El logo oficial no se reemplazó. Ver [archivos y prompts de las portadas](docs/portadas-generadas.md). No es una réplica píxel a píxel del Figma ni una plataforma con operaciones reales.

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

- **Node.js 24 LTS:** versión 24.13.0 o posterior de la rama 24, conforme a `package.json`. La versión comprobada localmente es 24.13.0. Descarga una versión compatible desde [Node.js](https://nodejs.org/en/download).
- **Bun 1.4.2:** versión fijada en `packageManager` y utilizada en las verificaciones. Sigue la [instalación oficial de Bun](https://bun.com/docs/installation); su documentación también explica cómo instalar una versión concreta.
- **Git:** necesario para clonar y actualizar el repositorio; no es necesario si solo descargas el ZIP.
- Un navegador actualizado. Un editor como VS Code es opcional para ejecutar la muestra y útil para modificar el código.

En Windows, abre una terminal nueva después de instalar Node.js, Bun o Git para que se actualice el PATH. Comprueba su disponibilidad:

```sh
node --version
bun --version
git --version
```

No hace falta instalar PostgreSQL, Docker, NestJS, Figma ni servicios de pago para abrir esta entrega. La instalación inicial necesita conexión a Internet para descargar las dependencias; las campañas, imágenes y fuentes de la muestra son locales.

El gestor exclusivo del frontend es **Bun**. No utilizar npm, yarn ni pnpm para instalar dependencias aquí. Versionar `bun.lock`; no subir `node_modules` ni `dist`.

## Instalar y ejecutar

### 1. Obtener y abrir el proyecto

Puedes elegir una de estas dos opciones:

- **Clonar con Git:** usa `git clone` y `cd` del inicio rápido. La carpeta descargada se llama `CrowFunding-Brotar`.
- **Descargar ZIP:** en GitHub, selecciona **Code → Download ZIP**, descomprime todo y abre la carpeta extraída. En Windows puedes hacer clic derecho dentro de ella y elegir **Abrir en Terminal**. No ejecutes el proyecto dentro del archivo ZIP.

Si usas VS Code, selecciona **Archivo → Abrir carpeta** y después **Terminal → Nueva terminal**. En la raíz debes ver `package.json`, `bun.lock`, `index.html` y la carpeta `src`. La copia original local se llama `brotar-frontend`, pero la clonación usa el nombre del repositorio: lo importante es estar junto a `package.json`.

### 2. Instalar las dependencias

```sh
bun install --frozen-lockfile
```

Este comando instala las versiones registradas en `bun.lock` y crea `node_modules`. Espera a que termine sin errores. No borres el lockfile ni cambies de gestor para resolver una instalación fallida; revisa primero las versiones y el mensaje del error.

### 3. Arrancar y abrir la aplicación

```sh
bun run dev
```

Abre **http://127.0.0.1:5173/**. Debe aparecer la portada de Brotar con navegación y campañas destacadas. Si cambias el código, Vite actualiza el navegador durante el desarrollo.

El servidor usa un puerto fijo. Para cerrarlo, vuelve a la terminal y pulsa `Ctrl+C`. Para abrirlo otro día, entra en la misma carpeta y ejecuta `bun run dev`; no necesitas reinstalar dependencias cada vez.

La dirección `127.0.0.1` funciona únicamente en el equipo donde está ejecutándose el servidor. Subir código a GitHub no publica automáticamente una página web accesible para todos.

### 4. Recorrido sugerido para una presentación

1. Portada: comprobar logo, explicación y proyectos destacados.
2. **Cómo funciona** y **Para creadores**: revisar las páginas informativas.
3. **Explorar**: cambiar orden y página, abrir búsqueda y combinar filtros.
4. Detalle: abrir una campaña activa y revisar historia, financiamiento, impacto y novedades.
5. **Apoyar**: seguir al acceso simulado y utilizar **Usar datos de prueba**; no ingresar información personal real.
6. Registro y recuperación: probar validaciones, éxito y error mediante los controles de muestra.
7. Volver a explorar y mostrar una campaña finalizada, una cancelada y los estados vacíos o de error.

Los apartados **Probar el recorrido público** y **Probar el acceso simulado** explican cada escenario con más detalle.

## Verificar y compilar

Para ejecutar todas las comprobaciones de una vez:

```sh
bun run check
```

También puedes ejecutarlas por separado:

```sh
bun run typecheck
bun run lint
bun run test
bun run build
bun run preview
```

`bun run check` ejecuta lint, TypeScript (aplicación y pruebas), los tests con Bun y build. El resultado de build queda en `dist/`. La vista previa usa http://127.0.0.1:4173.

Para revisar solo la versión compilada, ejecuta `bun run build` y después `bun run preview`. Mantén la terminal abierta y visita **http://127.0.0.1:4173/**. La vista de componentes de desarrollo no se incluye en esa compilación. `preview` es una comprobación local, no un servicio de producción ni un despliegue público.

La última verificación documentada del frontend pasó con **51 pruebas**, además de lint, revisión de tipos y build. No equivale a pruebas de backend o pagos, que todavía no existen en esta entrega.

Se fija TypeScript 5.9.3 para mantener compatibilidad con las herramientas de lint seleccionadas; no actualizar las dependencias automáticamente sin ejecutar las comprobaciones.

## Problemas frecuentes

| Problema | Qué revisar |
| --- | --- |
| `bun`, `node` o `git` no se reconoce | Instalar la herramienta, cerrar y abrir la terminal y comprobar su versión. Para Bun, revisar el PATH según su documentación oficial. |
| No se encuentra `package.json` o el script `dev` | La terminal está en otra carpeta. Entrar en la raíz que contiene `package.json` y `bun.lock`. |
| Puerto 5173 ocupado | Puede haber otra ejecución de Brotar. Usar esa ventana o detener únicamente el servidor conocido con `Ctrl+C`. Como alternativa, ejecutar `bun run dev --port 5174` y abrir `http://127.0.0.1:5174/`. |
| No conecta con `127.0.0.1` | Confirmar que `bun run dev` sigue activo, que no terminó con error y que se abrió el puerto correcto. |
| Error de versión o de lockfile | Usar la rama Node 24 compatible y Bun 1.4.2. Ejecutar la instalación desde la raíz, conservar `bun.lock` y comprobar acceso a Internet. No sustituirlo con un lockfile de npm. |
| Pantalla vacía al abrir un archivo HTML | No usar `file://` ni doble clic sobre `index.html`; arrancar Vite o la vista previa compilada. |
| No hay carpeta `dist` al usar `preview` | Ejecutar primero `bun run build` y corregir cualquier error antes de previsualizar. |
| El ingreso no abre un panel o no llega el correo | Es el comportamiento previsto: autenticación y recuperación son simuladas; no hay cuentas ni correo reales. |
| Una campaña está vacía o muestra error | Revisar el selector de estados de la muestra y el parámetro `estado` de la URL; elegir Normal o Reintentar. |
| Una ruta da 404 al recargar después de desplegar | El hosting necesita fallback de SPA a `index.html`; subir archivos sin esa configuración no basta. |

## Actualizar una copia existente

Si clonaste el repositorio y no tienes cambios locales pendientes:

```sh
git pull --ff-only
bun install --frozen-lockfile
bun run dev
```

Si tienes cambios propios, revísalos primero con `git status` y coordina cómo conservarlos. No uses un reinicio forzado para actualizar ni reemplaces el trabajo de otro integrante.

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

El destino elegido es [luisrocha159/CrowFunding-Brotar](https://github.com/luisrocha159/CrowFunding-Brotar). La primera publicación del código está pendiente de autenticación con permisos de escritura. El nombre y correo del autor de Git no conceden acceso: la cuenta autenticada debe ser propietaria o colaboradora autorizada. No es necesario cambiar la cuenta global para todos los proyectos ni reescribir commits anteriores.

El repositorio de destino es público: solo deben incorporarse código y entregables aprobados para compartir, nunca tokens, contraseñas, documentos privados de identidad o datos reales de participantes. `node_modules`, `dist`, archivos `.env` reales y temporales están excluidos por `.gitignore`.

Para alojarlo como SPA, el hosting debe redirigir las rutas de frontend a `index.html` conservando los archivos estáticos. Así funcionará también recargar una ruta profunda. Vite ya resuelve esto durante desarrollo y vista previa.

No se necesitan variables de entorno en esta fase. No agregar credenciales ni archivos `.env` reales al repositorio.
