import { Transform } from 'class-transformer'
import { Equals, IsEmail, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator'
import { PERSON_NAME } from '../../../shared/domain/person-name'

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value

export class RegisterUserDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  @Matches(PERSON_NAME)
  firstName!: string

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  @Matches(PERSON_NAME)
  lastName!: string

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string

  // No se recorta, transforma ni registra la contraseña.
  @IsString()
  @Length(15, 128)
  @Matches(/\S/u)
  password!: string

  @Equals(true)
  demoConsent!: true

  @ValidateIf((body: RegisterUserDto) => body.phoneCountryCode !== undefined || body.phoneNumber !== undefined)
  @IsString()
  @Matches(/^\+[1-9]\d{0,4}$/)
  phoneCountryCode?: string

  @ValidateIf((body: RegisterUserDto) => body.phoneCountryCode !== undefined || body.phoneNumber !== undefined)
  @IsString()
  @Matches(/^\d{4,30}$/)
  phoneNumber?: string
}
