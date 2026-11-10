import type {EntityManager} from 'typeorm'

export interface AccountContact {name:string|null;email:string}
/** Solo tras autorizar la lectura del expediente. No ofrece búsqueda ni directorio público.
 * Son datos actuales de contacto; los UUID históricos de las acciones se conservan. */
export async function attachAccountContacts<T extends object>(reader:Pick<EntityManager,'query'>,records:T[],bindings:Record<string,string>):Promise<(T&Record<string,AccountContact|null>)[]>{
 const field=(row:T,key:string)=>(row as Record<string,unknown>)[key]
 const ids=[...new Set(records.flatMap(row=>Object.values(bindings).map(key=>field(row,key))).filter((id):id is string=>typeof id==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id)))]
 const contacts:{id:string;name:string|null;email:string}[]=ids.length?await reader.query(`SELECT u.id,NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),'') AS name,u.email FROM public.app_user u LEFT JOIN public.user_profile p ON p.user_id=u.id WHERE u.id=ANY($1::uuid[])`,[ids]):[]
 const map=new Map(contacts.filter(c=>typeof c.email==='string').map(({id,name,email})=>[id.toLowerCase(),{name,email}]))
 return records.map(row=>Object.assign({},row,Object.fromEntries(Object.entries(bindings).map(([alias,key])=>{const id=field(row,key);return[alias,typeof id==='string'?map.get(id.toLowerCase())??null:null]}))))
}
