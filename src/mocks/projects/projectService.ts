import { projects } from './projects'

export type MockScenario = 'success' | 'empty' | 'error'
export type MockOptions = { scenario?: MockScenario; delayMs?: number; signal?: AbortSignal }

export class MockProjectError extends Error {
  constructor() {
    super('No pudimos cargar los proyectos. Intenta nuevamente.')
    this.name = 'MockProjectError'
  }
}

function simulate({ delayMs = 350, signal, scenario = 'success' }: MockOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Solicitud cancelada', 'AbortError'))
    }
    const delay = Number.isFinite(delayMs) ? Math.min(5000, Math.max(0, delayMs)) : 350
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      if (scenario === 'error') reject(new MockProjectError())
      else resolve()
    }, delay)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}

/** Purely local; no fetch, storage, sessions, random failures or external writes. */
export async function listMockProjects(options: MockOptions = {}) {
  await simulate(options)
  return options.scenario === 'empty' ? [] : structuredClone(projects)
}

export async function getMockProject(slug: string, options: MockOptions = {}) {
  const items = await listMockProjects(options)
  return items.find(project => project.slug === slug) ?? null
}

export async function listFeaturedMockProjects(options: MockOptions = {}) {
  const items = await listMockProjects(options)
  return items.filter(project => project.featured && project.status === 'active').slice(0, 3)
}
