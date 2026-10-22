import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { progressStatuses, validateProgress, validateUpdate } from '../domain/progress'
import { ProgressRepository } from './progress.repository'
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
@Controller('campaigns')
export class ProgressController {
  constructor(private readonly repository: ProgressRepository) {}
  @Header('Cache-Control', 'no-store') @Get('creator-dashboard') @UseGuards(RoleGuard) @RequireRoles('CREATOR')
  dashboard(@Req() request: AuthenticatedRequest) { return this.repository.dashboard(request.brotarUser.id) }
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
  @Header('Cache-Control', 'no-store') @Get('public/:id/updates') publicUpdates(@Param('id', new ParseUUIDPipe()) id: string, @Query('page') page='1') { return this.repository.publicUpdates(id, Number(page)) }
}
