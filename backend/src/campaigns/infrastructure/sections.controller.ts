import { BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DraftNotEditable, DraftNotFound } from '../application/drafts'
import { CampaignSections, SectionInvalid } from '../application/sections'
import type { BudgetInput, FundingInput, PlanInput, RewardInput } from '../domain/sections'

class ActivityDto {
  @IsString() @MaxLength(200) name!: string
  @IsString() @MaxLength(160) responsibleName!: string
  @IsDateString() plannedStartOn!: string
  @IsDateString() plannedEndOn!: string
}
class MilestoneDto extends ActivityDto { @IsOptional() @IsInt() activityIndex!: number | null }
export class PlanDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ActivityDto) activities!: ActivityDto[]
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => MilestoneDto) milestones!: MilestoneDto[]
}
class BudgetItemDto {
  @IsUUID() categoryId!: string
  @IsString() @MaxLength(300) description!: string
  @IsNumber() quantity!: number
  @IsNumber() unitPrice!: number
  @IsNumber() plannedAmount!: number
  @IsString() notes!: string
}
class RiskDto {
  @IsString() @MaxLength(200) title!: string
  @IsString() description!: string
  @IsString() @MaxLength(40) likelihood!: string
  @IsString() @MaxLength(40) impact!: string
  @IsString() mitigation!: string
}
export class BudgetDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => BudgetItemDto) items!: BudgetItemDto[]
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RiskDto) risks!: RiskDto[]
}
export class FundingDto {
  @IsNumber() goalAmount!: number
  @IsString() @MaxLength(3) currencyCode!: string
  @IsInt() durationDays!: number
  @IsString() fundingModel!: string
  @IsOptional() @IsDateString() startsAt!: string | null
  @IsOptional() @IsDateString() endsAt!: string | null
}
class RewardDto {
  @IsString() @MaxLength(200) title!: string
  @IsString() description!: string
  @IsString() @MaxLength(60) rewardKind!: string
  @IsNumber() minAmount!: number
  @IsOptional() @IsInt() quantityTotal!: number | null
  @IsOptional() @IsDateString() estimatedDeliveryOn!: string | null
}
export class RewardsDto { @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RewardDto) rewards!: RewardDto[] }

function translate(error: unknown): never {
  if (error instanceof DraftNotFound) throw new NotFoundException('Campaña no disponible.')
  if (error instanceof DraftNotEditable) throw new ConflictException('La campaña no admite edición en su estado actual.')
  if (error instanceof SectionInvalid) throw new BadRequestException(Object.entries(error.fields).map(([field, message]) => `${field}: ${message}`))
  throw error
}

@Controller('campaigns/drafts/:id') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class SectionsController {
  constructor(private readonly sections: CampaignSections) {}

  @Get('plan') @Header('Cache-Control', 'no-store')
  async plan(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.sections.readPlan(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Put('plan') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async savePlan(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: PlanDto) {
    try { return await this.sections.savePlan(request.brotarUser.id, id, input as PlanInput) } catch (error) { translate(error) }
  }
  @Get('budget') @Header('Cache-Control', 'no-store')
  async budget(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.sections.readBudget(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Put('budget') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async saveBudget(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: BudgetDto) {
    try { return await this.sections.saveBudget(request.brotarUser.id, id, input as BudgetInput) } catch (error) { translate(error) }
  }
  @Get('funding') @Header('Cache-Control', 'no-store')
  async funding(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.sections.readFunding(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Put('funding') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async saveFunding(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: FundingDto) {
    try { return await this.sections.saveFunding(request.brotarUser.id, id, input as FundingInput) } catch (error) { translate(error) }
  }
  @Get('rewards') @Header('Cache-Control', 'no-store')
  async rewards(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return { rewards: await this.sections.readRewards(request.brotarUser.id, id) } } catch (error) { translate(error) }
  }
  @Put('rewards') @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  async saveRewards(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: RewardsDto) {
    try { return { rewards: await this.sections.saveRewards(request.brotarUser.id, id, input.rewards as RewardInput[]) } } catch (error) { translate(error) }
  }
  @Get('section-catalogs') @Header('Cache-Control', 'no-store')
  async catalogs() { return { expenseCategories: await this.sections.expenseCategories(), currencies: await this.sections.currencies() } }
}
