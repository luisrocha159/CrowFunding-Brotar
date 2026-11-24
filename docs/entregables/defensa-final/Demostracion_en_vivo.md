# Demostración en vivo de Brotar

## Preparar la instalación desde main

En una PC con Windows, abra Docker Desktop con el motor Linux y espere a que esté activo. Necesitará Git, Node.js 24.13 o posterior de la serie 24, Bun 1.4.2 y Corepack con pnpm 11.19.0. En PowerShell, desde una carpeta nueva, ejecute:

```powershell
git clone --branch main https://github.com/luisrocha159/CrowFunding-Brotar.git Brotar-Defensa
cd Brotar-Defensa
node scripts/setup-review.mjs
```

Espere a que el instalador termine de cargar las 18 cuentas y los 20 escenarios. Abra dos terminales en la carpeta Brotar-Defensa y deje ambas abiertas.

- **Terminal 1 · servidor** — `node scripts/start-review.mjs backend`
- **Terminal 2 · interfaz** — `node scripts/start-review.mjs frontend`

Abra **http://127.0.0.1:5173**. Para la defensa, usen una misma instalación en la computadora que se proyecta, con un perfil de navegador por cuenta de práctica. Cada integrante puede instalar su propia copia para practicar individualmente. Cada copia tiene su propia base de datos. El recorrido utiliza el buzón local y funciona sin configurar Gmail.

## Preparar las sesiones antes de proyectar

La diapositiva 45 presenta los tres casos centrales. Al abrir el navegador, Santiago añade: «Primero veremos quién habilita al creador. Después de los tres casos, mostraremos cómo se comprueba el uso de los fondos». Mantengan abierta la diapositiva 46 para volver a las conclusiones después del cierre.

| Integrante | Perfil del navegador y correo | Contraseña inicial |
|---|---|---|
| Santiago · titular en verificación | usuario@brotar.test | usuario1234567890 |
| Ricardo · Cumplimiento | cumplimiento@brotar.test | cumplimiento1234567890 |
| Santiago · creador con proyectos | creador@brotar.test | creador1234567890 |
| Alison · patrocinadora | patrocinador@brotar.test | patrocinador1234567890 |
| Ricardo · Finanzas | finanzas@brotar.test | finanzas1234567890 |
| Alison · Revisión final | revisor@brotar.test | revisor1234567890 |
| Ricardo · Administración | administrador@brotar.test | administrador1234567890 |

Preparen las siete sesiones en perfiles independientes o cambien de cuenta cerrando sesión. Dos pestañas del mismo perfil comparten la sesión. Verifiquen el correo de la cuenta activa antes de cada decisión.

**Orden de la defensa.** Identidad personal → envío del borrador → aporte de 25 BOB y comprobante → desembolso de 600 BOB → rendición final y cierre. Se usan **cuatro campañas en distintas etapas**. El aporte de Alison, el desembolso y el gasto final pertenecen a casos independientes.

## 1 Habilitar al creador

**Santiago y Ricardo · 2 a 3 minutos.** El titular es **usuario@brotar.test**. En una copia nueva tiene el expediente personal enviado y carece del rol de creador. La cuenta identidadpendiente pertenece a otro escenario y ya dispone de ese rol.

1. **Santiago**, como **usuario**, abre **Mi cuenta → Iniciativas y permisos → Ver mis permisos y herramientas**. Muestra los roles vigentes antes de la decisión. En **Mi verificación** puede abrir el caso enviado.
2. **Ricardo**, como **cumplimiento**, abre **Administración → Verificaciones**. En Personas, busca el expediente enviado por **usuario@brotar.test** y pulsa **Abrir expediente**. Comprueba el correo y revisa los documentos privados preparados.
3. En **Registrar decisión**, elige pasar a revisión, explica el motivo, marca la confirmación y registra la decisión. Ahora elige aprobar, marca **Revisé y acepto este documento** en cada respaldo válido y explica el resultado. Ejemplo: «Revisé la documentación del expediente y coincide con la identidad declarada». Confirma y registra.
4. **Santiago** vuelve al perfil **usuario**, recarga **Mi cuenta** y abre nuevamente los permisos. Muestra el rol de creador. El público acaba de ver la habilitación desde la misma cuenta sin intervención de Administración.
5. **Transición.** «Esta cuenta ya puede actuar como creadora. Voy a cambiar a la cuenta que tiene un proyecto preparado para que vean cómo se envía a revisión».

**Si usan una instalación anterior:** si usuario aún carece del rol y no tiene un expediente enviado, antes de proyectar acepte las condiciones desde esa cuenta, abra **Mi verificación**, inicie el caso personal, complete los campos con datos de práctica, adjunte los documentos requeridos y envíelo. Pueden usar las imágenes sintéticas de `backend/review/assets`. Si el rol ya fue concedido, usen una copia nueva para repetir el antes y el después.

## 2 Enviar el borrador a revisión

**Santiago · cuenta creador.**

1. Abrir **Mis proyectos**, localizar **Semilleros para el barrio** y continuar con el borrador. Sus datos y su categoría ya están cargados.
2. Avanzar hasta **Revisión y envío**. Mostrar la meta de 600 BOB y el presupuesto de 500 BOB. La diferencia es un aviso informativo.
3. Pulsar **Enviar a revisión**. Volver a abrir la campaña en Mis proyectos y mostrar **En revisión**. La publicación corresponde a una etapa posterior.
4. Dar paso a Alison: «Para ver qué hace un patrocinador, vamos a usar otra campaña que ya está publicada».

## 3 Verificar un aporte y emitir su comprobante

**Alison y Ricardo · patrocinador y finanzas.**

1. Alison abre **Huertos familiares de Samaipata** en Explorar proyectos, pulsa **Aportar a la campaña**, ingresa **25 BOB**, elige QR y continúa.
2. Revisa el resumen, confirma el importe y pulsa **Continuar al pago**. Muestra el QR y **Pendiente de verificación**. Anota la referencia BRT-C completa. El QR permite volver a consultar el intento.
3. Para representar la recepción en este ejercicio, usen una constancia de práctica independiente con su identificador, la campaña, la cuenta aportante, la referencia BRT-C del intento y los 25 BOB. Cuando falta el respaldo o algún dato difiere, el pago queda pendiente.
4. Ricardo abre **Administración → Finanzas → Revisar pagos pendientes** desde su perfil. Localiza la tarjeta por la referencia y comprueba que coincidan la cuenta, la campaña y el importe. Despliega **Revisar pago**, escribe el identificador en **Referencia de la constancia**, marca la casilla de cotejo y pulsa **Confirmar pago**.
5. Alison pulsa **Actualizar estado** en su sesión. Abre **Ver comprobante** y muestra el importe, el método y la referencia. Pulsa **Imprimir o guardar PDF** para ver la hoja. Vuelve a **Mis aportes** y reabre el comprobante de la misma referencia.
6. Alison da paso a Ricardo: «El aporte quedó confirmado. Ahora Ricardo mostrará cómo se desembolsan los fondos de otra campaña que ya terminó su recaudación».

## 4 Desembolsar los fondos

**Ricardo · cuenta finanzas.**

1. En **Administración → Desembolsos**, buscar **Riego para el vivero comunitario** y abrir **Ver desembolso e historial**. Mostrar la cuenta solicitante, el destino y los **600 BOB**.
2. En **Operar desembolso**, elegir **Autorizar desembolso**, escribir el motivo de la decisión (al menos 20 caracteres), confirmar y pulsar **Registrar acción**.
3. Elegir **Iniciar procesamiento**, justificar y registrar. Luego elegir **Completar desembolso** y registrar la última acción con su justificación.
4. Recargar, mostrar el estado completado y el historial. Dar paso a Santiago: «Ahora abriremos otra campaña cuyo creador ya presentó el informe final. Allí veremos en qué se gastaron los fondos».

## 5 Revisar la rendición y cerrar la campaña

**Santiago, Alison y Ricardo · 3 a 4 minutos.** Usen **Tomates del valle**. La rendición ya fue presentada por el creador. Tiene **600 BOB recibidos y 600 BOB justificados**, un gasto en herramientas y materiales y su evidencia privada.

1. **Santiago**, como **creador**, abre **Mis proyectos → Tomates del valle → Preparar cierre**. En **Última rendición final del ciclo**, muestra el importe recibido, el justificado, el gasto y **Evidencia privada 1**. Explica la diferencia de 100 BOB respecto al presupuesto inicial según el informe.
2. **Alison**, como **revisor**, abre **Administración → Cierre de campañas → Tomates del valle → Preparar cierre**. Comprueba período, gasto, respaldo y pendientes. En **Revisar rendición final** selecciona **Aprobar rendición final**, escribe un motivo de al menos 20 caracteres, confirma y pulsa **Registrar acción**. Ejemplo: «El gasto documentado coincide con el total recibido y justificado».
3. **Ricardo**, como **administrador**, abre esa campaña en **Ciclo de campañas**, o usa **Ver bloqueos y decidir el ciclo** desde la preparación de cierre. Actualiza el estado. Comprueba que se resolvieron actividades, recompensas, incidencias y obligaciones financieras.
4. Si el sistema habilita **Cerrar campaña**, selecciona la acción, escribe un motivo, confirma y registra. Recarga y muestra **Cerrada**. Si figura un bloqueo, lee el requisito exacto y muestra qué rol debe atenderlo. Para enseñar el estado terminal de referencia también está **La huerta del encuentro**, ya cerrada.
5. **Vuelvan a la diapositiva 46.** Frase de salida: «Vimos quién aprobó al creador, quién verificó el aporte y quién comprobó el gasto antes de cerrar la campaña».

## Repetir el ensayo y responder preguntas

Desde una copia nueva de main, con Docker en ejecución, seguir el [manual de instalación](../../revision-lideres/Manual_Revision_Brotar.md). Para una segunda copia en la misma PC, utilizar otro nombre de proyecto y puertos libres. Ejecutar en esa copia:

```powershell
node scripts/setup-review.mjs --project=brotar-revision-otro-ensayo --db-port=15590 --api-port=3090 --web-port=5290
```

En dos terminales de la misma carpeta, iniciar `node scripts/start-review.mjs backend` y `node scripts/start-review.mjs frontend`. Abrir http://127.0.0.1:5290. Repetir el instalador en una copia usada conserva su avance. Para practicar las decisiones iniciales y finales otra vez, usar una copia y una base nuevas.

### Variante opcional para mostrar recompensas

Alison puede mostrar **Semillas que pasan de mano en mano** en Explorar proyectos. En la ficha, **Ver recompensas disponibles** lleva a **Semillas y manual comunitario**, disponible desde **50 BOB**. Para mostrar la selección, abrir **Aportar a la campaña** e ingresar 50 BOB. Si eligen completar este aporte durante la defensa, usar su propia referencia y cotejar exactamente 50 BOB desde Finanzas. Para mostrar una preventa, **Cultiva tu primera huerta** ofrece un kit de cultivo desde 50 BOB. El recorrido central de las tres cuentas conserva el aporte de 25 BOB en Huertos familiares de Samaipata.

**Otras preguntas del tribunal.** Soporte puede abrir la disputa preparada de *Del almácigo a la mesa*. Auditoría puede consultar las acciones que realizaron los operadores. Estas pantallas quedan como reserva.
