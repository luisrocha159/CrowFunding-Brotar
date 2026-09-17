import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'

// Ejecutar una sola vez. Nunca reemplaza configuraciones existentes ni muestra secretos.
const databaseEnv = new URL('.env', import.meta.url)
const backendEnv = new URL('../../backend/.env', import.meta.url)
if (existsSync(databaseEnv) || existsSync(backendEnv)) {
  throw new Error('Ya existe alguna configuración .env. Revísala manualmente; no se reemplazó.')
}
// Comprueba también reservas de puertos de Windows, no solo listeners existentes.
await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(15432, '127.0.0.1', () => probe.close(resolve))
})
const template = readFileSync(new URL('../../backend/.env.example', import.meta.url), 'utf8')
const password = randomBytes(32).toString('hex')
const backend = template
  .replace(/^DATABASE_ENABLED=false$/m, 'DATABASE_ENABLED=true')
  .replace(/^DB_PORT=\d+$/m, 'DB_PORT=15432')
  .replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${password}`)
writeFileSync(databaseEnv, `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nPOSTGRES_PORT=15432\n`, { flag: 'wx', mode: 0o600 })
writeFileSync(backendEnv, backend, { flag: 'wx', mode: 0o600 })
console.log('Configuraciones locales creadas, sin mostrar credenciales. PostgreSQL: 15432; API: 3000.')
console.log('Arranca PostgreSQL, restaura el backup y aprovisiona brotar_app antes de iniciar la API.')
