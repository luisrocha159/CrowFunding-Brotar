/** Política del equipo: prefijo internacional y número nacional, máximo 15 dígitos juntos. */
export function phoneErrors(code: string, number: string): Record<string, string> {
  const errors: Record<string, string> = {}
  const prefix = code.trim(), national = number.trim()
  if (!prefix && !national) return errors
  if (!/^\+[1-9]\d{0,2}$/.test(prefix)) errors.phoneCountryCode = 'Usa un prefijo de 1 a 3 dígitos, como +591.'
  if (!/^\d{4,15}$/.test(national)) errors.phoneNumber = 'Usa de 4 a 15 dígitos, sin letras ni espacios.'
  else if (prefix.replace('+', '').length + national.length > 15) errors.phoneNumber = 'El prefijo y el teléfono juntos no pueden superar 15 dígitos.'
  return errors
}
