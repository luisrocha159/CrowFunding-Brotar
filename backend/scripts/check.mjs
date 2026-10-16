import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Reutiliza las tareas declaradas sin invocar otro pnpm tomado del PATH global.
const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
try {
  for (const task of ['lint','typecheck','test','test:local-admin','build']) {
    console.log(`\nVerificación: ${task}`)
    execSync(scripts[task], { stdio: 'inherit' })
  }
} catch (error) { process.exitCode = typeof error.status === 'number' ? error.status : 1 }
