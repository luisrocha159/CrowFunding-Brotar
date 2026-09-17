export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production'
  readonly host: string
  readonly port: number
  readonly corsOrigins: readonly string[]
}

export function readEnvironment(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development'
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV debe ser development, test o production.')
  }
  const rawPort = env.PORT ?? '3000'
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.')
  }
  const host = env.HOST ?? '127.0.0.1'
  if (!['127.0.0.1', 'localhost', '0.0.0.0', '::1', '::'].includes(host)) {
    throw new Error('HOST debe ser una dirección de escucha local válida.')
  }
  const corsOrigins = (env.CORS_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',').map((origin) => origin.trim())
  for (const origin of corsOrigins) {
    let url: URL
    try { url = new URL(origin) } catch { throw new Error('CORS_ORIGINS contiene un origen inválido.') }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('CORS_ORIGINS requiere orígenes exactos, sin rutas ni comodines.')
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
      throw new Error('En producción, CORS_ORIGINS requiere HTTPS.')
    }
  }
  return {
    nodeEnv: nodeEnv as AppConfig['nodeEnv'], host, port: Number(rawPort),
    corsOrigins: [...new Set(corsOrigins)]
  }
}
