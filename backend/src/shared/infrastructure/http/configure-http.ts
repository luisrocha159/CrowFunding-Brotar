import { ValidationPipe, type INestApplication } from '@nestjs/common'
import helmet from 'helmet'
import type { AppConfig } from '../../../config/environment'
import { ApiExceptionFilter } from './api-exception.filter'

export function configureHttp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix('api')
  app.use(helmet())
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Brotar-Request'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false }
  }))
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableShutdownHooks()
}
