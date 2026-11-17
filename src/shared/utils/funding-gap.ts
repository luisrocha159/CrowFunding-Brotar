/** Remaining funding in integer cents; an overfunded campaign has no gap. */
export function getFundingGapCents(goalCents: bigint, raisedCents: bigint): bigint {
  if (goalCents <= 0n) throw new RangeError('La meta debe ser mayor que cero')
  if (raisedCents < 0n) throw new RangeError('La recaudación no puede ser negativa')
  return raisedCents >= goalCents ? 0n : goalCents - raisedCents
}
