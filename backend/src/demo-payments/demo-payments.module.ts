import { BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, HttpException, Injectable, Module, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Equals, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import type { Response } from 'express'
import { SessionMutationGuard } from '../auth/infrastructure/http/session-http'
import { ContributionsModule } from '../contributions/contributions.module'
import { ContributionPageDto } from '../contributions/contributions.module'
import { LedgerConflict, LedgerInvalid, type IncomingState } from '../contributions/domain/payment'
import { ReportInvalid } from '../finance/domain/report'
import { RolesModule } from '../roles/roles.module'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../roles/infrastructure/roles-http'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { DatabaseService } from '../shared/infrastructure/database/database.service'
import { writeBudget } from '../shared/infrastructure/http/write-budget'
import { assertDemoEnabled, DemoPayments } from './infrastructure/demo-payments'
import { DemoReconciliation } from './infrastructure/demo-reconciliation'

export class ConsentDto {
  @IsUUID('4') requestKey!: string
  @IsBoolean() @Equals(true) demoConsent!: true
}
export class CheckoutDto extends ConsentDto {
  @IsUUID() campaignId!: string
  @IsOptional() @IsUUID() rewardId?: string|null
  @IsString() @Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/) amount!: string
  @Matches(/^[A-Z]{3}$/) currencyCode!: string
}
export class SimulationDto {
  @IsUUID('4') requestKey!: string
  @IsIn(['PENDING','CONFIRMED','FAILED','EXPIRED']) outcome!: IncomingState
}
export class ReconciliationDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string
  @Matches(/^[A-Z]{3}$/) currencyCode!: string
  @IsUUID('4') requestKey!: string
}
export class PendingReconciliationDto extends ContributionPageDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string
  @Matches(/^[A-Z]{3}$/) currencyCode!: string
}
export class ResolutionDto {
  @IsIn(['RECHECK','COMPENSATE_DEMO']) action!: 'RECHECK'|'COMPENSATE_DEMO'
  @IsString() @MinLength(20) @MaxLength(500) reason!: string
}
export class ExpirationDto { @IsInt() @Min(1) @Max(100) limit=100 }
export class CloseDto { @IsBoolean() @Equals(true) confirmed!: true }

@Injectable()
export class DemoEnabledGuard implements CanActivate {
  canActivate(): boolean {assertDemoEnabled();return true}
}
@Injectable()
export class DemoWriteLimitGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http=context.switchToHttp(),request=http.getRequest<AuthenticatedRequest>()
    if (!await writeBudget(this.database.connection(),'demo-payments:v1',request.brotarUser.id,request.ip ?? 'unknown')) {
      http.getResponse<Response>().setHeader('Retry-After','60')
      throw new HttpException('Demasiadas operaciones DEMO. Espera un minuto y consulta el estado antes de repetir.',429)
    }
    return true
  }
}
async function translate<T>(operation: ()=>Promise<T>): Promise<T> {
  try {return await operation()} catch(error) {
    if (error instanceof LedgerInvalid || error instanceof ReportInvalid) throw new BadRequestException(error.message)
    if (error instanceof LedgerConflict) throw new ConflictException(error.message)
    throw error
  }
}

@Controller('demo-payments') @UseGuards(DemoEnabledGuard,RoleGuard) @RequirePermissions('contribution.write.own')
export class DemoPaymentsController {
  constructor(private readonly payments: DemoPayments) {}
  @Post('checkout') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  checkout(@Req() request: AuthenticatedRequest,@Body() input: CheckoutDto) {
    return translate(()=>this.payments.checkout(request.brotarUser.id,input))
  }
  @Get(':id') @Header('Cache-Control','no-store') @RequirePermissions('contribution.read.own')
  ticket(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id: string) {
    return translate(()=>this.payments.ticket(request.brotarUser.id,id))
  }
  @Post('contributions/:id/retry') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  retry(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id: string,@Body() input: ConsentDto) {
    return translate(()=>this.payments.retry(request.brotarUser.id,id,input.requestKey,input.demoConsent))
  }
  @Post(':id/simulate') @HttpCode(200) @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  simulate(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id: string,@Body() input: SimulationDto) {
    return translate(()=>this.payments.simulate(request.brotarUser.id,id,input.outcome,input.requestKey))
  }
}

@Controller('admin/finance/demo') @UseGuards(DemoEnabledGuard,RoleGuard) @RequirePermissions('finance.read')
export class DemoReconciliationController {
  constructor(private readonly reconciliation: DemoReconciliation) {}
  @Get('currencies') @Header('Cache-Control','no-store')
  currencies() {return translate(()=>this.reconciliation.currencies())}
  @Get('pending') @Header('Cache-Control','no-store')
  pending(@Query() query: PendingReconciliationDto) {
    return translate(()=>this.reconciliation.pending({...query,limit:Number(query.limit)}))
  }
  @Get('reconciliations') @Header('Cache-Control','no-store')
  list(@Query() query: ContributionPageDto) {return translate(()=>this.reconciliation.list(Number(query.limit),query.cursor))}
  @Get('reconciliations/:id') @Header('Cache-Control','no-store')
  detail(@Param('id',new ParseUUIDPipe()) id: string) {return translate(()=>this.reconciliation.detail(id))}
  @Post('reconciliations') @RequirePermissions('finance.operate') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  create(@Req() request: AuthenticatedRequest,@Body() input: ReconciliationDto) {return translate(()=>this.reconciliation.create(request.brotarUser.id,input))}
  @Post('reconciliations/:id/items/:itemId/resolve') @HttpCode(200) @RequirePermissions('finance.operate') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  resolve(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id: string,@Param('itemId',new ParseUUIDPipe()) itemId: string,@Body() input: ResolutionDto) {
    return translate(()=>this.reconciliation.resolve(request.brotarUser.id,id,itemId,input.action,input.reason))
  }
  @Post('reconciliations/:id/close') @HttpCode(200) @RequirePermissions('finance.operate') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  close(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id: string,@Body() input: CloseDto) {
    if (input.confirmed!==true) throw new BadRequestException('Confirma el cierre del lote DEMO.')
    return translate(()=>this.reconciliation.close(request.brotarUser.id,id))
  }
  @Post('expire') @HttpCode(200) @RequirePermissions('finance.operate') @Header('Cache-Control','no-store') @UseGuards(SessionMutationGuard,DemoWriteLimitGuard)
  expire(@Req() request: AuthenticatedRequest,@Body() input: ExpirationDto) {return translate(()=>this.reconciliation.expire(request.brotarUser.id,input.limit))}
}
@Module({imports:[RolesModule,DatabaseModule,ContributionsModule],controllers:[DemoPaymentsController,DemoReconciliationController],
  providers:[DemoEnabledGuard,DemoWriteLimitGuard,SessionMutationGuard,DemoPayments,DemoReconciliation]})
export class DemoPaymentsModule {}
