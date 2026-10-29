import 'reflect-metadata'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {NestFactory,ModulesContainer} from '@nestjs/core'
import {RequestMethod} from '@nestjs/common'
import {PATH_METADATA,METHOD_METADATA,GUARDS_METADATA} from '@nestjs/common/constants.js'

// Inventario de metadatos, sin abrir puerto ni conectar a datos.
process.env.DATABASE_ENABLED='false'
const compiled=process.argv.includes('--test-build')?'dist-test/src':'dist'
const {AppModule}=await import(`../${compiled}/app.module.js`)
const {ACCESS_POLICY}=await import(`../${compiled}/roles/domain/access-policy.js`)
const app=await NestFactory.create(AppModule,{logger:false})
const destination=new URL('../../docs/contratos-http-sprint3.json',import.meta.url)
try{
 const routes=[]
 for(const module of app.get(ModulesContainer).values())for(const wrapper of module.controllers.values()){
  const type=wrapper.metatype;if(!type)continue
  for(const name of Object.getOwnPropertyNames(type.prototype)){
   const handler=type.prototype[name],method=Reflect.getMetadata(METHOD_METADATA,handler)
   if(method===undefined)continue
   const path='/api/'+[Reflect.getMetadata(PATH_METADATA,type),Reflect.getMetadata(PATH_METADATA,handler)].filter(Boolean).join('/').replace(/\/+/g,'/').replace(/\/$/,'')
   const guards=[...(Reflect.getMetadata(GUARDS_METADATA,type)??[]),...(Reflect.getMetadata(GUARDS_METADATA,handler)??[])].map(guard=>guard.name)
   const roles=Reflect.getMetadata('brotar.requiredRoles',handler)??Reflect.getMetadata('brotar.requiredRoles',type)??[]
   const permissions=Reflect.getMetadata('brotar.requiredPermissions',handler)??Reflect.getMetadata('brotar.requiredPermissions',type)??[]
   const entry={method:RequestMethod[method],path,controller:type.name,handler:name,guards:[...new Set(guards)].sort(),roles,permissions}
   routes.push(entry)
  }
 }
 routes.sort((a,b)=>(a.path+' '+a.method).localeCompare(b.path+' '+b.method))
 const publicOperations=['RegistrationController.checkEmail','RegistrationController.create','PasswordRecoveryController.request','PasswordRecoveryController.reset',
  'HealthController.ready','HealthController.live','PublicCampaignController.list','PublicCampaignController.find','PublicGalleryController.read','VerificationBadgeController.read']
 const sessionOperations=['SessionController.login','SessionController.logout','SessionController.me','RolesController.current']
 const publicMethods=['FileController.publicFile','ProgressController.publicUpdates','PublicAccountabilityController.list','LegalDocumentsController.read']
 for(const route of routes){
  const name=route.controller+'.'+route.handler
  for(const permission of route.permissions)assert.ok(Object.hasOwn(ACCESS_POLICY,permission),`${name} usa un permiso fuera de la matriz acordada`)
  if(publicOperations.includes(name)||sessionOperations.includes(name)||publicMethods.includes(name))continue
  assert.ok(route.guards.includes('RoleGuard'),`${name} debe declarar autorización común`)
  assert.ok(route.roles.length||route.permissions.length,`${name} no declara permisos ni roles`)
  if(['POST','PUT','PATCH','DELETE'].includes(route.method))assert.ok(route.guards.includes('SessionMutationGuard'),`${name} carece de protección de origen`)
 }
 assert.ok(routes.length>100,'Inventario incompleto')
 assert.equal(new Set(routes.map(r=>r.method+' '+r.path)).size,routes.length,'Hay rutas duplicadas')
 const value={version:'sprint3-demo-0.15',scope:'API implementada, correo operativo del MVP; condiciones provisionales del equipo integradas; aceptación general pendiente. Matriz y autorización por objeto se comprueban además en integración.',routes}
 if(process.argv.includes('--write'))writeFileSync(destination,JSON.stringify(value,null,2)+'\n')
 else assert.deepEqual(JSON.parse(readFileSync(destination,'utf8')),value,'Cambió un contrato HTTP: revisar permisos/cliente y regenerar inventario con --write.')
 console.log(`Contratos HTTP: ${routes.length} rutas verificadas, sin puerto ni conexión a PostgreSQL.`)
}finally{await app.close()}
