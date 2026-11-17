# Guía de reutilización de la plantilla de revisión

## Recurso compartible

La [plantilla de revisión de cambios](plantillas/revision-cambio.md) organiza el problema, alcance, pruebas, seguridad y revisión humana de una contribución. Su contenido es genérico y puede utilizarse en otros sistemas de información. La plantilla no contiene credenciales, datos de usuarios ni reglas financieras propias de Brotar.

## Instrucciones de uso

1. Copiar la plantilla en el repositorio del otro equipo, por ejemplo en `docs/plantillas/revision-cambio.md`.
2. Adaptar los nombres de ramas y los comandos a la tecnología del proyecto. No copiar los comandos de Brotar si no corresponden.
3. Completar una copia por cambio y enlazar el requisito o incidencia cuando exista.
4. Registrar resultados reales, incluyendo pruebas no ejecutadas o fallidas. Adjuntar evidencias con datos ficticios.
5. Solicitar revisión a una persona distinta del autor, registrar sus observaciones y atenderlas antes de integrar según las reglas del equipo receptor.

Ejemplo de adaptación: un equipo con una API Java puede reemplazar la verificación de Bun por su comando de Maven o Gradle; el problema, los resultados y la revisión conservan la misma estructura.

## Reglas para proponer modificaciones

- Crear una rama de trabajo y un Pull Request pequeño hacia la integración del equipo.
- Explicar qué campo falta o sobra y cómo mejora la revisión. Añadir un ejemplo genérico sin datos privados.
- Mantener los campos de problema, evidencia y revisión humana; evitar imponer herramientas que otros equipos no utilizan.
- Revisar lenguaje, enlaces y compatibilidad con las copias anteriores. Atender observaciones y registrar el cambio en el historial.

## Responsables de revisión y mantenimiento

Propuesta para Brotar: Ricardo (`ricardoNP0`) coordina el mantenimiento y una persona distinta del autor realiza la revisión; para esta contribución se propone a Alison (`AlisonPizarro1`). La asignación es una propuesta de trabajo y no implica que la persona ya haya revisado o aceptado el recurso.

Cada equipo receptor debe designar su propio mantenedor y un revisor distinto del autor. Las mejoras se incorporan después de la revisión correspondiente y se comunican mediante el Pull Request. Este procedimiento aplica prácticas de código abierto dentro del equipo u organización: InnerSource. No requiere cambiar la visibilidad del repositorio.
