import { useMemo, useState } from 'react'
import { Download, Filter, Search, ShoppingBag, X } from 'lucide-react'
import { Card, EmptyState, KV, Modal, StatCard, StatusBadge, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { API_URL, type OrderStatus } from '@/lib/store'
import { brl, compactMoney, dateTime, methodLabel, num, statusLabel } from '@/lib/format'

const statusOptions: (OrderStatus | 'todos')[] = ['todos', 'pago', 'pendente', 'reembolsado', 'cancelado', 'expirado']
const methodOptions = ['todos', 'pix', 'cartao', 'crypto', 'saldo'] as const

export default function Sales() {
  const { orders, guildId } = useGuild()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('todos')
  const [method, setMethod] = useState<(typeof methodOptions)[number]>('todos')
  const [selected, setSelected] = useState<string | null>(null)
  const { toast, toastNode } = useToast()

  const filtered = useMemo(
    () =>
      orders.data.filter((o) => {
        const term = q.toLowerCase()
        const matchQ =
          !term ||
          o.id.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.productName.toLowerCase().includes(term) ||
          o.customerId.includes(term)
        return matchQ && (status === 'todos' || o.status === status) && (method === 'todos' || o.method === method)
      }),
    [orders.data, q, status, method],
  )

  const paid = filtered.filter((o) => o.status === 'pago')
  const total = paid.reduce((s, o) => s + o.amount, 0)
  const order = orders.data.find((o) => o.id === selected)

  const exportCsv = () => {
    if (!filtered.length) {
      toast('Nada para exportar')
      return
    }
    const header = 'pedido,cliente,id_discord,produto,metodo,valor,status,criado_em\n'
    const body = filtered
      .map((o) =>
        [o.id, o.customerName, o.customerId, o.productName, o.method, o.amount.toFixed(2), o.status, o.createdAt].join(','),
      )
      .join('\n')
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nesspay-vendas-${guildId}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos carregados" value={orders.data.length ? num(filtered.length) : '—'} hint={orders.data.length ? 'filtro atual' : 'nenhum pedido na API'} muted={!orders.data.length} />
        <StatCard label="Receita filtrada" value={paid.length ? compactMoney(total) : '—'} hint={paid.length ? `${num(paid.length)} pagos` : 'sem pagamentos'} muted={!paid.length} />
        <StatCard
          label="Pendentes"
          value={orders.data.length ? num(filtered.filter((o) => o.status === 'pendente').length) : '—'}
          hint="aguardando pagamento"
          muted={!orders.data.length}
        />
        <StatCard
          label="Reembolsos"
          value={orders.data.length ? num(filtered.filter((o) => o.status === 'reembolsado').length) : '—'}
          hint={
            orders.data.length
              ? brl(filtered.filter((o) => o.status === 'reembolsado').reduce((s, o) => s + o.amount, 0))
              : 'nada devolvido'
          }
          muted={!orders.data.length}
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por pedido, cliente, produto ou ID Discord…"
              className="field pl-9"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 border border-ink-700 px-2.5 py-1.5">
              <Filter size={11} className="text-ink-500" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus | 'todos')}
                className="bg-transparent text-[11px] uppercase tracking-[0.08em] text-ink-200 outline-none"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s} className="bg-ink-900">
                    {s === 'todos' ? 'todos status' : statusLabel[s]}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as (typeof methodOptions)[number])}
              className="border border-ink-700 bg-transparent px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em] text-ink-200 outline-none"
            >
              {methodOptions.map((m) => (
                <option key={m} value={m} className="bg-ink-900">
                  {m === 'todos' ? 'todo método' : methodLabel[m]}
                </option>
              ))}
            </select>
            <button onClick={exportCsv} className="btn-ghost py-1.5">
              <Download size={12} /> CSV
            </button>
            <button onClick={() => void orders.reload()} className="btn-ghost py-1.5">
              atualizar
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ShoppingBag size={16} />}
              title={orders.data.length ? 'Nenhum pedido com esses filtros' : 'Nenhuma venda registrada'}
              hint={
                orders.data.length
                  ? 'Ajuste a busca ou os filtros de status e método.'
                  : API_URL
                    ? 'A API está configurada mas não retornou pedidos para este servidor.'
                    : 'As vendas chegam aqui quando o bot estiver enviando pedidos para a API (VITE_API_URL).'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-ink-900/50">
                  <th className="th">Pedido</th>
                  <th className="th">Cliente</th>
                  <th className="th">ID Discord</th>
                  <th className="th">Produto</th>
                  <th className="th">Método</th>
                  <th className="th">Cupom</th>
                  <th className="th text-right">Valor</th>
                  <th className="th">Status</th>
                  <th className="th">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className="cursor-pointer border-b border-ink-800/70 transition-colors hover:bg-ink-850/80"
                  >
                    <td className="td font-mono text-[11.5px] text-white">{o.id}</td>
                    <td className="td">{o.customerName}</td>
                    <td className="td font-mono text-[10.5px] text-ink-500">{o.customerId}</td>
                    <td className="td text-ink-300">{o.productName}</td>
                    <td className="td font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                      {methodLabel[o.method]}
                    </td>
                    <td className="td font-mono text-[10.5px] text-ink-400">{o.coupon ?? '—'}</td>
                    <td className="td text-right font-mono text-[12px] text-white">{brl(o.amount)}</td>
                    <td className="td">
                      <StatusBadge status={o.status} label={statusLabel[o.status]} />
                    </td>
                    <td className="td font-mono text-[11px] text-ink-400">{dateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink-800 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            {filtered.length} de {orders.data.length} pedidos
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-600">
            fonte: {orders.state === 'ready' ? 'api do bot' : 'sem conexão'}
          </span>
        </div>
      </Card>

      <Modal
        open={!!order}
        onClose={() => setSelected(null)}
        eyebrow={order?.id}
        title="Detalhe do pedido"
        footer={
          <>
            <button className="btn-ghost" onClick={() => toast('Ação disponível quando a API estiver no ar')}>
              Reembolsar
            </button>
            <button className="btn-primary" onClick={() => toast('Ação disponível quando a API estiver no ar')}>
              Reenviar entrega
            </button>
          </>
        }
      >
        {order && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-ink-700 bg-ink-850/60 p-3.5">
              <div>
                <p className="text-[13px] text-white">{order.customerName}</p>
                <p className="font-mono text-[10.5px] text-ink-500">{order.customerId}</p>
              </div>
              <StatusBadge status={order.status} label={statusLabel[order.status]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-ink-800 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">valor</p>
                <p className="mt-1 font-display text-[18px] leading-none text-white">{brl(order.amount)}</p>
              </div>
              <div className="border border-ink-800 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">método</p>
                <p className="mt-1 font-display text-[18px] leading-none text-white">{methodLabel[order.method]}</p>
              </div>
            </div>
            <div>
              <KV k="Produto" v={order.productName} />
              <KV k="Cupom" v={order.coupon ?? '—'} />
              <KV k="Criado em" v={dateTime(order.createdAt)} />
              <KV k="Server" v={guildId} />
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </div>
  )
}
