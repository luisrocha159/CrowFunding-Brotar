import {readFileSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'

const reason='Preparación sintética autorizada para la revisión académica de Brotar.'
export async function buildReviewDataset({backend,manifest,checkpoint,key,sql,api}){
  const definitions=JSON.parse(readFileSync(new URL('./accounts.json',import.meta.url),'utf8'))
  const require=createRequire(import.meta.url),{LEGAL_VERSION}=require('../dist/legal/domain/legal-v2-20261109.js')
  const users={}
  const call=async(path,user,body,method)=> (await api(path,user,body,method)).data
  const step=async(name,fn)=>{console.log('Preparando '+name);return checkpoint(name,fn)}
  const addDays=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)
  const[todayRow]=await sql("SELECT (clock_timestamp() AT TIME ZONE 'America/La_Paz')::date::text AS day")
  const today=todayRow.day,end=addDays(today,30)
  manifest.anchorDay??=today
  manifest.accounts=[]
  for(const def of definitions){
    const account=await step('cuenta:'+def.user,async()=>{
      const email=def.user+'@brotar.test',password=def.user+'1234567890'
      const[existing]=await sql('SELECT id FROM public.app_user WHERE email=$1',[email])
      const created=existing??await call('auth/register',null,{legalVersion:LEGAL_VERSION,email,password,firstName:def.name.split(' ')[0],lastName:def.name.split(' ').slice(1).join(' '),demoConsent:true})
      return{...def,id:created.id,email,password}
    })
    manifest.accounts.push(account)
    const login=await api('auth/login',null,{email:account.email,password:account.password})
    users[def.user]={...account,cookie:login.cookie}
  }
  const u=users,owner=u.creador,sponsor=u.patrocinador
  // Verificar contactos por el token del buzón, antes de conceder perfiles de solo lectura.
  for(const account of Object.values(users).filter(a=>!['correopendiente','restringido'].includes(a.user))){
    await step('correo:'+account.user,async()=>{
      const current=await call('contacts',account)
      if(!current.verifiedAt){
        await call('contacts/email/request',account,{})
        const dir=resolve(backend,'private/review-mail')
        const messages=readdirSync(dir).filter(n=>n.endsWith('.txt')).sort().reverse().map(n=>readFileSync(resolve(dir,n),'utf8'))
        const token=messages.find(text=>text.includes('Para: '+account.email)&&text.includes('/verificar-correo#token='))?.match(/token=([a-f0-9]{64})/)?.[1]
        if(!token)throw new Error('No se encontró el enlace en el buzón de revisión para '+account.email)
        await call('contacts/email/confirm',account,{token})
      }
      await call('contacts/email/preferences',account,{enabled:true},'PUT')
      return true
    })
  }
  await step('roles-iniciales',async()=>{
    for(const account of Object.values(users))for(const code of account.roles){
      await sql(`INSERT INTO public.user_role(user_id,role_id) SELECT $1,id FROM public.role WHERE code=$2
        AND NOT EXISTS(SELECT 1 FROM public.user_role WHERE user_id=$1 AND role_id=role.id AND revoked_at IS NULL)`,[account.id,code])
    }
    return true
  })
  const upload=async(user,name,purpose='SUPPORT_EVIDENCE',visibility='PRIVATE')=>checkpoint('archivo:'+user.user+':'+name,()=>call('files',user,{
    purpose,visibility,originalName:name+'.png',mimeType:'image/png',contentBase64:readFileSync(new URL(visibility==='PUBLIC'?'./assets/portada-huerto.png':'./assets/evidencia-sintetica.png',import.meta.url)).toString('base64')
  }))
  async function verification(user,code,target='APPROVED',organizationId){
    const prefix='verificacion:'+user.user+':'+code+':'+(organizationId??'persona')
    const types=await call('me/verifications/types',user),type=types.find(t=>t.code===code)
    if(!type?.policy)throw new Error('Falta política activa para '+code)
    let detail=await checkpoint(prefix+':inicio',()=>call('me/verifications',user,{verificationTypeId:type.id,...(organizationId?{organizationId}:{})}))
    const documents=[]
    for(const[index,doc]of type.policy.documents.entries()){
      const file=await upload(user,prefix.replaceAll(':','-').slice(0,100)+'-'+index,'VERIFICATION_DOCUMENT')
      documents.push({documentTypeId:doc.documentTypeId,fileId:file.id})
    }
    detail=await checkpoint(prefix+':envio',()=>call(`me/verifications/${detail.id}`,user,{legalVersion:LEGAL_VERSION,expectedVersion:detail.version,policyVersion:type.policy.version,fields:Object.fromEntries(type.policy.fields.map(f=>[f.key,'PRUEBA '+user.name])),documents,accepted:true,submit:true},'PUT'))
    if(target!=='PENDING'){
      detail=await checkpoint(prefix+':revision',()=>call(`admin/verifications/${detail.id}/review`,u.cumplimiento,{expectedVersion:detail.version,decision:'IN_REVIEW',reason,documents:[]}))
      detail=await checkpoint(prefix+':decision',()=>call(`admin/verifications/${detail.id}/review`,u.cumplimiento,{expectedVersion:detail.version,decision:target,reason:target==='REQUIRES_INFO'?'Adjunta un respaldo legible para continuar la revisión del expediente.':reason,documents:target==='APPROVED'?detail.documents.map(d=>({fileId:d.fileId,isValid:true,notes:'Respaldo sintético legible para revisión.'})):[]}))
    }
    return {id:detail.id,status:detail.status,version:detail.version}
  }
  for(const user of [owner,u.organizacion,u.creadorajeno])await step('identidad-aprobada:'+user.user,()=>verification(user,'KYC_IDENTITY'))
  const identityPending=await step('identidad-pendiente',()=>verification(u.identidadpendiente,'KYC_IDENTITY','PENDING'))
  const identityChanges=await step('identidad-observada',()=>verification(u.observaciones,'KYC_IDENTITY','REQUIRES_INFO'))
  const org=await step('organizacion',async()=>{
    const types=await call('organizations/types',u.organizacion)
    return call('organizations',u.organizacion,{legalName:'PRUEBA Fundación Semillas del Valle',tradeName:'Semillas del Valle',organizationTypeId:types.find(t=>t.code==='FOUNDATION')?.id??types[0].id,contactEmail:'organizacion@brotar.test',contactPhone:'+591 70000001'})
  })
  await step('kyb-legal',()=>verification(u.organizacion,'KYB_LEGAL','APPROVED',org.id))
  await step('kyb-representacion',()=>verification(u.organizacion,'KYB_REPRESENTATIVE','APPROVED',org.id))
  for(const target of [u.miembro,u.invitacion])await step('invitacion:'+target.user,async()=>{
    const members=await call(`me/organizations/${org.id}/members`,u.organizacion)
    const invitation=await call(`me/organizations/${org.id}/members`,u.organizacion,{action:'ADD',userId:target.id,role:'MEMBER',expectedVersion:members.version,reason,confirmed:true},'PUT')
    if(target.user==='miembro')await call(`me/organization-invitations/${invitation.invitationId}`,target,{action:'ACCEPT',expectedVersion:'1',reason,confirmed:true},'PUT')
    return invitation
  })
  const categories=await call('catalogs/categories',owner)
  const[expense]=await sql('SELECT id FROM public.expense_category WHERE is_active ORDER BY id LIMIT 1')
  const category=categories[0].id
  const campaigns={}
  async function campaign(code,title,{type='DONATION',state='PUBLISHED',user=owner,organizationId=null}={}){
    const result=await step('campana:'+code,async()=>{
      const draft=await checkpoint('borrador:'+code,()=>call('campaigns/drafts',user,{title:`${code} ${title}`,summary:'Iniciativa comunitaria preparada para la revisión funcional del equipo.',campaignType:type,...(organizationId?{organizationId}:{})}))
      const path=`campaigns/drafts/${draft.id}`,administrative=`admin/campaigns/${draft.id}`
      const[current]=await sql('SELECT status FROM public.campaign WHERE id=$1',[draft.id])
      if(['DRAFT','CHANGES_REQUESTED'].includes(current.status)){
        await call(path+'/general',user,{title:`${code} ${title}`,summary:'Recuperar espacios comunitarios mediante actividades y recursos documentados.',categoryId:category,location:{countryCode:'BO',locality:'Samaipata',addressLine:'Espacio comunitario de revisión',reference:'Zona central de la iniciativa'}},'PUT')
        await call(path+'/story',user,{problem:'El barrio no dispone de herramientas suficientes para recuperar sus espacios verdes.',solution:'Adquirir herramientas, organizar jornadas y registrar los resultados de cada actividad.',beneficiaries:'Veinte familias del sector participan de las actividades comunitarias.',expectedResults:'Recuperar el espacio y dejar evidencia verificable del trabajo realizado.',indicators:[{name:'Familias participantes',description:'Cantidad de familias que participan del proyecto.',unit:'familias',baselineValue:0,targetValue:20}]},'PUT')
        await call(path+'/plan',user,{activities:[{name:'Preparar terreno comunitario',responsibleName:user.name,plannedStartOn:today,plannedEndOn:end},{name:'Instalar el huerto comunitario',responsibleName:user.name,plannedStartOn:today,plannedEndOn:end}],milestones:[{name:'Huerto comunitario habilitado',responsibleName:user.name,plannedStartOn:today,plannedEndOn:end,activityIndexes:[0,1]}]},'PUT')
        await call(path+'/budget',user,{items:[{categoryId:expense.id,description:'Herramientas para el huerto comunitario',quantity:10,unitPrice:50,plannedAmount:500,notes:'Compra prevista de herramientas y materiales.'}],risks:[{title:'Retraso por lluvias intensas',description:'La lluvia puede dificultar la preparación del terreno.',likelihood:'30',impact:'Medio',mitigation:'Reprogramar jornadas y proteger los materiales.'}]},'PUT')
        await call(path+'/funding',user,{goalAmount:600,currencyCode:'BOB',durationDays:30,fundingModel:code==='REV-13'?'ALL_OR_NOTHING':'FLEXIBLE',startsAt:today+'T00:00:00-04:00',endsAt:end+'T00:00:00-04:00'},'PUT')
        if(type!=='DONATION')await call(path+'/rewards',user,{rewards:[{title:type==='PRESALE'?'Kit de cultivo en preventa':'Semillas y manual comunitario',description:'Reconocimiento de la campaña preparado para el recorrido de revisión.',rewardKind:type==='PRESALE'?'PRESALE':'REWARD',minAmount:50,quantityTotal:100,estimatedDeliveryOn:addDays(end,10)}]},'PUT')
        const cover=await upload(user,'portada-'+code,'CAMPAIGN_PUBLIC_IMAGE','PUBLIC')
        await call(path+'/cover',user,{fileId:cover.id,altText:'Ilustración del huerto comunitario de revisión'},'PATCH')
        if(state!=='DRAFT')await call(path+'/submission',user,{})
      }
      const[c]=await sql('SELECT status FROM public.campaign WHERE id=$1',[draft.id])
      if(state==='CHANGES_REQUESTED'&&c.status==='IN_REVIEW')await call(administrative+'/decision',u.revisor,{decision:'CHANGES_REQUESTED',comment:'Aclara las actividades con las familias y completa la descripción del resultado.',expectedRound:1,observations:[{section:'story',fieldPath:'expectedResults',message:'Detalla cómo demostrarás el resultado esperado con las familias.'}]})
      if(['APPROVED','PUBLISHED'].includes(state)&&c.status==='IN_REVIEW')await call(administrative+'/decision',u.revisor,{decision:'APPROVED',comment:'Campaña revisada para el recorrido funcional del equipo.',expectedRound:1,observations:[]})
      const[approved]=await sql('SELECT status FROM public.campaign WHERE id=$1',[draft.id])
      if(state==='PUBLISHED'&&approved.status==='APPROVED')await call(administrative+'/publish',u.administrador,{confirmed:true,expectedRound:1})
      const slug=code.toLowerCase()+'-'+title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')
      await sql('UPDATE public.campaign SET slug=$2 WHERE id=$1',[draft.id,slug])
      return{id:draft.id,code,title:`${code} ${title}`,slug,owner:user.user,type,initialState:state}
    })
    campaigns[code]=result
    return result
  }
  for(const args of [
    ['REV-01','Borrador para completar',{state:'DRAFT'}],['REV-02','Campaña pendiente de revisión',{state:'IN_REVIEW'}],
    ['REV-03','Campaña aprobada para publicar',{state:'APPROVED'}],['REV-04','Huerto por donación',{}],
    ['REV-05','Huerto con recompensas',{type:'REWARD'}],['REV-06','Kit de cultivo en preventa',{type:'PRESALE'}],
    ['REV-07','Recaudación vencida para evaluar',{}],['REV-08','Destino pendiente para desembolso',{}],
    ['REV-09','Solicitud de desembolso lista',{}],['REV-10','Ejecución con fondos disponibles',{}],
    ['REV-11','Rendición final para revisión',{}],['REV-12','Campaña cerrada de referencia',{}],
    ['REV-13','Todo o nada con meta incumplida',{}],['REV-14','Cancelación solicitada',{}],
    ['REV-15','Consulta y devolución del aportante',{}],['REV-16','Disputa para atender',{}],
    ['REV-17','Campaña institucional',{user:u.organizacion,organizationId:org.id}],
    ['REV-18','Publicación bloqueada por identidad',{user:u.identidadpendiente,state:'APPROVED'}],
    ['REV-19','Campaña observada para corregir',{state:'CHANGES_REQUESTED'}],
    ['REV-20','Rendición mensual y recompensas',{type:'REWARD'}]
  ])await campaign(...args)
  const paid={}
  async function payment(code,amount,outcome='CONFIRMED',suffix='principal',withReward=false){
    return step('pago:'+code+':'+suffix,async()=>{
      const c=campaigns[code]
      const rewardId=withReward?(await call('campaigns/public/'+c.slug,sponsor)).rewards[0].id:undefined
      const checkout=await call('demo-payments/checkout',sponsor,{campaignId:c.id,...(rewardId?{rewardId}:{}),amount,currencyCode:'BOB',method:'TEST_QR',requestKey:key('checkout:'+code+':'+suffix),demoConsent:true})
      if(outcome!=='INITIATED')await call(`demo-payments/${checkout.contribution.paymentId}/simulate`,sponsor,{outcome,requestKey:key('resultado:'+code+':'+suffix)})
      return{contributionId:checkout.contribution.id,paymentId:checkout.contribution.paymentId,amount,outcome}
    })
  }
  for(const code of ['REV-07','REV-08','REV-09','REV-10','REV-11','REV-12'])paid[code]=await payment(code,'600.00')
  paid['REV-20']=await payment('REV-20','600.00','CONFIRMED','principal',true)
  for(const code of ['REV-13','REV-14'])paid[code]=await payment(code,'100.00')
  paid['REV-15']=await payment('REV-15','300.00');paid['REV-16']=await payment('REV-16','200.00')
  for(const state of ['CONFIRMED','PENDING','FAILED','EXPIRED'])await payment('REV-04','20.00',state,state)
  async function cycle(code,action,user=u.administrador){
    return checkpoint('ciclo:'+code+':'+action,async()=>{
      const c=await call(`admin/campaign-cycle/${campaigns[code].id}`,u.administrador)
      return call(`${user.user==='creador'?'me':'admin'}/campaign-cycle/${c.id}/actions`,user,{action,expectedVersion:c.version,requestKey:key(code+':'+action),reason,demoConsent:true})
    })
  }
  async function expire(code){return checkpoint('vencimiento:'+code,()=>sql("UPDATE public.campaign SET ends_at=clock_timestamp()-interval '1 minute' WHERE id=$1",[campaigns[code].id]))}
  const destinations={},payouts={}
  async function execution(code,{destination=false,request=false,complete=false}={}){
    await expire(code);await cycle(code,'END_FUNDING');await cycle(code,'START_EXECUTION')
    if(destination){
      let dest=await checkpoint('destino:'+code,()=>call(`me/disbursements/campaigns/${campaigns[code].id}/destination`,owner,{reference:'PRUEBA-HUERTO-'+code.slice(-2).replace(/\d/g,d=>'ABCDEFGHIJ'[Number(d)]),holder:'PRUEBA Camila Creadora',expectedVersion:0,reason,requestKey:key('destino:'+code),demoConsent:true},'PUT'))
      if(request||complete)dest=await checkpoint('destino-revisado:'+code,()=>call(`admin/finance/disbursements/campaigns/${campaigns[code].id}/destination/review`,u.finanzas,{decision:'VERIFIED',expectedVersion:dest.destination.version,reason,requestKey:key('destino-revisado:'+code),demoConsent:true}))
      destinations[code]=dest.destination
      if(request||complete){
        let payout=await checkpoint('desembolso:'+code,()=>call(`me/disbursements/campaigns/${campaigns[code].id}`,owner,{amount:'600.00',payoutAccountId:dest.destination.id,destinationVersion:dest.destination.version,scheduledFor:null,reason,requestKey:key('desembolso:'+code),demoConsent:true}))
        if(complete)for(const action of ['AUTHORIZE','PROCESS_DEMO','COMPLETE_DEMO'])payout=await checkpoint('desembolso:'+code+':'+action,()=>call(`admin/finance/disbursements/${payout.id}/actions`,u.finanzas,{action,expectedVersion:payout.version,reason,requestKey:key('desembolso:'+code+':'+action),demoConsent:true}))
        payouts[code]={id:payout.id,status:payout.status}
      }
    }
  }
  await expire('REV-07');await execution('REV-08',{destination:true});await execution('REV-09',{destination:true,request:true})
  for(const code of ['REV-10','REV-11','REV-12','REV-20'])await execution(code,{destination:true,complete:true})
  await expire('REV-13');await cycle('REV-14','REQUEST_CANCEL',owner)
  const reports={}
  for(const code of ['REV-11','REV-12']){
    reports[code]=await step('informe-final:'+code,async()=>{
      await checkpoint('avances:'+code,async()=>{
        const current=await call(`campaigns/${campaigns[code].id}/progress`,owner)
        return call(`campaigns/${campaigns[code].id}/progress`,owner,{revision:current.revision,activities:current.activities.map(a=>({id:a.id,responsibleName:a.responsibleName,status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today})),milestones:current.milestones.map(m=>({id:m.id,responsibleName:m.responsibleName,status:'COMPLETED',progressPercent:100,actualStartOn:today,actualEndOn:today})),indicators:current.indicators.map(i=>({id:i.id,achievedValue:20}))},'PUT')
      })
      await checkpoint('novedad:'+code,()=>call(`campaigns/${campaigns[code].id}/updates/${key('novedad:'+code)}`,owner,{revision:null,title:'Resultados del huerto comunitario',body:'Se completaron las actividades de preparación y se habilitó el huerto con participación de las familias.',milestoneId:null,images:[],publish:true},'PUT'))
      let closure=await call(`me/campaign-closure/${campaigns[code].id}`,owner)
      const evidence=await upload(owner,'gasto-final-'+code,'CLOSURE_EVIDENCE')
      closure=await checkpoint('envio-final:'+code,()=>call(`me/campaign-closure/${closure.id}/actions`,owner,{action:'SUBMIT_FINAL',data:{periodStart:today,periodEnd:today,narrative:'Se completó el huerto y participaron las familias en ambas actividades planificadas.',varianceExplanation:'Se añadieron materiales complementarios por cien bolivianos respecto al presupuesto inicial.',expenses:[{budgetItemId:null,expenseCategoryId:expense.id,description:'Herramientas y materiales usados en el huerto',amount:'600.00',spentOn:today,fileIds:[evidence.id]}]},expectedVersion:closure.version,requestKey:key('envio-final:'+code),reason,demoConsent:true}))
      if(code==='REV-12'){
        closure=await checkpoint('aprobacion-final:'+code,()=>call(`admin/campaign-closure/${closure.id}/actions`,u.revisor,{action:'APPROVE_FINAL',data:{reportId:closure.report.id},expectedVersion:closure.version,requestKey:key('aprobacion-final:'+code),reason,demoConsent:true}))
        // Un ajuste del reloj de Docker puede dejar un movimiento posterior al sello de revisión.
        // La referencia cerrada se vuelve a presentar y revisar por la API, sin alterar sellos históricos.
        const[chronology]=await sql(`SELECT EXISTS(SELECT 1 FROM public.disbursement d JOIN public.accountability_report r ON r.campaign_id=d.campaign_id
          WHERE d.campaign_id=$1 AND d.status='COMPLETED' AND r.id=$2 AND d.completed_at>r.reviewed_at) AS retry`,[closure.id,closure.report.id])
        if(chronology.retry){
          closure=await call(`me/campaign-closure/${closure.id}`,owner)
          closure=await checkpoint('reenvio-final-cronologia:'+code,()=>call(`me/campaign-closure/${closure.id}/actions`,owner,{action:'SUBMIT_FINAL',data:{periodStart:today,periodEnd:today,narrative:'Se completó el huerto y se vuelve a presentar el cierre después del último movimiento registrado.',varianceExplanation:'Se añadieron materiales complementarios por cien bolivianos respecto al presupuesto inicial.',expenses:[{budgetItemId:null,expenseCategoryId:expense.id,description:'Herramientas y materiales usados en el huerto',amount:'600.00',spentOn:today,fileIds:[evidence.id]}]},expectedVersion:closure.version,requestKey:key('reenvio-final-cronologia:'+code),reason,demoConsent:true}))
          closure=await checkpoint('revision-final-cronologia:'+code,()=>call(`admin/campaign-closure/${closure.id}/actions`,u.revisor,{action:'APPROVE_FINAL',data:{reportId:closure.report.id},expectedVersion:closure.version,requestKey:key('revision-final-cronologia:'+code),reason,demoConsent:true}))
        }
        await cycle(code,'CLOSE')
      }
      return {id:closure.report.id,status:closure.report.status}
    })
  }
  // Solo esta referencia sintética representa un mes ya cerrado. No cambia el reloj ni datos ajenos.
  const monthly=await step('rendicion-mensual',async()=>{
    const id=campaigns['REV-20'].id
    const [bounds]=await checkpoint('historia-mensual',async()=>{
      const [b]=await sql("SELECT (date_trunc('month',clock_timestamp() AT TIME ZONE 'America/La_Paz')-interval '1 month')::date::text AS start,(date_trunc('month',clock_timestamp() AT TIME ZONE 'America/La_Paz')-interval '1 day')::date::text AS finish")
      await sql("UPDATE brotar_extension.campaign_cycle SET execution_started_at=$2::date+interval '12 hours' WHERE campaign_id=$1",[id,b.start])
      await sql("UPDATE public.disbursement SET created_at=$2::date+interval '12 hours 1 minute',authorized_at=$2::date+interval '12 hours 2 minutes',processed_at=$2::date+interval '12 hours 3 minutes',completed_at=$2::date+interval '13 hours' WHERE campaign_id=$1 AND status='COMPLETED'",[id,b.start])
      return [b]
    })
    const file=await upload(owner,'gasto-mensual','CLOSURE_EVIDENCE'),documentId=key('documento-mensual')
    let state=await call('me/accountability/'+id,owner)
    state=await checkpoint('borrador-mensual',()=>call('me/accountability/'+id+'/actions',owner,{action:'SAVE_DRAFT',data:{documentId,periodLabel:'Primer mes de ejecución',periodStart:bounds.start,periodEnd:bounds.finish,narrative:'Se adquirieron herramientas y materiales para la primera etapa del huerto comunitario.',varianceExplanation:'Se ejecutó una parte del presupuesto; el saldo queda identificado para su posterior rendición.',expenses:[{budgetItemId:null,expenseCategoryId:expense.id,description:'Herramientas de la primera etapa del huerto',amount:'300.00',spentOn:bounds.start,fileIds:[file.id]}]},expectedVersion:state.version,requestKey:key('borrador-mensual'),reason,demoConsent:true}))
    state=await checkpoint('envio-mensual',()=>call('me/accountability/'+id+'/actions',owner,{action:'SUBMIT_REPORT',data:{documentId},expectedVersion:state.version,requestKey:key('envio-mensual'),reason,demoConsent:true}))
    return {documentId,periodStart:bounds.start,periodEnd:bounds.finish,status:state.reports.find(r=>r.documentId===documentId).status}
  })
  const incident=await step('incidencia',async()=>{
    const file=await upload(sponsor,'respaldo-incidencia')
    const created=await call('me/support-cases',sponsor,{requestId:key('incidencia'),campaignId:campaigns['REV-15'].id,contributionId:paid['REV-15'].contributionId,category:'OTHER',subject:'Consulta sobre el uso del aporte',description:'Solicito información adicional sobre el detalle de las herramientas y el destino de mi aporte.',evidenceFileIds:[file.id],confirmed:true})
    const answer=await upload(u.soporte,'respuesta-soporte')
    await call(`admin/support-cases/${created.id}/assignment`,u.soporte,{assignedTo:u.soporte.id})
    await call(`admin/support-cases/${created.id}/messages`,u.soporte,{requestId:key('respuesta-soporte'),body:'Adjuntamos la información del caso. Puedes responder aquí con tus observaciones y archivos.',evidenceFileIds:[answer.id]})
    return{id:created.id,reference:created.reference}
  })
  const refund=await step('devolucion',async()=>{
    const evidence=await upload(sponsor,'respaldo-devolucion')
    return call('me/refunds',sponsor,{paymentId:paid['REV-15'].paymentId,amount:'50.00',reasonCode:'OTHER',reason:'Solicito la devolución parcial de cincuenta bolivianos del aporte registrado.',evidenceFileIds:[evidence.id],requestKey:key('devolucion'),demoConsent:true})
  })
  const dispute=await step('disputa',async()=>{
    const evidence=await upload(sponsor,'respaldo-disputa')
    const c=await checkpoint('incidencia-disputa',()=>call('me/support-cases',sponsor,{requestId:key('incidencia-disputa'),campaignId:campaigns['REV-16'].id,contributionId:paid['REV-16'].contributionId,category:'UNRECOGNIZED_PAYMENT',subject:'Revisar el registro del pago',description:'Solicito investigar la identificación del pago y contrastar la información del registro.',evidenceFileIds:[evidence.id],confirmed:true}))
    const d=await call('me/disputes',sponsor,{supportCaseId:c.id,paymentId:paid['REV-16'].paymentId,description:'Solicito investigar este pago del recorrido de revisión y documentar la resolución del caso.',requestKey:key('disputa'),demoConsent:true})
    return{id:d.id,supportCaseId:c.id,status:d.status}
  })
  const reconciliation=await step('conciliacion',()=>call('admin/finance/demo/reconciliations',u.finanzas,{from:today,to:today,currencyCode:'BOB',requestKey:key('conciliacion')}))
  await step('cuenta-restringida',()=>sql("UPDATE public.app_user SET status='SUSPENDED' WHERE id=$1",[u.restringido.id]))
  for(const c of Object.values(campaigns)){const [r]=await sql('SELECT status FROM public.campaign WHERE id=$1',[c.id]);c.initialState=r.status}
  manifest.scenarios=Object.values(campaigns).map(c=>({...c,routes:{public:'/proyectos/'+c.slug,creator:'/mis-proyectos/'+c.id,review:'/administracion/campanas/'+c.id,cycle:'/administracion/ciclo-campanas/'+c.id,closure:'/administracion/cierre-campanas/'+c.id},payment:paid[c.code]??null,destination:destinations[c.code]??null,payout:payouts[c.code]??null,report:reports[c.code]??null}))
  manifest.verifications={pending:identityPending,changes:identityChanges}
  manifest.organization={id:org.id,name:'Fundación Semillas del Valle'}
  manifest.monthly=monthly;manifest.support=incident;manifest.refund={id:refund.id,status:refund.status};manifest.dispute=dispute;manifest.reconciliation={id:reconciliation.id}
  manifest.nextSteps='Consultar el manual de revisión; los escenarios son independientes y mantienen su progreso.'
}
