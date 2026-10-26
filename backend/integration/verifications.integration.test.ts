import 'reflect-metadata'
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { randomUUID,randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { readTestDatabaseTarget } from './database-target'
import type { VerificationDetail,VerificationType } from '../src/verifications/application/verifications'
import type { ManagedOrganization } from '../src/verifications/infrastructure/organization-management.controller'

test('identidad PostgreSQL: política ausente, propiedad, documentos/versiones/corrección, auditor y representación', {timeout:60000},async()=>{
  const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');assert.notEqual(process.env.NODE_ENV,'production')
  const target=readTestDatabaseTarget(config)
  assert.equal(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',target.container],{encoding:'utf8'}).trim(),target.project)
  const admin=(sql:string)=>execFileSync('docker',['exec','-i',target.container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:sql,stdio:['pipe','pipe','pipe'],timeout:10000})
  const source=createDataSource(config);await source.initialize()
  const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app,readEnvironment({NODE_ENV:'test'}));await app.listen(0,'127.0.0.1');const base=await app.getUrl()
  const suffix=randomUUID();const documentTypeId=randomUUID();const organizationalDocumentTypeId=randomUUID();const users:string[]=[];const files:string[]=[];const organizations:string[]=[];const password=randomBytes(24).toString('hex');let policyType=''
  const request=(path:string,cookie='',method='GET',body?:unknown)=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Origin:'http://127.0.0.1:5173',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})})
  try{
    const cookies:string[]=[]
    for(let i=0;i<2;i++){
      const email=`verification-${i}-${suffix}@example.invalid`;const registration=await request('auth/register','','POST',{firstName:'Prueba',lastName:'Identidad',email,password,demoConsent:true});assert.equal(registration.status,201);users.push((await registration.json() as {id:string}).id)
      const login=await request('auth/login','','POST',{email,password});assert.equal(login.status,200);cookies.push(login.headers.get('set-cookie')!.split(';')[0]!)
    }
    assert.equal((await request('me/verifications')).status,401)
    const types=await (await request('me/verifications/types',cookies[0])).json() as VerificationType[];const type=types.find(type=>type.code==='KYC_IDENTITY')!;assert.ok(type)
    // La instalación nueva trae una política sintética; nunca se reemplaza un acuerdo real.
    if(type.policy)assert.match(type.policy.version,/^mvp-demo-/,'No probar expedientes sobre una política real.')
    if(!type.policy)assert.equal((await request('me/verifications',cookies[0],'POST',{verificationTypeId:type.id})).status,409)
    const policy={version:`test-${suffix}`,treatmentNotice:'SOLO DATOS SINTÉTICOS DE PRUEBA',evidenceReference:'integration-fixture-not-approved-policy',approvedBy:'test-fixture',approvedAt:new Date().toISOString(),fields:[{key:'name',label:'Nombre de prueba',required:true,maxLength:120}],documents:[{documentTypeId,label:'Respaldo sintético',required:true}],requiresAcceptance:true}
    const activePolicy=type.policy??policy
    if(!type.policy){admin(`INSERT INTO public.document_type(id,code,name,applies_to) VALUES('${documentTypeId}','test-${suffix}','Documento sintético','USER'); INSERT INTO brotar_extension.verification_policy(verification_type_id,version,definition,is_active) VALUES('${type.id}','${policy.version}','${JSON.stringify(policy)}'::jsonb,true);`);policyType=type.id}
    const started=await request('me/verifications',cookies[0],'POST',{verificationTypeId:type.id});assert.equal(started.status,201);let detail=await started.json() as VerificationDetail
    const repeated=await request('me/verifications',cookies[0],'POST',{verificationTypeId:type.id});assert.equal((await repeated.json() as VerificationDetail).id,detail.id)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[1])).status,404)
    const upload=async(cookie:string)=>{const result=await request('files',cookie,'POST',{purpose:'VERIFICATION_DOCUMENT',visibility:'PRIVATE',originalName:'synthetic.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nsynthetic').toString('base64')});assert.equal(result.status,201);const id=(await result.json() as {id:string}).id;files.push(id);return id}
    const ownFile=await upload(cookies[0]!);const foreignFile=await upload(cookies[1]!)
    const body=(fileId:string)=>({expectedVersion:detail.version,policyVersion:activePolicy.version,fields:Object.fromEntries(activePolicy.fields.map(field=>[field.key,'DEMO Prueba'])),documents:[{documentTypeId:activePolicy.documents[0]!.documentTypeId,fileId}],accepted:true,submit:true})
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),policyVersion:'obsolete'})).status,409)
    if(type.policy)assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),fields:Object.fromEntries(activePolicy.fields.map(field=>[field.key,'Dato no sintético']))})).status,400)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',body(foreignFile))).status,400)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),fields:{name:'Prueba',bankAccount:'not-accepted'}})).status,400)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),accepted:false})).status,400)
    for (const invalidText of ['Ana\u0000X','Ana\uD800X']) {
      assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),fields:{name:invalidText}})).status,400)
    }
    assert.equal((await source.query('SELECT count(*)::int AS n FROM brotar_extension.verification_revision WHERE verification_id=$1',[detail.id]))[0].n,0)
    const sent=await request(`me/verifications/${detail.id}`,cookies[0],'PUT',body(ownFile));assert.equal(sent.status,200);const oldVersion=detail.version;detail=await sent.json() as VerificationDetail;assert.equal(detail.status,'PENDING')
    assert.equal(detail.documents.length,1);assert.equal(detail.revisions.length,2)
    assert.equal((await request(`files/public/${ownFile}`)).status,404)
    assert.equal((await request(`files/${ownFile}`,cookies[0])).status,403,'El titular descarga por el expediente, no por la ruta genérica.')
    assert.equal((await request(`me/verifications/${detail.id}/documents/${ownFile}`,cookies[1])).status,404)
    assert.equal((await request(`me/verifications/${detail.id}/documents/${ownFile}`,cookies[0])).status,200)
    const ownPath=join(process.env.FILE_STORAGE_DIR??join(process.cwd(),'private','files'),'VERIFICATION_DOCUMENT',ownFile+'.bin'),original=readFileSync(ownPath)
    try{writeFileSync(ownPath,Buffer.alloc(original.length));assert.equal((await request(`me/verifications/${detail.id}/documents/${ownFile}`,cookies[0])).status,404,'Tamaño idéntico con hash alterado no entrega un documento KYC ni devuelve un error SQL.')}finally{writeFileSync(ownPath,original)}
    assert.equal((await request(`files/${ownFile}`,cookies[0],'DELETE')).status,409)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',{...body(ownFile),expectedVersion:oldVersion})).status,409)
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',body(ownFile))).status,400)
    admin(`UPDATE public.verification SET status='REQUIRES_INFO',result_notes='Reemplaza el documento de prueba' WHERE id='${detail.id}';`)
    detail=await (await request(`me/verifications/${detail.id}`,cookies[0])).json() as VerificationDetail;const replacement=await upload(cookies[0]!)
    const corrected=await request(`me/verifications/${detail.id}`,cookies[0],'PUT',body(replacement));assert.equal(corrected.status,200);detail=await corrected.json() as VerificationDetail
    assert.equal(detail.status,'PENDING');assert.equal(detail.documents[0]?.fileId,replacement);assert.ok(detail.revisions.some(revision=>revision.documents.some(doc=>doc.fileId===ownFile)))
    assert.equal((await source.query('SELECT count(*)::int AS n FROM public.verification_document WHERE verification_id=$1',[detail.id]))[0].n,2)
    assert.equal((await source.query('SELECT status FROM public.app_user WHERE id=$1',[users[0]]))[0].status,'PENDING_VERIFICATION')
    assert.equal((await request('administration/parties?kind=USER',cookies[0])).status,403)
    admin(`INSERT INTO public.user_role(user_id,role_id) SELECT '${users[0]}',id FROM public.role WHERE code='AUDITOR';`)
    assert.equal((await request('administration/parties?kind=USER',cookies[0])).status,200)
    assert.equal((await request('me/verifications',cookies[0],'POST',{verificationTypeId:type.id})).status,403)
    admin(`UPDATE public.user_role SET revoked_at=clock_timestamp() WHERE user_id='${users[0]}' AND role_id=(SELECT id FROM public.role WHERE code='AUDITOR');`)
    const orgTypes=await (await request('organizations/types',cookies[0])).json() as {id:string}[]
    const input={legalName:`Prueba ${suffix}`,tradeName:'Prueba',organizationTypeId:orgTypes[0]!.id,contactEmail:'contact@example.invalid',contactPhone:''}
    const createdOrg=await request('organizations',cookies[0],'POST',input);assert.equal(createdOrg.status,201);const orgId=(await createdOrg.json() as {id:string}).id;organizations.push(orgId)
    const managed=(await (await request('me/organizations',cookies[0])).json() as ManagedOrganization[]).find(org=>org.id===orgId)!
    assert.equal(managed.canEdit,true)
    assert.equal((await request(`me/organizations/${orgId}`,cookies[1],'PUT',{...input,expectedVersion:managed.version})).status,404)
    const changed=await request(`me/organizations/${orgId}`,cookies[0],'PUT',{...input,tradeName:'Actualizada',expectedVersion:managed.version});assert.equal(changed.status,200)
    assert.equal((await request(`me/organizations/${orgId}`,cookies[0],'PUT',{...input,expectedVersion:managed.version})).status,409)
    const orgCase=randomUUID();const orgFile=await upload(cookies[0]!)
    admin(`INSERT INTO public.document_type(id,code,name,applies_to) VALUES('${organizationalDocumentTypeId}','org-test-${suffix}','Documento institucional sintético','ORGANIZATION');
      INSERT INTO public.verification(id,verification_type_id,organization_id) SELECT '${orgCase}',id,'${orgId}' FROM public.verification_type WHERE code='KYB_LEGAL';
      INSERT INTO public.verification_document(verification_id,document_type_id,file_id) VALUES('${orgCase}','${organizationalDocumentTypeId}','${orgFile}');`)
    assert.equal((await request(`me/verifications/${orgCase}/documents/${orgFile}`,cookies[0])).status,200)
    admin(`UPDATE public.organization_member SET left_at=clock_timestamp() WHERE organization_id='${orgId}' AND user_id='${users[0]}';`)
    assert.equal((await request(`me/verifications/${orgCase}`,cookies[0])).status,404)
    assert.equal((await request(`me/verifications/${orgCase}/documents/${orgFile}`,cookies[0])).status,404)
    assert.equal((await request(`files/${ownFile}`,cookies[0])).status,403)
    assert.deepEqual(await (await request('me/organizations',cookies[0])).json(),[])
    admin(`UPDATE public.verification SET status='REQUIRES_INFO' WHERE id='${detail.id}';`)
    detail=await (await request(`me/verifications/${detail.id}`,cookies[0])).json() as VerificationDetail
    assert.equal((await request(`me/verifications/${detail.id}`,cookies[0],'PUT',body(orgFile))).status,400,'Un documento institucional no se reutiliza en otro caso propio tras revocar representación.')
    assert.equal((await source.query('SELECT count(*)::int AS n FROM public.verification_document WHERE verification_id=$1 AND file_id=$2',[detail.id,orgFile]))[0].n,0)
  }finally{
    await app.close()
    // Solo fixtures identificados por UUID creados en esta prueba. Nunca toca datos anteriores.
    for(const userId of users){admin(`DELETE FROM brotar_extension.verification_revision WHERE verification_id IN (SELECT id FROM public.verification WHERE user_id='${userId}'); DELETE FROM public.verification_document WHERE verification_id IN (SELECT id FROM public.verification WHERE user_id='${userId}'); DELETE FROM public.status_history WHERE entity_type='VERIFICATION' AND entity_id IN (SELECT id FROM public.verification WHERE user_id='${userId}'); DELETE FROM public.verification WHERE user_id='${userId}'; DELETE FROM public.audit_log WHERE actor_user_id='${userId}';`)}
    for(const id of organizations)admin(`DELETE FROM brotar_extension.verification_revision WHERE verification_id IN (SELECT id FROM public.verification WHERE organization_id='${id}'); DELETE FROM public.verification_document WHERE verification_id IN (SELECT id FROM public.verification WHERE organization_id='${id}'); DELETE FROM public.status_history WHERE entity_type='VERIFICATION' AND entity_id IN (SELECT id FROM public.verification WHERE organization_id='${id}'); DELETE FROM public.verification WHERE organization_id='${id}'; DELETE FROM public.organization WHERE id='${id}';`)
    admin(`DELETE FROM public.document_type WHERE id='${organizationalDocumentTypeId}';`)
    for(const id of files)admin(`UPDATE public.file_asset SET deleted_at=COALESCE(deleted_at,now()) WHERE id='${id}';`)
    for(const id of users)admin(`DELETE FROM public.app_user WHERE id='${id}';`)
    if(policyType)admin(`DELETE FROM brotar_extension.verification_policy WHERE verification_type_id='${policyType}' AND version='test-${suffix}'; DELETE FROM public.document_type WHERE id='${documentTypeId}';`)
    await source.destroy()
  }
})
