import { useState } from 'react'
import { MessagesSquare, RefreshCw } from 'lucide-react'
import { Card, EmptyState, KV, Modal, StatCard, StatusBadge } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { API_URL } from '@/lib/store'
import { dateTime, num, relative, statusLabel } from '@/lib/format'

const filters = ['todos', 'aberto', 'aguardando', 'resolvido'] as const

export default function Tickets() {
  const { tickets } = useGuild()
  const [filter, setFilter] = useState<(typeof filters)[number]>('todos')
  const [selected, setSelected] = useState<string | null>(null)

  const list = tickets.data.filter((t) => filter === 'todos' || t.status === filter)
  const ticket = tickets.data.find((t) => t.id === selected)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Abertos"
          value={tickets.data.length ? num(tickets.data.filter((t) => t.status === 'aberto').length) : '—'}
          hint="precisam de resposta"
          muted={!tickets.data.length}
        />
        <StatCard
          label="Aguardando cliente"
          value={tickets.data.length ? num(tickets.data.filter((t) => t.status === 'aguardando').length) : '—'}
          muted={!tickets.data.length}
        />
        <StatCard
          label="Resolvidos"
          value={tickets.data.length ? num(tickets.data.filter((t) => t.status === 'resolvido').length) : '—'}
          muted={!tickets.data.length}
        />
        <StatCard label="Tempo de resposta" value="—" hint="calculado pela API (ainda não disponível)" muted />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                filter === f ? 'border-white bg-white text-black' : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-white'
              }`}
            >
              {f === 'todos' ? 'todos' : statusLabel[f]}
              <span className="ml-1.5 opacity-60">
                {f === 'todos' ? tickets.data.length : tickets.data.filter((t) => t.status === f).length}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => void tickets.reload()} className="btn-ghost py-1.5">
          <RefreshCw size={12} /> atualizar
        </button>
      </div>

      <Card padded={false}>
        {list.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<MessagesSquare size={16} />}
              title={tickets.data.length ? 'Nenhum ticket nesse filtro' : 'Nenhum ticket aberto'}
              hint={
                tickets.data.length
                  ? 'Troque o filtro de status.'
                  : API_URL
                    ? 'A API está configurada mas não retornou tickets para este servidor.'
                    : 'Os tickets chegam aqui quando o bot registrar os atendimentos na API.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-900/50">
                  <th className="th">Ticket</th>
                  <th className="th">Cliente</th>
                  <th className="th">Assunto</th>
                  <th className="th">Produto</th>
                  <th className="th">Prioridade</th>
                  <th className="th">Status</th>
                  <th className="th">Aberto</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className="cursor-pointer border-b border-ink-800/70 transition-colors hover:bg-ink-850/80"
                  >
                    <td className="td font-mono text-[11.5px] text-white">{t.id}</td>
                    <td className="td">{t.customerName}</td>
                    <td className="td max-w-[200px] truncate text-ink-300">{t.subject}</td>
                    <td className="td max-w-[150px] truncate text-ink-400">{t.productName ?? '—'}</td>
                    <td className="td">
                      <StatusBadge status={t.priority} label={t.priority} />
                    </td>
                    <td className="td">
                      <StatusBadge status={t.status} label={statusLabel[t.status]} />
                    </td>
                    <td className="td font-mono text-[11px] text-ink-400">{relative(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!ticket} onClose={() => setSelected(null)} title={ticket?.subject ?? ''} eyebrow={ticket?.id}>
        {ticket && (
          <div>
            <div className="mb-3 flex items-center justify-between border border-ink-700 bg-ink-850/60 p-3">
              <div>
                <p className="text-[12.5px] text-white">{ticket.customerName}</p>
                <p className="font-mono text-[10px] text-ink-500">{ticket.id}</p>
              </div>
              <StatusBadge status={ticket.status} label={statusLabel[ticket.status]} />
            </div>
            <div className="mb-3 border border-ink-800 bg-black/50 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">última mensagem</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-100">{ticket.lastMessage}</p>
            </div>
            <KV k="Produto" v={ticket.productName ?? '—'} />
            <KV k="Prioridade" v={ticket.priority} />
            <KV k="Aberto em" v={dateTime(ticket.createdAt)} />
            <p className="mt-3 border border-dashed border-ink-700 p-2.5 text-[11px] leading-relaxed text-ink-500">
              Responder pelo painel exige o endpoint de mensagens do ticket na API. Enquanto isso, responda direto no
              canal do Discord.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
