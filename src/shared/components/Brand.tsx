import { Link } from 'react-router-dom'
import logo from '../assets/brotar-logo.png'
import styles from '../layout/layout.module.css'

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className={`${styles.brand} ${inverse ? styles.inverse : ''}`} aria-label="Brotar, inicio"><img src={logo} width={36} height={36} alt="" /><span>brotar</span></Link>
}
