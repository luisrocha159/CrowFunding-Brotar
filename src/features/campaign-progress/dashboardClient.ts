import { SessionError } from '../../shared/api/sessionError'

const counterFields = {
  supportAlerts: ['open','firstResponseDue','escalationDue'],
  identityAlerts: ['awaitingReview','requiresInformation'],
  accountabilityAlerts: ['awaitingReview','requiresInformation'],
  closureAlerts: ['blocked'],
  financeAlerts: ['paymentsTotal','paymentsPending','paymentsOverdue','paymentsNeedingReview','reconciliationOpen','reconciliationUnresolved','disbursementsPending','disbursementsApproved','disbursementsProcessing','refundsRequested','refundsProcessing'],
  disputeAlerts: ['open','awaitingResponse','escalated']
} as const
type Counters = { [K in keyof typeof counterFields]?: Record<typeof counterFields[K][number],number> }
export type Dashboard = Counters & {
  readOnly: boolean; asOf: string
  campaigns?: {status: string; count: number}[]
  catalogs?: {active: number; inactive: number}
  parties?: {users: number; organizations: number}
}
const object = (v: unknown): v is Record<string,unknown> => Boolean(v) && typeof v==='object' && !Array.isArray(v)
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v)>=0
export function dashboardFrom(value: unknown): Dashboard {
  if(!object(value)||typeof value.readOnly!=='boolean'||typeof value.asOf!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value.asOf)||!Number.isFinite(Date.parse(value.asOf)))throw new SessionError(0)
  if(value.campaigns!==undefined&&(!Array.isArray(value.campaigns)||!value.campaigns.every(c=>object(c)&&typeof c.status==='string'&&count(c.count))))throw new SessionError(0)
  for(const [key,names] of Object.entries({...counterFields,catalogs:['active','inactive'],parties:['users','organizations']})){
    if(value[key]===undefined)continue
    const group=value[key]
    if(!object(group)||!names.every(name=>count(group[name])))throw new SessionError(0)
  }
  return value as Dashboard
}
