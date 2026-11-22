import {Injectable,NotFoundException,type CanActivate} from '@nestjs/common'

/** Los avisos anómalos se inyectan exclusivamente desde la suite de integración con escritura habilitada. */
@Injectable()
export class TestFixtureGuard implements CanActivate {
  canActivate():boolean {
    if(process.env.NODE_ENV==='production'||!process.env.NODE_TEST_CONTEXT||process.env.ALLOW_DB_TEST_WRITES!=='true')throw new NotFoundException()
    return true
  }
}
