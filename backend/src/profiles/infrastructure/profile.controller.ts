import { BadRequestException, Body, Controller, Get, Header, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsString, Length, Matches } from 'class-validator'
import type { Request } from 'express'
import { SessionMissing, Sessions } from '../../auth/application/sessions'
import { readSessionCookie, SessionMutationGuard } from '../../auth/infrastructure/http/session-http'
import { InvalidProfile, ProfileUnavailable, Profiles } from '../application/profile'

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value
export class ProfileDto {
  @Transform(trim) @IsString() @Length(1, 120) firstName!: string
  @Transform(trim) @IsString() @Length(1, 120) lastName!: string
  @Transform(trim) @IsString() @Matches(/^(?:\+[1-9]\d{0,4})?$/) phoneCountryCode!: string
  @Transform(trim) @IsString() @Matches(/^(?:\d{4,30})?$/) phoneNumber!: string
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly sessions: Sessions, private readonly profiles: Profiles) {}
  private async own<T>(request: Request, operation: (id: string) => Promise<T>): Promise<T> {
    try {
      const user = await this.sessions.current(readSessionCookie(request))
      return await operation(user.id)
    } catch (error) {
      if (error instanceof SessionMissing || error instanceof ProfileUnavailable) throw new UnauthorizedException('Inicia sesión para continuar.')
      if (error instanceof InvalidProfile) throw new BadRequestException('Completa ambos campos del teléfono o deja ambos vacíos.')
      throw error
    }
  }
  @Get() @Header('Cache-Control', 'no-store')
  read(@Req() request: Request) { return this.own(request, id => this.profiles.read(id)) }
  @Patch() @Header('Cache-Control', 'no-store') @UseGuards(SessionMutationGuard)
  save(@Req() request: Request, @Body() input: ProfileDto) { return this.own(request, id => this.profiles.save(id, input)) }
}
