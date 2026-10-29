import {LedgerInvalid} from '../../contributions/domain/payment'
export function assertPublicConsent(value:unknown){if(value!==true)throw new LedgerInvalid('Confirma expresamente que revisaste el resumen y autorizas su exposición pública.')}
