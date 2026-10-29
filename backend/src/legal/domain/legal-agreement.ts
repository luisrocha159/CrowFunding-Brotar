import { LEGAL_VERSION } from './legal-v1-20261028'
export class InvalidLegalAgreement extends Error {}
export class LegalAgreementRequired extends Error {}
export function assertLegalAcceptance(version: unknown, accepted: unknown) {
  if (version !== LEGAL_VERSION || accepted !== true) throw new InvalidLegalAgreement('Lee y acepta la versión vigente de las condiciones del ensayo.')
}
