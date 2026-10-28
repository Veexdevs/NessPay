import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brl, compactBrl, num } from '@/lib/format'

const axis = {
  stroke: '#1f1f1f',
  tickLine: false,
  axisLine: false,
} as const

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-ink-500 bg-black/95 px-3 py-2 shadow-[3px_3px_0_0_#000]">
      {children}
    </div>
  )
}

export function RevenueChart({ data }: { data: { label: string; receita: number; pedidos: number }[] }) {
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
                <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400">
                  dia {label}
                </p>
                <p className="font-display text-lg text-white">{brl(Number(payload[0].value))}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-400">{num(Number(payload[1]?.value ?? 0))} pedidos</p>
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

export function OrdersLineChart({ data }: { data: { label: string; pedidos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <Line type="stepAfter" dataKey="pedidos" stroke="#8a8a8a" strokeWidth={1.3} dot={false} />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipShell>
                <p className="font-mono text-[11px] text-white">{num(Number(payload[0].value))} pedidos</p>
              </TooltipShell>
            ) : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MethodBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, 70]} />
        <YAxis
          type="category"
          dataKey="name"
          {...axis}
          width={72}
          tick={{ fill: '#b8b8b8', fontSize: 10.5 }}
        />
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
        <Bar dataKey="value" barSize={13} radius={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#ffffff' : i === 1 ? '#b4b4b4' : i === 2 ? '#6e6e6e' : '#3a3a3a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  const shades = ['#ffffff', '#bdbdbd', '#7a7a7a', '#3f3f3f']
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
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipShell>
                    <p className="font-mono text-[11px] text-white">
                      {payload[0].name} · {payload[0].value}%
                    </p>
                  </TooltipShell>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[19px] leading-none text-white">100%</span>
          <span className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-500">mix</span>
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

export function MiniBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[5px] bg-ink-500 transition-colors hover:bg-white"
          style={{ height: `${Math.max(10, (v / max) * 100)}%`, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  )
}

export const fmtAxis = compactBrl
