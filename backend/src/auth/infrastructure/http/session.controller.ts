import { Body, Controller, ForbiddenException, Get, Header, HttpCode, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, MaxLength } from 'class-validator'
import type { Request, Response } from 'express'
import { AccountUnavailable, InvalidCredentials, SessionMissing, Sessions } from '../../application/sessions'
import { RegistrationLimitGuard } from '../../../users/infrastructure/http/registration-limit.guard'
import { clearSessionCookie, readSessionCookie, SESSION_COOKIE, sessionCookieOptions, SessionMutationGuard } from './session-http'

class LoginDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string
  @IsString()
  @Length(1, 128)
  password!: string
}
@Injectable()
export class LoginLimitGuard extends RegistrationLimitGuard {}

@Controller('auth')
export class SessionController {
  constructor(private readonly sessions: Sessions) {}
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionMutationGuard, LoginLimitGuard)
  async login(@Body() input: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.sessions.login(input.email, input.password, readSessionCookie(request))
      response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions(), expires: result.expiresAt })
      return { status: 'authenticated' }
    } catch (error) {
      if (error instanceof InvalidCredentials) throw new UnauthorizedException('Correo o contraseña incorrectos.')
      if (error instanceof AccountUnavailable) throw new ForbiddenException('La cuenta no está habilitada o está bloqueada temporalmente.')
      throw error
    }
  }
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try { return await this.sessions.current(readSessionCookie(request)) }
    catch (error) {
      if (error instanceof SessionMissing) { clearSessionCookie(response); throw new UnauthorizedException('Inicia sesión para continuar.') }
      throw error
    }
  }
  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionMutationGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.sessions.logout(readSessionCookie(request))
    clearSessionCookie(response)
  }
}
