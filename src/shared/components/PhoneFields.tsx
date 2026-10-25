import { FormField } from './FormField'
import styles from './ui.module.css'

export interface PhoneValue { phoneCountryCode: string; phoneNumber: string }
export function PhoneFields({ idPrefix, value, errors = {}, onChange, onBlur, disabled = false }: {
  idPrefix: string; value: PhoneValue; errors?: Partial<Record<keyof PhoneValue, string>>
  onChange: (value: PhoneValue) => void; onBlur?: () => void; disabled?: boolean
}) {
  const other = Boolean(value.phoneCountryCode && value.phoneCountryCode !== '+591')
  return <fieldset className={styles.phoneFields} disabled={disabled}>
    <legend>Teléfono de contacto (opcional)</legend>
    <p className={styles.help}>Elige el país y escribe solo el número nacional. El prefijo no forma parte del número.</p>
    <div className={styles.phoneRow}>
      <FormField as="select" id={`${idPrefix}-phoneCountryCode`} label="País y prefijo" value={other ? 'OTHER' : value.phoneCountryCode}
        error={errors.phoneCountryCode} onBlur={onBlur} onChange={event => onChange({ ...value, phoneCountryCode: event.target.value === 'OTHER' ? '+' : event.target.value })}>
        <option value="">Sin seleccionar</option><option value="+591">Bolivia (+591)</option><option value="OTHER">Otro país</option>
      </FormField>
      <FormField id={`${idPrefix}-phoneNumber`} label="Número nacional" type="tel" inputMode="numeric" autoComplete="tel-national"
        value={value.phoneNumber} maxLength={15} error={errors.phoneNumber} onBlur={onBlur}
        help="Solo dígitos, sin repetir el prefijo. Máximo 15 dígitos entre prefijo y número."
        onChange={event => onChange({ phoneCountryCode: value.phoneCountryCode || (event.target.value ? '+591' : ''), phoneNumber: event.target.value })} />
    </div>
    {other && <FormField id={`${idPrefix}-customPrefix`} label="Prefijo internacional de otro país" type="tel" autoComplete="tel-country-code"
      maxLength={4} value={value.phoneCountryCode} error={errors.phoneCountryCode} onBlur={onBlur}
      help="Signo + y de 1 a 3 dígitos; por ejemplo, +34."
      onChange={event => onChange({ ...value, phoneCountryCode: event.target.value || '+' })} />}
  </fieldset>
}
