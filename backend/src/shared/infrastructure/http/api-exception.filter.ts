import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : 500
    let message: string | string[] = 'No se pudo completar la solicitud.'
    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse()
      if (typeof body === 'string') message = body
      else if ('message' in body &&
        (typeof body.message === 'string' ||
          (Array.isArray(body.message) && body.message.every((value: unknown) => typeof value === 'string')))) {
        message = body.message as string | string[]
      }
    }
    // No devolver errores del driver, stack, SQL, payloads o credenciales.
    response.status(status).json({ statusCode: status, message })
  }
}
