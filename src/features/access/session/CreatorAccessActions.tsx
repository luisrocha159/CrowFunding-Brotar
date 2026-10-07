import { Button, ButtonLink } from '../../../shared/components/Button'
import { usePublicSession } from './useHeaderSession'

/** El mismo acceso público se adapta a la sesión confirmada por la API. */
export function CreatorAccessActions({ registerLabel = 'Empezar con una cuenta' }: { registerLabel?: string }) {
  const { user, checking, unavailable } = usePublicSession()
  if (checking) return <Button loading loadingLabel="Comprobando cuenta…" />
  if (unavailable) return <ButtonLink variant="secondary" to="/mi-cuenta">Comprobar mi cuenta</ButtonLink>
  if (user) return <><ButtonLink to="/crear-campana">Abrir mis borradores</ButtonLink><ButtonLink variant="secondary" to="/mi-cuenta">Ir a mi cuenta</ButtonLink></>
  return <><ButtonLink to="/registro?perfil=creador&continuar=%2Fcrear-campana">{registerLabel}</ButtonLink><ButtonLink variant="secondary" to="/iniciar-sesion?continuar=%2Fcrear-campana">Ya tengo una cuenta</ButtonLink></>
}
