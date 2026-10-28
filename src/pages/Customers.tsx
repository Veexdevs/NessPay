import { useState } from 'react'
import { Search, ShieldBan, UserRound } from 'lucide-react'
import { Avatar, Card, KV, Modal, StatCard, StatusBadge, useToast } from '@/components/ui'
import { customers, sales } from '@/data/mock'
import { brl, compactBrl, dateShort, num } from '@/lib/format'

export default function Customers() {
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'todos' | 'vip' | 'recorrente' | 'novo'>('todos')
  const [selected, setSelected] = useState<string | null>(null)
  const { toast, toastNode } = useToast()

  const filtered = customers.filter(
    (c) =>
      (`${c.name} ${c.discordTag} ${c.id}`.toLowerCase().includes(q.toLowerCase())) &&
      (tier === 'todos' || c.tier === tier),
  )
  const customer = customers.find((c) => c.id === selected)
  const theirSales = sales.filter((s) => s.customer === customer?.name)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes" value={num(customers.length)} delta={5.8} hint="base total" />
        <StatCard label="VIP" value={num(customers.filter((c) => c.tier === 'vip').length)} hint="10+ pedidos" />
        <StatCard label="LTV médio" value={compactBrl(customers.reduce((s, c) => s + c.spent, 0) / customers.length)} />
        <StatCard
          label="Novos em 30 dias"
          value={num(customers.filter((c) => c.tier === 'novo').length)}
          hint="primeira compra"
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, tag ou ID…"
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ink-900/50">
                <th className="th">Cliente</th>
                <th className="th">Discord</th>
                <th className="th">Desde</th>
                <th className="th">Pedidos</th>
                <th className="th text-right">Total gasto</th>
                <th className="th">Tier</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="cursor-pointer border-b border-ink-800/70 hover:bg-ink-850/80"
                >
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <Avatar label={c.name.slice(0, 1)} hue={c.id.length * 5} size={26} />
                      <div>
                        <p className="text-[12.5px] text-white">{c.name}</p>
                        <p className="font-mono text-[9.5px] text-ink-600">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td font-mono text-[11px] text-ink-400">@{c.discordTag}</td>
                  <td className="td font-mono text-[11px] text-ink-400">{dateShort(c.joinedAt)}</td>
                  <td className="td font-mono">{c.orders}</td>
                  <td className="td text-right font-mono text-white">{brl(c.spent)}</td>
                  <td className="td">
                    <StatusBadge status={c.tier} label={c.tier} />
                  </td>
                  <td className="td">
                    {c.banned ? (
                      <span className="tag border-ink-500 text-ink-300">banido</span>
                    ) : (
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-500">ativo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!customer}
        onClose={() => setSelected(null)}
        title={customer?.name ?? ''}
        eyebrow={customer?.id}
        wide
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => {
                setSelected(null)
                toast('Cliente banido (simulação)')
              }}
            >
              <ShieldBan size={13} /> Banir
            </button>
            <button className="btn-primary" onClick={() => toast('Mensagem enviada no DM (simulação)')}>
              Enviar DM
            </button>
          </>
        }
      >
        {customer && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-3 border border-ink-700 bg-ink-850/60 p-3">
                <Avatar label={customer.name.slice(0, 1)} hue={40} size={40} />
                <div>
                  <p className="text-[13px] text-white">@{customer.discordTag}</p>
                  <p className="font-mono text-[10px] text-ink-500">{customer.id}</p>
                </div>
              </div>
              <KV k="Entrou em" v={dateShort(customer.joinedAt)} />
              <KV k="Pedidos" v={num(customer.orders)} />
              <KV k="Total gasto" v={brl(customer.spent)} />
              <KV k="Ticket médio" v={brl(customer.spent / Math.max(1, customer.orders))} />
              <KV k="Última compra" v={dateShort(customer.lastOrder)} />
              <KV k="Tier" v={<StatusBadge status={customer.tier} label={customer.tier} />} />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-500">
                <UserRound size={11} /> histórico
              </p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {theirSales.length ? (
                  theirSales.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border border-ink-800 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] text-ink-100">{s.product}</p>
                        <p className="font-mono text-[9.5px] text-ink-600">
                          {s.id} · {dateShort(s.createdAt)}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-white">{brl(s.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="border border-dashed border-ink-700 px-3 py-6 text-center text-[11.5px] text-ink-500">
                    Sem histórico de compras.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </div>
  )
}
