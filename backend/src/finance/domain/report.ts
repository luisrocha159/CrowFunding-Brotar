export const PAYMENT_STATUSES = ['INITIATED','PENDING','CONFIRMED','FAILED','EXPIRED','REFUNDED','DISPUTED'] as const
export class ReportInvalid extends Error {}
export interface ReportFilters { campaignId?: string; status?: string; from?: string; to?: string }
export function validatePeriod(filters: ReportFilters): void {
  for (const day of [filters.from,filters.to]) {
    if (day !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day<'0001-01-01' || day>'9999-12-31' ||
      !Number.isFinite(Date.parse(`${day}T00:00:00Z`)) || new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)!==day)) {
      throw new ReportInvalid('Usa fechas reales, en formato AAAA-MM-DD.')
    }
  }
  if (filters.from && filters.to && filters.from>filters.to) throw new ReportInvalid('La fecha inicial no puede ser posterior a la final.')
}
/** CSV entrecomillado y neutralizado: los textos no pueden ejecutar fórmulas al abrirse. */
export function reportCsv(rows: readonly (readonly (string | boolean)[])[]): string {
  return '\uFEFF'+rows.map(row=>row.map(value=>{
    let text=String(value)
    if (/^[\s\uFEFF]*[=+\-@]/u.test(text.normalize('NFKC')) || /^[\t\r\n]/.test(text)) text="'"+text
    return '"'+text.replaceAll('"','""')+'"'
  }).join(',')).join('\r\n')+'\r\n'
}
