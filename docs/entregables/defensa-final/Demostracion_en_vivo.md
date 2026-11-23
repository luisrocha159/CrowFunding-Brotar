# Demostración en vivo de Brotar

En la diapositiva 45, explicar que se utilizarán tres campañas distintas en tres momentos de su ciclo. Preparar tres perfiles de navegador independientes para conservar las sesiones. La cuenta de Santiago ya tiene la identidad aprobada y el rol de creador. Los importes de los tres escenarios son independientes. La billetera registra pagos de práctica.

| Turno | Cuenta | Contraseña de práctica | Caso |
|---|---|---|---|
| Santiago | creador@brotar.test | creador1234567890 | REV-01 · Borrador para completar |
| Alison | patrocinador@brotar.test | patrocinador1234567890 | REV-04 · Huerto por donación |
| Ricardo | finanzas@brotar.test | finanzas1234567890 | REV-09 · Solicitud de desembolso lista |

### Santiago · Del borrador a la revisión

1. Abrir **Mis proyectos**, localizar REV-01 y continuar con el borrador. Sus datos y su categoría ya están cargados.
2. Avanzar hasta **Revisión y envío**. Mostrar la meta de 600 BOB y el presupuesto de 500 BOB. La diferencia es un aviso informativo.
3. Pulsar **Enviar a revisión**. Volver a abrir REV-01 en Mis proyectos y mostrar **En revisión**. La publicación corresponde a una etapa posterior.
4. Dar paso a Alison: «Para ver qué hace un patrocinador, vamos a usar otra campaña que ya está publicada».

### Alison · Del aporte al comprobante

1. Desde **Explorar proyectos**, abrir REV-04 y pulsar **Aportar a la campaña**. Ingresar **20 BOB** y continuar.
2. Confirmar el importe, continuar al pago y mostrar el QR con el aporte pendiente.
3. Abrir **Mis aportes**, entrar al detalle del aporte recién creado y elegir **Continuar con el pago**.
4. Abrir la **billetera de práctica**, autorizar los 20 BOB y pulsar **Ver comprobante**. Mostrar el método QR, el estado confirmado y la referencia. Recargar para demostrar que el comprobante persiste.
5. Dar paso a Ricardo: «Ahora veremos cómo Finanzas desembolsa los fondos de una campaña que ya terminó su recaudación».

### Ricardo · De la solicitud al desembolso completado

1. En **Administración → Desembolsos**, buscar REV-09 y abrir **Ver desembolso e historial**. Mostrar la cuenta solicitante, el destino y los **600 BOB**.
2. En **Operar desembolso**, elegir **Autorizar desembolso**, escribir el motivo de la decisión (al menos 20 caracteres), confirmar y pulsar **Registrar acción**.
3. Elegir **Iniciar procesamiento**, justificar y registrar. Luego elegir **Completar desembolso** y registrar la última acción con su justificación.
4. Recargar, mostrar el estado completado y el historial. Volver a la diapositiva **46** para las conclusiones.

### Preparar otro ensayo

Desde una copia nueva de DEV, con Docker en ejecución, seguir el [manual de instalación](../../revision-lideres/Manual_Revision_Brotar.md). Para una segunda copia en la misma PC, utilizar otro nombre de proyecto y puertos libres. Ejecutar en esa copia:

```powershell
node scripts/setup-review.mjs --project=brotar-revision-otro-ensayo --db-port=15590 --api-port=3090 --web-port=5290
```

En dos terminales de la misma carpeta, iniciar `node scripts/start-review.mjs backend` y `node scripts/start-review.mjs frontend`. Abrir http://127.0.0.1:5290. Repetir el instalador en una copia usada conserva su avance. Para practicar los tres finales otra vez, usar una copia y una base nuevas.
