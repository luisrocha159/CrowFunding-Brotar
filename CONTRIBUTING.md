# Contribuir a Brotar

## Ramas y responsabilidad

- `main`: base entregada para revisión de líderes. No hacer desarrollo cotidiano aquí.
- `DEV`: integración del equipo.
- `RicardoDev`, `AlisonDev`, `SantiagoDev`: ramas personales existentes; no crear variantes que solo cambien mayúsculas.
- Flujo: rama personal → Pull Request a `DEV` → revisión y pruebas → Pull Request de `DEV` a `main`.

La integración actual del Sprint 1 se publica en `DEV`. `main` y las ramas personales no se actualizan automáticamente: cada integrante debe incorporar `origin/DEV` en su propia rama, con su trabajo guardado, usando el procedimiento siguiente. No se fuerza ni sobreescribe el trabajo remoto de nadie. Esta convención no configura protecciones de GitHub; el propietario deberá establecerlas si corresponde.

## Primera vez: cada persona elige SOLO su rama

Después de clonar e instalar según el README, comprobar `git status` limpio. No ejecutar los tres bloques seguidos.

Alison:

```powershell
git fetch origin
git switch --track origin/AlisonDev
```

Santiago:

```powershell
git fetch origin
git switch --track origin/SantiagoDev
```

Ricardo:

```powershell
git fetch origin
git switch --track origin/RicardoDev
```

Si la rama ya existe localmente, usar `git switch AlisonDev`, `git switch SantiagoDev` o `git switch RicardoDev` en lugar de `--track`. Revisar `git branch --show-current` antes de editar.

## Antes de cada tarea

1. Abrir su tarjeta de Trello; comprobar responsable, criterios, dependencias y verificación pendiente.
2. Acordar el alcance inmediato y documentar decisiones. No implementar reglas financieras, legales o de identidad inventadas.
3. Con el árbol limpio, incorporar los cambios de integración a la rama personal:

```powershell
git fetch origin
git merge origin/DEV
```

4. Si hay conflictos, resolverlos con el autor de los archivos, revisar el diff y repetir pruebas. No usar force-push ni `reset --hard` para hacerlos desaparecer.
5. Mover la tarea a En curso. Mantener su ID y etiqueta de sprint. No mover la historia BG del catálogo general.

Para trabajo guardado a medias, conservarlo primero en un commit propio revisado o mediante el mecanismo acordado con el equipo; no cambiar ramas a ciegas.

## Al terminar una tarea

Desde la raíz:

```powershell
bun run check
cd backend
pnpm run check
```

Si cambia persistencia/API, ejecutar también las pruebas de integración locales indicadas en el README. Registrar qué pruebas pasaron y cuáles no se pudieron ejecutar.

Volver a la raíz y revisar antes de preparar el commit:

```powershell
cd ..
git status --short
git diff
git diff --check
```

Añadir **rutas concretas** de la tarea, revisar `git diff --cached` y `git diff --cached --name-only`; no incluir archivos de otro compañero. Ejemplo de mensaje:

```powershell
git commit -m "S1-11: completa validaciones del registro"
```

El ejemplo no autoriza cerrar S1-11 sin resolver los textos y decisiones que realmente falten. Subir solamente la rama propia:

```powershell
git push origin AlisonDev
```

Santiago usa `git push origin SantiagoDev`; Ricardo usa `git push origin RicardoDev`. No usar `git push --force`.

## Pull Request e integración

En GitHub, crear PR con **base DEV** y **compare la rama personal**. No seleccionar main como destino cotidiano.

Incluir:

- ID de tarea y BG relacionadas, enlace de Trello.
- Cambios y partes expresamente fuera de alcance.
- Pruebas ejecutadas/resultados y pasos manuales para revisar.
- Cambios de variables de entorno, contratos, dependencias o base, sin valores secretos.
- Capturas con datos ficticios si afecta a interfaz.
- Decisiones pendientes, limitaciones y conflictos con trabajo en paralelo.

Mover la tarjeta a En revisión. Un compañero revisa diff, contrato y pruebas antes de integrar. Preferir merge commit normal al trabajar con ramas personales de larga duración; no reescribir su historial. Después de integrar, cada integrante ejecuta `git fetch origin` y `git merge origin/DEV` en su rama para mantenerse al día.

Ricardo coordina el PR `DEV → main` cuando el incremento integrado esté probado. La fusión debe respetar revisiones y reglas del repositorio. Nadie debe considerar que un PR aprobado equivale automáticamente a aceptación de los líderes.

## Contratos para evitar esperas y conflictos

Reparto aprobado: Alison 4 tareas y Santiago 7. Ver [asignación](docs/asignacion-sprint-1.md).

- Alison puede iniciar acceso y archivos; Santiago puede iniciar migraciones, permisos y categorías.
- Antes de portada/borrador, acordar en un PR/documento pequeño: identificación del borrador, propiedad, contrato de carga, referencia del archivo, errores y guardado/reemplazo. Es una coordinación técnica, no permiso para inventar reglas del cliente.
- Alison puede desarrollar selección/previsualización con un adaptador o fixture explícito mientras Santiago implementa el borrador; no cerrar S1-19 hasta conectar y probar persistencia real.
- Santiago entrega S1-16 a DEV tan pronto esté revisada, sin esperar terminar todo su bloque. Alison incorpora DEV y termina la integración.
- El contrato compartido evita esperar para empezar, pero no elimina la dependencia para cerrar ambas funciones.

No editar simultáneamente routers, contratos compartidos o configuración sin avisar. Preferir PR pequeños por tarea, en el orden de dependencias, en vez de un único PR de todo el sprint.

## Base de datos, secretos y archivos

Usar la base local oficial V2 de cada persona. Nunca compartir `.env`, contraseñas, tokens, dumps ni datos personales en Git/Trello. No publicar el SQL recibido con sus datos iniciales.

No activar sincronización automática del ORM, DDL destructivo ni reinstalar el SQL para actualizar. Las migraciones y su recuperación siguen en S1-10; coordinar el mecanismo antes de modificar el esquema. Una propuesta de migración debe explicar compatibilidad y recuperación sobre copia aislada.

No versionar `node_modules`, `dist`, `dist-test`, cobertura o temporales. Conservar los dos lockfiles y usar el gestor correspondiente. No actualizar dependencias sin necesidad y sin pruebas.

## Cierre en Trello

Una tarea termina cuando cumple su checklist, evidencia y revisión; una BG termina solo al completar todos sus criterios, aunque abarque varios sprints. Mantener las decisiones D01–D10/VT que sigan pendientes.

Tras presentar y aceptar un sprint, archivar únicamente sus tareas terminadas; replanificar lo incompleto y conservar las BG visibles. No cerrar tareas por tener Figma, una tabla o una simulación.
