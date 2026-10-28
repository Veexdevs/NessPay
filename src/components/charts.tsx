import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brl, num } from '@/lib/format'
import type { DayPoint } from '@/lib/metrics'

const axis = { stroke: '#1f1f1f', tickLine: false, axisLine: false } as const
const shades = ['#ffffff', '#bdbdbd', '#7a7a7a', '#3f3f3f']

function TooltipShell({ children }: { children: React.ReactNode }) {
  return <div className="border border-ink-500 bg-black/95 px-3 py-2 shadow-[3px_3px_0_0_#000]">{children}</div>
}

export function ChartEmpty({ height = 250, message = 'Sem dados para exibir' }: { height?: number; message?: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <div className="absolute inset-0 bg-grid [background-size:36px_36px] opacity-40" />
      <div className="relative border border-dashed border-ink-600 bg-black/70 px-4 py-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">{message}</p>
        <p className="mt-1 text-[11px] text-ink-600">os gráficos aparecem quando existirem registros reais</p>
      </div>
    </div>
  )
}

export function RevenueChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.34} />
            <stop offset="60%" stopColor="#ffffff" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={4} dy={6} />
        <YAxis {...axis} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={44} />
        <Tooltip
          cursor={{ stroke: '#555', strokeDasharray: '3 3' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipShell>
                <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{label}</p>
                <p className="font-display text-[15px] text-white">{brl(Number(payload[0].value))}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                  {num(Number(payload[0].payload.pedidos))} pedidos
                </p>
              </TooltipShell>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="receita"
          stroke="#ffffff"
          strokeWidth={1.6}
          fill="url(#revFill)"
          activeDot={{ r: 3.5, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MethodBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis type="category" dataKey="name" {...axis} width={72} tick={{ fill: '#b8b8b8', fontSize: 10.5 }} />
        <Tooltip
          cursor={{ fill: '#ffffff08' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipShell>
                <p className="font-mono text-[11px] text-white">
                  {payload[0].payload.name} · {payload[0].value}%
                </p>
              </TooltipShell>
            ) : null
          }
        />
        <Bar dataKey="value" barSize={13}>
          {data.map((_, i) => (
            <Cell key={i} fill={shades[i % shades.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              stroke="#000"
              strokeWidth={1.5}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={shades[i % shades.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[16px] leading-none text-white">mix</span>
          <span className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-500">receita</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0" style={{ background: shades[i % shades.length] }} />
            <span className="flex-1 text-[11.5px] text-ink-300">{d.name}</span>
            <span className="font-mono text-[11px] text-white">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
