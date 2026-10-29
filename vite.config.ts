import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = { '/api': { target: env.BACKEND_URL || 'http://127.0.0.1:3000', changeOrigin: false } }
  // Opt-in local QA instrumentation; never inserted in production builds.
  const qa = env.BROTAR_QA_AUDIT === 'true' ? [{
    name: 'brotar-local-qa',
    apply: 'serve' as const,
    transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: '/scripts/qa-audit-browser.ts' }, injectTo: 'body' as const }]
  }] : []
  return { plugins: [react(), ...qa], resolve: { dedupe: ['react', 'react-dom'] }, server: { proxy }, preview: { proxy } }
})
