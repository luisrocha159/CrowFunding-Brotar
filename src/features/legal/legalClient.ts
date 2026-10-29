import {readJson,requestApi} from '../../shared/api/request'
import {SessionError} from '../access/session/sessionClient'
import {LEGAL_VERSION} from '../../../backend/src/legal/domain/legal-v1-20261028'
export {LEGAL_VERSION}
export interface LegalPublication {version:string;mode:'DEMO';publishedAt:string;hash:string;documents:{code:string;title:string;sections:{title:string;text:string}[]}[]}
export interface LegalStatus {version:string;accepted:boolean;history:{version:string;acceptedAt:string;hash:string;source:string}[]}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
export function legalPublicationFrom(v:unknown):LegalPublication{
 if(!object(v)||typeof v.version!=='string'||v.mode!=='DEMO'||!date(v.publishedAt)||!hash(v.hash)||!Array.isArray(v.documents)||v.documents.length!==3)throw new SessionError(0)
 const codes=new Set<string>()
 for(const doc of v.documents){
  if(!object(doc)||typeof doc.code!=='string'||!['TERMS','PRIVACY','IDENTITY'].includes(doc.code)||codes.has(doc.code)||typeof doc.title!=='string'||!doc.title.trim()||!Array.isArray(doc.sections)||!doc.sections.length||doc.sections.length>20||!doc.sections.every(s=>object(s)&&typeof s.title==='string'&&!!s.title.trim()&&typeof s.text==='string'&&!!s.text.trim()))throw new SessionError(0)
  codes.add(doc.code)
 }
 return v as unknown as LegalPublication
}
export function legalStatusFrom(v:unknown):LegalStatus{
 if(!object(v)||v.version!==LEGAL_VERSION||typeof v.accepted!=='boolean'||!Array.isArray(v.history)||!v.history.every(r=>object(r)&&typeof r.version==='string'&&date(r.acceptedAt)&&hash(r.hash)&&['REGISTRATION','ACCOUNT'].includes(String(r.source)))||v.accepted!==v.history.some(r=>r.version===LEGAL_VERSION))throw new SessionError(0)
 return v as unknown as LegalStatus
}
export async function readLegal(version?:string,signal?:AbortSignal){return legalPublicationFrom(await readJson(await requestApi('/api/legal/documents'+(version?'?version='+encodeURIComponent(version):''),{signal})))}
export async function myLegal(signal?:AbortSignal){return legalStatusFrom(await readJson(await requestApi('/api/me/legal',{signal})))}
export async function acceptLegal(version:string,accepted:boolean){
 if(version!==LEGAL_VERSION||accepted!==true)throw new SessionError(400)
 const result=legalStatusFrom(await readJson(await requestApi('/api/me/legal',{method:'PUT',body:{version,accepted}})))
 if(!result.accepted)throw new SessionError(0)
 return result
}
