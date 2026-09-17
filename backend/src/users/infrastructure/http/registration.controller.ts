import { Body, ConflictException, Controller, Header, Post, UseGuards } from '@nestjs/common'
import { RegisterUser, RegistrationConflict, type RegistrationResult } from '../../application/register-user'
import { RegisterUserDto } from './register-user.dto'
import { RegistrationLimitGuard } from './registration-limit.guard'

@Controller('auth')
export class RegistrationController {
  constructor(private readonly register: RegisterUser) {}

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RegistrationLimitGuard)
  async create(@Body() input: RegisterUserDto): Promise<RegistrationResult> {
    try { return await this.register.execute(input) }
    catch (error) {
      if (error instanceof RegistrationConflict) throw new ConflictException('No se puede registrar una cuenta con estos datos.')
      throw error
    }
  }
}
