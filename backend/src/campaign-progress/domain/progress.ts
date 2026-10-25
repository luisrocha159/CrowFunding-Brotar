export const progressStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED'] as const
export interface ProgressRow { id: string; responsibleName: string; status: string; progressPercent: number; actualStartOn: string | null; actualEndOn: string | null }
export interface ProgressInput { revision: string; activities: ProgressRow[]; milestones: ProgressRow[]; indicators: { id: string; achievedValue: number | null }[] }
export interface UpdateInput { revision: string | null; title: string; body: string; milestoneId: string | null; images: { fileId: string; caption: string }[]; publish: boolean }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const plain = (value: string, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[<>]/u.test(value) && ![...value].some(char => { const code = char.charCodeAt(0); return (code < 32 && code !== 9 && code !== 10 && code !== 13) || (char.length === 1 && code >= 0xd800 && code <= 0xdfff) })
function date(value: string | null): boolean { if (value === null) return true; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10) }
export function validateProgress(input: ProgressInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!plain(input.revision, 1, 100)) errors.revision = 'Actualiza la información antes de guardar.'
  for (const key of ['activities', 'milestones'] as const) {
    const rows = input[key]
    if (!Array.isArray(rows) || rows.length > 50) { errors[key] = 'Máximo 50 elementos.'; continue }
    const ids = new Set<string>()
    for (const [index, row] of rows.entries()) {
      if (!row || !uuid.test(row.id) || ids.has(row.id) || !plain(row.responsibleName, 2, 160) || !(progressStatuses as readonly string[]).includes(row.status) || !Number.isInteger(row.progressPercent) || row.progressPercent < 0 || row.progressPercent > 100 || !date(row.actualStartOn) || !date(row.actualEndOn) || (row.actualEndOn !== null && (!row.actualStartOn || row.actualEndOn < row.actualStartOn)) || (row.status === 'COMPLETED' && (row.progressPercent !== 100 || !row.actualEndOn)) || (row.progressPercent > 0 && !row.actualStartOn)) errors[`${key}.${index}`] = 'Revisa responsable, estado, fechas reales y porcentaje (0–100). Completar requiere 100% y fecha de fin.'
      if (row) ids.add(row.id)
    }
  }
  if (!Array.isArray(input.indicators) || input.indicators.length > 50) errors.indicators = 'Máximo 50 indicadores.'
  else { const ids = new Set<string>(); for (const [index, row] of input.indicators.entries()) { if (!row || !uuid.test(row.id) || ids.has(row.id) || (row.achievedValue !== null && (!Number.isFinite(row.achievedValue) || row.achievedValue < 0 || row.achievedValue > 999999999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(row.achievedValue))))) errors[`indicators.${index}`] = 'Usa un resultado no negativo con hasta dos decimales.'; if (row) ids.add(row.id) } }
  return errors
}
export function validateUpdate(input: UpdateInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!plain(input.title, 5, 200)) errors.title = 'Escribe un título de 5 a 200 caracteres, sin HTML.'
  if (!plain(input.body, 20, 10000)) errors.body = 'Describe el avance con 20 a 10.000 caracteres, sin HTML.'
  if (input.milestoneId !== null && !uuid.test(input.milestoneId)) errors.milestoneId = 'Selecciona un hito válido.'
  if (typeof input.publish !== 'boolean' || (input.revision !== null && !plain(input.revision, 1, 100))) errors.revision = 'Solicitud de actualización no válida.'
  if (!Array.isArray(input.images) || input.images.length > 10) errors.images = 'Máximo 10 evidencias.'
  else if (new Set(input.images.map(row => row.fileId)).size !== input.images.length || input.images.some(row => !uuid.test(row.fileId) || !plain(row.caption, 1, 300))) errors.images = 'Revisa las imágenes y sus descripciones; no deben repetirse.'
  return errors
}
