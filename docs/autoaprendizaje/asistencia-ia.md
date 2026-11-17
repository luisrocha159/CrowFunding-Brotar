# Implementación y pruebas con asistencia de IA

## Función seleccionada y herramienta

Herramienta: **Codex, asistente de IA de OpenAI**, como alternativa permitida por el enunciado a GitHub Copilot. Se implementó `getFundingGapCents` para calcular cuántos centavos faltan para alcanzar la meta de una campaña de crowdfunding. Es una utilidad independiente disponible para reutilización; en este cambio no se conecta a la interfaz ni se sustituye el cálculo de progreso existente.

## Prompt de trabajo

El siguiente encargo fue registrado y desarrollado por el asistente durante esta actividad; no se atribuye al estudiante haber escrito literalmente este texto:

> Implementa para Brotar una función TypeScript getFundingGapCents(goalCents: bigint, raisedCents: bigint) que calcule cuántos centavos faltan para alcanzar la meta de una campaña. Usa centavos enteros bigint para conservar precisión. Una meta debe ser mayor que cero y la recaudación no puede ser negativa. Al alcanzar o superar la meta, el importe restante debe ser cero. Prepara pruebas unitarias con node:test y assert/strict que cubran una aportación parcial, cero recaudado, meta exacta, sobrefinanciación, un centavo pendiente, meta mínima, entradas negativas, meta cero e importes superiores al entero seguro de Number. No conectes pagos reales ni cambies el flujo de la interfaz.

## Propuesta inicial y revisión

Se conservó una primera versión mínima para contrastarla con los requisitos:

```typescript
export function getFundingGapCents(goalCents: bigint, raisedCents: bigint): bigint {
  return goalCents - raisedCents
}
```

La revisión identificó que podía devolver un saldo negativo al superar la meta y no rechazaba una meta no positiva ni una recaudación negativa. No se integró esa versión: al ejecutarla frente a los diez casos, pasaron seis y fallaron cuatro. Este ensayo documenta la limitación de una implementación mínima y no representa un defecto previamente existente en Brotar.

## Versión final

```typescript
export function getFundingGapCents(goalCents: bigint, raisedCents: bigint): bigint {
  if (goalCents <= 0n) throw new RangeError('La meta debe ser mayor que cero')
  if (raisedCents < 0n) throw new RangeError('La recaudación no puede ser negativa')
  return raisedCents >= goalCents ? 0n : goalCents - raisedCents
}
```

Se usa `bigint` para no perder precisión con centavos ni importes superiores al entero seguro de `Number`; los argumentos deben ser enteros bigint, no valores monetarios decimales ni JSON directo. La conversión desde la entrada de usuario corresponde al punto de integración. `RangeError` rechaza valores fuera del dominio. La sobrefinanciación es válida y produce un saldo restante de cero.

## Casos y resultados

Todos los importes de la tabla están en centavos, salvo la explicación decimal del primer caso.

| Caso | Meta | Recaudado | Resultado esperado y obtenido |
| --- | --- | --- | --- |
| Parcial, 1000.00 menos 250.50 | 100000 | 25050 | 74950 |
| Sin aportes | 100000 | 0 | 100000 |
| Meta exacta | 100000 | 100000 | 0 |
| Sobrefinanciación | 100000 | 125000 | 0 |
| Un centavo pendiente | 100000 | 99999 | 1 |
| Meta mínima | 1 | 0 | 1 |
| Meta cero | 0 | 0 | RangeError |
| Meta negativa | -100 | 0 | RangeError |
| Recaudación negativa | 100000 | -1 | RangeError |
| Enteros grandes | 90071992547409931234 | 90071992547409931233 | 1 |

Comando: `bun test ./tests/funding-gap.test.ts`. Resultado final: **10 aprobadas, 0 fallidas**. Los archivos son `src/shared/utils/funding-gap.ts` y `tests/funding-gap.test.ts`. Los registros de propuesta inicial y ejecución final se adjuntan al informe académico.

## Reflexión y límite de la revisión

La IA ayuda a formular una solución y enumerar casos, pero el código generado debe contrastarse con reglas y pruebas. Restar dos importes no basta para expresar todo el dominio. Las pruebas verifican valores esperados independientes de la implementación e incluyen límites de precisión y valores inválidos. La revisión técnica y ejecución fueron realizadas con asistencia de Codex; la revisión humana independiente se solicita mediante el PR y permanece pendiente hasta que otra persona la realice.
