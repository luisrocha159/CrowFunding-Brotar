import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequirePermissions, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { AdministrativeReview } from '../application/administrative-review'
import { SubmissionIncomplete } from '../application/submission'
import { PublicationDisabled, REVIEW_SECTIONS, ReviewConflict, ReviewInvalid, ReviewMissing } from '../domain/administrative-review'
import type { ReviewDecision } from '../domain/lifecycle'

export class ObservationDto {
  @IsIn(REVIEW_SECTIONS) section!: string
  @IsOptional() @IsString() @MaxLength(160) fieldPath: string | null = null
  @IsString() @MaxLength(5000) message!: string
}
export class DuplicateReviewDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string
  @IsString() @Length(20, 2000) reason!: string
}
export class DecisionDto {
  @IsIn(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']) decision!: ReviewDecision
  @IsString() @MaxLength(5000) comment!: string
  @IsInt() @Min(1) @Max(32767) expectedRound!: number
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ObservationDto) observations!: ObservationDto[]
  @IsOptional() @IsObject() @ValidateNested() @Type(() => DuplicateReviewDto) duplicateReview?: DuplicateReviewDto
}
export class PublishDto {
  @IsBoolean() @Equals(true) confirmed!: boolean
  @IsInt() @Min(1) @Max(32767) expectedRound!: number
  @IsOptional() @IsObject() @ValidateNested() @Type(() => DuplicateReviewDto) duplicateReview?: DuplicateReviewDto
}
function translate(error: unknown): never {
  if (error instanceof ReviewMissing) throw new NotFoundException('Campaña no disponible para administración.')
  if (error instanceof ReviewConflict) throw new ConflictException('La campaña o la ronda cambió. Actualiza antes de decidir.')
  if (error instanceof ReviewInvalid) throw new BadRequestException(error.message)
  if (error instanceof PublicationDisabled) throw new ForbiddenException('Publicación deshabilitada: falta confirmar el actor autorizado (D05).')
  if (error instanceof SubmissionIncomplete) throw new UnprocessableEntityException({ message: 'La campaña tiene información faltante.', missing: error.missing })
  throw error
}
@Controller('admin/campaigns') @UseGuards(RoleGuard)
export class AdministrativeReviewController {
  constructor(private readonly review: AdministrativeReview) {}
  @Get(':id/detail') @Header('Cache-Control', 'no-store')
  @RequirePermissions('campaign.review.read')
  async detail(@Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.review.detail(id) } catch (error) { translate(error) }
  }
  @Post(':id/decision') @HttpCode(200) @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  @RequirePermissions('campaign.review.decide')
  async decide(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: DecisionDto) {
    try { return await this.review.decide(request.brotarUser.id, id, input) } catch (error) { translate(error) }
  }
  @Post(':id/publish') @HttpCode(200) @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  @RequirePermissions('campaign.publish')
  async publish(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: PublishDto) {
    try { return await this.review.publish(request.brotarUser.id, id, input.expectedRound, input.duplicateReview) } catch (error) { translate(error) }
  }
}
