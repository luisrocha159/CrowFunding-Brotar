import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { progressStatuses, validateProgress, validateUpdate, validatePublicationChange, validateRewardChange, type PublicationChange, type RewardChange } from '../domain/progress'
import { ProgressRepository } from './progress.repository'
import { CreatorDashboardRepository, dashboardQuery } from './creator-dashboard.repository'
import { operation } from '../../campaign-lifecycle/infrastructure/operation'
class ProgressRowDto {
  @IsUUID() id!: string
  @IsString() @MaxLength(160) responsibleName!: string
  @IsIn(progressStatuses) status!: string
  @IsInt() @Min(0) @Max(100) progressPercent!: number
  @IsOptional() @IsString() @MaxLength(10) actualStartOn!: string | null
  @IsOptional() @IsString() @MaxLength(10) actualEndOn!: string | null
}
class IndicatorDto { @IsUUID() id!: string; @IsOptional() @IsNumber() @Min(0) achievedValue!: number | null }
class ProgressDto {
  @IsString() @MaxLength(100) revision!: string
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ProgressRowDto) activities!: ProgressRowDto[]
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ProgressRowDto) milestones!: ProgressRowDto[]
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => IndicatorDto) indicators!: IndicatorDto[]
}
class ImageDto { @IsUUID() fileId!: string; @IsString() @MaxLength(300) caption!: string }
class UpdateDto {
  @IsOptional() @IsString() @MaxLength(100) revision!: string | null
  @IsString() @MaxLength(200) title!: string
  @IsString() @MaxLength(10000) body!: string
  @IsOptional() @IsUUID() milestoneId!: string | null
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => ImageDto) images!: ImageDto[]
  @IsBoolean() publish!: boolean
}
class PublicationDto {
  @IsIn(['CORRECT','WITHDRAW']) action!: 'CORRECT' | 'WITHDRAW'
  @IsString() @MaxLength(100) revision!: string
  @IsString() @MaxLength(1000) reason!: string
  @IsBoolean() confirmed!: true
  @IsOptional() @IsString() @MaxLength(200) title?: string
  @IsOptional() @IsString() @MaxLength(10000) body?: string
  @IsOptional() @IsUUID() milestoneId?: string | null
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({each:true}) @Type(()=>ImageDto) images?: ImageDto[]
}
class RewardDto {
  @IsString() @MaxLength(100) revision!: string
  @IsIn(['PENDING','IN_PROGRESS','FULFILLED','CANCELLED']) status!: RewardChange['status']
  @IsString() @MaxLength(1000) reason!: string
  @IsBoolean() confirmed!: true
  @IsOptional() @IsString() @MaxLength(10) fulfilledOn!: string | null
  @IsOptional() @IsUUID() fileId!: string | null
}
@Controller('campaigns')
export class ProgressController {
  constructor(private readonly repository: ProgressRepository, private readonly creatorPanel: CreatorDashboardRepository) {}
  @Header('Cache-Control', 'no-store') @Get('creator-dashboard') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  dashboard(@Req() request: AuthenticatedRequest, @Query('page') page = '1', @Query('scope') scope = 'all') {
    const query = dashboardQuery(page, scope)
    return this.creatorPanel.read(request.brotarUser.id, query.page, query.scope)
  }
  @Header('Cache-Control', 'no-store') @Get(':id/accountability') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  accountability(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.repository.accountability(request.brotarUser.id, id) }
  @Header('Cache-Control', 'no-store') @Get(':id/progress') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  read(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.repository.read(request.brotarUser.id, id) }
  @Header('Cache-Control', 'no-store') @Put(':id/progress') @UseGuards(RoleGuard, SessionMutationGuard) @RequireRoles('CREATOR')
  save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: ProgressDto) {
    const errors = validateProgress(input); if (Object.keys(errors).length) throw new BadRequestException({ message: 'Revisa el avance.', errors })
    return this.repository.save(request.brotarUser.id, id, input)
  }
  @Header('Cache-Control', 'no-store') @Get(':id/updates') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  updates(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Query('page') page='1') { return this.repository.updates(request.brotarUser.id, id, Number(page)) }
  @Header('Cache-Control', 'no-store') @Get(':id/updates/:updateId') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  update(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('updateId', new ParseUUIDPipe()) updateId: string) { return this.repository.update(request.brotarUser.id, id, updateId) }
  @Header('Cache-Control', 'no-store') @Put(':id/updates/:updateId') @UseGuards(RoleGuard, SessionMutationGuard) @RequireRoles('CREATOR')
  saveUpdate(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('updateId', new ParseUUIDPipe()) updateId: string, @Body() input: UpdateDto) {
    const errors = validateUpdate(input); if (Object.keys(errors).length) throw new BadRequestException({ message: 'Revisa la novedad.', errors })
    return this.repository.saveUpdate(request.brotarUser.id, id, updateId, input)
  }
  @Header('Cache-Control','no-store') @Get(':id/updates/:updateId/history') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  history(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('updateId',new ParseUUIDPipe()) updateId:string,@Query('page') page='1') { return this.repository.updateHistory(request.brotarUser.id,id,updateId,Number(page)) }
  @Header('Cache-Control','no-store') @Put(':id/updates/:updateId/publication') @UseGuards(RoleGuard,SessionMutationGuard) @RequireRoles('CREATOR')
  publication(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('updateId',new ParseUUIDPipe()) updateId:string,@Body() input:PublicationDto) {
    const errors=validatePublicationChange(input);if(Object.keys(errors).length)throw new BadRequestException({message:'Revisa la publicación.',errors})
    return operation(()=>this.repository.changePublication(request.brotarUser.id,id,updateId,input as PublicationChange))
  }
  @Header('Cache-Control','no-store') @Get(':id/reward-tracking') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  rewards(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query('page') page='1') { return this.repository.rewards(request.brotarUser.id,id,Number(page)) }
  @Header('Cache-Control','no-store') @Get(':id/reward-tracking/:contributionId/history') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  rewardHistory(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('contributionId',new ParseUUIDPipe()) contributionId:string,@Query('page') page='1') { return this.repository.rewardHistory(request.brotarUser.id,id,contributionId,Number(page)) }
  @Header('Cache-Control','no-store') @Put(':id/reward-tracking/:contributionId') @UseGuards(RoleGuard,SessionMutationGuard) @RequireRoles('CREATOR')
  changeReward(@Req() request: AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string,@Param('contributionId',new ParseUUIDPipe()) contributionId:string,@Body() input:RewardDto) {
    const errors=validateRewardChange(input);if(Object.keys(errors).length)throw new BadRequestException({message:'Revisa el seguimiento.',errors})
    return operation(()=>this.repository.changeReward(request.brotarUser.id,id,contributionId,input))
  }
  @Header('Cache-Control', 'no-store') @Get('public/:id/updates') publicUpdates(@Param('id', new ParseUUIDPipe()) id: string, @Query('page') page='1') { return this.repository.publicUpdates(id, Number(page)) }
}
