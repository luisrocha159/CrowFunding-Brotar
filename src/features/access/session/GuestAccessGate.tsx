import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Message } from '../../../shared/components/Feedback'
import { AccessShell } from '../AccessComponents'
import { existingSessionDestination } from '../navigation'
import { usePublicSession } from './useHeaderSession'

/** No vuelve a pedir credenciales ni permite otro registro con una sesión abierta. */
export function GuestAccessGate({ children }: { children: ReactNode }) {
  const session = usePublicSession()
  const [params] = useSearchParams()
  if (session.checking) return <AccessShell centered title="Comprobando tu sesión" subtitle="Un momento antes de mostrar el acceso."><p role="status">Consultando tu cuenta…</p></AccessShell>
  if (session.unavailable) return <AccessShell centered title="No pudimos comprobar tu sesión" subtitle="No es necesario volver a iniciar sesión sin comprobar primero tu cuenta.">
    <Message tone="error" title="Servicio no disponible">Comprueba la conexión con la API y vuelve a intentarlo.</Message>
    <Button onClick={session.retry}>Reintentar comprobación</Button>
  </AccessShell>
  if (session.user) return <Navigate replace to={existingSessionDestination(params)} />
  return children
}
