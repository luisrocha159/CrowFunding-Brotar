import {ForbiddenException,Injectable,type CanActivate,type ExecutionContext} from '@nestjs/common'
import type {Request} from 'express'
/** Financial presentation/review is browser-origin bound, including non-browser clients. */
@Injectable()
export class AccountabilityOriginGuard implements CanActivate {
 canActivate(context:ExecutionContext){const request=context.switchToHttp().getRequest<Request>();if(typeof request.headers.origin!=='string'||!request.headers.origin)throw new ForbiddenException('El origen de esta operación es obligatorio.');return true}
}
