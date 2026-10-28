import { useMemo, useState } from 'react'
import { Download, Filter, Search, X } from 'lucide-react'
import { Avatar, Card, CopyButton, KV, Modal, StatusBadge, StatCard, useToast } from '@/components/ui'
import { sales, type SaleStatus } from '@/data/mock'
import { brl, compactBrl, dateTime, methodLabel, num, statusLabel } from '@/lib/format'

const statusOptions: (SaleStatus | 'todos')[] = ['todos', 'pago', 'pendente', 'reembolsado', 'cancelado', 'expirado']
const methodOptions = ['todos', 'pix', 'cartao', 'crypto', 'saldo'] as const

export default function Sales() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('todos')
  const [method, setMethod] = useState<(typeof methodOptions)[number]>('todos')
  const [selected, setSelected] = useState<string | null>(null)
  const { toast, toastNode } = useToast()

  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const matchQ =
          !q ||
          s.id.toLowerCase().includes(q.toLowerCase()) ||
          s.customer.toLowerCase().includes(q.toLowerCase()) ||
          s.product.toLowerCase().includes(q.toLowerCase()) ||
          s.discordId.includes(q)
        const matchStatus = status === 'todos' || s.status === status
        const matchMethod = method === 'todos' || s.method === method
        return matchQ && matchStatus && matchMethod
      }),
    [q, status, method],
  )

  const total = filtered.filter((s) => s.status === 'pago').reduce((a, b) => a + b.amount, 0)
  const sale = sales.find((s) => s.id === selected)

  const exportCsv = () => {
    const header = 'pedido,cliente,produto,metodo,valor,status,criado_em\n'
    const body = filtered
      .map((s) =>
        [s.id, s.customer, s.product, s.method, s.amount.toFixed(2), s.status, s.createdAt].join(','),
      )
      .join('\n')
    const url = URL.createObjectURL(new Blob([header + body], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'nesspay-vendas.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos listados" value={num(filtered.length)} hint="filtro atual" />
        <StatCard label="Receita filtrada" value={compactBrl(total)} delta={9.2} hint="pagos" />
        <StatCard
          label="Pendentes"
          value={num(filtered.filter((s) => s.status === 'pendente').length)}
          hint="aguardando pagamento"
        />
        <StatCard
          label="Reembolsos"
          value={num(filtered.filter((s) => s.status === 'reembolsado').length)}
          hint={`${brl(filtered.filter((s) => s.status === 'reembolsado').reduce((a, b) => a + b.amount, 0))} devolvidos`}
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
              <button
                onClick={() => setQ('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 border border-ink-700 px-2.5 py-1.5">
              <Filter size={11} className="text-ink-500" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SaleStatus | 'todos')}
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
          </div>
        </div>

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
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className="cursor-pointer border-b border-ink-800/70 transition-colors hover:bg-ink-850/80"
                >
                  <td className="td font-mono text-[11.5px] text-white">{s.id}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar label={s.customer.slice(0, 1)} hue={s.avatarHue} size={24} />
                      {s.customer}
                    </div>
                  </td>
                  <td className="td font-mono text-[10.5px] text-ink-500">{s.discordId}</td>
                  <td className="td text-ink-300">{s.product}</td>
                  <td className="td font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                    {methodLabel[s.method]}
                  </td>
                  <td className="td font-mono text-[10.5px] text-ink-400">{s.coupon ?? '—'}</td>
                  <td className="td text-right font-mono text-[12px] text-white">{brl(s.amount)}</td>
                  <td className="td">
                    <StatusBadge status={s.status} label={statusLabel[s.status]} />
                  </td>
                  <td className="td font-mono text-[11px] text-ink-400">{dateTime(s.createdAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-ink-500">
                    Nenhum pedido encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-ink-800 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
            {filtered.length} de {sales.length} pedidos
          </span>
          <div className="flex gap-1">
            {['‹', '1', '2', '3', '›'].map((p, i) => (
              <button
                key={i}
                className={`h-7 min-w-7 border px-2 font-mono text-[10.5px] transition-colors ${
                  p === '1' ? 'border-white bg-white text-black' : 'border-ink-700 text-ink-400 hover:border-white hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Modal
        open={!!sale}
        onClose={() => setSelected(null)}
        eyebrow={sale?.id}
        title="Detalhe do pedido"
        footer={
          <>
            <button className="btn-ghost" onClick={() => { setSelected(null); toast('Reembolso solicitado (simulação)') }}>
              Reembolsar
            </button>
            <button className="btn-primary" onClick={() => { setSelected(null); toast('Entrega reenviada') }}>
              Reenviar entrega
            </button>
          </>
        }
      >
        {sale && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-ink-700 bg-ink-850/60 p-3.5">
              <div className="flex items-center gap-3">
                <Avatar label={sale.customer.slice(0, 1)} hue={sale.avatarHue} size={38} />
                <div>
                  <p className="text-[13px] text-white">{sale.customer}</p>
                  <p className="font-mono text-[10.5px] text-ink-500">{sale.discordId}</p>
                </div>
              </div>
              <StatusBadge status={sale.status} label={statusLabel[sale.status]} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-ink-800 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">valor</p>
                <p className="mt-1 font-display text-[22px] leading-none text-white">{brl(sale.amount)}</p>
              </div>
              <div className="border border-ink-800 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">método</p>
                <p className="mt-1 font-display text-[22px] leading-none text-white">{methodLabel[sale.method]}</p>
              </div>
            </div>

            <div>
              <KV k="Produto" v={sale.product} />
              <KV k="Cupom" v={sale.coupon ?? '—'} />
              <KV k="Criado em" v={dateTime(sale.createdAt)} />
              <KV k="Ticket" v={sale.ticketId ?? '—'} />
              <KV
                k="ID do pagamento"
                v={
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-300">pay_9f2ac{sale.id.slice(-4)}</span>
                    <CopyButton value={`pay_9f2ac${sale.id.slice(-4)}`} />
                  </span>
                }
              />
            </div>

            <div className="border border-dashed border-ink-700 p-3">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">linha do tempo</p>
              <ol className="space-y-2">
                {['Pedido criado pelo bot', 'Pagamento confirmado (webhook)', 'Produto entregue no DM'].map((t, i) => (
                  <li key={t} className="flex items-center gap-2.5 text-[11.5px] text-ink-300">
                    <span className={`h-1.5 w-1.5 ${i === 2 && sale.status !== 'pago' ? 'bg-ink-600' : 'bg-white'}`} />
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </div>
  )
}
