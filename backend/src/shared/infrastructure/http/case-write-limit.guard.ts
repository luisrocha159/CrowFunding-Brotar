import {HttpException,Injectable,type CanActivate,type ExecutionContext} from '@nestjs/common'
import type {Response} from 'express'
import type {AuthenticatedRequest} from '../../../roles/infrastructure/roles-http'
import {DatabaseService} from '../database/database.service'
import {writeBudget} from './write-budget'
@Injectable()
export class CaseWriteLimitGuard implements CanActivate {
 constructor(private readonly database:DatabaseService){}
 async canActivate(context:ExecutionContext){const request=context.switchToHttp().getRequest<AuthenticatedRequest>()
  if(!await writeBudget(this.database.connection(),'mvp-case-write',request.brotarUser.id,request.ip??'unknown')){context.switchToHttp().getResponse<Response>().setHeader('Retry-After','60');throw new HttpException('Demasiados cambios. Espera un minuto y consulta el estado antes de repetir.',429)}
  return true
 }
}
