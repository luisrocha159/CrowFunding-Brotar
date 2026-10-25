import type {DatabaseService} from './database.service'
import {recordAudit,setAuditActor} from './audit'

/** Llamar únicamente después de autorizar el caso y leer el binario íntegro, antes de entregarlo. */
export async function auditFileRead(database:DatabaseService,actor:string,id:string){
  await database.connection().transaction(async manager=>{
    await setAuditActor(manager,actor)
    await recordAudit(manager,actor,'READ','file_asset',id)
  })
}
