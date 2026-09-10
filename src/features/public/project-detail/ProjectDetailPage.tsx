import { useParams } from 'react-router-dom'
import { PhasePlaceholder } from '../../../shared/components/PhasePlaceholder'
export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  return <><PhasePlaceholder title="Detalle público del proyecto" description="Historia, impacto, creador, recaudación y señales de confianza de la campaña." /><p>Identificador de ruta: <code>{slug}</code></p></>
}
