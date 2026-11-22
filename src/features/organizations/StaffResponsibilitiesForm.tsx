import { accountRoleLabel } from '../../shared/utils/accountLabels'
import { useState } from 'react'
import { Button } from '../../shared/components/Button'
import { staffRoles, type ManagedUser, type StaffRole } from './creatorAdministrationClient'
import styles from '../campaigns/projects.module.css'

const descriptions: Record<StaffRole, string> = {
  REVIEWER: 'Evalúa campañas y registra la decisión de revisión.',
  COMPLIANCE: 'Revisa la identidad de otras personas y organizaciones.',
  FINANCE: 'Gestiona conciliaciones, devoluciones y desembolsos.',
  SUPPORT: 'Atiende incidencias e investiga disputas.',
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
      <p>Selecciona la responsabilidad que deseas conceder o revocar a esta cuenta.</p>
      <label>Responsabilidad *<select required value={role} onChange={event => { setRole(event.target.value as StaffRole); setConfirmed(false) }}>
        {staffRoles.map(code => <option key={code} value={code}>{accountRoleLabel(code)}</option>)}
      </select></label>
      <p>{descriptions[role]}</p>
      <label>Acción *<select required value={operation} onChange={event => { setOperation(event.target.value as 'GRANT' | 'REVOKE'); setConfirmed(false) }}>
        <option value="GRANT">Conceder</option><option value="REVOKE">Revocar conservando historial</option>
      </select></label>
      <label>Motivo *<textarea required minLength={10} maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false) }} /></label>
      <small>De 10 a 500 caracteres. No incluyas documentos, contraseñas ni información sensible.</small>
      <label><span><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo {operation === 'GRANT' ? 'conceder' : 'revocar'} {accountRoleLabel(role)} para {user.email}.</span></label>
      <Button type="submit" disabled={!confirmed || reason.trim().length < 10} loading={busy} loadingLabel="Comprobando y guardando…">Aplicar responsabilidad</Button>
    </fieldset>
  </form>
}
