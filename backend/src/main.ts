import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { readEnvironment } from './config/environment'
import { configureHttp } from './shared/infrastructure/http/configure-http'

async function bootstrap(): Promise<void> {
  if (existsSync('.env')) loadEnvFile('.env')
  const config = readEnvironment(process.env)
  const app = await NestFactory.create(AppModule, { abortOnError: false })
  configureHttp(app, config)
  await app.listen(config.port, config.host)
}

bootstrap().catch(() => {
  console.error('No se pudo iniciar Brotar API. Revisa las variables de entorno y el puerto disponible.')
  process.exitCode = 1
})
