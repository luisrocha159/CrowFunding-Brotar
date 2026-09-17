import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

test('BG-58 mantiene dominio y aplicación independientes de HTTP, NestJS y ORM', () => {
  let checked = 0
  for (const module of ['auth', 'users', 'profiles', 'roles', 'organizations']) {
    for (const layer of ['domain', 'application']) {
      const directory = join(process.cwd(), 'src', module, layer)
      const files = readdirSync(directory).filter(file => file.endsWith('.ts'))
      assert.ok(files.length > 0, `${module}/${layer}`)
      for (const file of files) {
        const source = readFileSync(join(directory, file), 'utf8')
        assert.doesNotMatch(source, /(?:from|import)\s*['"][^'"]*(?:@nestjs|typeorm|express|infrastructure)[^'"]*['"]/, `${module}/${layer}/${file}`)
        checked++
      }
    }
  }
  assert.ok(checked >= 10)
})
