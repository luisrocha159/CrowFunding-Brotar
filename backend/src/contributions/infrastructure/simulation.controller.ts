import { BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { InvalidSimulation, SimulationConflict, SimulationUnavailable } from '../application/support-simulation'
import { TypeormSimulationRepository } from './typeorm-simulation.repository'
export class CreateSimulationDto {
  @IsUUID() campaignId!: string
  @IsOptional() @IsUUID() rewardId: string | null = null
  @IsString() @MaxLength(15) amount!: string
  @IsIn(['TEST_CARD', 'TEST_QR']) method!: 'TEST_CARD' | 'TEST_QR'
  @IsUUID('4') requestId!: string
  @IsIn(['SIMULATION']) mode!: 'SIMULATION'
}
export class TransitionSimulationDto {
  @IsInt() @Min(1) expectedVersion!: number
  @IsIn(['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED']) state!: string
  @IsIn(['SIMULATION']) mode!: 'SIMULATION'
}
function translate(error: unknown): never {
  if (error instanceof InvalidSimulation) throw new BadRequestException('Revisa el importe y la recompensa de prueba.')
  if (error instanceof SimulationConflict) throw new ConflictException('La selección, disponibilidad o versión cambió. Recarga el ensayo antes de continuar.')
  if (error instanceof SimulationUnavailable) throw new NotFoundException('Simulación o campaña no disponible.')
  throw error
}
@Controller('me') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class SimulationController {
  constructor(private readonly simulations: TypeormSimulationRepository) {}
  @Get('support-options/:id') @Header('Cache-Control', 'no-store')
  async options(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.simulations.options(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Get('simulations') @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthenticatedRequest) { return this.simulations.list(request.brotarUser.id) }
  @Get('simulations/:id') @Header('Cache-Control', 'no-store')
  async detail(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.simulations.detail(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Post('simulations') @UseGuards(SessionMutationGuard) @Header('Cache-Control', 'no-store')
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreateSimulationDto) {
    try { return await this.simulations.create(request.brotarUser.id, input) } catch (error) { translate(error) }
  }
  @Put('simulations/:id') @UseGuards(SessionMutationGuard) @Header('Cache-Control', 'no-store')
  async transition(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: TransitionSimulationDto) {
    try { return await this.simulations.transition(request.brotarUser.id, id, input) } catch (error) { translate(error) }
  }
}
