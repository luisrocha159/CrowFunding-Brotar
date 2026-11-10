# Manual de instalación y revisión de Brotar

Guía de DEV con cuentas y escenarios preparados

Proyecto de Sistemas II

Equipo de trabajo: Ricardo, Alison y Santiago

Ricardo Núñez del Prado Justiniano
Santiago Rocha Mejia
Alison Pizarro Apaza

Paquete brotar-review-2026-11-09-v1. Preparado el 9 de noviembre de 2026.

Este manual permite instalar una base independiente y recorrer el software sin crear manualmente todos los usuarios y campañas. Primero complete la instalación, después consulte las credenciales y finalmente siga los recorridos en el orden indicado.

La preparación contiene 18 cuentas, los nueve roles de plataforma, cinco categorías iniciales y 20 campañas con situaciones diferentes. Los documentos y movimientos monetarios son sintéticos. Los QR son escaneables e identifican operaciones internas; no son órdenes de pago bancarias.

Cada instalación conserva sus propios datos. Compartir el documento o clonar Git no conecta las bases de las computadoras. No importe la base personal de un integrante.

Los resultados esperados son criterios para la revisión. Marcar Correcto requiere ejecutar el paso y comprobar su efecto; esta guía no atribuye pruebas humanas a quienes todavía no las hicieron.

<!-- page -->

## 1 Preparar la computadora

Necesita Windows con PowerShell, Git, Node.js 24.13 o superior de la serie 24, Bun 1.4.2, Corepack con pnpm 11.19.0 y Docker Desktop con motor Linux. La instalación necesita Internet para descargar dependencias e imagen PostgreSQL.

1. Abra Docker Desktop y espere al motor. No necesita instalar PostgreSQL en Windows ni crear brotar_app manualmente.
2. Abra PowerShell o la terminal de Visual Studio Code. Compruebe cada herramienta por separado:

```powershell
node --version
bun --version
git --version
corepack pnpm --version
docker info
```

3. Si falta una herramienta, instálela y vuelva a abrir la terminal. Si Corepack necesita descargar la versión de pnpm declarada por el backend, permita esa descarga.
4. La revisión usa base 15460, API 3000 e interfaz 5173. Si ya hay otra copia usando esos puertos, utilice la alternativa de la página siguiente.
5. Elija una carpeta nueva. El preparador se detiene si encuentra una infraestructura ordinaria ya configurada: no sobrescribe la base personal.

**Comprobación:** Docker responde sin error de conexión y Node comienza por v24. No continúe si un comando termina con error; conserve la salida para el equipo.

<!-- page -->

## 2 Instalar desde DEV

En PowerShell, situado en la carpeta donde guardará el proyecto, ejecute:

```powershell
git clone -b DEV https://github.com/luisrocha159/CrowFunding-Brotar.git Brotar-Revision
cd Brotar-Revision
node scripts/setup-review.mjs
```

El preparador instala frontend y backend con sus lockfiles, genera configuración privada, levanta PostgreSQL en Docker, instala línea base y 43 migraciones, prepara categorías y permisos, compila la API y carga los escenarios. Espere a Preparación completada. La primera descarga puede tardar varios minutos.

No copie .env.example encima de los archivos generados. No importe otro SQL ni ejecute una migración histórica separada. La infraestructura vigente es infra/postgres-v2; infra/postgres es histórica.

**Otra copia en la misma computadora:** use desde el inicio otro proyecto y puertos:

```powershell
node scripts/setup-review.mjs `
  --project=brotar-revision-equipo --db-port=15463 `
  --api-port=3023 --web-port=5199
```

En ese ejemplo la interfaz será http://127.0.0.1:5199 y la API http://127.0.0.1:3023. Repita los mismos argumentos en futuras ejecuciones de esa copia. El proyecto debe empezar por brotar-revision.

**Resultado:** 18 cuentas y 20 escenarios. Se crean backend/private/review-dataset.json, el almacén de adjuntos y el buzón privado. Los identificadores se generan para esta instalación; no use UUID copiados de otra computadora.

<!-- page -->

## 3 Arrancar detener y conservar avances

Abra dos terminales en la raíz Brotar-Revision, donde está el README principal. No entre en backend para estos comandos.

**Terminal 1 para la API**

```powershell
node scripts/start-review.mjs backend
```

**Terminal 2 para la interfaz**

```powershell
node scripts/start-review.mjs frontend
```

1. Mantenga ambas terminales abiertas. Visite http://127.0.0.1:5173, o el puerto alternativo configurado.
2. Compruebe http://127.0.0.1:3000/api/health/ready. Debe responder HTTP 200. Esto verifica API y base, no solo que abrió una ventana.
3. Entre como creador y abra REV-01. El selector Categoría ya debe tener opciones provenientes de la base.
4. Para detener API o frontend, pulse Ctrl+C en su terminal. Docker conserva los datos en su volumen.
5. Después de reiniciar la computadora, abra Docker Desktop, repita setup-review con los mismos argumentos y arranque ambas terminales.

Repetir el preparador conserva contraseñas, roles y avances; no duplica escenarios ni restablece estados iniciales. Para repetir todo desde cero use otra carpeta, proyecto Docker y puertos. No ejecute down -v ni borre volúmenes para intentar reparar un error.

<!-- page -->

## 4 Leer correos y abrir sus enlaces

La revisión funciona sin la contraseña Gmail de un integrante. El buzón local guarda mensajes a @brotar.test y permite probar los tokens reales de verificación y recuperación sin enviar correos externos.

1. Entre como correopendiente@brotar.test y abra Mi cuenta.
2. Solicite el enlace para verificar correo. En una tercera terminal situada en la raíz ejecute:

```powershell
node scripts/review-mailbox.mjs correopendiente@brotar.test
```

3. Copie la URL completa del mensaje más reciente. Ábrala en el mismo navegador donde inició sesión. No quite #token ni publique el enlace en capturas.
4. Vuelva a Mi cuenta y actualice: debe mostrar correo verificado. Esto no aprueba identidad ni concede rol de creador.
5. Para recuperación, cierre sesión, abra Recuperar contraseña y escriba ese correo. Lea el buzón, abra el enlace y guarde una frase válida de al menos 15 caracteres con confirmación coincidente.
6. Compruebe el nuevo acceso y que el enlace usado no permita restablecer otra vez. Anote la contraseña nueva en sus notas: repetir el preparador no la restablece.

Los mensajes están en backend/private/review-mail. No los envíe con reportes ni los suba a Git: contienen enlaces temporales. Este transporte rechaza correos externos. Gmail real se configura aparte con una credencial privada y no es requisito de esta guía.

<!-- page -->

## 5 Credenciales de operación

| Correo | Contraseña | Función inicial |
|---|---|---|
| administrador@brotar.test | administrador1234567890 | Publicación, permisos, catálogos y cierre del ciclo |
| revisor@brotar.test | revisor1234567890 | Revisar campañas e informes sin operar finanzas |
| cumplimiento@brotar.test | cumplimiento1234567890 | Revisar identidad y organización |
| finanzas@brotar.test | finanzas1234567890 | Conciliación, devoluciones y desembolsos |
| soporte@brotar.test | soporte1234567890 | Incidencias, adjuntos y disputas |
| auditor@brotar.test | auditor1234567890 | Consulta autorizada sin escritura |
| creador@brotar.test | creador1234567890 | Campañas, ejecución y rendición; identidad aprobada |
| patrocinador@brotar.test | patrocinador1234567890 | Aportes y casos precargados del patrocinador |

Copie correo completo y contraseña sin espacios. Cambie de rol cerrando sesión o usando perfiles de navegador separados.

ADMIN publica y gestiona plataforma; REVIEWER revisa campañas e informes; COMPLIANCE revisa identidades; FINANCE opera fondos; SUPPORT atiende incidencias y disputas; AUDITOR consulta sin modificar. No use ADMIN como sustituto automático de FINANCE.

Las cuentas separadas permiten comprobar que el creador no se revisa ni autoriza sus propios fondos. Todas las credenciales de esta guía son sintéticas y públicas para el entorno local de evaluación.

<!-- page -->

## 6 Otras cuentas y estados especiales

| Correo | Contraseña | Función inicial |
|---|---|---|
| usuario@brotar.test | usuario1234567890 | Usuario normal sin privilegios internos ni de creador |
| organizacion@brotar.test | organizacion1234567890 | Titular de la organización de prueba y su campaña |
| miembro@brotar.test | miembro1234567890 | Miembro institucional sin permisos de plataforma |
| invitacion@brotar.test | invitacion1234567890 | Tiene una invitación institucional por aceptar |
| identidadpendiente@brotar.test | identidadpendiente1234567890 | Expediente de identidad enviado pendiente de revisión |
| observaciones@brotar.test | observaciones1234567890 | Identidad con cambios solicitados para corregir y reenviar |
| correopendiente@brotar.test | correopendiente1234567890 | Correo sin verificar; probar enlace en el buzón privado local |
| restringido@brotar.test | restringido1234567890 | Cuenta restringida para probar denegación y rehabilitación |
| creadorajeno@brotar.test | creadorajeno1234567890 | Creador diferente para probar propiedad y acceso ajeno |
| auditorcombinado@brotar.test | auditorcombinado1234567890 | Comprueba que AUDITOR conserva solo lectura incluso con ADMIN |

Visitante sin registro: cierre sesión o abra una ventana privada. No tiene contraseña ni fila de usuario en la base.

Cuenta restringida: el rechazo al iniciar sesión es esperado. Rehabilitarla cambia el estado inicial.

Auditor combinado: ADMIN junto a AUDITOR mantiene la restricción de escritura. Organización y miembro son relaciones con una entidad, no roles internos nuevos de plataforma.

<!-- page -->

## 7 Campañas preparadas

| Código | Campaña | Situación inicial |
|---|---|---|
| REV-01 | Borrador para completar | Borrador |
| REV-02 | Campaña pendiente de revisión | En revisión |
| REV-03 | Campaña aprobada para publicar | Aprobada |
| REV-04 | Huerto por donación | Publicada |
| REV-05 | Huerto con recompensas | Publicada con recompensa |
| REV-06 | Kit de cultivo en preventa | Publicada con preventa |
| REV-07 | Recaudación vencida para evaluar | Vencida para evaluar |
| REV-08 | Destino pendiente para desembolso | En ejecución destino pendiente |
| REV-09 | Solicitud de desembolso lista | Desembolso solicitado |
| REV-10 | Ejecución con fondos disponibles | Desembolso completado |

Busque el código REV en la lista correspondiente. Cada campaña tiene UUID y slug propios. El archivo privado backend/private/review-dataset.json muestra los identificadores de su instalación si necesita una referencia técnica.

Los pasos válidos cambian el estado y se conservan al recargar. Una campaña cerrada no sirve para probar un pago nuevo. Use un escenario distinto para cada camino.

<!-- page -->

## 8 Campañas preparadas continuación

| Código | Campaña | Situación inicial |
|---|---|---|
| REV-11 | Rendición final para revisión | Final presentada |
| REV-12 | Campaña cerrada de referencia | Cerrada |
| REV-13 | Todo o nada con meta incumplida | Todo o nada vencida |
| REV-14 | Cancelación solicitada | Cancelación solicitada |
| REV-15 | Consulta y devolución del aportante | Caso y devolución parcial |
| REV-16 | Disputa para atender | Disputa abierta |
| REV-17 | Campaña institucional | Institucional publicada |
| REV-18 | Publicación bloqueada por identidad | Aprobada con KYC pendiente |
| REV-19 | Campaña observada para corregir | Cambios solicitados |
| REV-20 | Rendición mensual y recompensas | Informe mensual presentado |

Las fechas se calculan respecto al día de la primera preparación. REV-20 representa deliberadamente un mes calendario anterior para revisar rendición mensual sin cambiar el reloj de la computadora. Su historial está identificado como sintético.

La cuenta creador administra las campañas personales; organizacion administra REV-17 e identidadpendiente administra REV-18. Los aportes precargados pertenecen a patrocinador.

<!-- page -->

## 9 Visitante registro y acceso

Inicio sin sesión. Recorrido: / → /explorar → detalle público → /registro → /mi-cuenta.

1. Abra inicio, Cómo funciona y Para creadores. Entre a Explorar, busque REV-04 y abra su detalle. Debe mostrar meta, progreso, modalidad y portada. REV-01 no aparece públicamente.
2. Busque texto inexistente y pruebe filtros; un resultado vacío debe explicarse. Abra REV-12: permite consultar su historia, pero no aportar de nuevo.
3. Abra Registro. Use un correo nuevo, por ejemplo visitanteextra@brotar.test, nombre María y apellido Núñez. El correo va primero y se valida al salir del campo. Use una frase de al menos 15 caracteres y confirme exactamente la contraseña.
4. Pruebe antes correo mal formado, usuario@brotar.test ya registrado, nombre solo con espacios, contraseña corta y confirmación diferente. Debe señalar el campo y conservar los otros datos válidos.
5. Si añade teléfono, complete el formato exigido; prefijo y número deben distinguirse. Abra las condiciones y acepte expresamente la versión presentada antes de registrar.
6. Registre y entre a Mi cuenta. Recargue. Abrir Ya tengo cuenta con sesión vigente no debe pedir otro inicio de sesión innecesario.
7. Cierre sesión y pruebe acceso incorrecto y correcto. Con restringido@brotar.test se espera denegación. No declare fallo una restricción prevista.

Registre URL, cuenta, entrada inválida, mensaje observado y persistencia. No incluya contraseñas reales en capturas.

<!-- page -->

## 10 Perfil condiciones e identidad

Cuentas: identidadpendiente, observaciones y cumplimiento. Rutas: /mi-cuenta, /mi-verificacion y /administracion/verificaciones.

1. Entre como identidadpendiente. Abra la verificación ya enviada desde Mi cuenta. Debe mostrar expediente y estado pendiente; no necesita crear otro.
2. Entre como cumplimiento. Abra Administración → Verificaciones, localice a Iván por su correo y revise campos y documentos privados.
3. Pase a revisión. Para aprobar, evalúe los documentos requeridos y marque su resultado; escriba un motivo y confirme la decisión. El estado cambia solo tras guardar correctamente.
4. Vuelva como identidadpendiente y actualice. Verificar correo y aprobar KYC son controles separados.
5. Para correcciones use observaciones. Su expediente ya tiene información solicitada. Corrija los campos señalados y adjunte un PNG sintético si hace falta. Use backend/review/assets, nunca documentos personales reales.
6. Abra condiciones y privacidad y marque la aceptación requerida antes de enviar. El recibo conserva la versión aceptada aunque la interfaz presente un título simplificado.
7. Reenvíe y revise con cumplimiento. Pruebe obligatorio vacío, espacios, archivo no admitido y más de 5 MB: no debe aparentar un envío correcto.

Con usuario o creadorajeno intente acceder al documento privado mediante su URL: debe denegarse. Los documentos de identidad no son imágenes públicas de campaña.

<!-- page -->

## 11 Organización miembros y representación

Cuenta: organizacion. Ruta: /mis-organizaciones. La Fundación Semillas del Valle tiene revisión institucional aprobada y la campaña REV-17.

1. Abra la entidad y revise datos y relación de titular. La organización no es una cuenta separada para iniciar sesión.
2. Abra miembros. Marcos ya tiene vínculo MEMBER. Pertenecer a la entidad no concede permisos internos de Brotar.
3. Entre con invitacion y abra /mis-invitaciones. Revise entidad y rol propuesto; acepte la invitación pendiente. Con organizacion actualice miembros y compruebe el efecto.
4. Para probar rechazo cree otra invitación hacia una cuenta que todavía no pertenezca a la entidad. No debe duplicarse una relación activa.
5. Abra las verificaciones de la entidad. Consulte KYB legal y representación; cumplimiento las revisa conservando propiedad y privacidad de documentos.
6. Entre como miembro y compruebe las opciones de su relación. Pegar un enlace administrativo no debe concederle acceso interno.
7. Con organizacion abra Mis proyectos → REV-17. Consulte también su detalle público y confirme la entidad asociada.

Resultado esperado: invitaciones con decisión explícita, relaciones persistidas y documentos visibles solo para titulares o revisores autorizados. Una relación de miembro no equivale a representación legal ni a ADMIN.

<!-- page -->

## 12 Crear editar y conservar borradores

Cuenta: creador. Ruta: /mis-proyectos. REV-01 tiene los pasos completos para facilitar la revisión.

1. Abra REV-01 → continuar o editar. En Información general pruebe resumen corto, campo en blanco y categoría vacía. Corrija antes de seguir. Las categorías ya deben estar disponibles.
2. Abra Historia. Revise problema, solución, beneficiarios y resultados con sus límites. Un indicador necesita nombre, unidad y meta numérica coherente.
3. Abra Plan. Hay dos actividades vinculadas a un hito. Revise responsables y fechas; fin no puede preceder al inicio. Al guardar el hito deben conservarse ambas actividades.
4. En Presupuesto revise categoría, descripción, cantidad, precio e importe. Una medida puede admitir fracciones; dinero tiene precisión limitada. Pruebe cero, negativos y texto en un valor numérico.
5. En Financiamiento compare meta 600 BOB y presupuesto 500. Pruebe meta incoherente, fechas invertidas y duración inválida. Riesgo exige porcentaje de 0 a 100 y mitigación.
6. Revise recompensas según modalidad, portada y checklist. Puede usar portada-huerto.png si reemplaza la imagen.
7. Guarde y vuelva a Mis proyectos. Reabra REV-01 y compruebe persistencia. Cree otro borrador distinto: ambos deben seguir accesibles, sin reemplazo visual ni pérdida del anterior.
8. Envíe a revisión solo cuando no falten requisitos. Recargar no debe crear otra campaña. Para no modificar REV-01 puede usar REV-02 al probar revisión.

Anote el campo, valor rechazado y mensaje. No basta comprobar que HTML limita la escritura: el servidor también valida los datos.

<!-- page -->

## 13 Revisar corregir y publicar

Cuentas: revisor, creador y administrador. Ruta: /administracion/campanas.

1. Con revisor abra REV-02. Revise secciones y creador. Solicite cambios indicando campo y explicación útil; guarde y confirme el estado.
2. Con creador abra esa campaña desde Mis proyectos, corrija y reenvíe. El historial conserva la ronda anterior. REV-19 ya está observada para empezar directamente por esta parte.
3. Con revisor actualice y apruebe la nueva ronda. Aprobar y publicar son operaciones separadas. El creador no se aprueba a sí mismo.
4. Para publicar directamente, con administrador abra REV-03, ya aprobada. Pulse Publicar, confirme y espere. Sin sesión búsquela en Explorar y revise portada y contenido.
5. Antes de aprobar el KYC de Iván, abra REV-18 con administrador e intente publicar. Debe explicar la identidad pendiente. Complete su verificación, actualice y repita para comprobar el camino válido.
6. Los títulos iguales o parecidos no se bloquean automáticamente. Identificador y slug sí son únicos. Las coincidencias sirven para revisión, sin prohibición absoluta por nombre.

Compruebe que una pestaña desactualizada no sobrescribe la ronda vigente y que un rechazo del servidor no se presenta como guardado. Un bloqueo por identidad pendiente es correcto cuando muestra el requisito concreto.

<!-- page -->

## 14 Aportar con y sin recompensa

Cuenta: patrocinador. Escenarios: REV-04 donación, REV-05 recompensa y REV-06 preventa. Entre desde el botón de apoyo del detalle público para conservar la campaña en el checkout.

1. Abra REV-04 y seleccione, por ejemplo, 25.00 BOB. Revise resumen, condiciones y confirmación requerida.
2. Continúe al checkout integrado. El ensayo aislado y el aporte integrado son pasos diferentes: elegir un importe todavía no confirma un pago.
3. Seleccione QR y escanéelo con cámara o lector. Debe identificar la operación interna, sin cobrar a un banco. Use los controles del simulador para confirmar el resultado.
4. Compruebe estado confirmado, referencia, importe y método. Recargue y abra Mis aportes: no debe duplicarse la confirmación.
5. En REV-05 introduzca menos de 50 BOB: la recompensa de 50 no debe estar habilitada. Si permite apoyar sin recompensa, seleccione esa opción. Con 50 o más elija la tarjeta de semillas y manual.
6. Revise monto, recompensa y cupos. Importe negativo, más de dos decimales o recompensa incompatible se rechazan. La reserva no debe consumir cupos dos veces por doble clic.
7. En REV-06 revise preventa y entrega estimada. Complete otro aporte si quiere comparar modalidades; no cambie la selección sin volver a revisar el resumen.

El QR es escaneable pero no es bancario. No se solicita tarjeta ni se debita dinero real. Un estado pendiente, fallido o vencido no debe verse como recaudación confirmada.

<!-- page -->

## 15 Consultar aportes y comprobantes

Cuenta: patrocinador. Rutas: /panel-patrocinador y /mis-aportes.

1. Localice REV-04: tiene ejemplos confirmado, pendiente, fallido y vencido. Compare mensajes y acciones de cada estado.
2. Abra el confirmado. Revise referencia BRT-C, campaña, importe, moneda, método y fecha. Abra su comprobante y contraste los datos. Es un comprobante interno, no factura ni recibo bancario.
3. Abra fallido o vencido y revise el reintento permitido. No debe acreditar dos veces un pago confirmado.
4. Abra REV-15. Su pago original es 300 BOB y tiene una solicitud parcial de 50. Distinga pagado, devuelto y reservado: el pago original no equivale siempre al saldo disponible.
5. Abra incidencias y devoluciones desde el panel. Los accesos deben mantener el aporte elegido; no intercambie IDs de campaña y pago.
6. Entre como usuario o creadorajeno y pegue la URL privada de ese aporte. Debe denegar acceso sin revelar datos ajenos.
7. Desde una campaña pública añada favoritos o seguidos. Compruebe en /mis-guardados, recargue y retire. Son registros de interés, no aportes monetarios.

Capture campaña, referencia y estado para respaldar el resultado. No capture tokens ni enlaces privados del buzón. El panel del patrocinador y el panel laboral de FINANCE deben ofrecer accesos coherentes con su función.

<!-- page -->

## 16 Devoluciones y archivos de respaldo

Cuentas: patrocinador y finanzas. Escenario: REV-15. Rutas: /mis-devoluciones y /administracion/devoluciones.

1. Con patrocinador abra la solicitud preparada de 50 BOB. Observe avance, causa, explicación y adjunto. El pago original es 300 y la solicitud reserva 50 mientras siga vigente.
2. Con finanzas localice REV-15. Confirme titular por nombre y correo y descargue su evidencia desde la acción autorizada.
3. Escriba motivo y autorice. Después complete mediante la acción del simulador. Autorizar no equivale a devolver: deben distinguirse ambos estados.
4. Con patrocinador actualice: debe mostrar 50 devuelto y, sin otros compromisos, 250 restante. No solicite nuevamente 300.
5. Para un nuevo caso abra aporte → Solicitar devolución. Revise disponible, introduzca un importe dentro del saldo, seleccione causa y explique con claridad.
6. Adjunte imagen o PDF admitido dentro de los límites. Espere la carga antes de enviar. Pruebe extensión no admitida, exceso de tamaño y archivo ajeno.
7. Envíe una vez y recargue solicitudes existentes. Un doble clic no debe reservar dos veces. FINANCE también puede rechazar con una observación útil, liberando la reserva correspondiente.

La devolución total corresponde al saldo todavía elegible. Cancelación y meta incumplida tienen tratamiento automático propio; no duplique una solicitud manual por el mismo importe.

<!-- page -->

## 17 Incidencias respuestas y disputas

Cuentas: patrocinador y soporte. Escenarios: REV-15 y REV-16. Rutas: /mis-incidencias, /administracion/soporte y /administracion/disputas.

1. Con patrocinador abra la incidencia de REV-15. Ya tiene consulta y respuesta de soporte con adjunto. Lea y descargue desde la pantalla autorizada.
2. Responda con un texto claro y archivo sintético de assets. Espere la carga y envíe una vez. Vacío o solo espacios se rechaza.
3. Con soporte abra el caso, revise titular y aporte, asígnelo si procede y responda también con un adjunto. Una nota interna no debe confundirse con mensaje compartido.
4. Con patrocinador actualice: debe aparecer la respuesta. El aviso de correo depende de contacto verificado y preferencias; léalo con review-mailbox.mjs. No debe adjuntar documentos privados en el correo.
5. Con soporte abra la disputa de REV-16. Tiene incidencia por pago no reconocido y 200 BOB vinculados. Revise evidencia, asuma investigación y use la transición permitida.
6. Escriba resolución motivada. Resolver una disputa no ejecuta por sí mismo devolución: FINANCE autoriza y completa el movimiento financiero por separado si corresponde.
7. Para otra disputa, patrocinador crea primero una incidencia asociada a un aporte propio y usa la opción habilitada. Una consulta sin pago no inventa una disputa financiera.

Compruebe acceso del titular, archivos protegidos, límites y bloqueo de doble resolución. Un estado terminal no debe cambiar desde una pestaña antigua.

<!-- page -->

## 18 Finanzas y conciliación

Cuenta: finanzas. Rutas: /administracion/finanzas y /administracion/conciliacion.

1. Revise resumen por moneda y estado, confirmados, devoluciones y desembolsos. Compare REV-15 con su aporte y devolución anterior.
2. Abra Conciliación. Existe un lote del día de preparación. Consulte referencia, totales y líneas: contrasta registros internos con eventos del simulador.
3. Para otro lote elija rango de sus operaciones y BOB. Inicio no puede superar fin ni usar un período inválido. Ejecute una vez y revise el resultado.
4. Los registros preparados deben conciliar como coincidentes. Para ver cambios del resumen, confirme un aporte nuevo y genere otro lote que incluya ese día.
5. Revise por separado el pago pendiente de REV-04. Pendiente no es confirmado. Una diferencia no se corrige inventando movimientos o alterando un importe manualmente.
6. Desde Finanzas abra Devoluciones y Desembolsos. Compruebe identificación de solicitante y beneficiario, manteniendo los UUID en referencias secundarias.
7. Con administrador intente escribir una operación financiera: ADMIN por sí solo no puede mover fondos. AUDITOR consulta sus proyecciones autorizadas sin operar.

No sume monedas diferentes ni atribuya eventos internos a un banco externo. Totales y cambios deben calcularse con precisión monetaria y conservar su estado real.

<!-- page -->

## 19 Vencimiento cancelación y devolución automática

Cuenta: administrador. Ruta: /administracion/ciclo-campanas. Use una campaña distinta para cada camino.

1. Abra REV-07: 600 BOB confirmados y plazo terminado. Finalice recaudación con motivo y confirmación. Revise el resultado calculado.
2. Si habilita ejecución, iníciela. Debe pasar a En ejecución y no aceptar nuevos aportes. No cambie el reloj ni edite SQL para forzar este caso.
3. Abra REV-13, todo o nada con meta 600 y confirmado 100. Finalice recaudación. La meta incumplida debe activar el tratamiento de devolución del saldo permitido, sin exigir otra solicitud por lo mismo.
4. Abra REV-14: el creador ya pidió cancelar y tiene 100 confirmados. Revise y apruebe cancelación si corresponde. Compruebe estado y proceso automático.
5. Con patrocinador consulte aportes/devoluciones y con finanzas la devolución resultante. Actualizar varias veces no debe devolver dos veces.
6. Si había devoluciones anteriores solo corresponde el remanente elegible. Compromisos que impidan devolución automática deben quedar explicados, sin saldo negativo ni salto de autorizaciones.
7. Sin sesión compruebe estado público y que campañas vencidas/canceladas no acepten nuevos aportes.

Finalizar recaudación no es cerrar definitivamente una campaña. El cierre definitivo requiere ejecución, rendición y resolución de pendientes.

<!-- page -->

## 20 Destino y desembolsos

Cuentas: creador y finanzas. Escenarios: REV-08 y REV-09.

1. Con creador abra REV-08 → Destino y desembolsos. Está en ejecución con 600 confirmados. El destino aún necesita revisión.
2. Con finanzas abra /administracion/desembolsos, seleccione REV-08 y revise titular, referencia y versión. Verifique o rechace con motivo. Use el destino sintético preparado.
3. Con creador actualice y solicite hasta el saldo disponible. Debe usar versión vigente del destino; monto negativo, excesivo o versión antigua se rechaza.
4. Para comenzar directamente por una solicitud use REV-09: destino verificado y desembolso pendiente de 600 BOB.
5. Con finanzas abra esa solicitud y revise bruto, costos, neto, beneficiario y creador. Autorice, procese y complete por el simulador en el orden permitido.
6. Con creador actualice: completado pasa a estar disponible para rendición. Autorización o procesamiento no equivalen a finalización.
7. Repita la acción o use otra pestaña antigua: no debe duplicar el desembolso. ADMIN sin FINANCE no puede operarlo.

El creador solicita y FINANCE autoriza/completa. Para revisar avances sin este trabajo previo use REV-10, que ya tiene 600 BOB desembolsados.

<!-- page -->

## 21 Avances hitos y recompensas

Cuenta: creador. REV-10 para avances y REV-20 para recompensas. Acceda desde Mis proyectos.

1. En REV-10 abra Avances. Hay dos actividades y un hito compartido. Vincularlas no debe eliminar una actividad.
2. Complete la primera: responsable, estado, porcentaje y fechas reales. Pruebe porcentaje mayor que 100 y fin anterior al inicio, corrija y guarde. Recargue.
3. Complete segunda actividad e hito cuando corresponda. Una fecha real puede ser pasada dentro de la ejecución; no aplique a gastos o trabajo real la regla de fecha futura de planificación.
4. Actualice Familias participantes con un valor coherente. Cree una novedad descriptiva y publique solo información destinada al público.
5. En REV-20 abra Preparar cierre. Tiene un aporte confirmado con recompensa. Consulte la obligación, seleccione la acción de cumplimiento disponible, adjunte respaldo privado y explique la entrega.
6. Compruebe historial y propiedad. El archivo de entrega no se vuelve imagen pública por adjuntarlo.
7. Como creadorajeno pruebe editar esa campaña: no debe permitirse. Soporte solo puede consultar su alcance autorizado.

REV-20 seguirá bloqueada para cierre mientras tenga actividades, recompensas o rendiciones pendientes. Esos bloqueos son válidos y no deben eliminarse para que aparezca el botón.

<!-- page -->

## 22 Rendición mensual y devolución de remanente

Cuentas: revisor, creador y finanzas. REV-20 representa un mes terminado: 600 BOB recibidos e informe de 300 presentado.

1. Con revisor abra /administracion/rendicion → REV-20. Revise período, gastos y archivo privado. Apruebe o solicite correcciones con motivo y confirmación.
2. Si pidió cambios, creador abre Rendición, corrige, guarda y presenta; revisor vuelve a evaluar. Un informe aprobado no se edita directamente.
3. Con creador compruebe 600 desembolsados, 300 justificados y 300 disponibles antes de nuevas operaciones. Revise historial y no duplique gastos aprobados.
4. Publique el resumen aprobado si desea demostrar transparencia. Sin sesión consulte la rendición pública; no deben aparecer documentos privados ni cuentas de destino.
5. Solicite devolver remanente de 300, adjunte evidencia y confirme. La solicitud reserva importe pero no demuestra devolución completada.
6. Con finanzas autorice y complete con un respaldo privado propio. Con creador actualice: devuelto 300, sin reserva duplicada ni saldo negativo.
7. Un informe mensual cubre mes ya terminado. El primero se recorta al inicio de ejecución. No se permite rendir anticipadamente el mes actual ni superponer otro período.

La devolución de remanente del beneficiario es distinta de la devolución al aportante. No use Mis devoluciones para justificar fondos de ejecución.

<!-- page -->

## 23 Rendición final y cierre definitivo

Cuentas: revisor y administrador. REV-11 está pendiente y REV-12 es referencia cerrada.

1. Con revisor abra /administracion/cierre-campanas → REV-11. Tiene actividades terminadas, desembolso 600 y un informe final con gasto y evidencia.
2. Revise resultados, indicadores, fechas, variaciones y pendientes. Gastos periódicos aprobados se incorporan acumulativamente; no se vuelven a cargar como gastos nuevos.
3. Solicite correcciones o apruebe con motivo. El creador no aprueba su propio cierre. Aprobar rendición tampoco ejecuta un desembolso.
4. Con administrador abra Ver bloqueos y decidir el ciclo. Actualice y compruebe ausencia de actividades, recompensas, incidencias y operaciones financieras pendientes.
5. Seleccione cerrar y confirme con motivo. Debe pasar a Cerrada y conservar historia. Sin sesión sigue consultable y no acepta aportes.
6. Compare con REV-12, ya cerrada, sin reabrirla para pagos nuevos.
7. Para observar bloqueos abra REV-10 o REV-20 antes de terminar sus pendientes. La pantalla debe explicar lo que falta. Complete en cada módulo y actualice, sin cambiar estado directamente en base.

No basta que venza el plazo o se alcance la meta: se exige ejecución demostrada, rendición revisada y compromisos resueltos. ADMIN decide ciclo; REVIEWER revisa informe; FINANCE opera fondos.

<!-- page -->

## 24 Permisos catálogos y auditoría

Cuentas: administrador, auditor, auditorcombinado y usuario.

1. Con administrador consulte /administracion/usuarios y responsabilidades. Para conceder o revocar un rol use una cuenta adicional y no altere los operadores principales durante la prueba.
2. En /administracion/personas revise relaciones y restricciones. Rehabilitar restringido debe cambiar el resultado de acceso, que antes se denegaba.
3. En /administracion/catalogos confirme cinco categorías activas. No desactive todas: bloquearía campañas de otros revisores. Parámetros exigen clave, tipo, valor y permisos válidos.
4. Con auditor abra /administracion/auditoria. Filtre período, entidad o acción. Revise actor, fecha y referencia; pruebe paginación y exportación autorizada.
5. No deben aparecer contraseñas, tokens, documentos privados ni binarios en el historial exportado.
6. Con auditorcombinado compruebe consulta y escritura denegada, aunque tenga ADMIN. Una restricción esperada no es defecto.
7. Con usuario abra directamente rutas administrativas: el servidor también debe denegarlas, no solo ocultar enlaces del menú. Revoque un permiso de una cuenta adicional y confirme efecto al actualizar.

Resultado esperado: permisos por responsabilidad y propiedad, sin autoaprobación ni poderes financieros implícitos de ADMIN.

<!-- page -->

## 25 Persistencia problemas y evidencia

**Reinicio controlado:** anote referencias de aporte, incidencia y desembolso. Detenga API/frontend, vuelva a abrir Docker, repita setup con los mismos argumentos y arranque servicios. Deben persistir datos y archivos. No ejecute down -v.

**API no conecta:** revise /api/health/ready y terminal backend en sus puertos configurados. No mezcle localhost con 127.0.0.1 durante la sesión ni copie .env de otra computadora.

**Puerto ocupado:** cierre la instancia anterior o prepare otra carpeta con proyecto y puertos diferentes. El frontend utiliza puerto estricto; no debe cambiar silenciosamente.

**Sin categorías:** confirme que setup terminó. Prepara categorías después de migrar y antes de crear campañas. No añada una lista fija en frontend para ocultar el error.

**Configuración existente:** no borre .env ni fuerce importación. Use carpeta nueva. Una base con usuarios sin manifiesto no es un destino seguro para estas credenciales públicas.

**Reloj de Docker:** si sellos quedan en futuro, sincronice Docker Desktop y repita. El importador espera un intervalo limitado y conserva avances; no quita validaciones ni cambia el reloj del sistema.

**Hallazgo:** anote recorrido, cuenta/rol, campaña REV, URL sin tokens, pasos exactos, esperado, observado, captura y fecha. Una denegación esperada es una prueba correcta. No marque guardado sin recargar y comprobar persistencia.

<!-- page -->

## 26 Lista final de revisión

| Área | Resultado que debe comprobar |
|---|---|
| Instalación | Copia limpia, categorías, 43 migraciones y adjuntos disponibles |
| Acceso y correo | Registro, sesión, restricción, verificación y recuperación de un solo uso |
| Identidad | Pendiente, observación, corrección y revisión privada |
| Organización | Titular, miembro, invitación y campaña institucional |
| Campañas | Varios borradores, validaciones, revisión y publicación separada |
| Aportes | Donación, recompensa, preventa, QR, fallo y reintento |
| Patrocinador | Historial, comprobante, favoritos y accesos a solicitudes |
| Finanzas | Conciliación, exactitud, destinos y desembolsos |
| Devoluciones | Total elegible, parcial, archivos y no duplicación |
| Soporte | Respuestas con adjuntos, privacidad y avisos |
| Disputas | Investigación y resolución separada de devolución |
| Ciclo | Vencimiento, meta incumplida, cancelación y ejecución |
| Ejecución | Actividades, hito, recompensas y evidencia |
| Rendición | Mes cerrado, revisión, publicación y remanente |
| Cierre | Informe final aprobado y pendientes resueltos |
| Control | Permisos, auditoría y persistencia tras reinicio |

Registre Correcto, Hallazgo o No ejecutado por fila, responsable y evidencia. Use una instalación por revisor para que otro no cambie los estados mientras documenta.

Fuentes: README de DEV, rutas del software, accounts.json, scenarios.mjs y comprobaciones de esta carpeta. Las condiciones son provisionales del equipo para el alcance académico; no sustituyen aprobación legal del cliente ni habilitan operación financiera real.
