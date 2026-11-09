/** Publicación 1.1: conserva intactos los textos y las huellas de la versión 1.0. */
import {LEGAL_DOCUMENTS,LEGAL_PUBLISHED_AT,LEGAL_VERSION} from './domain/legal-v2-20261109'
import {legalDigest} from './legal-v1-record'
export {legalDigest} from './legal-v1-record'
export const LEGAL_DEFINITION={version:LEGAL_VERSION,mode:'DEMO',publishedAt:LEGAL_PUBLISHED_AT,documents:LEGAL_DOCUMENTS}
export const LEGAL_HASH=legalDigest(LEGAL_DEFINITION)
