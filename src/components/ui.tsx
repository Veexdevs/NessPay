import { ReactNode, useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { num } from '@/lib/format'

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  className = '',
  hover = false,
  padded = true,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  padded?: boolean
}) {
  return (
    <div
      className={`panel ${hover ? 'panel-hover' : ''} ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-300">{icon}</span>}
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Badges / status                                                     */
/* ------------------------------------------------------------------ */
const statusStyles: Record<string, string> = {
  pago: 'border-white bg-white text-black',
  pendente: 'border-ink-400 bg-transparent text-ink-200',
  reembolsado: 'border-ink-500 bg-ink-800 text-ink-300 line-through decoration-ink-500',
  cancelado: 'border-ink-600 bg-transparent text-ink-400',
  expirado: 'border-ink-700 bg-transparent text-ink-500',
  aberto: 'border-white bg-white text-black',
  aguardando: 'border-ink-400 bg-ink-850 text-ink-200',
  resolvido: 'border-ink-600 bg-transparent text-ink-400',
  conectado: 'border-white bg-white text-black',
  desconectado: 'border-ink-600 bg-transparent text-ink-400',
  vip: 'border-white bg-white text-black',
  recorrente: 'border-ink-400 bg-transparent text-ink-200',
  novo: 'border-ink-600 bg-transparent text-ink-400',
  alta: 'border-white bg-white text-black',
  media: 'border-ink-500 bg-transparent text-ink-200',
  baixa: 'border-ink-700 bg-transparent text-ink-400',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`tag ${statusStyles[status] ?? 'border-ink-600 text-ink-300'}`}>
      <span className="inline-block h-1 w-1 bg-current" />
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* KPI card                                                            */
/* ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  delta,
  hint,
  spark,
  icon,
}: {
  label: string
  value: string
  delta?: number
  hint?: string
  spark?: number[]
  icon?: ReactNode
}) {
  const positive = (delta ?? 0) > 0
  const flat = (delta ?? 0) === 0
  return (
    <div className="panel panel-hover group relative overflow-hidden p-4">
      <div className="hatch pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</span>
        {icon && <span className="text-ink-500 transition-colors group-hover:text-white">{icon}</span>}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="font-display text-[30px] leading-none text-white">{value}</div>
          <div className="mt-2 flex items-center gap-2">
            {delta !== undefined && (
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10.5px] ${
                  flat ? 'text-ink-400' : positive ? 'text-white' : 'text-ink-300'
                }`}
              >
                {flat ? <Minus size={11} /> : positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {Math.abs(delta).toFixed(1).replace('.', ',')}%
              </span>
            )}
            {hint && <span className="text-[10.5px] text-ink-500">{hint}</span>}
          </div>
        </div>
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  )
}

export function Sparkline({ data, w = 68, h = 30 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible opacity-80">
      <polyline points={pts} fill="none" stroke="#ffffff" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
export function Meter({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const ratio = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={`h-1.5 w-full overflow-hidden border border-ink-700 bg-ink-850 ${className}`}>
      <div className="h-full bg-white transition-all duration-500" style={{ width: `${ratio}%` }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */
export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 border transition-colors ${
        checked ? 'border-white bg-white' : 'border-ink-600 bg-ink-850'
      }`}
    >
      <span
        className={`absolute top-[2px] h-3 w-3 transition-all ${
          checked ? 'left-[19px] bg-black' : 'left-[2px] bg-ink-400'
        }`}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-ink-700 px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-ink-600 font-display text-lg text-ink-400">
        0
      </div>
      <p className="text-sm text-ink-200">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar (monocromático — usa hue só no brilho)                       */
/* ------------------------------------------------------------------ */
export function Avatar({ label, hue = 0, size = 30 }: { label: string; hue?: number; size?: number }) {
  const shade = 18 + (hue % 40)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center border border-ink-600 font-mono font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(140deg, hsl(0 0% ${shade + 16}%), hsl(0 0% ${shade}%))`,
      }}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-fade-up border border-ink-600 bg-ink-900 shadow-[0_40px_120px_-40px_#fff2]`}
      >
        <div className="flex items-start justify-between border-b border-ink-700 px-5 py-4">
          <div>
            {eyebrow && (
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{eyebrow}</p>
            )}
            <h3 className="font-display text-xl text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center border border-transparent text-ink-400 transition-colors hover:border-ink-600 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-700 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up border border-white bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-black shadow-[6px_6px_0_0_#000]">
      {msg}
    </div>
  ) : null
  return { toast: setMsg, toastNode: node }
}

/* ------------------------------------------------------------------ */
/* Count-up number                                                     */
/* ------------------------------------------------------------------ */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value)
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
      className="border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
    >
      {done ? 'copiado' : label}
    </button>
  )
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-ink-800 py-2.5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.1em] text-ink-500">{k}</span>
      <span className="text-right text-[12.5px] text-ink-100">{v}</span>
    </div>
  )
}

export const nf = num
