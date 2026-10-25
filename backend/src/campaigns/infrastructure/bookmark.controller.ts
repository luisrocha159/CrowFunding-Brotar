import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common'
import { IsBoolean } from 'class-validator'
import { SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { RequireRoles, RoleGuard, type AuthenticatedRequest } from '../../roles/infrastructure/roles-http'
import { Bookmarks, BookmarkUnavailable, InvalidBookmark, type BookmarkKind } from '../application/bookmarks'
export class BookmarkDto { @IsBoolean() active!: boolean }
function translate(error: unknown): never {
  if (error instanceof BookmarkUnavailable) throw new NotFoundException('Campaña no disponible.')
  if (error instanceof InvalidBookmark) throw new BadRequestException('Revisa el tipo de lista y la página solicitada.')
  throw error
}
@Controller('me/bookmarks') @UseGuards(RoleGuard) @RequireRoles('REGISTERED_USER')
export class BookmarkController {
  constructor(private readonly bookmarks: Bookmarks) {}
  @Get() @Header('Cache-Control', 'no-store')
  async list(@Req() request: AuthenticatedRequest, @Query('kind') kind = 'FAVORITE', @Query('page') page = '1') {
    try { return await this.bookmarks.list(request.brotarUser.id, kind as BookmarkKind, Number(page)) } catch (error) { translate(error) }
  }
  @Get('updates') @Header('Cache-Control', 'no-store')
  async updates(@Req() request: AuthenticatedRequest, @Query('page') page = '1') {
    try { return await this.bookmarks.updates(request.brotarUser.id, Number(page)) } catch (error) { translate(error) }
  }
  @Get(':id') @Header('Cache-Control', 'no-store')
  async state(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    try { return await this.bookmarks.state(request.brotarUser.id, id) } catch (error) { translate(error) }
  }
  @Put(':id/:kind') @UseGuards(SessionMutationGuard) @Header('Cache-Control', 'no-store')
  async set(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('kind') kind: string, @Body() input: BookmarkDto) {
    try { return await this.bookmarks.set(request.brotarUser.id, id, kind as BookmarkKind, input.active) } catch (error) { translate(error) }
  }
}
