/** Reglas del equipo (13/10/2026), compartidas con la interfaz; no certifican reglas del cliente. */
export const MINIMUMS = { title: 5, summary: 11, description: 10, story: 20, name: 2 } as const
export const INDICATOR_UNITS = ['personas', 'familias', 'unidades', 'kg', 'litros', 'm²', 'ha', '%', 'BOB'] as const
export const RISK_IMPACTS = ['Bajo', 'Medio', 'Alto'] as const
const controls = /[\p{Cc}\p{Cf}]/u
export const textLength = (value: string) => [...value.trim()].length
export function textError(value: string, min: number, max: number, optional = false): string | undefined {
  if (optional && !value.trim()) return undefined
  if (/[\uD800-\uDFFF]/u.test(value) || controls.test(value.replaceAll('\n', '').replaceAll('\r', '').replaceAll('\t', '')) || /<\/?[a-z][^>]*>/iu.test(value)) return 'Usa texto Unicode válido, sin etiquetas HTML ni caracteres de control.'
  if (!/[\p{L}\p{N}]/u.test(value) || textLength(value) < min || textLength(value) > max) return `Escribe entre ${min} y ${max} caracteres de texto, no solo espacios o símbolos.`
  return undefined
}
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
export const validMoney = (value: number) => Number.isFinite(value) && value > 0 && value <= 999999999999.99 && value === Number(value.toFixed(2))
export function plannedAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * Math.round(unitPrice * 100)) / 100
}
export function totalBudget(items: { plannedAmount: number }[]): number {
  return items.reduce((sum, item) => sum + Math.round(item.plannedAmount * 100), 0) / 100
}
