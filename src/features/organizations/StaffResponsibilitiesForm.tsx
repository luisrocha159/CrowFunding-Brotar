import { useState } from 'react'
import { Button } from '../../shared/components/Button'
import { staffRoles, type ManagedUser, type StaffRole } from './creatorAdministrationClient'
import styles from '../campaigns/projects.module.css'

const descriptions: Record<StaffRole, string> = {
  REVIEWER: 'Revisa y decide campañas; no publica ni opera dinero.',
  COMPLIANCE: 'Revisa identidad; no autoriza pagos ni se verifica a sí mismo.',
  FINANCE: 'Opera las funciones financieras habilitadas, exclusivamente de prueba en este MVP.',
  SUPPORT: 'Resuelve incidencias; no mueve fondos.',
  AUDITOR: 'Solo consulta. Bloquea toda escritura aunque la cuenta tenga otros roles.'
}
export function StaffResponsibilitiesForm({ user, busy, change }: {
  user: ManagedUser; busy: boolean; change: (role: StaffRole, operation: 'GRANT' | 'REVOKE', reason: string) => Promise<void>
}) {
  const [role, setRole] = useState<StaffRole>('REVIEWER')
  const [operation, setOperation] = useState<'GRANT' | 'REVOKE'>('GRANT')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  return <form className={styles.staffForm} onSubmit={event => {
    event.preventDefault()
    if (confirmed && reason.trim().length >= 10) { setConfirmed(false); void change(role, operation, reason) }
  }}>
    <fieldset className={styles.reviewForm} disabled={busy}><legend>Responsabilidades internas</legend>
      <p>Solo ADMIN gestiona roles de otras cuentas. ADMIN se aprovisiona con el procedimiento local existente, no desde este formulario. Esto no verifica identidad ni contactos.</p>
      <label>Responsabilidad *<select required value={role} onChange={event => { setRole(event.target.value as StaffRole); setConfirmed(false) }}>
        {staffRoles.map(code => <option key={code} value={code}>{code}</option>)}
      </select></label>
      <p>{descriptions[role]}</p>
      <label>Acción *<select required value={operation} onChange={event => { setOperation(event.target.value as 'GRANT' | 'REVOKE'); setConfirmed(false) }}>
        <option value="GRANT">Conceder</option><option value="REVOKE">Revocar conservando historial</option>
      </select></label>
      <label>Motivo *<textarea required minLength={10} maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false) }} /></label>
      <small>De 10 a 500 caracteres. No incluyas documentos, contraseñas ni información sensible.</small>
      <label><span><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo {operation === 'GRANT' ? 'conceder' : 'revocar'} {role} para {user.email}.</span></label>
      <Button type="submit" disabled={!confirmed || reason.trim().length < 10} loading={busy} loadingLabel="Comprobando y guardando…">Aplicar responsabilidad</Button>
    </fieldset>
  </form>
}
