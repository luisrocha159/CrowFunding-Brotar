/** ADR-013 v1.0: metas operativas DEMO, no SLA legal ni parámetros financieros. */
export const SETTING_RULES = {
  'support.first_response_hours': {initial:48,min:1,max:48},
  'support.escalation_hours': {initial:120,min:72,max:720}
} as const
export const AGREED_SETTINGS: readonly string[] = Object.keys(SETTING_RULES)
export function isValidSettingValue(key: string,value: unknown): value is number {
  const rule=SETTING_RULES[key as keyof typeof SETTING_RULES]
  return Boolean(rule) && typeof value==='number' && Number.isInteger(value) && value>=rule.min && value<=rule.max
}

export function isAgreedSetting(key: string): boolean {
  return AGREED_SETTINGS.includes(key)
}

const KEY = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/

export function isValidSettingKey(key: string): boolean {
  return KEY.test(key) && key.length <= 120
}
