import { BadRequestException, Body, ConflictException, Controller, Header, Post, UseGuards } from '@nestjs/common'
import { RegisterUser, RegistrationConflict, RegistrationInvalid, type RegistrationResult } from '../../application/register-user'
import { RegisterUserDto } from './register-user.dto'
import { RegistrationLimitGuard } from './registration-limit.guard'
import { Transform } from 'class-transformer'
import { IsEmail, MaxLength } from 'class-validator'

export class EmailAvailabilityDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string
}

@Controller('auth')
export class RegistrationController {
  constructor(private readonly register: RegisterUser) {}
  @Post('email-availability') @Header('Cache-Control', 'no-store') @UseGuards(RegistrationLimitGuard)
  checkEmail(@Body() input: EmailAvailabilityDto) { return this.register.emailAvailability(input.email) }

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RegistrationLimitGuard)
  async create(@Body() input: RegisterUserDto): Promise<RegistrationResult> {
    try { return await this.register.execute(input) }
    catch (error) {
      if (error instanceof RegistrationInvalid) throw new BadRequestException(Object.entries(error.fields).map(([field, message]) => `${field}: ${message}`))
      if (error instanceof RegistrationConflict) throw new ConflictException('No se puede registrar una cuenta con estos datos.')
      throw error
    }
  }
}
