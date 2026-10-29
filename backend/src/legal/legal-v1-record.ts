/** Archivo inmutable de la publicación 1.0; futuras versiones se añaden, no sustituyen esta. */
import {createHash} from 'node:crypto'
import {LEGAL_DOCUMENTS,LEGAL_PUBLISHED_AT,LEGAL_VERSION} from './domain/legal-v1-20261028'
export const LEGAL_DEFINITION={version:LEGAL_VERSION,mode:'DEMO',publishedAt:LEGAL_PUBLISHED_AT,documents:LEGAL_DOCUMENTS}
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value && typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):value
export const legalDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
export const LEGAL_HASH=legalDigest(LEGAL_DEFINITION)
