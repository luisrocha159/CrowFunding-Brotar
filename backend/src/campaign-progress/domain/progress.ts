export const progressStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED'] as const
export interface ProgressRow { id: string; responsibleName: string; status: string; progressPercent: number; actualStartOn: string | null; actualEndOn: string | null }
export interface ProgressInput { revision: string; activities: ProgressRow[]; milestones: ProgressRow[]; indicators: { id: string; achievedValue: number | null }[] }
export interface UpdateInput { revision: string | null; title: string; body: string; milestoneId: string | null; images: { fileId: string; caption: string }[]; publish: boolean }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const plain = (value: string, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[<>]/u.test(value) && ![...value].some(char => { const code = char.charCodeAt(0); return (code < 32 && code !== 9 && code !== 10 && code !== 13) || (char.length === 1 && code >= 0xd800 && code <= 0xdfff) })
function date(value: string | null): boolean { if (value === null) return true; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10) }
export function validateProgress(input: ProgressInput, units:Readonly<Record<string,string|null>>={}): Record<string, string> {
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
  if(Array.isArray(input.indicators))for(const [index,row]of input.indicators.entries())if(row&&row.achievedValue!==null){
    const unit=units[row.id]
    if(unit==='%'&&row.achievedValue>100)errors[`indicators.${index}`]='El resultado porcentual debe estar entre 0 y 100.'
    if(['personas','familias','unidades'].includes(unit??'')&&!Number.isInteger(row.achievedValue))errors[`indicators.${index}`]='Personas, familias y unidades requieren resultados enteros.'
  }
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

export type PublicationChange = { action: 'CORRECT'; revision: string; reason: string; confirmed: true; title: string; body: string; milestoneId: string | null; images: UpdateInput['images'] } | { action: 'WITHDRAW'; revision: string; reason: string; confirmed: true }
export const rewardStatuses = ['PENDING', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED'] as const
export interface RewardChange { revision: string; status: typeof rewardStatuses[number]; reason: string; confirmed: true; fulfilledOn: string | null; fileId: string | null }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function validatePublicationChange(value: unknown): Record<string,string> {
  if (!record(value)) return { request: 'Solicitud inválida.' }
  const errors: Record<string,string> = {}
  const keys = ['action','revision','reason','confirmed',...(value.action === 'CORRECT' ? ['title','body','milestoneId','images'] : [])]
  if (!['CORRECT','WITHDRAW'].includes(String(value.action)) || Object.keys(value).some(k => value[k] !== undefined && !keys.includes(k)) || keys.some(k => !Object.hasOwn(value,k))) errors.request = 'Selecciona una corrección o un retiro con sus campos correspondientes.'
  if (!plain(value.revision as string,1,100)) errors.revision = 'Actualiza la versión de la novedad.'
  if (!plain(value.reason as string,10,1000)) errors.reason = 'Explica el motivo con 10 a 1000 caracteres, sin HTML.'
  if (value.confirmed !== true) errors.confirmed = 'Confirma el cambio de la publicación.'
  if (value.action === 'CORRECT') {
    if (!Array.isArray(value.images) || value.images.some(i => !record(i) || typeof i.fileId !== 'string' || typeof i.caption !== 'string' || Object.keys(i).some(k => !['fileId','caption'].includes(k)))) errors.images = 'Revisa las evidencias.'
    else Object.assign(errors,validateUpdate({title:value.title as string,body:value.body as string,milestoneId:value.milestoneId as string|null,images:value.images as UpdateInput['images'],revision:value.revision as string,publish:true}))
  }
  return errors
}
export function validateRewardChange(value: unknown): Record<string,string> {
  if (!record(value)) return { request: 'Solicitud inválida.' }
  const errors: Record<string,string> = {}
  const keys = ['revision','status','reason','confirmed','fulfilledOn','fileId']
  if (Object.keys(value).some(k=>!keys.includes(k)) || keys.some(k=>!Object.hasOwn(value,k))) errors.request = 'Solicitud de seguimiento inválida.'
  if (!plain(value.revision as string,1,100)) errors.revision = 'Actualiza la versión de la recompensa.'
  if (!(rewardStatuses as readonly unknown[]).includes(value.status)) errors.status = 'Selecciona un estado válido.'
  if (!plain(value.reason as string,10,1000)) errors.reason = 'Describe el cambio con 10 a 1000 caracteres, sin HTML.'
  if (value.confirmed !== true) errors.confirmed = 'Confirma el cambio de seguimiento.'
  if (value.status === 'FULFILLED') {
    if (typeof value.fulfilledOn !== 'string' || !date(value.fulfilledOn) || value.fulfilledOn < '2000-01-01') errors.fulfilledOn = 'Usa una fecha real no futura.'
    if (typeof value.fileId !== 'string' || !uuid.test(value.fileId)) errors.fileId = 'Adjunta evidencia privada del cumplimiento.'
  } else if (value.fulfilledOn !== null || value.fileId !== null) errors.evidence = 'La fecha y evidencia corresponden al cumplimiento.'
  return errors
}
