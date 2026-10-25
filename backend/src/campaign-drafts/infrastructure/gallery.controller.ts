import { BadRequestException, Body, ConflictException, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { CampaignGalleries, GalleryConflict, GalleryUnavailable, InvalidGallery, normalizeVideoUrl } from '../application/gallery'

class GalleryImageDto {
  @IsUUID() fileId!: string
  @IsString() @Length(1, 300) caption!: string
}
export class GalleryDto {
  @IsString() @Length(1, 100) revision!: string
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => GalleryImageDto) images!: GalleryImageDto[]
  @IsOptional() @IsString() @MaxLength(2048) videoUrl: string | null = null
}
function translate(error: unknown): never {
  if (error instanceof GalleryUnavailable) throw new NotFoundException('Galería o archivo no disponible para esta cuenta y estado de campaña.')
  if (error instanceof GalleryConflict) throw new ConflictException('La campaña cambió en otra pestaña. Revisa la versión guardada antes de volver a guardar.')
  if (error instanceof InvalidGallery) throw new BadRequestException('Revisa las imágenes, sus descripciones y el enlace de vídeo de YouTube o Vimeo.')
  throw error
}
@Controller('campaigns/drafts/:id/gallery') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class GalleryController {
  constructor(private readonly galleries: CampaignGalleries) {}
  @Get() @Header('Cache-Control', 'no-store')
  async read(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.galleries.readOwn(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Put() @UseGuards(SessionMutationGuard) @Header('Cache-Control', 'no-store')
  async save(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: GalleryDto) {
    try { return await this.galleries.save(request.brotarUser.id, id, input) } catch (error) { translate(error) }
  }
}
@Controller('campaigns/public/:id/gallery')
export class PublicGalleryController {
  constructor(private readonly galleries: CampaignGalleries) {}
  @Get() @Header('Cache-Control', 'no-store')
  async read(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const result = await this.galleries.readPublic(id)
      // Una URL histórica no validada nunca se proyecta como enlace público.
      try { return { ...result, videoUrl: normalizeVideoUrl(result.videoUrl) } }
      catch { return { ...result, videoUrl: null } }
    } catch (error) { translate(error) }
  }
}
