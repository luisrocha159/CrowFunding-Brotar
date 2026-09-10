export const profileLabels = { usuario: 'Usuario', creador: 'Creador', organizacion: 'Organización' } as const
export type AccessProfile = keyof typeof profileLabels
export type LoginValues = { email: string; password: string }
export type RegisterValues = LoginValues & { firstName: string; lastName: string; confirmation: string; terms: boolean }
export type FieldErrors = Partial<Record<keyof RegisterValues | 'profile', string>>
export const DEMO_PASSWORD_HELP = 'Regla de la muestra: al menos 8 caracteres, una mayúscula y un número. No uses una contraseña real.'
export const demoValues: RegisterValues = { firstName: 'Camila', lastName: 'Ejemplo', email: 'demo@example.com', password: 'Brotar2026!', confirmation: 'Brotar2026!', terms: false }

export function normalizeEmail(value: string) { return value.trim().toLowerCase() }
export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Ingresa tu correo electrónico.'
  if (value.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingresa un correo electrónico válido.'
}
export function validateLogin(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {}
  const email = validateEmail(values.email)
  if (email) errors.email = email
  if (!values.password.trim()) errors.password = 'Ingresa tu contraseña.'
  return errors
}
export function readProfile(value: string | null): AccessProfile {
  return value && Object.hasOwn(profileLabels, value) ? value as AccessProfile : 'usuario'
}
export function validateRegister(values: RegisterValues, profile: string): FieldErrors {
  const errors = validateLogin(values)
  if (!values.firstName.trim()) errors.firstName = 'Ingresa tu nombre.'
  else if (values.firstName.trim().length > 80) errors.firstName = 'Usa hasta 80 caracteres para el nombre en esta muestra.'
  if (!values.lastName.trim()) errors.lastName = 'Ingresa tu apellido.'
  else if (values.lastName.trim().length > 80) errors.lastName = 'Usa hasta 80 caracteres para el apellido en esta muestra.'
  if (values.password && (values.password.length < 8 || !/[A-ZÁÉÍÓÚÜÑ]/.test(values.password) || !/\d/.test(values.password))) errors.password = 'Usa al menos 8 caracteres, una mayúscula y un número.'
  if (!values.confirmation) errors.confirmation = 'Confirma tu contraseña.'
  else if (values.confirmation !== values.password) errors.confirmation = 'Las contraseñas no coinciden.'
  if (!values.terms) errors.terms = 'Debes aceptar los términos de la demostración para continuar.'
  if (!Object.hasOwn(profileLabels, profile)) errors.profile = 'Selecciona un perfil disponible.'
  return errors
}
