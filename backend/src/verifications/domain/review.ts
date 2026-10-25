import {InvalidVerification} from './verification'
export const reviewStates=['IN_REVIEW','APPROVED','REJECTED','REQUIRES_INFO'] as const
export interface ReviewInput {decision:string;reason:string;documents:{fileId:string;isValid:boolean;notes:string}[]}
export function reviewPlan(status:string,input:ReviewInput,files:readonly string[]) {
 const reason=input.reason.trim()
 const safe=(s:string)=>!/[<>\uD800-\uDFFF]/u.test(s) && [...s].every(c=>c.charCodeAt(0)>=32 || '\t\r\n'.includes(c))
 if(!reviewStates.includes(input.decision as typeof reviewStates[number]) || reason.length<20 || reason.length>500 || !safe(reason) ||
   !(status==='PENDING' && input.decision==='IN_REVIEW' || status==='IN_REVIEW' && input.decision!=='IN_REVIEW') || input.documents.length>20)throw new InvalidVerification()
 const seen=new Set<string>()
 for(const doc of input.documents){if(!files.includes(doc.fileId) || seen.has(doc.fileId) || typeof doc.isValid!=='boolean' || doc.notes.trim().length>500 || !safe(doc.notes))throw new InvalidVerification();seen.add(doc.fileId)}
 if(input.decision==='APPROVED' && (files.length===0 || seen.size!==files.length || input.documents.some(d=>!d.isValid)))throw new InvalidVerification()
 return{decision:input.decision as typeof reviewStates[number],reason,documents:input.documents.map(d=>({...d,notes:d.notes.trim()}))}
}
