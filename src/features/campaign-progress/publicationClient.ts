import { readJson, requestApi } from '../../shared/api/request'
import { SessionError } from '../../shared/api/sessionError'
import { updatesFrom, type UpdateItem } from './progressClient'
import type { PublicationChange, RewardChange } from '../../../backend/src/campaign-progress/domain/progress'
export type { PublicationChange, RewardChange }
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const nullable=(v:unknown)=>v===null||typeof v==='string'
const page=(v:Record<string,unknown>)=>Number.isSafeInteger(v.total)&&Number(v.total)>=0&&Number.isSafeInteger(v.page)&&Number(v.page)>0&&v.pageSize===20
export interface PublicationVersion { version:number; action:string; actorId:string; reason:string; recordedAt:string; snapshot:UpdateItem }
export interface HistoryPage<T> {items:T[];total:number;page:number;pageSize:20}
export function publicationHistoryFrom(v:unknown):HistoryPage<PublicationVersion>{
 if(!object(v)||!page(v)||!Array.isArray(v.items)||!v.items.every(i=>object(i)&&Number.isSafeInteger(i.version)&&Number(i.version)>0&&['PUBLISHED','CORRECTED','WITHDRAWN'].includes(String(i.action))&&typeof i.actorId==='string'&&typeof i.reason==='string'&&typeof i.recordedAt==='string'&&updatesFrom({items:[i.snapshot]}).length===1))throw new SessionError(0)
 return v as unknown as HistoryPage<PublicationVersion>
}
export interface TrackedReward {id:string;reference:string;title:string;promise:string;promisedOn:string|null;status:RewardChange['status'];fulfilledOn:string|null;fileId:string|null;notes:string|null;revision:string}
export interface RewardTracking extends HistoryPage<TrackedReward> {mode:'DEMO';campaign:{id:string;title:string;status:string};editable:boolean;fulfilled:number}
export function rewardTrackingFrom(v:unknown):RewardTracking{
 if(!object(v)||v.mode!=='DEMO'||!page(v)||!object(v.campaign)||!['id','title','status'].every(k=>typeof (v.campaign as Record<string,unknown>)[k]==='string')||typeof v.editable!=='boolean'||!Number.isSafeInteger(v.fulfilled)||Number(v.fulfilled)<0||Number(v.fulfilled)>Number(v.total)||!Array.isArray(v.items)||!v.items.every(i=>object(i)&&['id','reference','title','promise','revision'].every(k=>typeof i[k]==='string')&&['PENDING','IN_PROGRESS','FULFILLED','CANCELLED'].includes(String(i.status))&&['promisedOn','fulfilledOn','fileId','notes'].every(k=>nullable(i[k]))))throw new SessionError(0)
 return v as unknown as RewardTracking
}
export interface RewardEvent {id:string;actorId:string;reason:string;recordedAt:string;snapshot:{status:string;notes:string|null;fulfilledAt:string|null;fulfilledBy:string|null;fileId:string|null}}
export function rewardHistoryFrom(v:unknown):HistoryPage<RewardEvent>{
 if(!object(v)||!page(v)||!Array.isArray(v.items)||!v.items.every(i=>object(i)&&['id','actorId','reason','recordedAt'].every(k=>typeof i[k]==='string')&&object(i.snapshot)&&typeof i.snapshot.status==='string'&&['notes','fulfilledAt','fulfilledBy','fileId'].every(k=>nullable((i.snapshot as Record<string,unknown>)[k]))))throw new SessionError(0)
 return v as unknown as HistoryPage<RewardEvent>
}
const root=(id:string)=>`/api/campaigns/${encodeURIComponent(id)}`
export async function changePublication(id:string,updateId:string,body:PublicationChange){return updatesFrom({items:[await readJson(await requestApi(`${root(id)}/updates/${encodeURIComponent(updateId)}/publication`,{method:'PUT',body}))]})[0]!}
export async function publicationHistory(id:string,updateId:string,pageNumber=1,signal?:AbortSignal){return publicationHistoryFrom(await readJson(await requestApi(`${root(id)}/updates/${encodeURIComponent(updateId)}/history?page=${pageNumber}`,{signal})))}
export async function readRewardTracking(id:string,pageNumber=1,signal?:AbortSignal){return rewardTrackingFrom(await readJson(await requestApi(`${root(id)}/reward-tracking?page=${pageNumber}`,{signal})))}
export async function changeReward(id:string,contributionId:string,body:RewardChange){return rewardTrackingFrom(await readJson(await requestApi(`${root(id)}/reward-tracking/${encodeURIComponent(contributionId)}`,{method:'PUT',body})))}
export async function rewardHistory(id:string,contributionId:string,pageNumber=1,signal?:AbortSignal){return rewardHistoryFrom(await readJson(await requestApi(`${root(id)}/reward-tracking/${encodeURIComponent(contributionId)}/history?page=${pageNumber}`,{signal})))}
