import { BadRequestException, ValidationPipe, type INestApplication } from '@nestjs/common'
import type { ValidationError } from 'class-validator'
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
    allowedHeaders: ['Content-Type', 'X-Brotar-Request', 'Idempotency-Key'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) => {
      const messages: string[] = []
      const explanations: Record<string, string> = {
        whitelistValidation: 'Este campo adicional no está permitido.', isString: 'Ingresa un valor de texto.',
        isNumber: 'Ingresa un número finito, no un texto.', isInt: 'Ingresa un número entero.',
        isArray: 'Envía una lista válida.', nestedValidation: 'Cada elemento debe ser un objeto válido.',
        isObject: 'Envía un objeto válido.', isDefined: 'Este dato es obligatorio.',
        isEmail: 'Ingresa un correo electrónico válido.', isDateString: 'Ingresa una fecha válida en formato ISO.',
        isUuid: 'Selecciona un identificador válido.', isIn: 'Selecciona una opción disponible.',
        maxLength: 'El texto supera la longitud máxima.', length: 'Revisa la longitud mínima y máxima del campo.',
        matches: 'Revisa el formato permitido para este campo.'
      }
      const visit = (error: ValidationError, prefix = '') => {
        const field = prefix ? `${prefix}.${error.property}` : error.property
        if (error.constraints) messages.push(`${field}: ${explanations[Object.keys(error.constraints)[0]!] ?? 'Revisa el formato y los límites de este campo.'}`)
        for (const child of error.children ?? []) visit(child, field)
      }
      errors.forEach(error => visit(error))
      return new BadRequestException(messages)
    },
    validationError: { target: false, value: false }
  }))
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableShutdownHooks()
}
