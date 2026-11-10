import styles from './accountIdentity.module.css'
import type {AccountContact} from '../api/accountContact'
export function AccountIdentity({contact,empty='Cuenta no disponible'}:{contact:AccountContact|null|undefined;empty?:string}){return <span className={styles.identity}>{contact?<><strong>{contact.name||contact.email}</strong>{contact.name&&<span>{contact.email}</span>}</>:<span>{empty}</span>}</span>}
