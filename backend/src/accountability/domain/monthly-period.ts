import {LedgerInvalid} from '../../contributions/domain/payment'
import {actualDate} from '../../campaign-lifecycle/domain/closure'
/** Calendar boundaries in the server's Bolivia date; never the browser timezone. */
export function monthlyBounds(month:string,executionOn:string,today:string){
 actualDate(today,today);actualDate(executionOn,today)
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||month<executionOn.slice(0,7)||month>today.slice(0,7))throw new LedgerInvalid('Selecciona un mes entre el inicio real de ejecución y el mes actual.')
 const first=month+'-01',last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10)
 return{periodStart:first<executionOn?executionOn:first,periodEnd:last>today?today:last}
}
