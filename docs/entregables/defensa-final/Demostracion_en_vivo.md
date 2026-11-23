# Demostración en vivo de Brotar

En la diapositiva 45, explicar que se utilizarán tres campañas distintas en tres momentos de su ciclo. Preparar tres perfiles de navegador independientes para conservar las sesiones. La cuenta de Santiago ya tiene la identidad aprobada y el rol de creador. Los importes de los tres escenarios son independientes. Ricardo interviene desde Finanzas para verificar el aporte de Alison antes de pasar al desembolso de otra campaña. Los códigos REV son referencias internas de esta guía. Busquen las campañas por el título visible y su portada.

| Turno | Cuenta | Contraseña de práctica | Caso |
|---|---|---|---|
| Santiago | creador@brotar.test | creador1234567890 | REV-01 · Semilleros para el barrio |
| Alison | patrocinador@brotar.test | patrocinador1234567890 | REV-04 · Huertos familiares de Samaipata |
| Ricardo | finanzas@brotar.test | finanzas1234567890 | REV-09 · Riego para el vivero comunitario |

### Santiago · Del borrador a la revisión

1. Abrir **Mis proyectos**, localizar **Semilleros para el barrio** y continuar con el borrador. Sus datos y su categoría ya están cargados.
2. Avanzar hasta **Revisión y envío**. Mostrar la meta de 600 BOB y el presupuesto de 500 BOB. La diferencia es un aviso informativo.
3. Pulsar **Enviar a revisión**. Volver a abrir la campaña en Mis proyectos y mostrar **En revisión**. La publicación corresponde a una etapa posterior.
4. Dar paso a Alison: «Para ver qué hace un patrocinador, vamos a usar otra campaña que ya está publicada».

### Alison y Ricardo · Del aporte pendiente al comprobante

1. Alison abre **Huertos familiares de Samaipata** en Explorar proyectos, pulsa **Aportar a la campaña**, elige QR, ingresa **25 BOB** y continúa.
2. Revisa el resumen, confirma el importe y pulsa **Continuar al pago**. Muestra el QR y **Pendiente de verificación**. Anota la referencia BRT-C completa. El QR permite volver a consultar el intento.
3. Para representar la recepción en este ejercicio, usen una constancia de práctica independiente con su identificador, la campaña, la cuenta aportante, la referencia BRT-C del intento y los 25 BOB. Cuando falta el respaldo o algún dato difiere, el pago queda pendiente.
4. Ricardo abre **Administración → Finanzas → Revisar pagos pendientes** desde su perfil. Localiza la tarjeta por la referencia y comprueba que coincidan la cuenta, la campaña y el importe. Despliega **Revisar pago**, escribe el identificador en **Referencia de la constancia**, marca la casilla de cotejo y pulsa **Confirmar pago**.
5. Alison pulsa **Actualizar estado** en su sesión. Abre **Ver comprobante** y muestra el importe, el método y la referencia. Pulsa **Imprimir o guardar PDF** para ver la hoja. Vuelve a **Mis aportes** y reabre el comprobante de la misma referencia.
6. Alison da paso a Ricardo: «El aporte quedó confirmado. Ahora Ricardo mostrará cómo se desembolsan los fondos de otra campaña que ya terminó su recaudación».

### Ricardo · De la solicitud al desembolso completado

1. En **Administración → Desembolsos**, buscar **Riego para el vivero comunitario** y abrir **Ver desembolso e historial**. Mostrar la cuenta solicitante, el destino y los **600 BOB**.
2. En **Operar desembolso**, elegir **Autorizar desembolso**, escribir el motivo de la decisión (al menos 20 caracteres), confirmar y pulsar **Registrar acción**.
3. Elegir **Iniciar procesamiento**, justificar y registrar. Luego elegir **Completar desembolso** y registrar la última acción con su justificación.
4. Recargar, mostrar el estado completado y el historial. Volver a la diapositiva **46** para las conclusiones.

### Preparar otro ensayo

Desde una copia nueva de DEV, con Docker en ejecución, seguir el [manual de instalación](../../revision-lideres/Manual_Revision_Brotar.md). Para una segunda copia en la misma PC, utilizar otro nombre de proyecto y puertos libres. Ejecutar en esa copia:

```powershell
node scripts/setup-review.mjs --project=brotar-revision-otro-ensayo --db-port=15590 --api-port=3090 --web-port=5290
```

En dos terminales de la misma carpeta, iniciar `node scripts/start-review.mjs backend` y `node scripts/start-review.mjs frontend`. Abrir http://127.0.0.1:5290. Repetir el instalador en una copia usada conserva su avance. Para practicar los tres finales otra vez, usar una copia y una base nuevas.

### Variante opcional para mostrar recompensas

Alison puede mostrar **Semillas que pasan de mano en mano** en Explorar proyectos. En la ficha, **Ver recompensas disponibles** lleva a **Semillas y manual comunitario**, disponible desde **50 BOB**. Para mostrar la selección, abrir **Aportar a la campaña** e ingresar 50 BOB. Si eligen completar este aporte durante la defensa, usar su propia referencia y cotejar exactamente 50 BOB desde Finanzas. Para mostrar una preventa, **Cultiva tu primera huerta** ofrece un kit de cultivo desde 50 BOB. El recorrido central de las tres cuentas conserva el aporte de 25 BOB en Huertos familiares de Samaipata.
