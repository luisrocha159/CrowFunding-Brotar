import { ValidationPipe, type INestApplication } from '@nestjs/common'
import helmet from 'helmet'
import { json, type Request, type Response, type NextFunction } from 'express'
import type { AppConfig } from '../../../config/environment'
import { ApiExceptionFilter } from './api-exception.filter'

export function configureHttp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix('api')
  app.use(helmet())
  // Base64 de documentos de hasta 5 MiB, más metadatos. Límite solo para cargas.
  const uploadParser = json({ limit: '7mb' })
  app.use('/api/files', function fileUploadParser(req: Request, res: Response, next: NextFunction) { uploadParser(req, res, next) })
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Brotar-Request'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
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
