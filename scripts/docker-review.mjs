import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {reviewOptions, verifyReviewCopy} from './review-config.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const metadata = resolve(root, 'backend/private/review-installation.json')
if (!existsSync(metadata)) throw new Error('Prepare primero la copia con node scripts/setup-review.mjs.')
const stored = JSON.parse(readFileSync(metadata, 'utf8'))
const config = reviewOptions([
  `--project=${stored.project}`, `--db-port=${stored.dbPort}`,
  `--api-port=${stored.apiPort}`, `--web-port=${stored.webPort}`
])
verifyReviewCopy(root, config)

const args = process.argv.slice(2)
if (!args.length) throw new Error('Uso: node scripts/docker-review.mjs up --build -d --wait | ps | logs backend | down')
const child = spawnSync('docker', [
  'compose', '--project-name', config.project, '--env-file', 'infra/postgres-v2/.env',
  '-f', 'compose.yaml', ...args
], {
  cwd: root,
  env: {...process.env, BROTAR_COMPOSE_PROJECT: config.project, POSTGRES_PORT: String(config.dbPort),
    PORT: String(config.apiPort), WEB_PORT: String(config.webPort)},
  stdio: 'inherit'
})
if (child.error) throw child.error
process.exitCode = child.status ?? 1
