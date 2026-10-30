# S3-21 · Validación del recorrido integral

Ricardo · RicardoDev · 29/10/2026 (America/La_Paz). Corte base `7c4222d` más este incremento local. No se publica código, no se modifica DEV y no se sincroniza Trello. El alcance adoptado es el MVP académico DEMO con condiciones provisionales propias del equipo.

**Estado:** validación técnica aprobada; aceptación humana pendiente de registro. **565 pruebas distintas aprobadas: 261 frontend + 241 backend + 8 ADMIN + 55 de la suite de integración**, con cero fallos y omitidas en la pasada final. Lint, tipos y builds terminaron con exit 0; 215 contratos HTTP verificados. [Resultados y hashes](evidencias/s3-21/resumen.json). No se suman repeticiones, observaciones UI ni rutas HTTP como pruebas adicionales.

## Criterios de BG-64 y resultado

| Criterio original | Comprobación | Estado |
| --- | --- | --- |
| CA1: conectar registro, campaña, revisión, publicación, aporte, resultado, seguimiento y gestión interna | Una campaña nueva realiza el recorrido completo mediante HTTP y PostgreSQL reales. Se inspeccionan después sus registros en la interfaz. | **Validado técnicamente.** |
| CA2: alternativas de error, permisos y proveedores simulados | Rechazos y límites en el mismo caso, más suite general. Se documentan transporte, reloj, dinero y evidencias sintéticas. | **Validado técnicamente.** No acredita integración bancaria ni identidad real. |
| CA3: revisión de responsables y evidencia de aceptación | Acta preparada al final de este documento, asociada a este corte y sus evidencias. | **Pendiente de respuesta humana.** Una prueba automática no puede aceptar el producto en nombre del equipo. |

La entrega general S3-20 continúa aparte. El orden solicitado permite ensayar el corte local antes de publicarlo; no transforma una entrega aún no publicada en aceptación externa.

## Un mismo caso, ocho etapas conectadas

Prueba reproducible: [mvp-acceptance.integration.test.ts](../backend/integration/mvp-acceptance.integration.test.ts). Registra ocho cuentas nuevas con contraseña que contiene Ñ y obtiene sus cookies mediante login. Solo el ADMIN inicial se habilita como fixture SQL; el resto de concesiones se efectúa desde las API del producto. Ningún resultado de revisión, pago, ejecución o cierre se inserta como aprobado en la base.

| Etapa | Responsable y acción | Resultado comprobado |
| --- | --- | --- |
| 1. Registro y permisos | Ocho cuentas; ADMIN concede CREATOR y responsabilidades separadas | No hay autoescalamiento. Creador, aportante, administrador, revisor, cumplimiento, finanzas, soporte y auditor son personas sintéticas distintas. |
| 2. Contacto e identidad | Creador confirma su token de correo y elige avisos; COMPLIANCE revisa KYC sintético | Un token usado desde otra cuenta se rechaza. Aprobar identidad y verificar correo son operaciones independientes. |
| 3. Campaña y revisión | Creador llena secciones; REVIEWER pide corrección y aprueba la segunda ronda; ADMIN publica | Catálogo real, ubicación, historia, indicador, dos actividades vinculadas a un hito, presupuesto, fechas, recompensa y portada persistidos. Aprobar no publica. |
| 4. Aporte | Aportante solicita checkout DEMO y confirma su resultado simulado | Un aporte de 12.00 BOB; reintentar la misma clave devuelve el mismo aporte. El cupo de una recompensa no se vende dos veces. El boleto no es pagable. |
| 5. Soporte | Aportante registra consulta; SUPPORT responde y resuelve | Historial privado persistido y avisos internos. Soporte no realiza devoluciones ni mueve dinero. |
| 6. Resultado y desembolso | ADMIN finaliza recaudación vencida e inicia ejecución; creador solicita; FINANCE revisa destino, autoriza, procesa y completa | Resultado calculado desde el pago confirmado. Destino `DEMO-HUERTO-INTEGRAL`, separado del solicitante, desembolso 12.00 BOB y referencia explícitamente ficticia. |
| 7. Seguimiento y rendición | Creador completa avances, publica novedad, documenta recompensa y presenta gastos; REVIEWER aprueba; ADMIN cierra | Dos actividades y un hito al 100 %, indicador de una familia, recompensa cumplida DEMO, informe final aprobado y campaña cerrada sin bloqueos. |
| 8. Persistencia y auditoría | API reiniciada dos veces; AUDITOR consulta | Mismas cookies válidas según sesión, campaña cerrada, desembolso completado, informe aprobado y auditoría accesible solo con permiso. La información pública conserva el historial y bloquea nuevos aportes. |

El presupuesto inicial es 10 BOB y la meta 12 BOB. El gasto final de 12 BOB lleva una explicación de variación de 2 BOB y no supera el desembolso disponible. Se prueban la regla inicial meta > presupuesto y el límite de gasto real; no se impone una igualdad artificial entre presupuesto inicial y gasto final.

### Identificadores y conciliación del caso conservado

[recorrido-integral.json](evidencias/s3-21/recorrido-integral.json) conserva etapas, identificadores y resultados, sin contraseñas, cookies ni tokens.

| Registro | Valor |
| --- | --- |
| Campaña | `8eddcfe7-84eb-4cd4-9b25-09527f9b5381` |
| Slug público | `camp-8eddcfe7-84eb-4cd4-9b25-09527f9b5381` |
| Aporte | `e4d8526a-b098-448c-8b0c-5341bad42e52` |
| Desembolso | `ef2a23f2-ef17-4547-b50d-3949ad1e1226` |
| Informe final | `f8f2fe4a-7382-4fe5-98c4-29b71bf69626` |
| Estado terminal | `CLOSED` |
| Número de aportes | **1** |
| Recaudado / desembolsado / gasto rendido | **12.00 / 12.00 / 12.00 BOB DEMO** |

La prueba comprueba los totales en las vistas y tablas persistidas, además de las respuestas HTTP. Cada repetición genera UUID nuevos; los de esta tabla corresponden al caso retenido para inspección visual, no a todos los ensayos. La ejecución incluida en la pasada final 55/55 queda separada en [recorrido-regresion-final.json](evidencias/s3-21/recorrido-regresion-final.json); sus fixtures se retiran al terminar y no son el caso visible conservado.

## Errores y límites ejercitados en el recorrido

- Cuenta básica intenta concederse CREATOR: 403; otro usuario intenta leer el borrador: 404.
- Envío incompleto: 422; fecha del plan en el pasado y meta igual al presupuesto: 400.
- Campaña aprobada aún no publicada: no aparece públicamente; creador intenta publicarla: 403.
- Misma solicitud de aporte: mismo identificador; un nuevo intento sin cupo: 409; leer aporte ajeno: 404.
- Intentar terminar recaudación antes del vencimiento: 409.
- ADMIN y AUDITOR intentan autorizar desembolso: 403. El rol ADMIN no obtiene potestad financiera automática.
- Avance al 101 %: 400. Rendición por 12.01 BOB con solo 12.00 desembolsados: 409.
- FINANCE intenta aprobar el informe final: 403; REVIEWER sí puede revisarlo.
- Reabrir ejecución o presentar otra rendición después del cierre: 409; aportante consulta auditoría: 403.

La regresión general complementa este camino con cancelación, meta no alcanzada, devoluciones, disputas, concurrencia, recuperación, organizaciones, representación, rendición periódica y permisos. No se presentan esas ramas alternativas como etapas que recorrió esta misma campaña cerrada.

## Comprobación de interfaz con datos reales de ese caso

Se generaron los datos mediante API para evitar rellenar manualmente cada formulario; después se iniciaron sesiones normales desde el navegador. **No es una grabación de creación completa mediante clics.** La evidencia incluye lectura por creador, aportante, FINANCE, AUDITOR y visitante anónimo.

[interfaz-observada.json](evidencias/s3-21/interfaz-observada.json) conserva 14 observaciones iniciales de diagnóstico (dos detectaron el salto de encabezados) y una pasada final de **12 combinaciones de ruta/rol/ancho**. Siete rutas distintas; 375 y 1440 px según el caso. En la pasada final se espera un texto inequívoco del registro ya cargado después de cada navegación/cambio de ancho, antes de medir o capturar; se revisan título, main/h1, desbordamiento, errores de script y axe. Las capturas de carga iniciales se sustituyeron por capturas del estado final comprobado. No se afirma haber repetido las 73 rutas de S3-19 en este incremento.

Se encontró un salto h1 → h3 en el distintivo documental del detalle público, visible únicamente cuando había una revisión aprobada. Se corrigió a h2 y se repitió la comprobación a ambos anchos: sin infracciones automáticas detectadas ni desbordamiento horizontal en esas observaciones finales. Los resultados incompletos de contraste de elementos decorativos quedan visibles en el JSON; no certifican conformidad WCAG.

- [Cierre del creador en escritorio](evidencias/s3-21/cierre-creador-escritorio.webp).
- [Cierre del creador en móvil](evidencias/s3-21/cierre-creador-movil.jpg).
- [Desembolso en móvil](evidencias/s3-21/desembolso-movil.jpg).
- [Campaña pública cerrada en móvil](evidencias/s3-21/campana-publica-movil.jpg).

## Corrección del primer arranque de PostgreSQL

Una instalación nueva aislada reprodujo `Connection terminated unexpectedly`: el healthcheck anterior aceptaba el servidor temporal que PostgreSQL utiliza durante initdb mediante socket Unix. El instalador avanzaba antes de arrancar el servidor TCP definitivo. No era ausencia de categorías ni un motivo para borrar el volumen.

La corrección en `infra/postgres-v2/compose.yaml` añade `-h 127.0.0.1` a pg_isready. [postgres-startup.integration.test.ts](../backend/integration/postgres-startup.integration.test.ts) monta una inicialización lenta en su propio contenedor con puerto y contraseña aleatorios: falla con el healthcheck anterior y pasa con el corregido. También se repitió la instalación oficial completa en otra instancia nueva: esquema, 40 migraciones, preparación de permisos/catálogos e inventario verificados. Estas copias de QA reutilizan dependencias y compilados comprobados mediante enlaces locales; se verifica la inicialización de configuración/base, no se presenta como una segunda descarga limpia de dependencias.

No hay migraciones ni contratos HTTP nuevos, cambios de contraseñas de la instalación personal ni borrado de volúmenes. El ensayo de arranque retira su propio contenedor y red con compose down **sin -v**; conserva volumen/configuración para diagnóstico. Las primeras ejecuciones dejaban esas redes ocupadas y agotaron el conjunto de subredes locales: se retiraron únicamente tres contenedores/redes de este ensayo, ya detenidos y con etiquetas verificadas; no se hizo prune global ni se tocaron redes o volúmenes de otros proyectos.

## Procedencia, simulaciones e incidencias de la validación

El caso visible se conserva en QA15448/API3198/frontend5198. La suite global se repite en instalaciones **nuevas y distintas**, sin API de uso ni ficheros de demostraciones previas. La base personal original no se usa para estas pruebas. Los resultados y destinos finales concretos constan en resumen.json.

La primera pasada global en una QA ya poblada terminó con 49/54: retención se detuvo por trabajo activo; pruebas de contribuciones, pagos y finanzas encontraron los registros históricos en sus conteos globales; recuperación con archivos no encontró en el almacén del fixture los binarios de otros ensayos conservados. Se guardan sus logs y se repite sobre una base nueva, sin debilitar las reglas ni borrar los datos de la demostración. Durante la construcción del escenario también se corrigieron una limpieza de fixture que omitía referencias de soporte y una referencia DEMO de destino que erróneamente contenía dígitos. No eran fallos de autorización del producto.

La primera QA nueva terminó **54/55** y reveló una interferencia entre pruebas: el fixture de correo/KYB eliminaba expedientes institucionales sin marcar sus dos archivos sintéticos como retirados. La recuperación con archivos encontraba metadatos activos que no estaban en su propio almacén. Una aserción específica reprodujo **2 archivos activos frente a 0 esperados**. Se corrigió la limpieza únicamente sobre los usuarios propios de ese fixture, sin relajar recoverLocalFiles. La secuencia correo/KYB → recuperación pasó **2/2** después; la suite completa posterior en QA15454 terminó **55/55, cero fallos y omitidas**, en una sola pasada de unos 15 minutos. Al terminar cada entorno auxiliar se retiran solo sus contenedores/redes propios, verificando etiquetas y conservando volúmenes/configuración; la QA visual permanece disponible.

Los logs completos permanecen en tmp/ ignorado; el resumen publica resultados y hashes. La advertencia de bundle frontend mayor de 500 kB se conserva y no impide el build; no se declara rendimiento de producción certificado.

Límites explícitos del ensayo:

- **Dinero:** simulador interno; QR/boletos y destinos ficticios. Sin proveedor, cuenta bancaria, tarjeta o transferencia real.
- **Identidad y evidencia:** documentos sintéticos y comprobantes de prueba. Aprobar KYC DEMO o cumplir recompensa no acredita identidad real, entrega física o validez jurídica.
- **Correo:** se sustituye únicamente el transporte por un capturador que exige destinatarios `@example.invalid`. PostgreSQL, tokens, preferencias, eventos y cola son reales. No se envían mensajes a Gmail ni se acredita posesión de un buzón real en este ensayo. La configuración Gmail privada se conserva sin cambios; su recepción previa está documentada con su fecha en [correo operativo](correo-operativo-2026-10-24.md).
- **Tiempo:** se adelanta únicamente ends_at de la campaña sintética para cruzar el vencimiento, y ventanas de cuota de sus propias cuentas para condensar varias jornadas humanas. No se precargan estados aprobados ni se desactivan límites de producción.
- **Legal:** condiciones provisionales propias `mvp-demo-legal-1.0-20261028`, aceptación registrada por cada cuenta de prueba. No representa aprobación externa/comercial.

## Repetir la validación automática

Los checks sin base se ejecutan en la raíz con `bun run check` y dentro de backend con `corepack pnpm run check`. Para las integraciones, abrir **otra PowerShell** desde la raíz del repositorio que contenga este incremento **ya confirmado localmente**. El clon es del repositorio local; el incremento aún no está en GitHub.

```powershell
$sourceRepo=(Get-Location).Path
$qaTag=[guid]::NewGuid().ToString('N').Substring(0,8)
$qaCopy=Join-Path $env:TEMP ('brotar-qa-s321-'+$qaTag)
git clone --no-hardlinks --branch RicardoDev $sourceRepo $qaCopy
if($LASTEXITCODE -ne 0){throw 'No se pudo crear la copia QA'}
Set-Location (Join-Path $qaCopy 'backend')
$env:BROTAR_COMPOSE_PROJECT='brotar-qa-s321-'+$qaTag
$env:BROTAR_DB_PORT='15452' # Elegir un puerto libre; no reutilizar otra instalación.
corepack pnpm install --frozen-lockfile
node scripts/adopt-provisional-v2.mjs install ../infra/postgres-v2/official-schema.sql
corepack pnpm run check
node scripts/migrate.mjs up
node scripts/prepare-sprint2.mjs
node scripts/verify-provisional-v2.mjs
```

Comprobar exit 0 en cada comando antes de continuar. No ejecutar activate ni arrancar la API sobre esta base antes de la suite. No copiar .env personal ni Gmail. El SQL oficial contiene estructura/catálogos, no las cuentas de la demostración.

```powershell
Get-ChildItem Env:SMTP_* | Remove-Item # Solo esta consola QA; no modifica archivos.
$env:ALLOW_DB_TEST_WRITES='true'
$env:DB_TEST_RESTART='false'
$env:NODE_ENV='test'
try {
  node --env-file=../infra/postgres-v2/.env.backend --test --test-concurrency=1 dist-test/integration/*.test.js
  if($LASTEXITCODE -ne 0){throw 'La regresión no está aprobada; revisar su salida'}
} finally {
  Remove-Item Env:\ALLOW_DB_TEST_WRITES
  Remove-Item Env:\DB_TEST_RESTART
  Remove-Item Env:\NODE_ENV
}
```

El ensayo de arranque crea además su propio contenedor temporal; retira su contenedor/red al terminar y conserva su volumen. DB_TEST_RESTART=false evita reiniciar la base compartida de la suite; el escenario integral reinicia su API dos veces.

Para conservar un caso inspeccionable, ejecutar **solo** `dist-test/integration/mvp-acceptance.integration.test.js` después, con los mismos flags de prueba y `BROTAR_QA_KEEP_FIXTURES=true`. Se crea `tmp/s321-integral-fixture.json` **privado e ignorado**, con cuentas, contraseña sintética y fileRoot. No adjuntarlo al informe ni subirlo a Git. Para inspeccionar sus documentos, la API QA debe usar exactamente ese fileRoot como FILE_STORAGE_DIR. Retirar también BROTAR_QA_KEEP_FIXTURES de la consola al terminar. No lanzar posteriormente la suite global sobre esa QA poblada; usar otra copia nueva.

## Recorrido breve para la revisión humana

En el entorno QA conservado, abrir `http://127.0.0.1:5198`. Las cuentas sintéticas se consultan únicamente en el archivo privado local del ensayo; no forman parte del repositorio. Iniciar/cerrar sesión desde la interfaz al cambiar de persona.

1. **Visitante:** abrir `/proyectos/camp-8eddcfe7-84eb-4cd4-9b25-09527f9b5381`. Ver campaña cerrada, 12 BOB confirmados, novedad pública y ausencia de botón para aportar. No deben verse documentos KYC, conversaciones ni motivos internos.
2. **Creador:** Mis proyectos → esa campaña → Avances y cierre. Ver dos actividades y un hito terminados, una familia alcanzada, recompensa cumplida DEMO e informe final aprobado; total recibido/gastado 12 BOB.
3. **Aportante:** Mis aportes → su comprobante. Ver la misma campaña y 12 BOB DEMO. Mis incidencias → `BRT-S-0000029`: mensaje privado de soporte y estado Resuelta.
4. **FINANCE:** Administración → Desembolsos → `BRT-P-0000013`. Ver solicitud, autorización, procesamiento y completado, bruto/neto 12 BOB y destino ficticio. No debe aprobar informes finales.
5. **AUDITOR:** Ciclo de campañas → esa campaña: Cerrada y seis eventos conservados. Consulta sin formularios de operación; contraste con API que devuelve 403 al intentar autorizar dinero.
6. Contrastar el caso y los límites con el resumen de pruebas. Registrar observaciones concretas y si se acepta el **alcance académico DEMO** de este corte, sin atribuir recepción de correo nueva, dinero real o aprobación comercial.

## Registro de aceptación pendiente

| Dato | Registro actual |
| --- | --- |
| Corte revisado | RicardoDev local, base 7c4222d más este incremento; commit de cierre en Git local |
| Evidencias | recorrido-integral.json, interfaz-observada.json, resumen.json y capturas enlazadas |
| Responsable que acepta | Pendiente; no se atribuye a Ricardo, Alison, Santiago ni líderes sin respuesta |
| Fecha/respuesta | Pendiente |
| Observaciones o reservas | Pendiente de la revisión del responsable |
| Decisión | **PENDING** |

Para cerrar CA3 hace falta una respuesta trazable del responsable tras revisar este resultado: aceptar el alcance académico DEMO o señalar los defectos que faltan. Este documento ya deja concreto qué se está sometiendo a revisión. Hasta registrar esa respuesta, S3-21 permanece validada técnicamente/en revisión y no se cuenta como aceptación formal del MVP. S3-20 conserva la entrega final pendiente; este incremento no la publica por adelantado.
