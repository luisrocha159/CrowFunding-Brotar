import 'reflect-metadata'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { UnprocessableEntityException, type ArgumentsHost } from '@nestjs/common'
import { ApiExceptionFilter } from '../src/shared/infrastructure/http/api-exception.filter'

test('la respuesta 422 conserva solo los faltantes seguros para enlazar pasos', () => {
  let body: unknown
  const response = { status: () => response, json: (value: unknown) => { body = value } }
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost
  new ApiExceptionFilter().catch(new UnprocessableEntityException({ message: 'Campaña incompleta', missing: [{ field: 'budget', label: 'Presupuesto', step: 4 }] }), host)
  assert.deepEqual(body, { statusCode: 422, message: 'Campaña incompleta', missing: [{ field: 'budget', label: 'Presupuesto', step: 4 }] })
})
