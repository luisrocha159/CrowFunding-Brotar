import {BadRequestException,ConflictException} from '@nestjs/common'
import {Equals,IsBoolean,IsString,IsUUID,Length} from 'class-validator'
import {LedgerConflict,LedgerInvalid} from '../../contributions/domain/payment'
export class DemoOperationDto {
 @IsUUID('4') requestKey!:string
 @IsBoolean() @Equals(true) demoConsent!:true
 @IsString() @Length(20,500) reason!:string
}
export async function operation<T>(fn:()=>Promise<T>){try{return await fn()}catch(e){if(e instanceof LedgerInvalid)throw new BadRequestException(e.message);if(e instanceof LedgerConflict)throw new ConflictException(e.message);throw e}}
export function pageNumber(s:string){if(!/^[1-9]\d{0,3}$/.test(s))throw new LedgerInvalid('Página inválida.');return Number(s)}
