import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : 500
    let message: string | string[] = 'No se pudo completar la solicitud.'
    let missing: { field: string; label: string; step: number }[] | undefined
    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse()
      if (typeof body === 'string') message = body
      else if ('message' in body &&
        (typeof body.message === 'string' ||
          (Array.isArray(body.message) && body.message.every((value: unknown) => typeof value === 'string')))) {
        message = body.message as string | string[]
      }
      if (status === 422 && typeof body === 'object' && body !== null && 'missing' in body &&
        Array.isArray(body.missing) && body.missing.length <= 2000 &&
        body.missing.every((item: unknown) => item !== null && typeof item === 'object' &&
          'field' in item && typeof item.field === 'string' && /^[a-zA-Z][a-zA-Z0-9.]*$/.test(item.field) &&
          'label' in item && typeof item.label === 'string' && item.label.length <= 500 &&
          'step' in item && Number.isInteger(item.step) && (item.step as number) >= 0 && (item.step as number) <= 7)) {
        missing = body.missing as { field: string; label: string; step: number }[]
      }
    }
    // No devolver errores del driver, stack, SQL, payloads o credenciales.
    response.status(status).json({ statusCode: status, message, ...(missing ? { missing } : {}) })
  }
}
