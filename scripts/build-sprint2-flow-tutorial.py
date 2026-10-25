"""Tutorial de ensayo manual; reutiliza el diseño de las guías sin regenerarlas."""
from pathlib import Path
import runpy

layout = runpy.run_path(str(Path(__file__).with_name('build-sprint2-pdfs.py')))
build, p, section, steps, table, Spacer, ROOT = (
    layout[name] for name in ['build', 'p', 'section', 'steps', 'table', 'Spacer', 'ROOT']
)


def context(actor, start, end):
    return [p(f'Cuenta: {actor}', 'small'), p(f'Inicio: {start}\nFinal esperado: {end}', 'small')]


def check(text):
    return section('Punto de comprobación', text)


def pages():
    out = []
    out.append([
        Spacer(1, 24), p('BROTAR', 'title'),
        p('Tutorial de flujos\nSprint 2, de inicio a fin', 'h1'),
        p('Guía práctica para Ricardo, Alison y Santiago. Corte del código local: 5 de octubre de 2026, rama RicardoDev. No presupone que este incremento ya esté publicado en DEV.'),
        *section('Cómo usar este documento', 'Sigue primero la preparación y después los flujos F1 a F7 en orden. Los botones citados corresponden al código actual. Cada recorrido indica cuenta, condición inicial, acción y resultado esperado. Lee la comprobación antes de continuar: una pantalla sin error no demuestra por sí sola que algo se haya guardado.'),
        table([['Lectura', 'Páginas'], ['Abrir el entorno / instalación opcional', '2-3'], ['Cuentas, campañas y datos de ensayo', '4'], ['F1. Construir y recuperar una campaña', '5-9'], ['F2. Revisar faltantes y enviar', '10'], ['F3. Solicitar cambios, corregir y reenviar', '11-12'], ['F4. Aprobar y publicar por separado', '13'], ['F5. Consulta pública sin sesión', '14'], ['F6. Rechazar otra campaña', '15'], ['F7. Cancelar y confirmar descarte', '16'], ['Variantes, errores y cierre del ensayo', '17-19']], [377, 122]),
        p('Esta es una guía de ejecución, no el acta de un nuevo ensayo interactivo. La revisión automatizada previa aprobó 276 pruebas; el ensayo adicional por navegador quedó bloqueado. Registra aquí lo que tú observes, sin marcarlo aprobado por suposición.', 'small'),
    ])
    out.append([p('Preparación A | Abrir una V2 existente', 'h1'),
        *context('Operador del equipo local; todavía sin iniciar sesión web', 'Proyecto y V2 ya instalados', 'Frontend, API y PostgreSQL disponibles'),
        *steps([
            'Abre la copia local que contiene el incremento Sprint 2. En esta máquina es brotar-frontend, dentro de CROUDWFUNDING. No cambies de rama con trabajo sin guardar y no hagas git pull como requisito para este ensayo local.',
            'Abre Docker Desktop. Desde una terminal PowerShell, ejecuta docker version: debe responder también la sección Server. Si no responde, detente; no borres volúmenes ni restaures nuevamente el SQL.',
            'Desde la raíz del proyecto ejecuta el comando de PostgreSQL mostrado debajo. Espera el estado saludable antes de iniciar la API.',
        ]),
        p('docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml up -d --wait', 'code'),
        p('En esa terminal entra a backend. Si acabas de incorporar este incremento, ejecuta en orden los comandos siguientes; si ya lo preparaste, basta arrancar la API.'),
        *[p(c, 'code') for c in ['cd backend', 'pnpm run build', 'node scripts/migrate.mjs up', 'node scripts/prepare-sprint2.mjs', 'node scripts/verify-provisional-v2.mjs']],
        p('Revisa localmente backend/.env: la publicación provisional requiere CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true. No muestres ni compartas las credenciales. Si editas configuración, reinicia la API. Esa bandera no concede ADMIN.'),
        *[p(c, 'code') for c in ['# Terminal de backend', 'pnpm run dev', '# Otra terminal, desde la raíz', 'bun run dev']],
        *check('Abre http://127.0.0.1:5173. Comprueba http://127.0.0.1:3000/api/health/ready y la misma ruta a través de 5173: deben responder 200. /health/live solo acredita que el proceso está vivo. Mantén ambas terminales abiertas.'),
        p('Configuración normal: API en Windows -> 127.0.0.1:15433 -> PostgreSQL del contenedor, base brotar_db, rol limitado brotar_app. No uses el puerto 5432 de un PostgreSQL instalado en Windows. Las versiones se consultan en README: Node 24, Bun 1.4.2 y pnpm 11.19.0.', 'small'),
    ])
    out.append([p('Preparación B | Solo si es instalación nueva', 'h1'),
        p('Si ya abriste el entorno de la página 2, omite esta página. No restaura datos ni configura cuentas este PDF: los pasos deben ejecutarlos tú o el responsable en una copia de ensayo.'),
        *steps([
            'Obtén una copia del incremento Sprint 2 autorizada por el equipo. El corte de este tutorial sigue local en RicardoDev; clonar DEV no garantiza que lo incluya. Identifica la raíz que contiene bun.lock y backend.',
            'Con Docker disponible y las versiones del README, instala las dependencias. No cambies el lockfile para acomodar un pnpm global distinto.',
        ]),
        *[p(c, 'code') for c in ['# Desde la raíz', 'bun install --frozen-lockfile', 'cd backend', 'pnpm install --frozen-lockfile']],
        p('Desde backend, ejecutar uno a uno y detenerse si cualquiera falla:'),
        *[p(c, 'code') for c in ['node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql', 'pnpm run check', 'node scripts/migrate.mjs up', 'node scripts/prepare-sprint2.mjs', 'node scripts/migrate.mjs status', 'node scripts/verify-provisional-v2.mjs', 'node scripts/adopt-provisional-v2.mjs activate', 'pnpm run dev']],
        p('En otra terminal desde la raíz: bun run dev. Después realiza las comprobaciones de salud de la página 2. Si pnpm tiene una versión distinta, usa la alternativa fijada en el README: bun x --package pnpm@11.19.0 pnpm en lugar de pnpm.'),
        *section('Qué hace la instalación', 'Usa infra/postgres-v2, restaura la estructura oficial solamente sobre un esquema vacío y genera credenciales locales. Las migraciones vienen después de la línea base: no crean las tablas oficiales ausentes. activate instala la configuración candidata en backend/.env con respaldo del archivo previo.'),
        *section('Qué no hacer', 'No copiar .env.example encima del .env generado, no cambiar al puerto 5432, no editar el SQL oficial ni aplicar un backup sobre una base poblada. No usar down -v ni Factory Reset. Si falta app_user/user_profile o falla brotar_app, seguir el diagnóstico del README antes de evaluar los formularios.'),
        p('Para esta entrega la publicación administrativa es provisional. Comprobar la bandera en backend/.env y reiniciar la API si se modifica. Crear la base y sus permisos técnicos no asigna roles de negocio a personas.', 'small'),
    ])
    out.append([p('Preparación C | Cuentas y datos ficticios', 'h1'),
        table([['Perspectiva', 'Condición y uso'], ['Creador A', 'Cuenta autorizada con REGISTERED_USER y CREATOR vigentes. Construye, lista sus proyectos y envía.'], ['Administrador', 'Cuenta distinta con ADMIN vigente. Consulta la cola, decide y publica.'], ['Visitante', 'Ventana privada o navegador sin sesión. Comprueba lo visible públicamente.'], ['Cuenta B básica', 'Opcional: cuenta ajena para comprobar aislamiento; no requiere ADMIN.']], [120, 379]),
        *steps([
            'En la sesión normal abre /iniciar-sesion, usa la cuenta Creador A y entra en /mi-cuenta. Despliega Opciones para iniciativas y permisos y comprueba Permisos vigentes.',
            'Si falta CREATOR, no puedes asumirlo por haber elegido un perfil en el registro. Solicita una cuenta de ensayo autorizada; no elimines las restricciones. Un usuario básico puede iniciar un borrador, pero no equivale a tener permiso de envío ni de Mis proyectos.',
            'Usa ventanas independientes para creador y administrador, o cierra sesión desde Mi cuenta antes de cambiar. Dos pestañas del mismo navegador normal comparten sesión. La ventana privada se reserva para visitante.',
        ]),
        table([['Campaña', 'Título de ejemplo / finalidad'], ['A: principal', 'Huerto de cañahua - ensayo S2 A. Se corrige, aprueba y publica.'], ['B: rechazo', 'Huerto de cañahua - ensayo S2 B. Debe completarse y enviarse antes de rechazar.'], ['C: descarte', 'Borrador desechable S2 C. Se queda en DRAFT; nunca se envía.']], [120, 379]),
        p('No existe un botón de duplicar documentado para este recorrido: B se crea nuevamente repitiendo F1-F2. Usa títulos distintos por cada ensayo y anota la URL/UUID de A al abrir su detalle. No escribas literalmente :id o <UUID> en una URL.'),
        *section('Datos comunes', 'Localidad: Cochabamba. País: BO. Actividad: Plantación de cañahua. Responsable: Ana Muñoz. Fechas: 01/11/2026 a 10/11/2026. Meta: 1000. Duración: 30. Recompensa: 10 de aporte mínimo, 20 de disponibilidad y entrega 01/01/2027. Si ejecutas en otra fecha, ajusta todas las fechas coherentemente.'),
        p('Son datos ficticios para estudio, no una promesa de una campaña real. Prepara una imagen PNG/JPG/WebP hasta 2 MB, propia o autorizada y sin datos sensibles. No uses documentos de identidad como portada.', 'small'),
    ])
    out.append([p('F1.1 | Crear borrador e información general', 'h1'),
        *context('Creador A', 'Sesión iniciada; ninguna campaña seleccionada', 'A creada en DRAFT y datos generales guardados'),
        *steps([
            'Desde Mi cuenta -> Opciones para iniciativas y permisos -> Ver mis borradores, abre /crear-campana. Si ya hay una campaña abierta, sal a /mi-cuenta y vuelve a Ver mis borradores sin el parámetro borrador para encontrar Nuevo borrador.',
            'En Nombre de la campaña escribe Huerto de cañahua - ensayo S2 A. En Resumen corto escribe: Preparación de un huerto comunitario de cañahua para veinte familias de Cochabamba.',
            'En Modalidad elige Recompensa. Pulsa Crear borrador una vez. Espera Avance guardado y comprueba que la campaña aparezca en Borradores guardados.',
            'En el paso Modalidad verifica que indique que usa recompensas. Pulsa Siguiente: debe abrir Información general. Crear el borrador no lo envía ni lo publica.',
            'Comprueba título y resumen. En Categoría selecciona una opción activa disponible que encaje con el ensayo; anota el nombre exacto para el filtro público posterior. No depende de que exista una etiqueta concreta.',
            'En País (código de dos letras) escribe BO; en Localidad, Cochabamba. Dirección y Referencia pueden quedar vacías; si las completas, usa datos ficticios.',
            'Pulsa Guardar información general. Espera Avance guardado y después pulsa Siguiente para abrir Historia e impacto.',
        ]),
        *check('Estado Borrador, nombre correcto, resumen, categoría, BO y Cochabamba guardados. El UUID identifica A: los otros flujos deben usar esa campaña, no una parecida.'),
        *section('Si no te deja avanzar', 'Lee el mensaje junto al campo: título/resumen/categoría/país son necesarios aquí. Si el catálogo no tiene categorías activas, es configuración pendiente y no un error de escritura tuyo. No intentes inventar una categoría mediante la consola.'),
        p('Límites visibles: nombre 200, resumen 500, localidad 160 y dirección/referencia 500 caracteres. Los números son válidos en títulos de campaña; esto no tiene la misma regla que un nombre personal.', 'small'),
    ])
    out.append([p('F1.2 | Historia, indicador y portada', 'h1'),
        *context('Creador A', 'A en Historia e impacto', 'Contenido e imagen guardados; siguiente paso Plan y presupuesto'),
        table([['Campo', 'Texto de ejemplo'], ['Problema', 'Veinte familias carecen de un espacio comunitario para cultivar alimentos.'], ['Solución', 'Preparar un huerto de cañahua con capacitación y acompañamiento vecinal.'], ['Beneficiarios', 'Veinte familias de Cochabamba participantes del ensayo.'], ['Resultados esperados', 'Instalar el huerto y capacitar a veinte familias; son metas, no resultados ya logrados.']], [135, 364]),
        *steps([
            'Completa los cuatro textos de la tabla. Pulsa Añadir indicador: en Nombre escribe Familias capacitadas, en Unidad familias y en Meta esperada 20. Basta un indicador para este recorrido.',
            'Pulsa Guardar historia e impacto. Espera Avance guardado; pulsa Siguiente para llegar a Portada.',
            'Pulsa Seleccionar portada y elige la imagen autorizada que preparaste. Debe ser PNG, JPG o WebP hasta 2 MB. La selección muestra una vista previa; eso todavía no acredita guardado.',
            'En Texto alternativo de la portada escribe: Huerto comunitario de cañahua preparado para la actividad vecinal. Debe describir la imagen y tener entre 10 y 180 caracteres.',
            'Pulsa Guardar portada. Espera la confirmación del editor y comprueba que siga mostrando la imagen. Si ya hay una portada guardada, el botón será Reemplazar portada.',
            'Solo después del guardado pulsa Siguiente. Debe abrir Plan y presupuesto. Si faltó la portada, el último paso seguirá marcándola como pendiente.',
        ]),
        *check('La imagen vuelve a verse al recuperar la campaña; los cuatro textos y el indicador se mantienen. Meta esperada no significa resultado ejecutado, y guardar portada no publica la campaña.'),
        p('Importante: el archivo de portada se almacena con visibilidad pública incluso mientras la campaña es borrador. El catálogo no lista el borrador, pero esto no convierte su imagen en un documento privado. No cargar información sensible.', 'small'),
    ])
    out.append([p('F1.3 | Actividades, hito, presupuesto y riesgo', 'h1'),
        *context('Creador A', 'A en Plan y presupuesto', 'Los dos bloques del paso guardados'),
        *steps([
            'En Actividades e hitos pulsa Añadir actividad. Actividad: Plantación de cañahua. Responsable: Ana Muñoz. Inicio previsto: 01/11/2026. Fin previsto: 10/11/2026. Usa el calendario del campo si tu navegador presenta otro formato.',
            'Pulsa Añadir hito. Hito: Primera jornada terminada. Responsable: Ana Muñoz. Actividad relacionada: Plantación de cañahua. Inicio previsto y Fin previsto: 10/11/2026.',
            'Pulsa Guardar planificación. Espera Sección guardada. Esto confirma actividades/hitos, no el presupuesto que aparece debajo.',
            'En Presupuesto y riesgos pulsa Añadir partida. Categoría de gasto: elige una activa del catálogo. Descripción: Semillas y materiales del huerto. Cantidad: 2. Precio unitario: 500. Importe planificado: 1000. Notas (opcional): Cotización ficticia utilizada para la demostración.',
            'Pulsa Añadir riesgo. Riesgo: Retraso de materiales. Descripción: El proveedor podría demorar la entrega. Probabilidad: Media. Impacto: Medio. Mitigación: Contar con un proveedor alternativo.',
            'Pulsa Guardar presupuesto y riesgos. Espera Sección guardada. El total de este ejemplo debe ser 1000.00; no supone pago ni dinero recaudado.',
            'Si ves Cambios sin guardar o Siguiente está deshabilitado, revisa cuál de los dos bloques modificaste y guárdalo. Cuando ambos estén guardados, pulsa Siguiente.',
        ]),
        *check('Una actividad, un hito vinculado, una partida y un riesgo. No confundir el mensaje del primer guardado con confirmación de ambos bloques. Mantén las fechas coherentes; fin no puede anteceder al inicio.'),
        *section('Prueba corta adicional, antes de continuar', 'Deja vacío el responsable e intenta Guardar planificación: debe señalar el campo. Repón Ana Muñoz y guarda. En la partida prueba importe -1 y guarda: debe rechazarlo. Repón 1000 y guarda; los errores deben desaparecer. No dejes datos inválidos para el envío.'),
    ])
    out.append([p('F1.4 | Financiamiento y recompensas', 'h1'),
        *context('Creador A', 'Plan/presupuesto guardados', 'Financiación y recompensa guardadas; revisión final abierta'),
        table([['Financiamiento', 'Valor del ensayo'], ['Meta', '1000'], ['Moneda', 'BOB si aparece activa; si no, elegir otra activa y anotar cuál'], ['Duración (días)', '30'], ['Modelo', 'Flexible'], ['Fecha de inicio / fin', 'Dejar ambas vacías para este ensayo']], [210, 289]),
        *steps([
            'Completa los campos de la tabla y pulsa Guardar financiamiento. Espera Sección guardada. Las fechas son opcionales, pero si eliges una tienes que completar la otra con fin posterior al inicio.',
            'Pulsa Siguiente. En Recompensas pulsa Añadir recompensa. Título: Planta de cañahua. Descripción: Una planta preparada como reconocimiento por apoyar la iniciativa.',
            'En Tipo escribe REWARD; en Aporte mínimo, 10; en Disponibilidad, 20; en Entrega estimada, 01/01/2027. El campo Tipo es texto en esta interfaz: no esperes un menú inexistente.',
            'Pulsa Guardar recompensas. Espera Sección guardada. Después pulsa Siguiente para abrir Revisión y envío.',
        ]),
        *check('Se muestran meta 1000, moneda seleccionada, 30 días, modelo Flexible y la recompensa. Disponibilidad vacía significa sin límite; 0 no significa lo mismo. El importe mínimo se interpreta en la moneda guardada.'),
        *section('Qué explicar mientras lo demuestras', 'Recompensa configura una contraprestación, no una venta real. Todo o nada y Flexible son modelos disponibles, pero aquí no se procesa dinero. No hay checkout ni aportes funcionando en esta fase. El presupuesto y la meta pueden diferir: se informa la diferencia, no se impone una igualdad comercial inventada.'),
        p('No cambies de moneda después de cargar recompensas como parte del recorrido principal: existen controles para evitar importes incoherentes. Si el catálogo está vacío o el guardado falla, corrige la configuración antes de intentar el envío.', 'small'),
    ])
    out.append([p('F1.5 | Salir y recuperar exactamente A', 'h1'),
        *context('Creador A', 'A completa, todavía DRAFT; no pulsar Enviar aún', 'Datos y posición recuperados'),
        *steps([
            'En Revisión y envío lee el resumen y compara: título A, Cochabamba, indicador 20, actividad/hito, partida 1000, riesgo, meta y recompensa. Esta vista lee datos guardados, no solo lo que acabas de escribir.',
            'Ve a /mis-proyectos usando su acceso o escribiendo la ruta. Busca A y pulsa Ver detalle. Copia o anota su URL para localizarla después; no anotes tokens ni secretos.',
            'Pulsa Continuar borrador: debe abrir /crear-campana?borrador= seguido del UUID de A. Comprueba que sea A y no B/C.',
            'Ve a /mi-cuenta y pulsa Cerrar sesión. Espera el cambio a la pantalla de acceso. Inicia sesión otra vez con la misma cuenta.',
            'Vuelve a Mis proyectos -> A -> Continuar borrador. Debe recuperar el avance. En Revisión y envío compara de nuevo los datos. No necesitas restaurar la base para continuar.',
            'Opcional, para demostrar persistencia sin Docker Reset: detén solo la terminal de API con Ctrl+C, vuelve a ejecutar pnpm run dev desde backend, comprueba ready y recarga A. Conserva los datos y vuelve a revisión.',
        ]),
        *check('El estado sigue Borrador y no aparece en Explorar. Los datos reaparecen después de salir/volver y, si lo probaste, de reiniciar la API. Enviar se hará expresamente en F2.'),
        *section('Cómo distinguir guardado y posición', 'Avance guardado confirma la operación del constructor; Sección guardada confirma el bloque de secciones. Al cambiar de paso se guarda la posición. No cierres la página mientras diga Guardando ni interpretes una vista previa de imagen como una respuesta del servidor.'),
        p('Si una petición perdió su respuesta, puede existir escritura aunque no hayas visto confirmación. Recupera A y consulta lo guardado antes de repetir decisiones. No declares persistencia tras reiniciar Docker si solo reiniciaste la API.', 'small'),
    ])
    out.append([p('F2 | Faltantes, revisión final y envío', 'h1'),
        *context('Creador A', 'A completa y editable en DRAFT', 'IN_REVIEW; envío real, edición bloqueada'),
        *steps([
            'Abre A -> Continuar borrador -> Revisión y envío. Para demostrar un faltante de forma controlada, vuelve con Anterior a Historia e impacto, vacía temporalmente Resultados esperados y pulsa Guardar historia e impacto. Es un borrador: puede guardar información parcial.',
            'Avanza con Siguiente hasta Revisión y envío, sin modificar otros datos. Debe aparecer Falta completar con Resultados esperados y un botón Ir al paso correspondiente. Enviar a revisión debe quedar deshabilitado.',
            'Pulsa el Ir al paso del faltante. Repón el texto de la página 6, guarda y vuelve al último paso. La lista de faltantes debe desaparecer; si quedan otros, usa sus enlaces y completa cada uno.',
            'Comprueba datos guardados, portada, al menos un indicador, una actividad, una partida, financiación completa y al menos una recompensa para esta modalidad. Hitos y riesgos se incluyen en el ensayo, pero no se afirma que sean requisitos universales de envío.',
            'Pulsa Enviar a revisión una sola vez. Espera Enviando y luego Campaña recibida: Tu campaña está pendiente de revisión. Esta acción no tiene el diálogo de confirmación administrativa; el clic del botón realiza el envío.',
            'Abre Mis proyectos y el detalle de A. Debe figurar En revisión. Si vuelves al constructor, debe estar en consulta y no admitir edición en este estado.',
            'En la ventana visitante abre /explorar y busca el título de A: todavía no debe verse. El administrador la encontrará en F3, no el visitante.',
        ]),
        *check('Transición DRAFT -> IN_REVIEW y primera ronda pendiente, sin publicación. No intentes completar F3 con la misma sesión si no es ADMIN: cambia de cuenta.'),
        p('Si indica que tu cuenta necesita el rol Creador, es falta de permiso y no falta de texto. Si indica que el estado cambió, actualiza antes de reintentar. Guarda la URL de A y una captura de su estado sin credenciales.', 'small'),
    ])
    out.append([p('F3.1 | Administrador solicita cambios', 'h1'),
        *context('Administrador autorizado', 'A en IN_REVIEW, ronda pendiente', 'CHANGES_REQUESTED con motivo y observación'),
        *steps([
            'Cierra la sesión del creador si compartirás navegador. Inicia sesión con ADMIN y abre Mi cuenta -> Opciones para iniciativas y permisos -> Revisión de campañas, o /administracion/campanas.',
            'En Buscar campaña o creador escribe parte del título de A. En su fila pulsa Revisar campaña. Comprueba el título antes de actuar.',
            'Recorre el expediente completo: general, historia, indicador, portada, planificación, presupuesto/riesgos, financiación y recompensas. Busca Rondas de revisión y anota la ronda actual; para la primera presentación debería ser 1.',
            'En Decidir, selecciona Solicitar cambios en Decisión. En Comentario escribe: Precisar cómo se comprobará la capacitación de las veinte familias. El comentario es obligatorio para solicitar cambios.',
            'Pulsa Añadir observación. En Sección selecciona Historia e impacto. En Cambio solicitado escribe: Indicar que se usará una lista de asistencia para comprobar la meta de capacitación. La observación por sección es opcional, pero se añade aquí para demostrar el enlace de corrección.',
            'Pulsa Solicitar cambios. En Confirmar solicitar cambios revisa título y ronda. Puedes probar Cancelar una vez: no debe cambiar el estado. Repite y pulsa Confirmar operación.',
            'Espera Decisión guardada: Cambios solicitados. Comprueba ronda, comentario y observación en el expediente. Usa Actualizar revisión si necesitas recuperar el resultado; no hagas otra decisión a ciegas.',
        ]),
        *check('IN_REVIEW -> CHANGES_REQUESTED. El motivo debe quedar asociado a la ronda y disponible al creador. No debe estar publicada ni permitir otra decisión sobre esa misma ronda ya resuelta.'),
        *section('Si algo difiere', 'Si la cola no tiene A, comprueba que F2 terminó realmente y que usas la misma base. Si el estado/ronda cambió, pulsa Actualizar revisión. Si falta ADMIN, no hay permiso; la bandera de publicación no lo reemplaza. Una lista vacía no significa que un fallo de API esté resuelto.'),
    ])
    out.append([p('F3.2 | Creador corrige y reenvía', 'h1'),
        *context('Creador A, propietario', 'A en CHANGES_REQUESTED', 'IN_REVIEW en una nueva ronda, conservando la anterior'),
        *steps([
            'Cierra sesión administrativa o vuelve a la ventana del creador. Comprueba la identidad en Mi cuenta antes de editar.',
            'Abre /mis-proyectos. En A debe aparecer Cambios solicitados. Pulsa Corregir campaña; desde el detalle también puede aparecer Corregir y reenviar campaña.',
            'En el constructor, ve a Revisión y envío. Lee Cambios solicitados y la observación. Pulsa Corregir sección junto a la observación: debe llevarte a Historia e impacto.',
            'En Resultados esperados conserva la meta y añade: Se comprobará la capacitación mediante una lista de asistencia de las veinte familias. Pulsa Guardar historia e impacto y espera Avance guardado.',
            'Regresa con Siguiente hasta Revisión y envío. Comprueba el texto corregido y que no queden faltantes. La corrección se guarda, pero todavía no equivale a reenvío.',
            'Pulsa Reenviar a revisión una sola vez. Espera Campaña recibida. En Mis proyectos A vuelve a En revisión; ya no debe admitir edición mientras se evalúa.',
            'Vuelve como ADMIN a la cola, abre A y revisa Rondas de revisión. Debe aparecer una nueva ronda pendiente, normalmente 2, y conservarse la ronda 1 con su solicitud de cambios. Comprueba el nuevo texto.',
        ]),
        *check('CHANGES_REQUESTED -> IN_REVIEW. El reenvío crea una ronda nueva, no borra ni reemplaza la decisión histórica. Desde aquí continuarás con F4 usando el administrador.'),
        *section('Qué guardar como evidencia', 'Una captura del motivo/observación, otra del texto corregido y una del historial de rondas. Anota resultado esperado y observado. No confundas guardar una sección con pulsar Reenviar a revisión.'),
        p('El creador no elige la aprobación ni la publicación desde este formulario. Conocer el UUID de otra campaña no concede propiedad ni acceso para corregirla.', 'small'),
    ])
    out.append([p('F4 | Aprobar primero, publicar después', 'h1'),
        *context('Administrador; visitante para contrastar', 'A nuevamente IN_REVIEW y completa', 'APPROVED privada; después PUBLISHED visible'),
        *steps([
            'Como ADMIN abre A desde Revisión de campañas y pulsa Actualizar revisión si conservabas un expediente anterior. Comprueba la ronda nueva y la corrección del creador.',
            'En Decisión selecciona Aprobar. Comentario es opcional; puedes escribir: Corrección revisada en el ensayo. Pulsa Aprobar, revisa la confirmación y pulsa Confirmar operación.',
            'Espera Decisión guardada: Aprobada. Debe quedar APPROVED, no PUBLISHED. En la ventana visitante limpia filtros y busca A en Explorar: todavía no debe aparecer.',
            'De vuelta como ADMIN, abre la cola: A aprobada debe seguir disponible para la publicación pendiente. Entra a su detalle y localiza Publicación.',
            'Si aparece Publicación deshabilitada, detente y verifica CAMPAIGN_ADMIN_PUBLICATION_ENABLED=true en la configuración local; reinicia la API. No modifiques estados en SQL ni elimines permisos.',
            'Pulsa Publicar campaña. En Confirmar publicación pública comprueba título y ronda. Pulsa Cancelar una vez para demostrar que no publica; repite y pulsa Confirmar operación.',
            'Espera Campaña publicada: ya está disponible para visitantes. En el expediente aparece Ver campaña pública. A puede salir de la cola porque ya no está pendiente; el creador la conserva en Mis proyectos.',
            'Abre el enlace público o úsalo en la ventana visitante. Continúa F5 para comprobar catálogo, filtros y detalle sin sesión.',
        ]),
        *check('IN_REVIEW -> APPROVED -> PUBLISHED son dos operaciones distintas. Aprobación sola no expone la campaña. El historial debe reflejar las transiciones sin simularlas mediante SQL.'),
        p('D05 autoriza provisionalmente publicar solo a ADMIN. Es una política de esta entrega, no una regla definitiva confirmada para todo el producto. Si una respuesta es incierta, actualiza antes de repetir; una doble publicación no debe duplicar el historial.', 'small'),
    ])
    out.append([p('F5 | Visitante: catálogo, filtros y detalle', 'h1'),
        *context('Sin sesión; ventana privada independiente', 'A PUBLISHED', 'A encontrada y consultada mediante datos reales'),
        *steps([
            'Abre http://127.0.0.1:5173/explorar sin iniciar sesión. Espera el listado real. Si estaba abierto antes de publicar, recarga. No debe rellenarse con campañas ficticias antiguas cuando no haya publicaciones.',
            'En Buscar proyectos escribe cañahua y pulsa Buscar. Debe encontrarse A si no hay otro filtro que la excluya. Usa después su título completo para diferenciarla de otros ensayos.',
            'Selecciona la Categoría anotada en F1, Ubicación Cochabamba y Tipo de campaña Recompensa. Los filtros se combinan: A debe satisfacerlos todos. Comprueba los chips de Filtros aplicados.',
            'En Ordenar por prueba Más recientes y luego otro orden. Si solo existe una campaña, que permanezca en la misma posición no significa que el orden falle. Paginación se demuestra solo si hay suficientes publicaciones.',
            'Abre la tarjeta de A y anota su enlace /proyectos/ seguido del slug real. No uses el UUID administrativo como si fuera el slug público.',
            'Compara portada, título, creador, ubicación, problema, solución, beneficiarios, resultados esperados, meta/avance y recompensa. La meta es 1000 en la moneda seleccionada; no afirmes que ya se recaudó ese importe.',
            'Vuelve a Explorar. Busca una cadena inexistente, por ejemplo ensayo-s2-sin-coincidencias-98765, y pulsa Buscar. Debe mostrar No se encontraron proyectos. Pulsa Limpiar filtros para recuperar el catálogo.',
            'Antes de crear B, busca los estados privados conocidos: A ya es pública, pero C/borradores no deben aparecer. Tras F6 vuelve y confirma que B rechazada tampoco aparezca.',
        ]),
        *check('La consulta pública no requiere login. Ningún borrador, campaña en revisión, con cambios, aprobada aún privada o rechazada debe aparecer. El detalle público no debe mostrar motivos administrativos ni rondas.'),
        p('No probar un aporte como cierre de este flujo: pagos, checkout y aportes reales siguen fuera de la fase. Un fallo de API debe producir error/reintento, no un proyecto inventado ni un falso catálogo vacío.', 'small'),
    ])
    out.append([p('F6 | Rechazar una segunda campaña', 'h1'),
        *context('Creador A, después ADMIN y visitante', 'B nueva; A publicada se conserva intacta', 'B REJECTED con motivo, sin publicación ni reenvío'),
        *steps([
            'Como creador vuelve a /crear-campana sin parámetro borrador. Crea B con el título Huerto de cañahua - ensayo S2 B. Repite F1 y F2 con sus datos: general, historia/indicador, portada, actividad/presupuesto, financiación y recompensa.',
            'Envía B y comprueba En revisión. No intentes rechazar un borrador incompleto: primero tiene que existir una campaña efectivamente enviada.',
            'Como ADMIN abre /administracion/campanas, busca B y pulsa Revisar campaña. Verifica que el título termina en B para no rechazar A.',
            'En Decisión selecciona Rechazar. Como ensayo negativo, deja Comentario vacío y pulsa Rechazar: debe señalar el motivo obligatorio y no guardar la decisión.',
            'Escribe: La propuesta de ensayo no presenta una justificación suficiente para su aprobación. Pulsa Rechazar y, tras comprobar título y ronda, Confirmar operación.',
            'Espera Decisión guardada: Rechazada. Revisa Rondas de revisión e Historial de estados. La ronda debe conservar la decisión y el motivo.',
            'Como creador abre Mis proyectos -> B -> Ver detalle. Debe verse Rechazada y el historial con el motivo. No debe ofrecer Corregir campaña como si fueran cambios solicitados ni permitir un nuevo envío desde este estado.',
            'Como visitante busca B en Explorar con filtros limpios: no debe aparecer. A debe seguir visible. B puede salir de la cola administrativa porque su revisión ya terminó.',
        ]),
        *check('IN_REVIEW -> REJECTED es distinto de CHANGES_REQUESTED. El rechazo de este incremento no abre un ciclo de corrección/reenvío; ese ciclo se prueba solo en F3.'),
        p('Para repetir la demostración de rechazo usa otra campaña nueva. No “devuelvas” B a DRAFT con SQL: ocultaría las restricciones que se pretende demostrar. No se está definiendo una política futura de apelaciones.', 'small'),
    ])
    out.append([p('F7 | Conservar y luego descartar un borrador', 'h1'),
        *context('Creador A, propietario', 'C recién creada en DRAFT', 'Descarte confirmado; C fuera de la lista habitual'),
        *steps([
            'Como creador abre /crear-campana sin campaña seleccionada. En Nuevo borrador escribe Borrador desechable S2 C, un resumen breve y modalidad Donación. Pulsa Crear borrador y espera Avance guardado. No necesitas completar todo porque no lo enviarás.',
            'Abre /mis-proyectos. Busca C y comprueba que diga Borrador. Si no aparece, verifica sesión y CREATOR; un fallo de consulta no debe confundirse con que no se guardó.',
            'En C pulsa Descartar. El diálogo debe preguntar ¿Descartar este borrador? y mostrar el título. Comprueba que no estás usando A ni B.',
            'Pulsa Conservar borrador. El diálogo se cierra y C debe seguir visible. Recarga la lista para confirmar que cancelar no modificó el estado.',
            'Pulsa Descartar otra vez, revisa el título y pulsa Confirmar descarte. Espera mientras el botón indique Descartando. No cierres la página mientras procesa.',
            'Comprueba el mensaje de resultado y que C deje de aparecer en la lista habitual. Recarga Mis proyectos y vuelve a /crear-campana: no debe quedar como un borrador recuperable normal.',
            'Si anotaste su URL, abrirla no debe permitir continuar o publicar C. La interfaz debe indicar que no está disponible. Comprueba además que A y B conservan su estado y datos.',
        ]),
        *check('El descarte es lógico; no se promete eliminar físicamente las relaciones e historial de PostgreSQL. Solo se admite para un DRAFT propio y con confirmación. No se descartan campañas enviadas, aprobadas o publicadas mediante este botón.'),
        *section('Cómo repetir sin dañar el ensayo', 'Crea una C2 nueva. No uses recuperación manual por SQL ni descartes A para ahorrar pasos. Para mostrar cancelación basta conservar; para mostrar confirmación usa un borrador realmente desechable.'),
    ])
    out.append([p('Variantes | Donación, modalidad y permisos', 'h1'),
        *section('V1. Donación sin recompensa', 'Crea una campaña D aparte con modalidad Donación. Completa los mismos datos generales, historia/indicador, portada, actividad/presupuesto y financiación de F1. Al avanzar desde Financiamiento el asistente omite Recompensas y pasa a Revisión y envío. No debe exigir una recompensa para enviar una donación.'),
        *steps([
            'Para probar conservación de recompensas usa otra campaña E en DRAFT y modalidad Recompensa; completa hasta guardar al menos una recompensa. No cambies A ya publicada.',
            'Vuelve con Anterior hasta Modalidad. Elige Donación: con recompensas cargadas debe aparecer Confirma el cambio de modalidad, no borrarlas silenciosamente.',
            'Pulsa Mantener la modalidad actual una vez: debe conservar Recompensa. Repite la selección y pulsa Cambiar de todos modos: pasa a Donación y omite el paso de recompensas.',
            'Vuelve a elegir Recompensa y recorre los pasos: los datos de recompensa deben conservarse. Guarda cualquier cambio pendiente antes de navegar.',
        ]),
        *section('V2. Propiedad y roles sin cambiar permisos', 'Como creador copia la URL de un DRAFT propio, cierra sesión y abre esa URL con Cuenta B básica. No debe recuperar ni editar el borrador ajeno. En /mis-proyectos sin CREATOR debe indicar acceso no disponible; en /administracion/campanas sin ADMIN debe denegar, no mostrar la cola.'),
        *steps([
            'Sin sesión intenta /mis-proyectos o /administracion/campanas: debe pedir iniciar sesión. Entrar con una cuenta no autorizada no debe conceder permisos automáticamente.',
            'Vuelve a la cuenta propietaria y recarga el borrador. Comprueba que siga intacto. No pruebes accesos ajenos contra datos reales de otra persona; utiliza únicamente las cuentas de ensayo del equipo.',
        ]),
        *check('Seleccionar un perfil en registro, tener rol CREATOR, tener ADMIN y verificar identidad son conceptos diferentes. La organización no es necesaria para el ejemplo personal; registrar una no concede ADMIN ni publica campañas.'),
        p('V1/V2 son escenarios adicionales de calidad. No forman nuevas tareas de backlog ni autorizan cambiar roles o reglas definitivas del cliente.', 'small'),
    ])
    out.append([p('Validaciones | Ensayos negativos controlados', 'h1'),
        p('Usa E u otro borrador desechable. Cambia una cosa por ensayo, intenta guardar, lee el error, repón el dato válido y guarda antes de seguir. No hagas estas pruebas sobre A ya publicada.'),
        table([['Lugar / entrada', 'Acción y resultado esperado'], ['General: resumen vacío', 'Guardar información general. Debe señalar resumen; reponer y guardar.'], ['Plan: responsable vacío', 'Guardar planificación. Debe señalar responsable; reponer Ana Muñoz.'], ['Plan: fin 01/11 y comienzo 10/11', 'Guardar planificación. Debe rechazar fin anterior; restaurar intervalo coherente.'], ['Presupuesto: importe 0 o -1', 'Guardar presupuesto y riesgos. Debe señalar importe; datos anteriores no deben sustituirse por la entrada inválida.'], ['Presupuesto/meta: 1.001', 'Guardar bloque. Debe rechazar más de dos decimales; reponer 1000.'], ['Financiación: solo fecha de inicio', 'Guardar financiamiento. Debe pedir el par coherente; borrar ambas o completar fin posterior.'], ['Recompensa: disponibilidad -1 o 1.5', 'Guardar recompensas. Debe rechazar cantidad negativa/fraccionaria; reponer 20.'], ['Portada: texto alternativo “Foto”', 'Guardar portada. Debe pedir 10-180 caracteres; no declarar guardada solo por vista previa.'], ['Portada: archivo no imagen o >2 MB', 'Intentar seleccionar/guardar. Debe rechazar formato/tamaño; usar imagen válida.'], ['ADMIN: motivo de cambios/rechazo vacío', 'Intentar decidir. Debe señalar motivo; no cambiar estado.']], [209, 290]),
        *section('Unicode y protección: cómo decirlo correctamente', 'Ñ y acentos deben conservarse en los textos válidos. Los nombres personales rechazan números; los títulos pueden llevarlos. Las contraseñas se comparan exactamente, sin recortar ni normalizar Ñ, acentos o espacios. Usa solo credenciales ficticias para un ensayo de acceso y nunca muestres tu contraseña real.'),
        p('31 de febrero, NUL invisible, NaN/Infinity y textos por encima del máximo HTML se cubren en pruebas automatizadas. El navegador puede impedir introducirlos: no afirmar que se ensayaron a mano ni forzar peticiones desde la consola. Esta guía no exige herramientas ofensivas ni cambios de seguridad.', 'small'),
    ])
    out.append([p('Cierre | Evidencia y contingencias', 'h1'),
        table([['Flujo', 'Resultado final que debes anotar'], ['F1', 'A guardada y recuperada, todavía DRAFT.'], ['F2', 'A IN_REVIEW, edición bloqueada y privada.'], ['F3', 'Cambios solicitados, corrección guardada y ronda nueva pendiente.'], ['F4', 'APPROVED privada; después PUBLISHED por acción separada.'], ['F5', 'Catálogo/filtros/detalle de A sin login y sin datos administrativos.'], ['F6', 'B REJECTED con motivo; no pública ni reenviable aquí.'], ['F7', 'Cancelar conserva C; confirmar la retira de la lista.']], [65, 434]),
        *section('Ficha para cada ensayo', 'Anota: fecha, cuenta ficticia/rol, campaña y URL, pasos ejecutados, resultado esperado, resultado observado y captura opcional. Usa Aprobado / Falló / No ejecutado. No registres contraseñas, cookies, tokens, .env ni datos personales en el informe.'),
        *section('Si aparece un problema', '503/ready: revisar Docker, puerto y configuración antes de formularios. 401: volver a iniciar sesión. 403: comprobar rol/propiedad o publicación deshabilitada. 409: estado/ronda cambiaron, Actualizar revisión antes de decidir. 422/faltantes: guardar los campos indicados. Error de red: no asumir que la operación no escribió; consultar el estado actual antes de repetir.'),
        *section('Cerrar la demostración sin borrar nada', 'Cierra las sesiones desde Mi cuenta. Detén Vite y API con Ctrl+C en sus terminales. Si quieres detener PostgreSQL sin borrar datos, desde la raíz usa el comando inferior. Al volver otro día aplica Preparación A, no reinstales el SQL.'),
        p('docker compose --env-file infra/postgres-v2/.env -f infra/postgres-v2/compose.yaml stop', 'code'),
        *section('Fuentes y alcance de la guía', 'README vigente (instalación y secciones 14-15), constructor y editores React, ProjectsPage, AccountRoles, panel administrativo, catálogo público y missingForSubmission del backend. Los títulos de botones y los requisitos se contrastaron con el código local. Los 13 compromisos corresponden al módulo de campañas; pagos, aportes, rendición y KYC/KYB quedan fuera.'),
        p('Preparación definitiva de roles y reglas finales de negocio siguen pendientes. El tutorial demuestra el incremento local, no aceptación externa, publicación en Git ni certificación absoluta. Para estudiar la implementación y principios usa las dos guías compañeras del Sprint 2.', 'small'),
    ])
    return out


if __name__ == '__main__':
    # Comprobación de rótulos importantes antes de escribir el tutorial.
    labels = {
        'src/features/campaigns/CampaignBuilderPage.tsx': ['Crear borrador', 'Guardar información general', 'Guardar historia e impacto', 'Cambiar de todos modos'],
        'src/features/campaigns/CampaignSectionsEditor.tsx': ['Guardar planificación', 'Guardar presupuesto y riesgos', 'Guardar financiamiento', 'Guardar recompensas'],
        'src/features/campaigns/CampaignSubmissionPanel.tsx': ['Enviar a revisión', 'Reenviar a revisión', 'Falta completar'],
        'src/features/campaigns/AdministrativeCampaignPanel.tsx': ['Confirmar operación', 'Publicar campaña', 'Actualizar revisión'],
        'src/features/campaigns/ProjectsPage.tsx': ['Confirmar descarte', 'Conservar borrador', 'Revisar campaña'],
    }
    for name, values in labels.items():
        source = (ROOT / name).read_text(encoding='utf-8')
        for label in values:
            assert label in source, f'Cambió el rótulo: {name}: {label}'
    build('Tutorial_Paso_a_Paso_Flujos_Sprint_2_Brotar.pdf', 'Brotar - tutorial de flujos del Sprint 2', pages())
