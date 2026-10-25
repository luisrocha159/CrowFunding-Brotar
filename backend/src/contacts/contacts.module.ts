import {Body,Controller,Get,Header,Module,Param,ParseUUIDPipe,Post,Put,Req,UseGuards} from '@nestjs/common'
import {IsBoolean,IsString,Matches} from 'class-validator'
import {DatabaseModule} from '../shared/infrastructure/database/database.module'
import {RolesModule} from '../roles/roles.module'
import {RoleGuard,RequireRoles,type AuthenticatedRequest} from '../roles/infrastructure/roles-http'
import {SessionMutationGuard} from '../auth/infrastructure/http/session-http'
import {ContactMail,ContactMailSender} from './contact-mail'
import {CaseWriteLimitGuard} from '../shared/infrastructure/http/case-write-limit.guard'

class ConfirmEmail { @IsString() @Matches(/^[a-f0-9]{64}$/) token!:string }
class MailPreference { @IsBoolean() enabled!:boolean }
@Controller('contacts') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class ContactsController {
 constructor(private readonly mail:ContactMail){}
 @Get() @Header('Cache-Control','no-store') status(@Req() r:AuthenticatedRequest){return this.mail.status(r.brotarUser.id)}
 @Post('email/request') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) request(@Req() r:AuthenticatedRequest){return this.mail.request(r.brotarUser.id)}
 @Post('email/confirm') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) confirm(@Req() r:AuthenticatedRequest,@Body() b:ConfirmEmail){return this.mail.confirm(r.brotarUser.id,b.token)}
 @Put('email/preferences') @UseGuards(SessionMutationGuard,CaseWriteLimitGuard) preference(@Req() r:AuthenticatedRequest,@Body() b:MailPreference){return this.mail.preference(r.brotarUser.id,b.enabled)}
 @Get('notifications') @Header('Cache-Control','no-store') notices(@Req() r:AuthenticatedRequest){return this.mail.notices(r.brotarUser.id)}
 @Post('notifications/:id/read') @UseGuards(SessionMutationGuard) read(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.mail.read(r.brotarUser.id,id)}
}
@Module({imports:[DatabaseModule,RolesModule],controllers:[ContactsController],providers:[ContactMail,ContactMailSender,SessionMutationGuard,CaseWriteLimitGuard]})
export class ContactsModule {}
