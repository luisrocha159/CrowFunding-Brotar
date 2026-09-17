import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; database: 'connected' }> {
    if (!await this.database.isReady()) throw new ServiceUnavailableException()
    return { status: 'ok', database: 'connected' }
  }

  @Get('live')
  live(): { status: 'ok'; service: 'brotar-api' } {
    // Liveness únicamente: no afirma que la base o el sistema estén integrados.
    return { status: 'ok', service: 'brotar-api' }
  }
}
