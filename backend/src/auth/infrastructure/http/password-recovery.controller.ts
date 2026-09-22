import { Body, Controller, HttpCode, Post, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator'
import { RegistrationLimitGuard } from '../../../users/infrastructure/http/registration-limit.guard'
import { PasswordRecovery, PasswordResetUnavailable, RecoveryDeliveryUnavailable } from '../../application/password-recovery'
import { SessionMutationGuard } from './session-http'

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value

class PasswordRecoveryRequestDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string
}

class PasswordResetDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string

  @IsString()
  @Length(15, 128)
  password!: string
}

@Controller('auth/password')
export class PasswordRecoveryController {
  constructor(private readonly recovery: PasswordRecovery) {}

  @Post('recovery')
  @HttpCode(202)
  @UseGuards(SessionMutationGuard, RegistrationLimitGuard)
  async request(@Body() input: PasswordRecoveryRequestDto): Promise<{ accepted: true; resetPath?: string }> {
    try { return await this.recovery.request(input.email) }
    catch (error) {
      if (error instanceof RecoveryDeliveryUnavailable) throw new ServiceUnavailableException('Recuperación no disponible. Comprueba el canal de correo autorizado.')
      throw error
    }
  }

  @Post('reset')
  @HttpCode(204)
  @UseGuards(SessionMutationGuard, RegistrationLimitGuard)
  async reset(@Body() input: PasswordResetDto): Promise<void> {
    try { await this.recovery.reset(input.token, input.password) }
    catch (error) {
      if (error instanceof PasswordResetUnavailable) throw new UnauthorizedException('El enlace de recuperación no está disponible o ya venció.')
      throw error
    }
  }
}
