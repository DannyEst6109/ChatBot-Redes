import {
  AlertTriangle,
  ArrowRight,
  Box,
  Braces,
  Check,
  ChevronRight,
  CircleDot,
  Cloud,
  Code2,
  Copy,
  Database,
  FileCheck2,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  Plane,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
  Waypoints,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import type {
  AnalysisPayload,
  BootstrapPayload,
  ChatPayload,
  ConversationMessage,
  MaterialStatus,
  ProtocolTrace,
  RecommendationExplanation,
  RiskRow,
  SupplyStatus,
} from './types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: BootstrapPayload }

const routeSteps = [
  { label: 'Riesgo', shortLabel: 'Riesgo', detail: 'Identificar y evaluar', icon: AlertTriangle },
  { label: 'Material', shortLabel: 'Material', detail: 'Contexto y disponibilidad', icon: Box },
  { label: 'Recomendación', shortLabel: 'Recom.', detail: 'Cálculo determinístico', icon: FileCheck2 },
  { label: 'Evidencia', shortLabel: 'Evidencia', detail: 'Traza y resultado', icon: ShieldCheck },
] as const

type RouteState = 'pending' | 'running' | 'done'

const suggestions = [
  '¿Cuál es el riesgo más urgente?',
  'Explícame la recomendación',
  '¿Qué herramientas MCP hay?',
] as const

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [working, setWorking] = useState(false)
  const [protocolOpen, setProtocolOpen] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void fetchJson<BootstrapPayload>('/api/bootstrap', { signal: controller.signal })
      .then((data) => {
        setLoadState({ status: 'ready', data })
        setAnalysis({ selected: data.selected, recommendation: data.recommendation, traces: data.traces })
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          text: initialAnswer(data.selected, data.recommendation),
        }])
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadState({ status: 'error', message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [])

  const data = loadState.status === 'ready' ? loadState.data : null
  const selected = analysis?.selected ?? data?.selected
  const recommendation = analysis?.recommendation ?? data?.recommendation
  const traces = analysis?.traces ?? data?.traces ?? []
  const states = routeStates(working, (data?.risks.risks.length ?? 0) > 0, Boolean(selected), Boolean(recommendation), traces.length)
  const visibleRisks = data?.risks.risks.filter((risk) => {
    const query = search.trim().toLocaleLowerCase('es')
    return query === '' || `${risk.description} ${risk.materialCode} ${risk.center}`.toLocaleLowerCase('es').includes(query)
  }) ?? []

  async function selectRisk(risk: RiskRow): Promise<void> {
    if (working) return
    setWorking(true)
    try {
      const next = await postJson<AnalysisPayload>('/api/analyze', {
        center: risk.center,
        materialCode: risk.materialCode,
      })
      setAnalysis(next)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: initialAnswer(next.selected, next.recommendation),
      }])
    } catch (error) {
      setMessages((current) => [...current, errorMessageEntry(error)])
    } finally {
      setWorking(false)
    }
  }

  async function submitMessage(message: string): Promise<void> {
    const trimmed = message.trim()
    if (!trimmed || working) return
    setInput('')
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'operator', text: trimmed }])
    setWorking(true)
    try {
      const next = await postJson<ChatPayload>('/api/chat', {
        message: trimmed,
        ...(selected ? { center: selected.material.center, materialCode: selected.material.materialCode } : {}),
      })
      setAnalysis(next)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: next.answer }])
    } catch (error) {
      setMessages((current) => [...current, errorMessageEntry(error)])
    } finally {
      setWorking(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void submitMessage(input)
  }

  if (loadState.status === 'loading') return <LoadingScreen />
  if (loadState.status === 'error') return <ErrorScreen message={loadState.message} />
  if (!data || !selected || !recommendation) return <EmptyScreen />

  return (
    <div className="app-shell">
      <Header data={data} search={search} onSearch={setSearch} />
      <main className="workspace">
        <RouteRail states={states} />
        <Conversation
          messages={messages}
          risks={visibleRisks}
          selected={selected}
          recommendation={recommendation}
          input={input}
          working={working}
          onInput={setInput}
          onSubmit={handleSubmit}
          onSuggestion={(value) => void submitMessage(value)}
          onSelectRisk={(risk) => void selectRisk(risk)}
        />
        <Inspector
          selected={selected}
          recommendation={recommendation}
          working={working}
          onAnalyze={() => void selectRisk(toRiskReference(selected))}
        />
      </main>
      <ProtocolDrawer open={protocolOpen} onToggle={() => setProtocolOpen((value) => !value)} traces={traces} />
    </div>
  )
}

function Header({ data, search, onSearch }: { data: BootstrapPayload; search: string; onSearch(value: string): void }) {
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function focusSearch(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('es') === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <header className="topbar">
      <a className="brand" href="#conversation" aria-label="Supply Control MCP, ir a la consulta">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>Supply Control MCP</strong><small>MCP // CONTROL DE ABASTECIMIENTO</small></span>
      </a>
      <label className="global-search">
        <span className="sr-only">Buscar material, código o centro</span>
        <Search size={17} aria-hidden="true" />
        <input ref={searchRef} value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => onSearch(event.target.value)} placeholder="Buscar material o código…" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="topbar-context">
        <span className="synthetic-tag"><Database size={15} /> Datos sintéticos</span>
        <span className="service-tag"><span className="status-dot" /> Servicio MCP activo</span>
        <span className="tool-count"><Wrench size={15} /> {data.tools.length} herramientas</span>
      </div>
      <BarcodeMark />
      <div className="route-stamp" aria-hidden="true"><Plane size={21} /><span>TRACE<br />ON ROUTE</span></div>
    </header>
  )
}

function RouteRail({ states }: { states: readonly RouteState[] }) {
  const stateWord: Record<RouteState, string> = { pending: 'pendiente', running: 'en curso', done: 'completada' }
  return (
    <nav className="route-rail" aria-label="Etapas del análisis">
      <div className="route-title"><Waypoints size={27} /><span>Cartera<br />de ruta</span></div>
      <ol>
        {routeSteps.map((step, index) => {
          const Icon = step.icon
          const state = states[index] ?? 'pending'
          return (
            <li
              key={step.label}
              className={state}
              aria-label={`${step.label}, ${step.detail}: etapa ${stateWord[state]}`}
              aria-current={state === 'running' ? 'step' : undefined}
            >
              <span className="route-node">{state === 'done' ? <Check size={14} /> : index + 1}</span>
              <Icon className="route-icon" size={22} aria-hidden="true" />
              <span className="route-copy"><strong data-short={step.shortLabel}><span>{step.label}</span></strong><small>{step.detail}</small></span>
            </li>
          )
        })}
      </ol>
      <div className="route-foot"><span>JSON-RPC 2.0</span><span>MCP 2025-11-25</span></div>
    </nav>
  )
}

/**
 * Las etapas describen lo que realmente se ha obtenido, no una animación: una
 * etapa se completa cuando su dato existe y vuelve a "en curso" mientras el
 * servidor la recalcula.
 */
function routeStates(working: boolean, hasRisks: boolean, hasMaterial: boolean, hasRecommendation: boolean, traceCount: number): RouteState[] {
  if (working) return ['done', 'running', 'running', 'running']
  return [
    hasRisks ? 'done' : 'pending',
    hasMaterial ? 'done' : 'pending',
    hasRecommendation ? 'done' : 'pending',
    traceCount > 0 ? 'done' : 'pending',
  ]
}

interface ConversationProps {
  messages: ConversationMessage[]
  risks: RiskRow[]
  selected: MaterialStatus
  recommendation: RecommendationExplanation
  input: string
  working: boolean
  onInput(value: string): void
  onSubmit(event: FormEvent<HTMLFormElement>): void
  onSuggestion(value: string): void
  onSelectRisk(risk: RiskRow): void
}

function Conversation(props: ConversationProps) {
  const streamRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLInputElement>(null)

  // Una respuesta que aparece fuera de la vista se lee como si no hubiera
  // llegado; el desplazamiento la sigue y respeta la preferencia del sistema.
  useEffect(() => {
    const stream = streamRef.current
    if (!stream) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    stream.scrollTo({ top: stream.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [props.messages, props.working])

  // Al terminar la consulta el cursor vuelve al campo para poder encadenar
  // preguntas sin tocar el ratón.
  const wasWorking = useRef(props.working)
  useEffect(() => {
    if (wasWorking.current && !props.working) composerRef.current?.focus()
    wasWorking.current = props.working
  }, [props.working])

  return (
    <section className="conversation" id="conversation" aria-labelledby="conversation-title">
      <header className="section-header">
        <span className="section-icon"><MessageSquareText size={22} /></span>
        <span><h1 id="conversation-title">Consulta operativa</h1><p>Interroga el dataset y conserva la evidencia del protocolo.</p></span>
        <span className="connected"><CircleDot size={14} /> Conectado</span>
      </header>

      <div className="risk-switcher" aria-label="Materiales en la cola de riesgo">
        {props.risks.length === 0 && <p className="empty-search">No hay materiales que coincidan con la búsqueda.</p>}
        {props.risks.slice(0, 5).map((risk) => (
          <button
            key={`${risk.center}-${risk.materialCode}`}
            className={risk.materialCode === props.selected.material.materialCode ? 'selected' : ''}
            onClick={() => props.onSelectRisk(risk)}
            disabled={props.working}
          >
            <StatusIcon status={risk.status} />
            <span><strong>{risk.description}</strong><small>{coverageLabel(risk.coverageDays)}</small></span>
          </button>
        ))}
      </div>

      <div className="message-stream" ref={streamRef} role="log" aria-live="polite" aria-busy={props.working}>
        <div className="message operator-message"><span className="avatar">OP</span><p>Analiza {props.selected.material.description} y muéstrame una recomendación verificable.</p></div>
        {props.messages.map((message) => (
          <div key={message.id} className={`message ${message.role === 'operator' ? 'operator-message' : 'assistant-message'}`}>
            <span className="avatar">{message.role === 'operator' ? 'OP' : <Braces size={17} />}</span>
            <p>{message.text}</p>
          </div>
        ))}
        <TicketChain selected={props.selected} recommendation={props.recommendation} />
        {props.working && <div className="working-state"><LoaderCircle size={18} /> Ejecutando herramientas MCP…</div>}
      </div>

      <div className="suggestions" aria-label="Consultas sugeridas">
        {suggestions.map((suggestion) => <button key={suggestion} onClick={() => props.onSuggestion(suggestion)} disabled={props.working}>{suggestion}</button>)}
      </div>

      <form className="composer" onSubmit={props.onSubmit}>
        <label className="sr-only" htmlFor="operator-question">Consulta sobre abastecimiento</label>
        <input
          id="operator-question"
          ref={composerRef}
          value={props.input}
          onChange={(event: ChangeEvent<HTMLInputElement>) => props.onInput(event.target.value)}
          placeholder="Pregunta por inventario, riesgo o herramientas MCP…"
          maxLength={1000}
          disabled={props.working}
        />
        <button type="submit" disabled={props.working || props.input.trim() === ''} aria-label="Enviar consulta">
          {props.working ? <LoaderCircle size={20} /> : <Send size={20} />}
        </button>
      </form>
    </section>
  )
}

function TicketChain({ selected, recommendation }: { selected: MaterialStatus; recommendation: RecommendationExplanation }) {
  const quantity = recommendation.calculation.recommendedQuantityUmc
  const tickets = [
    { label: 'Riesgo', value: statusLabel(selected.status), icon: AlertTriangle, tone: 'risk' },
    { label: 'Material', value: selected.material.materialCode, icon: Box, tone: 'navy' },
    { label: 'Recomendación', value: quantity > 0 ? `${formatNumber(quantity)} ${selected.material.purchaseUnit}` : 'Sin compra', icon: Sparkles, tone: 'purple' },
    { label: 'Evidencia', value: 'Traza disponible', icon: ShieldCheck, tone: 'navy' },
  ] as const
  return (
    <ol className="ticket-chain" aria-label="Resultado del análisis por etapas">
      {tickets.map((ticket, index) => {
        const Icon = ticket.icon
        return (
          <li key={ticket.label} className={`ticket ${ticket.tone}`}>
            <span className="ticket-index">{String(index + 1).padStart(2, '0')}</span>
            <Icon size={21} aria-hidden="true" />
            <span><strong>{ticket.label}</strong><small>{ticket.value}</small></span>
            {index < tickets.length - 1 && <ChevronRight className="ticket-arrow" size={17} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

function Inspector({ selected, recommendation, working, onAnalyze }: { selected: MaterialStatus; recommendation: RecommendationExplanation; working: boolean; onAnalyze(): void }) {
  const coverageRatio = selected.coverageDays === null || selected.material.targetDsi === null
    ? 0
    : Math.min(100, Math.round((selected.coverageDays / selected.material.targetDsi) * 100))
  return (
    <aside className="inspector" aria-label="Inspector del material seleccionado">
      <section className="material-sheet">
        <header><span className="section-icon"><Box size={21} /></span><h2>Material seleccionado</h2><span className="sheet-code">{selected.material.materialCode}</span></header>
        <h3>{selected.material.description}</h3>
        <dl className="material-meta">
          <div><dt>Centro</dt><dd>{selected.material.center}</dd></div>
          <div><dt>Almacén</dt><dd>{selected.material.warehouse}</dd></div>
          <div><dt>Proveedores</dt><dd>{selected.material.supplierCount}</dd></div>
        </dl>
      </section>

      <section className="risk-sheet">
        <header><AlertTriangle size={20} /><h2>Factores de riesgo</h2><StatusBadge status={selected.status} /></header>
        <div className="coverage-reading"><strong>{selected.coverageDays ?? '—'}</strong><span>días<br />de cobertura</span></div>
        <div className="coverage-bar" role="meter" aria-label="Cobertura frente al objetivo" aria-valuenow={coverageRatio} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${coverageRatio}%` }} /></div>
        <dl className="risk-facts">
          <div><dt>Inventario disponible</dt><dd>{formatNumber(selected.availableStock)} {selected.material.baseUnit}</dd></div>
          <div><dt>Demanda diaria</dt><dd>{formatNumber(selected.inventory.averageDailyDemand)} {selected.material.baseUnit}</dd></div>
          <div><dt>Objetivo DSI</dt><dd>{selected.material.targetDsi ?? '—'} días</dd></div>
          <div><dt>Quiebre proyectado</dt><dd>{selected.projectedStockoutDate ?? 'No proyectado'}</dd></div>
        </dl>
      </section>

      <section className="recommendation-sheet">
        <header><Sparkles size={20} /><h2>Recomendación determinística</h2></header>
        <div className="recommendation-title"><PackageCheck size={25} /><span><strong>{recommendation.calculation.recommendedQuantityUmc > 0 ? 'Reposición sugerida' : 'Cobertura suficiente'}</strong><small>Calculada por reglas locales auditables</small></span></div>
        <dl>
          <div><dt>Cantidad</dt><dd>{formatNumber(recommendation.calculation.recommendedQuantityUmc)} {selected.material.purchaseUnit}</dd></div>
          <div><dt>Necesidad neta</dt><dd>{formatNullable(recommendation.calculation.netRequirementUmb)} {selected.material.baseUnit}</dd></div>
          <div><dt>Antes del lead time</dt><dd>{recommendation.riskAssessment.stockoutBeforeLeadTime ? 'Sí, requiere contingencia' : 'No'}</dd></div>
        </dl>
        <button className="primary-action" onClick={onAnalyze} disabled={working}>
          {working ? <LoaderCircle size={18} /> : <ArrowRight size={18} />}
          {working ? 'Analizando…' : 'Ejecutar análisis'}
        </button>
      </section>
    </aside>
  )
}

function ProtocolDrawer({ open, onToggle, traces }: { open: boolean; onToggle(): void; traces: ProtocolTrace[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const onRender = window.location.hostname.endsWith('onrender.com')

  // Cada operación reemplaza el lote de trazas. Al llegar uno nuevo se vuelve a
  // la última, que es la que responde la pregunta recién hecha.
  useEffect(() => setSelectedId(null), [traces])

  const trace = traces.find((entry) => entry.id === selectedId) ?? traces.at(-1)
  const totalMs = Math.round(traces.reduce((sum, entry) => sum + entry.durationMs, 0) * 100) / 100

  return (
    <section className={`protocol-drawer ${open ? 'open' : ''}`} aria-labelledby="protocol-title">
      <button className="protocol-handle" onClick={onToggle} aria-expanded={open}>
        <span><Code2 size={18} /><strong id="protocol-title">Protocolo MCP</strong><small>{trace ? `${traceLabel(trace)} · ${trace.durationMs} ms` : 'Sin traza'}</small></span>
        <span className="service-overview">
          <span><Server size={13} /> {onRender ? 'Render' : 'Servidor local'}</span>
          <span><Cloud size={13} /> {onRender ? 'HTTPS cifrado' : 'HTTP en claro'}</span>
          <span>{totalMs} ms</span>
          <span>{traces.length} {traces.length === 1 ? 'mensaje' : 'mensajes'}</span>
        </span>
        {open ? <X size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && (
        <div className="protocol-content">
          <div className="trace-index">
            <h3>Intercambio</h3>
            <ol>
              {traces.length === 0 && <li className="trace-empty">Aún no se ha ejecutado ninguna llamada.</li>}
              {traces.map((entry) => (
                <li key={entry.id}>
                  <button
                    className={entry.id === trace?.id ? 'selected' : ''}
                    onClick={() => setSelectedId(entry.id)}
                    aria-current={entry.id === trace?.id ? 'true' : undefined}
                  >
                    <span className="trace-id">{String(entry.id).padStart(2, '0')}</span>
                    <span className="trace-name">{traceLabel(entry)}</span>
                    <span className="trace-ms">{entry.durationMs} ms</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <ProtocolBlock title="Solicitud JSON-RPC" value={trace?.request} />
          <ProtocolBlock title="Respuesta JSON-RPC" value={trace?.response} />
        </div>
      )}
    </section>
  )
}

function ProtocolBlock({ title, value }: { title: string; value: unknown }) {
  const [copied, setCopied] = useState(false)
  const serialized = value ? JSON.stringify(value, null, 2) : ''

  async function copy(): Promise<void> {
    if (!serialized) return
    try {
      await navigator.clipboard.writeText(serialized)
      setCopied(true)
      setTimeout(() => setCopied(false), 1_800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="protocol-block">
      <h3>
        {title}
        <button onClick={() => void copy()} disabled={!serialized} aria-label={`Copiar ${title.toLocaleLowerCase('es')}`}>
          {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
        </button>
      </h3>
      <pre tabIndex={0}>{serialized || 'Aún no hay datos.'}</pre>
    </div>
  )
}

/** Un `tools/call` se identifica por la herramienta, no por el método genérico. */
function traceLabel(trace: ProtocolTrace): string {
  const params = trace.request.params
  if (typeof params === 'object' && params !== null && 'name' in params && typeof params.name === 'string') return params.name
  return trace.method
}

function traceToolName(trace?: ProtocolTrace): string {
  const params = trace?.request.params
  if (typeof params === 'object' && params !== null && 'name' in params && typeof params.name === 'string') return params.name
  return trace?.method ?? 'sin herramienta'
}

function BarcodeMark() {
  const bars = [2, 5, 7, 11, 14, 18, 20, 24, 29, 31, 35, 39, 42, 47, 50, 54, 58, 61]
  return (
    <span className="barcode" aria-label="Identificador visual SCM 2026">
      <svg viewBox="0 0 64 24" role="img" aria-hidden="true">
        {bars.map((x, index) => <rect key={x} x={x} y={index % 3 === 0 ? 2 : 5} width={index % 4 === 0 ? 2 : 1} height={index % 3 === 0 ? 20 : 16} />)}
      </svg>
      <small>SCM·2026</small>
    </span>
  )
}

function StatusBadge({ status }: { status: SupplyStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><StatusIcon status={status} /> {statusLabel(status)}</span>
}

function StatusIcon({ status }: { status: SupplyStatus }) {
  if (status === 'SIN_STOCK' || status === 'CRITICO') return <AlertTriangle size={15} aria-hidden="true" />
  if (status === 'EN_RIESGO' || status === 'SIN_PARAMETROS') return <CircleDot size={15} aria-hidden="true" />
  return <Check size={15} aria-hidden="true" />
}

function LoadingScreen() {
  return <main className="state-screen loading" aria-live="polite"><LoaderCircle size={34} /><h1>Preparando la ruta</h1><p>Conectando con las herramientas MCP y leyendo los datos sintéticos…</p></main>
}

function ErrorScreen({ message }: { message: string }) {
  return <main className="state-screen error"><AlertTriangle size={34} /><h1>No pudimos abrir la consola</h1><p>{message}</p><button onClick={() => window.location.reload()}><RefreshCw size={18} /> Reintentar</button></main>
}

function EmptyScreen() {
  return <main className="state-screen"><Server size={34} /><h1>No hay materiales disponibles</h1><p>Verifica los archivos del dataset sintético y vuelve a cargar.</p></main>
}

function toRiskReference(selected: MaterialStatus): RiskRow {
  return {
    center: selected.material.center,
    materialCode: selected.material.materialCode,
    description: selected.material.description,
    status: selected.status,
    availableStock: selected.availableStock,
    baseUnit: selected.material.baseUnit,
    coverageDays: selected.coverageDays,
    projectedStockoutDate: selected.projectedStockoutDate,
    supplierCount: selected.material.supplierCount,
    warnings: selected.warnings,
  }
}

function initialAnswer(selected: MaterialStatus, recommendation: RecommendationExplanation): string {
  const order = recommendation.calculation.recommendedQuantityUmc
  return `${selected.material.description} presenta ${coverageLabel(selected.coverageDays)} y estado ${statusLabel(selected.status).toLocaleLowerCase('es')}. ${order > 0 ? `La regla de reposición recomienda ${formatNumber(order)} ${selected.material.purchaseUnit}.` : 'La proyección no requiere una nueva compra.'}`
}

function errorMessageEntry(error: unknown): ConversationMessage {
  return { id: crypto.randomUUID(), role: 'assistant', text: `No pude completar la consulta: ${errorMessage(error)} Puedes reintentar o elegir otro material.` }
}

function coverageLabel(value: number | null): string {
  return value === null ? 'Cobertura no calculable' : `${value} días de cobertura`
}

function statusLabel(status: SupplyStatus): string {
  const labels: Record<SupplyStatus, string> = {
    SIN_STOCK: 'Sin stock',
    CRITICO: 'Crítico',
    EN_RIESGO: 'En riesgo',
    DSI_IDEAL: 'DSI ideal',
    EXCESO: 'Exceso',
    SIN_CONSUMO: 'Sin consumo',
    SIN_PARAMETROS: 'Sin parámetros',
  }
  return labels[status]
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 2 }).format(value)
}

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value)
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json() as unknown
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `HTTP ${response.status}`
    throw new Error(message)
  }
  return body as T
}

function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
