# Matriz de cumplimiento · Frontend público de Brotar

Revisión: 10 de septiembre de 2026. Alcance: frontend provisional de experiencia pública y acceso; no el sistema completo ni el antiguo prototipo del creador del Equipo 2.

## Conclusión

Las nueve pantallas y las variantes funcionales mínimas solicitadas están implementadas con datos simulados. El código utiliza React, TypeScript y Bun, está separado por funcionalidades y no incorpora operaciones privadas reales. La comprobación combina lectura del código, tests automáticos y recorridos en navegador; no representa una certificación exhaustiva de accesibilidad o compatibilidad.

La entrega compartida requiere todavía un destino de repositorio del equipo: actualmente Git es local, sin remoto. Esto debe distinguirse de la funcionalidad del frontend. Las portadas distintas por campaña y el texto legal definitivo son pendientes de contenido; no se presentan como recursos oficiales ya recibidos ni impiden representar los estados de esta muestra.

Fuentes normativas:

- `Brotar_Tarea_Desarrollo_Frontend_Publico.pdf`, 8 páginas. Esta matriz usa su numeración impresa de secciones y el número de página del archivo.
- `Brotar_Definicion_Stack_Tecnologico_y_Arquitectura.pdf`, especialmente páginas 2–3 y 7–8, únicamente en lo aplicable al frontend.
- Figma CrownFundingV3 como guía visual, sin modificarlo. No se declara reproducción píxel a píxel.

## 1. Preparación, arquitectura y componentes

| Requisito explícito | Evidencia local | Resultado |
| --- | --- | --- |
| Repositorio independiente (tarea p. 2) | Repositorio Git propio `brotar-frontend`, historial por fases | Cumple localmente; remoto pendiente |
| Instalar y ejecutar sin errores; README con comandos (p. 2, 7) | `bun install --frozen-lockfile`, `bun run dev`, `bun run check`; ver acta de fase 6 | Verificación técnica documentada en fase 6 |
| No versionar temporales, dependencias ni credenciales (p. 2) | `.gitignore`: `node_modules`, `dist`, `tmp`, `.env`, logs; inspección de archivos versionados | Cumple en la revisión; no equivale a auditoría especializada de secretos |
| Commits descriptivos y trazabilidad (p. 2) | Historial de fases y cambios localizados | Cumple |
| React + TypeScript; props/modelos tipados (stack p. 2) | Componentes `.tsx`, tipos `Project`, `ProjectCardData`, formularios y consultas; TypeScript estricto | Cumple |
| Bun exclusivo y lockfile (stack p. 2) | `packageManager`, scripts y `bun.lock`; sin otros lockfiles | Cumple |
| Screaming Architecture (tarea p. 2; stack p. 3) | `app/routes`, `features/public`, `features/access`, `shared`, `mocks` | Cumple |
| No acoplarse a un backend inexistente (tarea p. 8) | Servicios simulados locales y modelos públicos; sin imports de backend | Cumple |

Los nueve componentes mínimos de la página 3 están cubiertos:

| Elemento requerido | Implementación reutilizada |
| --- | --- |
| Header / navegación pública | `shared/layout/PublicLayout.tsx` |
| Footer público | Mismo layout compartido por todas las rutas |
| Botones principales y secundarios | `Button` y `ButtonLink` |
| Tarjeta de proyecto | `ProjectCard` en portada, catálogo y búsqueda |
| Barra de progreso | `ProgressBar` en tarjetas y detalle |
| Categoría / estado / verificación | `Badge` |
| Campos de formulario | `FormField` y `PasswordField` |
| Mensajes de error, éxito e información | `Message`, `ErrorState`, `AccessSuccess` |
| Estados vacíos y carga | `EmptyState`, `ProjectCardSkeleton` |

## 2. Datos de ejemplo (tarea p. 3)

| Requisito | Implementación | Resultado |
| --- | --- | --- |
| Al menos seis campañas | Seis entradas en `mocks/projects/projects.ts` | Cumple |
| Categorías, ubicaciones y modalidades variadas | Cinco categorías, seis ubicaciones; donación, recompensa y preventa | Cumple |
| ID, nombre, resumen, categoría, ubicación, creador e imagen | `id`, `name`, `summary`, `category`, `location`, `creator`, `image` | Cumple |
| Meta, recaudación y porcentaje | `goal`, `raised`, porcentaje calculado por `getProgressPercentage` | Cumple; se calcula para evitar desajustes |
| Tipo, descripción, impacto y confianza | `campaignType`, `description`, `impact`, `trustSignals`, `verified` | Cumple |
| Separados de componentes | Datos en mocks; servicio y consultas separados de las vistas | Cumple |
| No duplicar información de campaña en cada pantalla | Tarjeta y detalle consumen el mismo objeto | Cumple |

Ejemplos comprobables: Reforestación (72 %), Huertos (40 %, sin actualizaciones), Textiles (105 %), Biblioteca (0 %, sin verificación), Agua (finalizada) y Cacao (cancelada). La barra se limita visualmente a 100 %, pero el porcentaje y monto reales del ejemplo se conservan.

Cada campaña tiene imagen; temporalmente comparten el recurso ilustrativo de referencia. El PDF no exige seis fotografías diferentes. Mejorarlas aumenta la calidad visual, no añade una funcionalidad requerida. Las fechas y los montos son una instantánea de demostración, no datos actuales de campañas reales.

## 3. Pantallas y contenido explícito

| Pantalla / referencia | Contenido solicitado y presente | Ruta y conexiones |
| --- | --- | --- |
| 01. Landing (p. 3) | Propuesta de valor, propósito del crowdfunding, impacto social/ambiental/productivo, tres destacados, CTA principales, header y footer | `/` → Explorar, Cómo funciona, Para creadores, acceso y registro desde Crear proyecto |
| 02. Cómo funciona (p. 3–4) | Descubrir, revisar campaña y confianza, apoyar, seguir avance, consultar resultados e impacto | `/como-funciona` → Explorar; CTA hacia rutas existentes |
| 03. Para creadores (p. 4) | Preparación, datos requeridos, verificación y revisión previa, donación/recompensa/preventa, acceso y registro | `/para-creadores` → `/registro?perfil=creador` y `/iniciar-sesion` |
| 04. Explorar (p. 4) | Tarjetas con imagen/nombre/categoría/creador/meta/avance, barra, acceso a búsqueda, ordenamiento, paginación | `/explorar` → búsqueda y detalle; dos páginas de tres campañas |
| 05. Búsqueda y filtros (p. 4–5) | Texto, categoría, ubicación, modalidad, filtros activos, quitar uno, limpiar todos, número de resultados | `/explorar/buscar` → detalle; filtros y página en URL |
| 06. Detalle (p. 5) | Nombre/portada/categoría/ubicación/resumen; historia/problema/solución; beneficiarios/impacto; meta/recaudación/progreso; modalidad; creador/confianza/verificación; actualizaciones; apoyar | `/proyectos/:slug` → inicio de sesión si la campaña permite apoyo |
| 07. Iniciar sesión (p. 6) | Correo, contraseña, ingreso, recuperar contraseña y registro; un solo acceso común | `/iniciar-sesion` → registro / recuperación / confirmación; no hay logins por rol |
| 08. Registro (p. 6) | Nombre/apellido/correo/contraseña/confirmación, perfil Usuario/Creador/Organización, aceptación y enlace a acceso | `/registro` → confirmación en la misma pantalla → acceso o recorrido público |
| 09. Recuperación (p. 6–7) | Correo, explicación, acción de envío simulada y regreso a acceso | `/recuperar-contrasena` → confirmación → inicio de sesión |

La aceptación del registro se exige mediante casilla y validación. Las condiciones visibles explican la demostración y señalan que el texto legal definitivo está pendiente. No se inventó una política jurídica ni se crean cuentas reales.

## 4. Variantes mínimas del PDF: 39 implementadas

Esta tabla registra presencia y forma de reproducir cada variante. No confundir las 39 variantes del documento con la cantidad de tests automáticos: una prueba puede cubrir varias reglas y otras verificaciones son manuales.

| Pantalla | Variante exigida | Cómo comprobarla |
| --- | --- | --- |
| Landing | Normal | `/`: contenido y tres destacados |
| Landing | Carga de destacados | `/?estado=carga`: tres skeletons, luego contenido |
| Landing | Sin destacados | `/?estado=vacio`: explicación, acceso a Explorar y navegación conservada |
| Landing | Error | `/?estado=error`: error simple, Reintentar e Ir a Explorar |
| Cómo funciona | Vista normal | Cinco pasos y CTA hacia rutas existentes |
| Para creadores | Vista normal | Información completa y CTA al acceso/registro |
| Explorar | Con resultados | Seis campañas distribuidas en dos páginas |
| Explorar | Cargando | `/explorar?estado=carga`: skeletons, sin falso vacío |
| Explorar | Sin campañas | `/explorar?estado=vacio`: explicación, restablecer o inicio |
| Explorar | Error de carga | `/explorar?estado=error`: Reintentar |
| Explorar | Más resultados | Siguiente/Anterior cambian tarjetas y página; conservan parámetros |
| Búsqueda | Sin filtros | `/explorar/buscar`: listado sin restricciones |
| Búsqueda | Filtros aplicados | Categoría + ubicación + tipo combinados; chips visibles |
| Búsqueda | Texto | Buscar `POTOSI`: Biblioteca de Potosí |
| Búsqueda | Sin resultados | Buscar `sincoincidencias987`: criterio y opciones para modificar/limpiar |
| Búsqueda | Filtro inválido / sin coincidencia | `?categoria=CategoriaInexistente`: aviso no técnico y vacío |
| Búsqueda | Restablecido | Limpiar filtros elimina texto/filtros y vuelve al listado general |
| Detalle | Activa | Reforestación o Huertos: información y enlace de apoyo al acceso |
| Detalle | Finalizada | `/proyectos/agua-segura-tarija`: cierre y aportes deshabilitados |
| Detalle | Cancelada / no disponible | `/proyectos/cacao-agroforestal-beni`: motivo y aportes deshabilitados |
| Detalle | Sin actualizaciones | Huertos o Biblioteca: Todavía no hay novedades |
| Detalle | Carga | `?estado=carga`: skeletons del contenido principal |
| Detalle | No encontrada / error | Slug inexistente o `?estado=error`: salida a Explorar; reintento en error |
| Acceso | Inicial | Campos vacíos, disponibles y sin errores |
| Acceso | Inválidos | Enviar vacío o correo inválido: errores locales y foco al campo |
| Acceso | Credenciales incorrectas | Elegir ese escenario: aviso general, correo conservado, contraseña vaciada |
| Acceso | Procesando | Envío válido: carga y controles deshabilitados; guardia contra duplicados |
| Acceso | Éxito simulado | Confirmación y salida al contenido público, sin sesión |
| Registro | Inicial | Campos disponibles y sin errores |
| Registro | Obligatorios incompletos | Enviar vacío: no confirma |
| Registro | Correo inválido | Formato incorrecto: error junto al campo, editable |
| Registro | Correo existente | Elegir Correo ya registrado: aviso y enlace a inicio de sesión |
| Registro | Contraseña inválida | Regla provisional visible; corregir y confirmar coincidencia |
| Registro | Términos no aceptados | Cargar datos y enviar sin marcar casilla: bloqueado con aviso |
| Registro | Éxito simulado | Datos válidos + aceptación + Registro correcto: confirmación y acceso |
| Recuperación | Inicial | Correo vacío disponible |
| Recuperación | Correo inválido | Enviar formato incorrecto: error, no procesa |
| Recuperación | Solicitud enviada | Formulario válido: confirmación explícitamente simulada; volver a acceso |
| Recuperación | Error de solicitud | Elegir error y enviar; Reintentar solicitud recupera el flujo |

Controles: las páginas dinámicas tienen **Probar estados de la muestra**; acceso tiene **Probar esta pantalla**, selección de resultado y **Usar datos de prueba**. Ningún resultado simulado comprueba cuentas reales. La regla de contraseña es provisional y está identificada como tal.

## 5. Comportamiento general y límites (p. 7–8)

| Criterio | Resultado |
| --- | --- |
| Rutas reales y navegación de principio a fin | Router con las nueve pantallas, seis slugs y 404 intencional para rutas desconocidas |
| Búsqueda y filtros sobre mocks | Implementados; combinación AND, normalización de texto y limpieza |
| Tarjetas abren el proyecto correcto | Slug por campaña y servicio común; comprobación de datos y recorrido |
| Estados visibles y probables | Controles de demo y tabla anterior |
| Validación frontend | Campos, correo, contraseña, confirmación y aceptación |
| Simular sin reglas definitivas | Avisos explícitos; sin cuentas, sesiones, dinero ni políticas de aprobación reales |
| Adaptación web | Nueve rutas comprobadas a 320 px; registro horizontal a 812 px y verificaciones de fases anteriores |
| Enlaces principales sin destinos rotos | Destinos públicos existentes; zonas privadas representadas como conexión futura, no enlaces a paneles inexistentes |
| Código compartido reutilizado | Layout, botones, tarjetas, formularios, progreso, feedback |
| No construir fuera del alcance | No hay backend/API, DB, autenticación/sesión real, panel creador/patrocinador/admin, KYC/KYB, checkout, pagos/proveedores, desembolsos, devoluciones o conciliación |

## 6. Qué falta y qué no falta

1. **Compartir el repositorio del equipo:** falta definir/configurar el remoto y dar acceso a los responsables. No se creó ni publicó uno externo sin elegir destino y permisos.
2. **Portadas específicas:** mejora visual pendiente de recursos; cada campaña ya tiene la imagen requerida. El conector Figma informa límite de consultas. No se fabricaron portadas supuestamente oficiales.
3. **Texto legal definitivo:** pendiente del responsable; la casilla, bloqueo y aviso de demostración funcionan. No hace falta inventar términos para demostrar el formulario.
4. **No falta desarrollar backend ni paneles privados para esta entrega:** el PDF los excluye expresamente.

La documentación y los PDFs del antiguo diseño del creador no deben confundirse con esta nueva entrega frontend pública. No se modificaron esos entregables anteriores.
