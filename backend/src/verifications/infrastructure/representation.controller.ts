import {Body,Controller,Get,Header,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common'
import {Equals,IsBoolean,IsIn,IsInt,IsString,IsUUID,Length,Min} from 'class-validator'
import {RequirePermissions,RequireRoles,RoleGuard,type AuthenticatedRequest} from '../../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../../auth/infrastructure/http/session-http'
import {CaseWriteLimitGuard} from '../../shared/infrastructure/http/case-write-limit.guard'
import {operation,pageNumber} from '../../campaign-lifecycle/infrastructure/operation'
import {RepresentationRequests} from './representation-requests'
export class RepresentationProposalDto {
 @IsIn(['REPRESENTATIVE','OWNERSHIP']) kind!:'REPRESENTATIVE'|'OWNERSHIP'
 @IsUUID() targetUserId!:string
 @IsString() @Length(1,100) expectedVersion!:string
 @IsString() @Length(10,1000) reason!:string
 @IsBoolean() @Equals(true) confirmed!:boolean
}
export class RepresentationActionDto {
 @IsIn(['ACCEPT','DECLINE','CANCEL','APPROVE','REJECT']) action!:'ACCEPT'|'DECLINE'|'CANCEL'|'APPROVE'|'REJECT'
 @IsInt() @Min(1) expectedVersion!:number
 @IsString() @Length(10,1000) reason!:string
 @IsBoolean() @Equals(true) confirmed!:boolean
}
@Controller('me') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class RepresentationController {
 constructor(private readonly requests:RepresentationRequests){}
 @Get('representation-requests') @Header('Cache-Control','private, no-store')
 list(@Req() r:AuthenticatedRequest,@Query('page') page='1'){return operation(()=>this.requests.list(r.brotarUser.id,false,pageNumber(page)))}
 @Get('representation-requests/:id') @Header('Cache-Control','private, no-store')
 detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.requests.detail(r.brotarUser.id,id)}
 @Post('organizations/:id/representation-requests') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store')
 propose(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:RepresentationProposalDto){return operation(()=>this.requests.propose(r.brotarUser.id,id,input))}
 @Post('representation-requests/:id/actions') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store')
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:RepresentationActionDto){return operation(()=>this.requests.act(r.brotarUser.id,id,input,false))}
}
@Controller('administration/representation-requests') @UseGuards(RoleGuard) @RequirePermissions('parties.read')
export class RepresentationAdministrationController {
 constructor(private readonly requests:RepresentationRequests){}
 @Get() @Header('Cache-Control','private, no-store')
 list(@Req() r:AuthenticatedRequest,@Query('page') page='1'){return operation(()=>this.requests.list(r.brotarUser.id,true,pageNumber(page)))}
 @Get(':id') @Header('Cache-Control','private, no-store')
 detail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.requests.detail(r.brotarUser.id,id,true)}
 @Post(':id/actions') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) @Header('Cache-Control','private, no-store')
 act(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body() input:RepresentationActionDto){return operation(()=>this.requests.act(r.brotarUser.id,id,input,true))}
}
