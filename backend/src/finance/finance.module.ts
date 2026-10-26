import { BadRequestException, Controller, Get, Header, Module, Query, Req, StreamableFile, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator'
import { RolesModule } from '../roles/roles.module'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../roles/infrastructure/roles-http'
import {transactionAccess} from '../roles/infrastructure/transaction-access'
import {DatabaseService} from '../shared/infrastructure/database/database.service'
import {recordAudit,setAuditActor} from '../shared/infrastructure/database/audit'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { FinancialOperations } from './infrastructure/financial-operations'
import { PAYMENT_STATUSES, ReportInvalid } from './domain/report'

export class ReportFiltersDto {
  @IsOptional() @IsUUID() campaignId?: string
  @IsOptional() @IsIn(PAYMENT_STATUSES) status?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string
}
export class OperationsQueryDto extends ReportFiltersDto {
  @Matches(/^(?:[1-9]|[1-4]\d|50)$/) limit = '25'
  @IsOptional() @IsUUID() cursor?: string
}
@Controller('admin/finance/payments') @UseGuards(RoleGuard) @RequirePermissions('finance.read')
export class FinanceController {
  constructor(private readonly operations: FinancialOperations,private readonly database:DatabaseService) {}
  @Get() @Header('Cache-Control','no-store')
  async list(@Query() query: OperationsQueryDto) {
    try { return await this.operations.list(query,Number(query.limit),query.cursor) } catch (error) { this.translate(error) }
  }
  @Get('export') @Header('Cache-Control','no-store')
  async export(@Query() query: ReportFiltersDto,@Req() request:AuthenticatedRequest) {
    try {
      const csv=await this.operations.export(query)
      await this.database.connection().transaction(async manager=>{
        await transactionAccess(manager,request.brotarUser.id,'finance.read')
        await setAuditActor(manager,request.brotarUser.id)
        await recordAudit(manager,request.brotarUser.id,'EXPORT','payment',null)
      })
      return new StreamableFile(Buffer.from(csv,'utf8'),{
      type:'text/csv; charset=utf-8',disposition:'attachment; filename="brotar-pagos.csv"'
    }) } catch (error) { this.translate(error) }
  }
  private translate(error: unknown): never {
    if (error instanceof ReportInvalid) throw new BadRequestException(error.message)
    throw error
  }
}
@Module({imports:[RolesModule,DatabaseModule],controllers:[FinanceController],providers:[FinancialOperations]})
export class FinanceModule {}
