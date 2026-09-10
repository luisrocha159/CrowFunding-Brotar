# Fase 5 · Acceso básico simulado

## Alcance implementado

| Pantalla | Comportamiento |
| --- | --- |
| Inicio de sesión | Correo y contraseña obligatorios, mostrar/ocultar contraseña, acceso incorrecto, error de solicitud, carga, confirmación y regreso al contenido público |
| Crear cuenta | Nombre, apellido, correo, contraseña y confirmación; perfil Usuario/Creador/Organización; aceptación manual; errores de campos, correo existente, carga y confirmación |
| Recuperar contraseña | Correo obligatorio y válido, carga, error con reintento y confirmación explícitamente simulada |

No se crean cuentas, sesiones, enlaces de recuperación, correos, paneles privados ni pagos. El éxito es un estado de interfaz, no autorización para una operación. Las confirmaciones se muestran en la misma pantalla, no como módulos nuevos fuera del alcance.

## Referencias y decisiones

Se revisaron en modo de lectura los frames `07-Inicio Sesion` (1:5199), `08-Crear Cuenta` (1:4877) y `09-Recuperacion Contra` (1:5318) del Figma CrownFundingV3. El conector informó un límite de consultas; la inspección visual se completó en el navegador sin modificar el archivo compartido.

Se mantienen el logo oficial local, Poppins/Inter, colores y componentes existentes. Acceso y registro conservan la composición de panel verde y formulario; recuperación utiliza un bloque centrado. Las variantes separadas del boceto se convierten en estados interactivos. No se copian métricas promocionales como resultados reales ni se habilitan destinos privados.

La lista UI/UX se aplicó a etiquetas, errores asociados, foco tras respuestas, objetivos táctiles, bloqueo durante carga y adaptación móvil. El script de búsqueda de esa skill no estaba disponible; no se introdujo una paleta alternativa ni nuevas dependencias.

La regla de contraseña de registro se presenta como provisional: mínimo 8 caracteres, una mayúscula y un número. Inicio de sesión solo exige contraseña no vacía. La casilla de condiciones prueba la aceptación, pero no sustituye el texto legal definitivo, pendiente del equipo responsable.

## Organización y tratamiento de datos

- `validation.ts`: reglas puras y valores ficticios, separadas de las vistas.
- `navigation.ts`: conserva perfil y una continuación pública permitida entre formularios. Descarta destinos externos, privados o desconocidos; no copia correo ni contraseña a los enlaces.
- `useAccessRequest.ts`: estado de solicitud, bloqueo de envíos duplicados y cancelación al salir de la vista.
- `mocks/access/accessService.ts`: temporizador de un segundo que devuelve el escenario elegido. No recibe credenciales ni datos personales; no usa red ni almacenamiento.
- Los datos escritos permanecen solo en el estado del formulario. Las contraseñas y la confirmación se vacían tras la respuesta; el correo se conserva en los errores para poder corregirlo. Recargar elimina este estado.

## Guion de demostración

1. Entrar desde Apoyar en un proyecto activo. Enviar vacío y comprobar los errores.
2. Abrir **Probar esta pantalla**, cargar datos ficticios y elegir **Credenciales incorrectas**. Enviar y comprobar carga, bloqueo y error.
3. Cargar de nuevo los datos de prueba, enviar con **Acceso correcto** y usar **Volver al proyecto**.
4. Abrir registro desde Crear proyecto. Comprobar perfil Creador preseleccionado; cambiar de perfil sin perder los campos.
5. Cargar datos ficticios: sin aceptar condiciones debe bloquearse el envío. Probar confirmación diferente, correo existente y registro correcto.
6. En recuperación, probar correo inválido; después cargar datos, elegir **Error de solicitud** y enviar. **Reintentar solicitud** muestra éxito sin enviar correo ni cambiar contraseña.

El resultado elegido solo se procesa cuando los campos son válidos. Los controles de muestra permiten repetir los estados sin cuentas reales. En registro la aceptación nunca se marca automáticamente.

## Verificación

- `bun run check`: lint, TypeScript, 46 pruebas automáticas y build.
- 17 pruebas nuevas: reglas de correo, campos, contraseña, confirmación, aceptación, perfiles, continuaciones públicas, exclusión de datos en enlaces, respuestas simuladas y cancelación. Se conservan las 29 pruebas anteriores.
- Navegador: campos vacíos, foco en primer error, mostrar contraseña, envío de acceso incorrecto y correcto, campos y acciones bloqueados durante carga, regreso al proyecto original.
- Registro: aceptación obligatoria, correo existente conservado con contraseñas vacías, confirmación distinta, selección de Organización y confirmación correcta; navegación entre formularios conserva el perfil.
- Recuperación: correo inválido, carga, foco en mensaje de error, reintento y confirmación que informa que no se envió correo.
- Inspección visual de las tres pantallas a 320 px y revisión de ancho en tableta; no equivale a una auditoría completa de todos los navegadores ni a una prueba de autenticación real.

## Pendiente para el cierre de entrega

Completar portadas específicas de campañas y optimización de imágenes, revisar el recorrido público completo y preparar la entrega. El texto legal definitivo sigue pendiente; la muestra no debe presentarse como un sistema listo para manejar cuentas o dinero real. No se configuró repositorio remoto ni despliegue.
