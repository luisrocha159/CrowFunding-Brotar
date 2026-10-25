import { BadRequestException, ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { Contributions, ContributionUnavailable, InvalidContributionQuery, ReceiptUnavailable } from '../application/contributions'
function translate(error: unknown): never {
  if (error instanceof ContributionUnavailable) throw new NotFoundException('Aporte no disponible.')
  if (error instanceof InvalidContributionQuery) throw new BadRequestException('Revisa la página, el estado del aporte y las fechas (AAAA-MM-DD).')
  if (error instanceof ReceiptUnavailable) throw new ConflictException('Este aporte no tiene un pago confirmado verificable para emitir el comprobante.')
  throw error
}
@Controller('me') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class ContributionController {
  constructor(private readonly contributions: Contributions) {}
  @Get('contributions') @Header('Cache-Control', 'no-store')
  async list(@Req() request: AuthenticatedRequest, @Query('page') page = '1', @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    try { return await this.contributions.list(request.brotarUser.id, { page: Number(page), status, from, to }) } catch (error) { translate(error) }
  }
  @Get('contributions/:id') @Header('Cache-Control', 'no-store')
  async detail(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.contributions.detail(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Get('contributions/:id/receipt') @Header('Cache-Control', 'no-store')
  async receipt(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.contributions.receipt(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Get('sponsor-summary') @Header('Cache-Control', 'no-store')
  summary(@Req() request: AuthenticatedRequest) { return this.contributions.summary(request.brotarUser.id) }
}
