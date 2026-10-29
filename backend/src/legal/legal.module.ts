import {transactionRegisteredAccess} from '../roles/infrastructure/transaction-access'
import {BadRequestException,Body,ConflictException,Controller,Get,Header,Injectable,Module,Put,Query,Req,UseGuards} from '@nestjs/common'
import {Equals,IsString,Length} from 'class-validator'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {DatabaseService} from '../shared/infrastructure/database/database.service'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequireRoles,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'
import {LEGAL_VERSION} from './domain/legal-v1-20261028'
import {assertLegalAcceptance,InvalidLegalAgreement,LegalAgreementRequired} from './domain/legal-agreement'
import {publishedLegal,recordLegalAcceptance} from './legal-record'

class AcceptanceDto{@IsString() @Length(1,100) version!:string;@Equals(true) accepted!:true}
@Injectable()
export class LegalAgreements{
 constructor(private readonly database:DatabaseService){}
 async documents(version=LEGAL_VERSION){return publishedLegal(this.database.connection().manager,version)}
 async status(actor:string){
  const rows:{version:string;acceptedAt:Date;hash:string;source:string}[]=await this.database.connection().query(`SELECT bundle_version AS version,accepted_at AS "acceptedAt",bundle_hash AS hash,source FROM brotar_extension.legal_acceptance WHERE user_id=$1 AND purpose='ACCOUNT' ORDER BY accepted_at DESC,id DESC`,[actor])
  return{version:LEGAL_VERSION,accepted:rows.some(r=>r.version===LEGAL_VERSION),history:rows.map(r=>({...r,acceptedAt:r.acceptedAt.toISOString()}))}
 }
 async accept(actor:string,version:string,accepted:boolean){
  assertLegalAcceptance(version,accepted)
  await this.database.connection().transaction(async m=>{
   await transactionRegisteredAccess(m,actor)
   await recordLegalAcceptance(m,actor,version,'ACCOUNT')
  })
  return this.status(actor)
 }
}
const translated=async<T>(operation:()=>Promise<T>)=>{try{return await operation()}catch(e){if(e instanceof InvalidLegalAgreement)throw new BadRequestException(e.message);if(e instanceof LegalAgreementRequired)throw new ConflictException(e.message);throw e}}
@Controller('legal')
export class LegalDocumentsController{
 constructor(private readonly legal:LegalAgreements){}
 @Get('documents') @Header('Cache-Control','no-store') read(@Query('version') version?:string){if(version!==undefined && !/^[a-z0-9.-]{1,100}$/.test(version))throw new BadRequestException('Versión inválida.');return translated(()=>this.legal.documents(version))}
}
@Controller('me/legal') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class LegalAcceptanceController{
 constructor(private readonly legal:LegalAgreements){}
 @Get() @Header('Cache-Control','no-store') status(@Req() r:AuthenticatedRequest){return translated(()=>this.legal.status(r.brotarUser.id))}
 @Put() @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','no-store') accept(@Req() r:AuthenticatedRequest,@Body() b:AcceptanceDto){return translated(()=>this.legal.accept(r.brotarUser.id,b.version,b.accepted))}
}
@Module({imports:[DatabaseModule,RolesModule],controllers:[LegalDocumentsController,LegalAcceptanceController],providers:[LegalAgreements,SessionMutationGuard,CaseWriteLimitGuard]})
export class LegalModule{}
