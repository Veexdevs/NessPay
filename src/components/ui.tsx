import { ReactNode, useEffect, useState } from 'react'
import { CircleSlash2, Info, TriangleAlert } from 'lucide-react'

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
    <div className={`panel ${hover ? 'panel-hover' : ''} ${padded ? 'p-5' : ''} ${className}`}>{children}</div>
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

const statusStyles: Record<string, string> = {
  pago: 'border-white bg-white text-black',
  pendente: 'border-ink-400 bg-transparent text-ink-200',
  reembolsado: 'border-ink-500 bg-ink-800 text-ink-300',
  cancelado: 'border-ink-600 bg-transparent text-ink-400',
  expirado: 'border-ink-700 bg-transparent text-ink-500',
  aberto: 'border-white bg-white text-black',
  aguardando: 'border-ink-400 bg-ink-850 text-ink-200',
  resolvido: 'border-ink-600 bg-transparent text-ink-400',
  conectado: 'border-white bg-white text-black',
  desconectado: 'border-ink-600 bg-transparent text-ink-400',
  pendente_integracao: 'border-ink-400 bg-ink-850 text-ink-200',
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

export function StatCard({
  label,
  value,
  hint,
  icon,
  muted = false,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  muted?: boolean
}) {
  return (
    <div className="panel panel-hover group relative overflow-hidden p-4">
      <div className="hatch pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</span>
        {icon && <span className="text-ink-500 transition-colors group-hover:text-white">{icon}</span>}
      </div>
      <div className="relative mt-3">
        <div className={`font-display text-[26px] leading-none ${muted ? 'text-ink-500' : 'text-white'}`}>
          {value}
        </div>
        {hint && <p className="mt-2 text-[10.5px] leading-relaxed text-ink-500">{hint}</p>}
      </div>
    </div>
  )
}

export function Meter({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={`h-1.5 w-full overflow-hidden border border-ink-700 bg-ink-850 ${className}`}>
      <div className="h-full bg-white transition-all duration-500" style={{ width: `${ratio}%` }} />
    </div>
  )
}

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

export function EmptyState({
  title,
  hint,
  action,
  icon,
  compact = false,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-ink-700 bg-black/30 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-14'
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-ink-600 text-ink-400">
        {icon ?? <CircleSlash2 size={16} />}
      </div>
      <p className="text-[13px] text-ink-200">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-ink-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Banner({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warn'
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const Icon = tone === 'warn' ? TriangleAlert : Info
  return (
    <div
      className={`flex flex-col gap-3 border p-3.5 sm:flex-row sm:items-center ${
        tone === 'warn' ? 'border-ink-500 bg-ink-850/70' : 'border-ink-700 bg-ink-900/60'
      }`}
    >
      <Icon size={15} className="shrink-0 text-ink-300" />
      <div className="flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">{title}</p>
        {children && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{children}</p>}
      </div>
      {action}
    </div>
  )
}

export function Avatar({
  label,
  src,
  size = 30,
}: {
  label: string
  src?: string | null
  size?: number
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        className="shrink-0 border border-ink-600 object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center border border-ink-600 bg-gradient-to-br from-ink-700 to-ink-850 font-mono font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {label || '?'}
    </span>
  )
}

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative my-6 w-full ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        } animate-fade-up border border-ink-600 bg-ink-900 shadow-[0_40px_120px_-40px_#fff2]`}
      >
        <div className="flex items-start justify-between border-b border-ink-700 px-5 py-4">
          <div>
            {eyebrow && (
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{eyebrow}</p>
            )}
            <h3 className="display-tight text-[19px] text-white">{title}</h3>
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

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2800)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up border border-white bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-black shadow-[6px_6px_0_0_#000]">
      {msg}
    </div>
  ) : null
  return { toast: setMsg, toastNode: node }
}

export function CopyButton({ value, label = 'copiar' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
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
