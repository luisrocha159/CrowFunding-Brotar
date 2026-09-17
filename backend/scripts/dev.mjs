import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const processes = [
  spawn(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], { stdio: 'inherit' }),
  spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'dist/main.js'], { stdio: 'inherit' })
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) child.kill('SIGTERM')
  process.exitCode = code
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
for (const child of processes) {
  child.on('error', () => stop(1))
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1) })
}
