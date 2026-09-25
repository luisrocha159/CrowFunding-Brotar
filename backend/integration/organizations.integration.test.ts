import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { configureHttp } from '../src/shared/infrastructure/http/configure-http'
import { readEnvironment } from '../src/config/environment'
import { createDataSource } from '../src/shared/infrastructure/database/data-source'
import { readDatabaseConfig } from '../src/shared/infrastructure/database/database.config'
import { UserSchema } from '../src/users/infrastructure/persistence/user.schemas'
import type { Organization } from '../src/organizations/application/organizations'
import type { EntityManager } from 'typeorm'
import type { DatabaseService } from '../src/shared/infrastructure/database/database.service'
import { TypeormOrganizationRepository } from '../src/organizations/infrastructure/typeorm-organization.repository'
import { readTestDatabaseTarget } from './database-target'

test('roles y organizaciones reales: registro básico, borrador, aislamiento, caducidad y revocación', { timeout:60000 }, async()=>{
  const config=readDatabaseConfig(process.env)
  assert.ok(config.enabled && process.env.ALLOW_DB_TEST_WRITES==='true')
  assert.equal(config.host,'127.0.0.1'); assert.notEqual(process.env.NODE_ENV,'production')
  const { container, project: expectedProject, port } = readTestDatabaseTarget(config)
  const project=execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],{encoding:'utf8',timeout:10000}).trim()
  assert.equal(project,expectedProject)
  const bindings=JSON.parse(execFileSync('docker',['inspect','--format','{{json .NetworkSettings.Ports}}',container],{encoding:'utf8'})) as Record<string, {HostIp:string;HostPort:string}[]>
  assert.deepEqual(bindings['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:port}])
  // Administración solo de fixtures identificados por UUID de ESTA prueba. La API no recibe estas facultades.
  const admin=(sql:string)=>execFileSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','brotar_db'],{input:sql,stdio:['pipe','pipe','pipe'],timeout:10000})
  const source=createDataSource(config)
  const suffix=randomUUID(); const ids:string[]=[]
  const inactiveId=randomUUID()
  const password=randomBytes(24).toString('hex')
  const createApp=async()=>{
    const instance=await NestFactory.create(AppModule,{logger:false});configureHttp(instance,readEnvironment({NODE_ENV:'test'}));await instance.listen(0,'127.0.0.1');return instance
  }
  let app=await createApp(); let base=await app.getUrl()
  const request=(path:string,cookie='',body?:unknown,extra:Record<string,string>={})=>fetch(`${base}/api/${path}`,{
    method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Brotar-Request':'1',Cookie:cookie,Origin:'http://127.0.0.1:5173',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})
  })
  try {
    await source.initialize()
    const rights=await source.query(`SELECT has_table_privilege(current_user,'public.role','UPDATE') AS role_update,
      has_table_privilege(current_user,'public.user_role','UPDATE') AS grant_update,
      has_table_privilege(current_user,'public.organization','DELETE') AS organization_delete`)
    assert.deepEqual(rights[0],{role_update:false,grant_update:false,organization_delete:false})
    const cookies:string[]=[]
    for(let i=0;i<2;i++) {
      const email=`org-${i}-${suffix}@example.invalid`
      const registration=await request('auth/register','',{firstName:'Prueba',lastName:'Organización',email,password,demoConsent:true})
      assert.equal(registration.status,201)
      const body=await registration.json() as {id:string;status:string}; assert.match(body.id,/^[a-f0-9-]{36}$/);ids.push(body.id)
      assert.equal(body.status,'PENDING_VERIFICATION')
      const assigned=await source.query('SELECT r.code FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id=$1',[body.id])
      assert.deepEqual(assigned,[{code:'REGISTERED_USER'}])
      const login=await request('auth/login','',{email,password});assert.equal(login.status,200)
      cookies.push(login.headers.get('set-cookie')!.split(';')[0]!)
      assert.equal((await (await request('auth/me',cookies[i])).json() as {status:string}).status,'PENDING_VERIFICATION')
    }
    assert.equal((await request('organizations')).status,401)
    assert.equal((await request('access/roles')).status,401)
    const roleResponse=await request('access/roles',cookies[0]);assert.equal(roleResponse.status,200)
    assert.deepEqual(await roleResponse.json(),{roles:[{code:'REGISTERED_USER',name:'Usuario registrado'}]})
    const types=await (await request('organizations/types',cookies[0])).json() as {id:string;code:string}[]
    assert.deepEqual(types.map(type=>type.code).sort(),['COMPANY','FOUNDATION','NGO','OTHER'])
    assert.deepEqual(await (await request('organizations',cookies[0])).json(),[])
    const input={legalName:`Organización prueba ${suffix}`,tradeName:'Prueba',organizationTypeId:types[0]!.id,contactEmail:' CONTACT@example.invalid ',contactPhone:'+591 70001234'}
    assert.equal((await request('organizations',cookies[0],input,{'X-Brotar-Request':''})).status,403)
    assert.equal((await request('organizations',cookies[0],input,{Origin:'https://untrusted.example'})).status,403)
    for(const change of [{legalName:''},{tradeName:'x'.repeat(201)},{contactEmail:'invalid'},{contactPhone:'abcdef'},
      {organizationTypeId:randomUUID()},{createdBy:ids[1]},{status:'ACTIVE'},{membershipRole:'ADMIN'}]) {
      assert.equal((await request('organizations',cookies[0],{...input,...change})).status,400)
    }
    admin(`INSERT INTO organization_type(id,code,name,is_active) VALUES('${inactiveId}','t-${inactiveId}','Tipo temporal inactivo',false);`)
    assert.equal((await request('organizations',cookies[0],{...input,organizationTypeId:inactiveId})).status,400)
    const result=await request('organizations',cookies[0],input);assert.equal(result.status,201)
    const organization=await result.json() as Organization
    assert.equal(organization.status,'DRAFT');assert.equal(organization.membershipRole,'OWNER');assert.equal(organization.contactEmail,'contact@example.invalid')
    assert.equal((await source.query('SELECT created_by FROM organization WHERE id=$1',[organization.id]))[0].created_by,ids[0])
    assert.equal((await source.query('SELECT count(*)::int AS n FROM organization_member WHERE organization_id=$1 AND user_id=$2',[organization.id,ids[0]]))[0].n,1)
    // Falla inducida SOLO en el adaptador de esta prueba, después del INSERT real de organización.
    // Debe revertir la transacción completa; no se crean triggers ni se altera el esquema.
    const faultDatabase = { connection: () => ({ transaction: <T>(work: (manager: EntityManager) => Promise<T>) => source.transaction(manager => work(new Proxy(manager, {
      get(target,key,receiver) {
        if(key==='query') return async (sql: string, parameters?: unknown[]) => {
          if(sql.includes('INSERT INTO public.organization_member')) throw new Error('fixture-membership-failure')
          return target.query(sql,parameters)
        }
        return Reflect.get(target,key,receiver) as unknown
      }
    }))) }) } as unknown as DatabaseService
    await assert.rejects(new TypeormOrganizationRepository(faultDatabase).create(ids[0]!,{...input,legalName:'Rollback temporal'}),/fixture-membership-failure/)
    assert.equal((await source.query('SELECT count(*)::int AS n FROM organization WHERE created_by=$1',[ids[0]]))[0].n,1)
    assert.equal((await request(`organizations/${organization.id}`,cookies[1])).status,404)
    assert.equal((await request(`organizations/${randomUUID()}`,cookies[1])).status,404)
    assert.deepEqual(await (await request('organizations',cookies[1])).json(),[])
    await app.close();app=await createApp();base=await app.getUrl()
    assert.deepEqual(await (await request(`organizations/${organization.id}`,cookies[0])).json(),organization)
    // Retirada de membresía elimina visibilidad sin borrar ni transferir la organización.
    admin(`UPDATE organization_member SET left_at=clock_timestamp() WHERE user_id='${ids[0]}' AND organization_id='${organization.id}';`)
    assert.equal((await request(`organizations/${organization.id}`,cookies[0])).status,404)
    admin(`UPDATE organization_member SET left_at=NULL WHERE user_id='${ids[0]}' AND organization_id='${organization.id}';`)
    // Roles se leen de la base en cada petición: no de un token o del cliente.
    admin(`UPDATE user_role SET granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE user_id='${ids[0]}';`)
    assert.equal((await request('organizations',cookies[0])).status,403)
    assert.deepEqual(await (await request('access/roles',cookies[0])).json(),{roles:[]})
    admin(`UPDATE user_role SET expires_at=NULL,revoked_at=clock_timestamp() WHERE user_id='${ids[0]}';`)
    assert.equal((await request('organizations',cookies[0],input)).status,403)
    assert.equal((await request('auth/me',cookies[0])).status,200)
    // La sesión no restituye el rol retirado.
    const relogin=await request('auth/login','',{email:`org-0-${suffix}@example.invalid`,password})
    assert.equal(relogin.status,200)
    assert.equal((await request('organizations',relogin.headers.get('set-cookie')!.split(';')[0])).status,403)
    assert.deepEqual((await source.query('SELECT status FROM organization WHERE id=$1',[organization.id]))[0],{status:'DRAFT'})
    assert.deepEqual((await source.query('SELECT status,email_verified_at,phone_verified_at FROM app_user WHERE id=$1',[ids[0]]))[0],
      {status:'PENDING_VERIFICATION',email_verified_at:null,phone_verified_at:null})
  } finally {
    await app.close()
    try {
      for(const id of ids) {
        assert.match(id,/^[a-f0-9-]{36}$/)
        admin(`DELETE FROM organization WHERE created_by='${id}';`)
        if(source.isInitialized) await source.getRepository(UserSchema).delete({id})
      }
      admin(`DELETE FROM organization_type WHERE id='${inactiveId}';`)
    } finally {if(source.isInitialized) await source.destroy()}
  }
})
