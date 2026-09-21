/**
 * Límites tomados del esquema oficial, no inventados (BG-16 CA 1):
 * campaign.title varchar(200), campaign.summary varchar(500),
 * campaign_location.locality varchar(160), country_code char(2).
 * El asistente los muestra para que el creador los vea antes de escribir.
 */
export const LIMITS = {
  title: 200,
  summary: 500,
  locality: 160,
  addressLine: 500,
  reference: 500
} as const

export interface LocationInput {
  countryCode: string | null
  locality: string
  addressLine: string
  reference: string
}

export interface GeneralInput {
  title: string
  summary: string
  categoryId: string | null
  location: LocationInput
}

const COUNTRY = /^[A-Z]{2}$/

export function normalizeGeneral(input: GeneralInput): GeneralInput {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    categoryId: input.categoryId,
    location: {
      countryCode: input.location.countryCode === null ? null : input.location.countryCode.trim().toUpperCase(),
      locality: input.location.locality.trim(),
      addressLine: input.location.addressLine.trim(),
      reference: input.location.reference.trim()
    }
  }
}

/**
 * Errores por campo (BG-16 CA 2): se devuelven todos a la vez y asociados a su campo,
 * para que el asistente los muestre junto a cada entrada y no como un aviso genérico.
 */
export function validateGeneral(input: GeneralInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const title = [...input.title].length
  if (title === 0) errors.title = 'El nombre de la campaña es obligatorio.'
  else if (title > LIMITS.title) errors.title = `El nombre admite hasta ${LIMITS.title} caracteres.`

  const summary = [...input.summary].length
  if (summary === 0) errors.summary = 'El resumen corto es obligatorio.'
  else if (summary > LIMITS.summary) errors.summary = `El resumen admite hasta ${LIMITS.summary} caracteres.`

  if (input.categoryId === null) errors.categoryId = 'Elige una categoría del catálogo.'

  const { countryCode, locality, addressLine, reference } = input.location
  if (countryCode === null || countryCode.length === 0) errors.countryCode = 'Elige el país de la campaña.'
  else if (!COUNTRY.test(countryCode)) errors.countryCode = 'El país debe ser un código de dos letras.'
  if ([...locality].length > LIMITS.locality) errors.locality = `La localidad admite hasta ${LIMITS.locality} caracteres.`
  if ([...addressLine].length > LIMITS.addressLine) errors.addressLine = `La dirección admite hasta ${LIMITS.addressLine} caracteres.`
  if ([...reference].length > LIMITS.reference) errors.reference = `La referencia admite hasta ${LIMITS.reference} caracteres.`
  return errors
}
