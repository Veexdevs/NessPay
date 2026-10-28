import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Card, EmptyState, KV, Modal, StatCard } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { brl, dateShort, num } from '@/lib/format'
import { tierOf } from '@/lib/metrics'
import { API_URL } from '@/lib/store'

export default function Customers() {
  const { metrics, orders } = useGuild()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'todos' | 'vip' | 'recorrente' | 'novo'>('todos')
  const [selected, setSelected] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      metrics.customers
        .map((c) => ({ ...c, tier: tierOf(c.orders) }))
        .filter(
          (c) =>
            `${c.name} ${c.id}`.toLowerCase().includes(q.toLowerCase()) && (tier === 'todos' || c.tier === tier),
        ),
    [metrics.customers, q, tier],
  )

  const customer = metrics.customers.find((c) => c.id === selected)
  const history = orders.data.filter((o) => o.customerId === selected)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clientes"
          value={metrics.customers.length ? num(metrics.customers.length) : '—'}
          hint={metrics.customers.length ? 'com pelo menos 1 compra paga' : 'sem compras registradas'}
          muted={!metrics.customers.length}
        />
        <StatCard
          label="VIP (10+ pedidos)"
          value={metrics.customers.length ? num(metrics.customers.filter((c) => c.orders >= 10).length) : '—'}
          muted={!metrics.customers.length}
        />
        <StatCard
          label="LTV médio"
          value={
            metrics.customers.length
              ? brl(metrics.customers.reduce((s, c) => s + c.spent, 0) / metrics.customers.length)
              : '—'
          }
          hint="total gasto ÷ clientes"
          muted={!metrics.customers.length}
        />
        <StatCard
          label="Recorrentes"
          value={metrics.customers.length ? num(metrics.customers.filter((c) => c.orders >= 3).length) : '—'}
          hint="3+ pedidos"
          muted={!metrics.customers.length}
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou ID do Discord…"
              className="field pl-9"
            />
          </div>
          <div className="flex border border-ink-700">
            {(['todos', 'vip', 'recorrente', 'novo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                  tier === t ? 'bg-white text-black' : 'text-ink-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users size={16} />}
              title={metrics.customers.length ? 'Nenhum cliente nesse filtro' : 'Nenhum cliente ainda'}
              hint={
                metrics.customers.length
                  ? 'Ajuste a busca ou o filtro de tier.'
                  : API_URL
                    ? 'A lista é montada a partir dos pedidos pagos que a API devolver.'
                    : 'Os clientes aparecem automaticamente quando o bot enviar os pedidos para a API.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-900/50">
                  <th className="th">Cliente</th>
                  <th className="th">ID Discord</th>
                  <th className="th">Primeira compra</th>
                  <th className="th">Pedidos</th>
                  <th className="th text-right">Total gasto</th>
                  <th className="th">Tier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="cursor-pointer border-b border-ink-800/70 hover:bg-ink-850/80"
                  >
                    <td className="td text-white">{c.name}</td>
                    <td className="td font-mono text-[11px] text-ink-400">{c.id}</td>
                    <td className="td font-mono text-[11px] text-ink-400">{dateShort(c.firstOrder)}</td>
                    <td className="td font-mono">{c.orders}</td>
                    <td className="td text-right font-mono text-white">{brl(c.spent)}</td>
                    <td className="td">
                      <span
                        className={`tag ${
                          c.tier === 'vip'
                            ? 'border-white bg-white text-black'
                            : c.tier === 'recorrente'
                              ? 'border-ink-400 text-ink-200'
                              : 'border-ink-600 text-ink-400'
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!customer}
        onClose={() => setSelected(null)}
        title={customer?.name ?? ''}
        eyebrow={customer?.id}
        wide
      >
        {customer && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <KV k="ID do Discord" v={<span className="font-mono text-[11px]">{customer.id}</span>} />
              <KV k="Pedidos pagos" v={num(customer.orders)} />
              <KV k="Total gasto" v={brl(customer.spent)} />
              <KV k="Ticket médio" v={brl(customer.spent / Math.max(1, customer.orders))} />
              <KV k="Primeira compra" v={dateShort(customer.firstOrder)} />
              <KV k="Última compra" v={dateShort(customer.lastOrder)} />
            </div>
            <div>
              <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-500">histórico</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {history.length ? (
                  history.map((o) => (
                    <div key={o.id} className="flex items-center justify-between border border-ink-800 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] text-ink-100">{o.productName}</p>
                        <p className="font-mono text-[9.5px] text-ink-600">
                          {o.id} · {dateShort(o.createdAt)}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-white">{brl(o.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="border border-dashed border-ink-700 px-3 py-6 text-center text-[11.5px] text-ink-500">
                    Sem histórico disponível.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
