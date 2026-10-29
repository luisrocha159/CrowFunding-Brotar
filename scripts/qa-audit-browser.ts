/** Local-only audit observer, loaded by Vite only with BROTAR_QA_AUDIT=true.
 * Results contain selectors/rule IDs, never field values, cookies or tokens.
 */
import axe from 'axe-core'
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

let timer: ReturnType<typeof setTimeout>
let running = false
let pendingRequests = 0
const http: { path: string; method: string; status: number; cancelled?: boolean }[] = []
let scriptErrors = 0
window.addEventListener('error', event => { if (event instanceof ErrorEvent) scriptErrors++ })
window.addEventListener('unhandledrejection', () => { scriptErrors++ })
const fetchPage = window.fetch.bind(window)
window.fetch = async (...args: Parameters<typeof fetch>) => {
  pendingRequests++; schedule()
  const input = args[0]
  const path = new URL(input instanceof Request ? input.url : String(input), location.href).pathname
  const method = args[1]?.method ?? (input instanceof Request ? input.method : 'GET')
  try { const response = await fetchPage(...args); http.push({ path, method, status: response.status }); return response }
  catch (error) {
    const signal = args[1]?.signal ?? (input instanceof Request ? input.signal : undefined)
    http.push({ path, method, status: 0, cancelled: signal?.aborted === true })
    throw error
  }
  finally { pendingRequests--; schedule() }
}
const result = document.createElement('script')
result.type = 'application/json'
result.id = 'brotar-qa-report'
document.body.append(result)
const performanceResult = document.createElement('script')
performanceResult.type = 'application/json'
performanceResult.id = 'brotar-qa-performance'
document.body.append(performanceResult)
const metrics: Record<string, { value: number; rating: string } | null> = { LCP: null, CLS: null, INP: null }
function recordMetric(metric: Metric) { metrics[metric.name] = { value: metric.value, rating: metric.rating }; performanceResult.textContent = JSON.stringify({ mode: 'local-development-diagnostic', ...metrics }) }
performanceResult.textContent = JSON.stringify({ mode: 'local-development-diagnostic', ...metrics })
onLCP(recordMetric, { reportAllChanges: true }); onCLS(recordMetric, { reportAllChanges: true }); onINP(recordMetric, { reportAllChanges: true })
const observer = new MutationObserver(schedule)
function schedule() { result.dataset.state = 'pending'; clearTimeout(timer); timer = setTimeout(() => { void audit() }, 450) }
function observe() { observer.observe(document.getElementById('root')!, { subtree: true, childList: true, attributes: true }) }
async function audit() {
  const loading = [...document.querySelectorAll('#root [role="status"], #root [aria-busy="true"]')]
    .some(element => /^(Consultando|Comprobando|Cargando|Guardando|Registrando)/i.test(element.textContent?.trim() ?? '') || element.getAttribute('aria-busy') === 'true')
  if (running || pendingRequests || loading) { schedule(); return }
  running = true
  observer.disconnect()
  try {
    const report = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })
    const visible = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
    const overflow = [...document.querySelectorAll('#root *')].filter(element => {
      if (!visible(element) || getComputedStyle(element).position === 'absolute') return false
      const rect = element.getBoundingClientRect()
      return rect.right > document.documentElement.clientWidth + 2 || rect.left < -2
    }).slice(0, 15).map(element => ({ tag: element.tagName, class: element.className, width: Math.round(element.getBoundingClientRect().width) }))
    const rules = (items: typeof report.violations) => items.map(item => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))
    result.textContent = JSON.stringify({ path: location.pathname + location.search, width: innerWidth, checkedAt: new Date().toISOString(),
      settled: true, http, scriptErrors, documentTitle: document.title, main: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length,
      overflow, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      violations: rules(report.violations), incomplete: rules(report.incomplete), passes: report.passes.length })
  } catch (error) { result.textContent = JSON.stringify({ error: error instanceof Error ? error.message : 'Audit failed' }) }
  finally { result.dataset.path = location.pathname + location.search; result.dataset.width = String(innerWidth); result.dataset.state = 'ready'; running = false; observe() }
}
observe()
window.addEventListener('resize', schedule)
window.addEventListener('popstate', schedule)
schedule()
