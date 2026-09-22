import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Header, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Req, Res, StreamableFile, UseGuards } from '@nestjs/common'
import { IsBase64, IsIn, IsMimeType, IsString, Length, MaxLength } from 'class-validator'
import type { Response } from 'express'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { FileAccessDenied, FileInUse, FileUnavailable, Files, InvalidFileUpload, type FilePurpose, type FileVisibility } from '../application/files'

const visibility: FileVisibility[] = ['PUBLIC', 'PRIVATE']
const purpose: FilePurpose[] = ['PROFILE_AVATAR', 'ORGANIZATION_DOCUMENT', 'CAMPAIGN_PUBLIC_IMAGE']

class FileUploadDto {
  @IsIn(visibility)
  visibility!: FileVisibility

  @IsIn(purpose)
  purpose!: FilePurpose

  @IsString()
  @Length(1, 160)
  originalName!: string

  @IsMimeType()
  @MaxLength(120)
  mimeType!: string

  @IsString()
  @IsBase64()
  @MaxLength(7_000_000)
  contentBase64!: string
}

function attachHeaders(response: Response, name: string, mimeType: string, size: number): void {
  response.setHeader('Content-Type', mimeType)
  response.setHeader('Content-Length', String(size))
  response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`)
  response.setHeader('Cache-Control', 'private, no-store')
}

@Controller('files')
export class FileController {
  constructor(private readonly files: Files) {}

  @Post()
  @UseGuards(RoleGuard, SessionMutationGuard)
  @RequireRoles('REGISTERED_USER')
  @Header('Cache-Control', 'no-store')
  async upload(@Req() request: AuthenticatedRequest, @Body() input: FileUploadDto) {
    try { return await this.files.upload(request.brotarUser.id, input) }
    catch (error) {
      if (error instanceof InvalidFileUpload) throw new BadRequestException('El archivo no cumple los límites permitidos.')
      throw error
    }
  }

  @Get('public/:id')
  async publicFile(@Param('id', new ParseUUIDPipe()) id: string, @Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.files.publicDownload(id)
      attachHeaders(response, result.file.originalName, result.file.mimeType, result.file.sizeBytes)
      response.setHeader('Cache-Control', 'public, max-age=300')
      return new StreamableFile(result.content)
    } catch (error) {
      if (error instanceof FileUnavailable) throw new NotFoundException('Archivo no disponible.')
      throw error
    }
  }

  @Get(':id')
  @UseGuards(RoleGuard)
  @RequireRoles('REGISTERED_USER')
  async privateFile(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.files.privateDownload(id, request.brotarUser.id)
      attachHeaders(response, result.file.originalName, result.file.mimeType, result.file.sizeBytes)
      return new StreamableFile(result.content)
    } catch (error) {
      if (error instanceof FileAccessDenied) throw new ForbiddenException('No puedes consultar este archivo.')
      if (error instanceof FileUnavailable) throw new NotFoundException('Archivo no disponible.')
      throw error
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RoleGuard, SessionMutationGuard)
  @RequireRoles('REGISTERED_USER')
  async delete(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    try { await this.files.delete(id, request.brotarUser.id) }
    catch (error) {
      if (error instanceof FileInUse) throw new ConflictException('El archivo sigue vinculado a contenido guardado.')
      if (error instanceof FileUnavailable) throw new NotFoundException('Archivo no disponible.')
      throw error
    }
  }
}
