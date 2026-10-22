import { SessionError } from '../access/session/sessionClient'
export interface Party {id:string;kind:string;name:string;contact:string;status:string;detail:string}
export interface PartyPage {items:Party[];page:number;hasMore:boolean}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)
export function parsePartyPage(value:unknown):PartyPage{
  if(!object(value)||!Number.isInteger(value.page)||typeof value.hasMore!=='boolean'||!Array.isArray(value.items)||!value.items.every(item=>object(item)&&['id','kind','name','contact','status','detail'].every(key=>typeof item[key]==='string')))throw new SessionError(0)
  return value as unknown as PartyPage
}
