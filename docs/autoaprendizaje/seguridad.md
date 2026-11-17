# Revisión de seguridad del repositorio Brotar

Consulta del 17/11/2026 con la cuenta `ricardoNP0`, que tiene escritura y no administración. Repositorio: [CrowFunding-Brotar](https://github.com/luisrocha159/CrowFunding-Brotar). La consulta al repositorio del curso confirmó únicamente lectura para esta cuenta, por lo que la actividad se desarrolla en el repositorio del proyecto conforme a la alternativa del enunciado.

## Lista de verificación

| Aspecto | Estado observado | Riesgo | Acción recomendada |
| --- | --- | --- | --- |
| Visibilidad | API: `private=false`, visibilidad pública. El README declara un MVP académico y operaciones simuladas. | La publicación accidental de datos privados sería accesible a terceros. | Mantener exclusivamente datos sintéticos y revisar el diff de cada contribución. |
| Accesos | Un administrador y cuatro colaboradores con escritura, según la consulta de colaboradores. Ricardo no puede administrar permisos. | Colaboradores inactivos podrían conservar acceso de escritura. | El propietario debe revisar periódicamente la lista y confirmar la necesidad de cada acceso. No se revocaron accesos durante esta actividad. |
| Rama principal e integración | `main` y `DEV` devuelven `protected=false`; las consultas de reglas aplicables devuelven listas vacías. | La convención escrita no impide cambios directos ni obliga a revisar. | El administrador debería proteger ambas ramas y exigir PR y al menos una aprobación de otra persona. |
| Pull Requests | Antes de esta actividad, la consulta de PR abiertos y cerrados devolvió una lista vacía. `CONTRIBUTING.md` establece revisión, pero no se observaron reglas que la exijan. | Se podrían integrar cambios sin una revisión independiente. | Utilizar el PR de esta actividad como primer registro verificable y registrar observaciones y correcciones antes de integrar. |
| Secretos | `.gitignore` excluye `.env`, variantes, respaldos y carpetas privadas. Se revisaron 904 archivos de texto UTF-8 versionados de la base: sin `.env` no ejemplares versionados ni coincidencias con los cinco patrones comprobados. | Un secreto con otro formato o en el historial podría no detectarse. | Mantener la revisión del diff y valorar detección automática. Si se detecta una credencial real, revocarla y tratar el historial según el procedimiento del propietario. |
| Dependencias | `bun audit --json`: 12 avisos (5 altos, 6 moderados y 1 bajo). `pnpm audit --prod --json` en backend: 10 avisos (2 altos, 8 moderados). Ambos finalizan con código 1 por hallazgos. | Dependencias directas o transitivas pueden afectar herramientas o ejecución según su exposición. | Priorizar avisos altos, estudiar las rutas de dependencia y actualizar en un PR específico con pruebas. No se cambiaron versiones ni lockfiles aquí. |
| Recuperación | Existen remoto Git, historial local y scripts de recuperación del backend. No se ejecutó una restauración ni se verificó una copia independiente de datos en esta actividad. | Git no respalda la base ni los archivos privados; las copias en un mismo disco comparten riesgo de pérdida. | Definir responsable, periodicidad y almacenamiento separado; comprobar una restauración en un entorno aislado. |

Los avisos del frontend incluyen dependencias de desarrollo; el backend se auditó con `--prod`. Los conteos no representan vulnerabilidades únicas entre ambos entornos ni demuestran explotación. La respuesta 404 al consultar la activación de alertas de Dependabot no permite concluir si está desactivado o si faltan permisos.

El escaneo local fue una comprobación por patrones de tokens GitHub, claves AWS, claves privadas, claves Google y URL de base con contraseña. Excluyó binarios, archivos no UTF-8, archivos privados no versionados e historial Git. Cero coincidencias no demuestra ausencia total de secretos.

## Recomendaciones prioritarias justificadas

1. **Proteger `main` y `DEV` con revisión obligatoria.** Reduce el riesgo concreto de cambios directos observado en la configuración actual. Debe configurarlo el administrador; esta actividad propone la medida sin cambiar ajustes.
2. **Resolver los avisos altos de dependencias en una contribución separada.** Las auditorías detectaron avisos reales; revisar alcance, dependencias transitivas y compatibilidad antes de actualizar permite reducir riesgo sin una actualización indiscriminada.
3. **Separar los respaldos del código y ensayar la restauración.** La base y adjuntos privados no están cubiertos por Git; una recuperación ensayada evita depender únicamente de copias locales.
4. **Revisar accesos y utilizar MFA con cuentas individuales.** Facilita limitar privilegios y atribuir cambios a cada persona. El estado MFA individual no fue visible con el acceso utilizado y no se declara verificado.

## Fuentes y evidencia

- [Configuración y resultados resumidos de esta actividad](evidencias/resultados.json).
- [Protección de ramas, documentación oficial](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Autenticación de dos factores, documentación oficial](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication).
- Los informes originales de auditoría y revisión por patrones se adjuntan al informe académico. No contienen valores de credenciales.
