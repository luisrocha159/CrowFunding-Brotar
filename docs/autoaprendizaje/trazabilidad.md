# Historial y trazabilidad de Brotar

## Tres commits relevantes

| Commit | Autor | Fecha, UTC-4 | Modificación y utilidad |
| --- | --- | --- | --- |
| [4579e52](https://github.com/luisrocha159/CrowFunding-Brotar/commit/4579e52b4598346e89be43db7b5468a78494b494) | ricardoNP0 | 09/11/2026, 03:24:29 | Ajustes de verificación, aportes y paneles de cuenta. Permite localizar el corte funcional de esas mejoras. |
| [abc527d](https://github.com/luisrocha159/CrowFunding-Brotar/commit/abc527d7e63ca31a93e96701a918bf1bd3b6f880) | ricardoNP0 | 09/11/2026, 21:23:20 | Preparación reproducible de revisión con cuentas y escenarios sintéticos y manual. |
| [8c8223e](https://github.com/luisrocha159/CrowFunding-Brotar/commit/8c8223eb993b15c3a55d7e586efc099304a11542) | ricardoNP0 | 09/11/2026, 21:23:58 | Integra el paquete de revisión en DEV. Es la base de la rama de esta actividad. |

## Evolución del archivo CONTRIBUTING.md

Se consultó `git log -- CONTRIBUTING.md`. El archivo registra convenciones de ramas y evolución de entregas. En el corte inicial de esta actividad conservaba una cabecera del 30/10/2026 y una referencia anterior a 40 migraciones, mientras el README ya documentaba la entrega del 09/11 y 43 migraciones. La mejora actual elimina esos números históricos como instrucción vigente y remite al README y al migrador.

Se utilizó `git blame -L 5,16 8c8223e -- CONTRIBUTING.md`: las líneas de definición de `main`, `DEV` y ramas personales proceden de `dc7bcad4`, del 17/09/2026; la aclaración de que la convención no configura protecciones procede de `99d70d71`, del 16/10/2026. `blame` identifica el último cambio de cada línea, no al responsable automático de un defecto.

La rama actual añade un procedimiento de contribuciones pequeñas y vincula la plantilla, la guía de reutilización y las verificaciones. Consultar el historial del [archivo](https://github.com/luisrocha159/CrowFunding-Brotar/commits/DEV/CONTRIBUTING.md) para contrastar la evolución.

## Relación con un Pull Request

La consulta inicial a los PR abiertos y cerrados no encontró resultados. No se inventa una incidencia histórica asociada a los tres commits. El [Pull Request #1](https://github.com/luisrocha159/CrowFunding-Brotar/pull/1), de `docs-mejora-proyecto` hacia `DEV`, relaciona ahora los cambios de documentación y la función de cálculo con sus pruebas y la solicitud de revisión. El [commit 0284f21](https://github.com/luisrocha159/CrowFunding-Brotar/commit/0284f21) contiene la mejora y las pruebas; el PR permite continuar la trazabilidad con la revisión del equipo.

## ¿Cómo ayuda a investigar un defecto?

Si una prueba detecta un error, primero se identifica el archivo y el comportamiento afectado. El historial permite comparar versiones y localizar cuándo cambió; `blame` lleva desde una línea al commit y su contexto. El PR relacionado permite revisar la intención, las pruebas y las observaciones. A partir de ahí puede prepararse una reproducción y, si corresponde, usar `git bisect` sobre una copia aislada. No se ejecutó un bisect ni se atribuye culpabilidad por figurar en una línea.
