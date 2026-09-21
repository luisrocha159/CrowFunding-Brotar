/**
 * Parámetros de negocio administrables (BG-55 CA 2).
 *
 * La lista está **vacía a propósito**: el criterio exige gestionar «solo parámetros
 * de negocio previamente acordados», y D02 y D10 siguen abiertas. Añadir claves aquí
 * sin esa aprobación sería inventar reglas del MVP. El mecanismo queda listo y
 * cualquier clave no acordada se rechaza, que es el lado seguro.
 */
export const AGREED_SETTINGS: readonly string[] = []

export function isAgreedSetting(key: string): boolean {
  return AGREED_SETTINGS.includes(key)
}

const KEY = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/

export function isValidSettingKey(key: string): boolean {
  return KEY.test(key) && key.length <= 120
}
