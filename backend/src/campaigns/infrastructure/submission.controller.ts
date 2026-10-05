import { ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { DraftNotEditable, DraftNotFound } from '../application/drafts'
import { CampaignSubmission, SubmissionIncomplete } from '../application/submission'

function translate(error: unknown): never {
  if (error instanceof DraftNotFound) throw new NotFoundException('Campaña no disponible.')
  if (error instanceof DraftNotEditable) throw new ConflictException('La campaña ya fue enviada o no admite reenvío.')
  if (error instanceof SubmissionIncomplete) throw new UnprocessableEntityException({ message: 'Completa la campaña antes de enviarla.', missing: error.missing })
  throw error
}

@Controller('campaigns/drafts/:id/submission') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class SubmissionController {
  constructor(private readonly submission: CampaignSubmission) {}

  @Get() @Header('Cache-Control', 'no-store')
  async review(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.submission.review(request.brotarUser.id, id) } catch (error) { translate(error) }
  }

  @Post() @Header('Cache-Control', 'no-store') @RequireRoles('REGISTERED_USER', 'CREATOR') @UseGuards(SessionMutationGuard)
  async submit(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.submission.submit(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
}
