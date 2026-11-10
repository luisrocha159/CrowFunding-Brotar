export interface AccountContact {name:string|null;email:string}
export interface AccountFields {
 contributorContact?:AccountContact|null;requestedByContact?:AccountContact|null;approvedByContact?:AccountContact|null;
 actorContact?:AccountContact|null;authorContact?:AccountContact|null;sponsorContact?:AccountContact|null;
 createdByContact?:AccountContact|null;closedByContact?:AccountContact|null;resolvedByContact?:AccountContact|null;
 raisedByContact?:AccountContact|null;assignedToContact?:AccountContact|null;ownerContact?:AccountContact|null;
 submittedByContact?:AccountContact|null;reviewedByContact?:AccountContact|null;cancelRequestedByContact?:AccountContact|null;
 completedByContact?:AccountContact|null;userContact?:AccountContact|null;authorizedByContact?:AccountContact|null;executedByContact?:AccountContact|null
}
export function accountContactsValid(value:Record<string,unknown>){return Object.entries(value).filter(([key])=>key.endsWith('Contact')).every(([,v])=>v===undefined||v===null||typeof v==='object'&&!Array.isArray(v)&&'email'in v&&typeof v.email==='string'&&v.email.length>0&&v.email.length<=254&&'name'in v&&(v.name===null||typeof v.name==='string'&&v.name.length<=300))}
