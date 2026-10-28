import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgeDollarSign,
  CircleAlert,
  Clock3,
  Package,
  Radio,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, StatCard, StatusBadge, Meter, Avatar } from '@/components/ui'
import { RevenueChart, MethodBars, CategoryDonut, OrdersLineChart } from '@/components/charts'
import { activity, botStatus, categorySplit, methodSplit, products, revenueSeries, sales, tickets } from '@/data/mock'
import { brl, compactBrl, dateTime, num, relative, methodLabel, statusLabel } from '@/lib/format'

const todayRevenue = revenueSeries[revenueSeries.length - 1].receita
const todayOrders = revenueSeries[revenueSeries.length - 1].pedidos
const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
const paidSales = sales.filter((s) => s.status === 'pago')
const avgTicket = paidSales.reduce((s, x) => s + x.amount, 0) / Math.max(1, paidSales.length)

const topProducts = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
const maxProductRevenue = topProducts[0].revenue

const activityDot: Record<string, string> = {
  sale: 'bg-white',
  delivery: 'bg-ink-200',
  ticket: 'bg-ink-300',
  coupon: 'bg-ink-400',
  alert: 'bg-white',
  refund: 'bg-ink-500',
  system: 'bg-ink-600',
}

export default function Dashboard() {
  return (
    <div className="space-y-5">
      {/* HERO ---------------------------------------------------------- */}
      <section className="panel grain relative overflow-hidden">
        <div className="hatch pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-ink-600 px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse-dot bg-white" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-200">
                sessão ao vivo · gateway conectado
              </span>
            </div>
            <h2 className="font-display text-[38px] leading-[0.95] text-white sm:text-[52px]">
              SUA LOJA<br />
              <span className="chrome-type">NO CONTROLE.</span>
            </h2>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-ink-400">
              Vendas, entregas, cupons e atendimento do <span className="text-white">NessPay</span> em um painel único.
              Tudo que passa pelo bot aparece aqui em tempo real.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/vendas" className="btn-primary">
                Ver vendas <ArrowUpRight size={13} />
              </Link>
              <Link to="/integracoes" className="btn-ghost">
                <Radio size={13} /> Conectar bot
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-end">
            <div className="pointer-events-none absolute right-2 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full border border-ink-700" />
            <div className="pointer-events-none absolute right-8 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-ink-800" />
            <img
              src="/assets/nesspay-mascot.png"
              alt="Mascote NessPay"
              className="relative z-10 h-[168px] w-auto object-contain saturate-0 contrast-125 drop-shadow-[0_18px_30px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>

        <div className="relative grid grid-cols-2 divide-x divide-ink-800 border-t border-ink-800 md:grid-cols-4">
          {[
            { k: 'faturamento total', v: compactBrl(totalRevenue) },
            { k: 'pedidos pagos', v: num(products.reduce((s, p) => s + p.sold, 0)) },
            { k: 'ticket médio', v: brl(avgTicket) },
            { k: 'servidores', v: `${botStatus.guilds}` },
          ].map((item) => (
            <div key={item.k} className="px-5 py-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">{item.k}</div>
              <div className="mt-1 font-display text-[19px] leading-none text-white">{item.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* KPIs --------------------------------------------------------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receita hoje"
          value={brl(todayRevenue)}
          delta={12.4}
          hint="vs. ontem"
          icon={<BadgeDollarSign size={15} />}
          spark={revenueSeries.slice(-12).map((d) => d.receita)}
        />
        <StatCard
          label="Pedidos hoje"
          value={num(todayOrders)}
          delta={8.1}
          hint="vs. ontem"
          icon={<ShoppingCart size={15} />}
          spark={revenueSeries.slice(-12).map((d) => d.pedidos)}
        />
        <StatCard
          label="Ticket médio"
          value={brl(avgTicket)}
          delta={-2.3}
          hint="30 dias"
          icon={<Receipt size={15} />}
          spark={[42, 48, 45, 52, 49, 55, 53, 58, 51, 54, 50, 49]}
        />
        <StatCard
          label="Conversão"
          value="34,8%"
          delta={4.6}
          hint="checkout → pago"
          icon={<TrendingUp size={15} />}
          spark={[22, 25, 24, 28, 31, 29, 33, 30, 34, 32, 35, 34]}
        />
      </section>

      {/* CHARTS ------------------------------------------------------- */}
      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Receita · últimos 30 dias"
            subtitle={`${compactBrl(revenueSeries.reduce((s, d) => s + d.receita, 0))} no período`}
            icon={<Zap size={14} />}
            action={
              <div className="flex border border-ink-700">
                {['30D', '7D', '24H'].map((r, i) => (
                  <button
                    key={r}
                    className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                      i === 0 ? 'bg-white text-black' : 'text-ink-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          />
          <RevenueChart data={revenueSeries} />
          <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-400">
                <span className="h-1.5 w-4 bg-white" /> receita
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">
                <span className="h-[1.5px] w-4 bg-ink-500" /> pedidos
              </span>
            </div>
            <div className="w-28">
              <OrdersLineChart data={revenueSeries} />
            </div>
          </div>
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader title="Métodos de pagamento" subtitle="distribuição · 30 dias" />
            <MethodBars data={methodSplit} />
          </Card>
          <Card>
            <CardHeader title="Mix de categorias" subtitle="participação na receita" />
            <CategoryDonut data={categorySplit} />
          </Card>
        </div>
      </section>

      {/* TABELAS ------------------------------------------------------ */}
      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">Últimas vendas</h2>
              <p className="mt-1 text-[11.5px] text-ink-400">Pedidos processados pelo bot</p>
            </div>
            <Link
              to="/vendas"
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300 transition-colors hover:text-white"
            >
              ver todas <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-ink-800 bg-ink-900/50">
                  <th className="th">Pedido</th>
                  <th className="th">Cliente</th>
                  <th className="th">Produto</th>
                  <th className="th">Método</th>
                  <th className="th">Valor</th>
                  <th className="th">Status</th>
                  <th className="th">Quando</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 7).map((s) => (
                  <tr key={s.id} className="border-b border-ink-800/70 transition-colors hover:bg-ink-850/70">
                    <td className="td font-mono text-[11.5px] text-ink-300">{s.id}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar label={s.customer.slice(0, 1)} hue={s.avatarHue} size={24} />
                        <span className="text-[12.5px] text-ink-100">{s.customer}</span>
                      </div>
                    </td>
                    <td className="td max-w-[180px] truncate text-ink-300">{s.product}</td>
                    <td className="td font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                      {methodLabel[s.method]}
                    </td>
                    <td className="td font-mono text-[12px] text-white">{brl(s.amount)}</td>
                    <td className="td">
                      <StatusBadge status={s.status} label={statusLabel[s.status]} />
                    </td>
                    <td className="td text-[11.5px] text-ink-400">{relative(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader title="Atividade" subtitle="eventos do bot" icon={<Clock3 size={14} />} />
            <ul className="space-y-0">
              {activity.slice(0, 6).map((a, i) => (
                <li key={i} className="group flex gap-3 border-b border-ink-800/70 py-2.5 last:border-0">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${activityDot[a.kind]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-ink-200 group-hover:text-white">{a.text}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-600">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Atenção necessária" icon={<CircleAlert size={14} />} />
            <div className="space-y-2.5">
              <Row
                label={`${tickets.filter((t) => t.status !== 'resolvido').length} tickets abertos`}
                hint="suporte"
                to="/tickets"
              />
              <Row label={`${products.filter((p) => p.stock === 0).length} produtos sem estoque`} hint="catálogo" to="/produtos" />
              <Row label="2 integrações pendentes" hint="setup" to="/integracoes" />
            </div>
          </Card>
        </div>
      </section>

      {/* TOP PRODUTOS ------------------------------------------------ */}
      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Top produtos por receita"
            subtitle="ranking acumulado"
            icon={<Package size={14} />}
            action={
              <Link to="/produtos" className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300 hover:text-white">
                gerenciar
              </Link>
            }
          />
          <ul className="space-y-3.5">
            {topProducts.map((p, i) => (
              <li key={p.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-4 font-mono text-[10px] text-ink-600">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[13px] text-white">{p.name}</span>
                    <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-500 sm:inline">
                      {p.category}
                    </span>
                  </div>
                  <span className="font-mono text-[11.5px] text-ink-200">{brl(p.revenue)}</span>
                </div>
                <Meter value={p.revenue} max={maxProductRevenue} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Saúde da operação" subtitle="monitor do bot" icon={<Radio size={14} />} />
          <div className="space-y-3">
            <HealthRow label="Latência do gateway" value={`${botStatus.ping} ms`} ok />
            <HealthRow label="Uptime" value={botStatus.uptime} ok />
            <HealthRow label="Comandos hoje" value={num(botStatus.commandsToday)} ok />
            <HealthRow label="Canal de logs" value="pendente" ok={false} />
            <HealthRow label="Webhook de pagamento" value="não configurado" ok={false} />
          </div>
          <div className="mt-4 border border-ink-700 bg-ink-850/60 p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-500">última sincronização</p>
            <p className="mt-1 text-[12px] text-ink-200">{dateTime(new Date().toISOString())}</p>
          </div>
        </Card>
      </section>
    </div>
  )
}

function Row({ label, hint, to }: { label: string; hint: string; to: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between border border-ink-700 bg-ink-850/40 px-3 py-2.5 transition-colors hover:border-white"
    >
      <div className="flex items-center gap-2">
        <Users size={12} className="text-ink-500" />
        <span className="text-[12px] text-ink-200 group-hover:text-white">{label}</span>
      </div>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">{hint}</span>
    </Link>
  )
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-800 py-2 last:border-0">
      <span className="flex items-center gap-2 text-[11.5px] text-ink-300">
        <span className={`h-1.5 w-1.5 ${ok ? 'bg-white' : 'bg-ink-600'}`} />
        {label}
      </span>
      <span className={`font-mono text-[11px] ${ok ? 'text-white' : 'text-ink-500'}`}>{value}</span>
    </div>
  )
}
