import { useState } from 'react'
import { Hash, MessagesSquare, Send } from 'lucide-react'
import { Avatar, Card, EmptyState, StatusBadge, StatCard, useToast } from '@/components/ui'
import { tickets, type TicketStatus } from '@/data/mock'
import { dateTime, num, relative, statusLabel } from '@/lib/format'

const filters: (TicketStatus | 'todos')[] = ['todos', 'aberto', 'aguardando', 'resolvido']

const thread = [
  { author: 'Lucas Ferreira', staff: false, at: '13:12', text: 'paguei no pix e até agora nada no privado 😥' },
  { author: 'Ness', staff: true, at: '13:14', text: 'Boa tarde! Vou verificar o pagamento agora, um instante.' },
  {
    author: 'Ness',
    staff: true,
    at: '13:16',
    text: 'Pagamento confirmado (NP-10428). Reenviei o produto no seu DM — confere lá e me avisa se chegou.',
  },
  { author: 'Lucas Ferreira', staff: false, at: '13:21', text: 'chegou sim, muito obrigado!' },
]

export default function Tickets() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('todos')
  const [selected, setSelected] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const { toast, toastNode } = useToast()

  const list = tickets.filter((t) => filter === 'todos' || t.status === filter)
  const ticket = tickets.find((t) => t.id === selected)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Abertos" value={num(tickets.filter((t) => t.status === 'aberto').length)} hint="precisa de você" />
        <StatCard label="Aguardando cliente" value={num(tickets.filter((t) => t.status === 'aguardando').length)} />
        <StatCard label="Resolvidos (7d)" value={num(tickets.filter((t) => t.status === 'resolvido').length)} delta={11.5} />
        <StatCard label="Tempo médio" value="14 min" delta={-9.4} hint="primeira resposta" />
      </div>

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
              {f === 'todos' ? tickets.length : tickets.filter((t) => t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-900/50">
                  <th className="th">Ticket</th>
                  <th className="th">Cliente</th>
                  <th className="th">Assunto</th>
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
                    className={`cursor-pointer border-b border-ink-800/70 transition-colors hover:bg-ink-850/80 ${
                      selected === t.id ? 'bg-ink-850' : ''
                    }`}
                  >
                    <td className="td font-mono text-[11.5px] text-white">{t.id}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar label={t.customer.slice(0, 1)} hue={t.id.length * 9} size={24} />
                        {t.customer}
                      </div>
                    </td>
                    <td className="td max-w-[190px] truncate text-ink-300">{t.subject}</td>
                    <td className="td">
                      <StatusBadge status={t.priority} label={t.priority} />
                    </td>
                    <td className="td">
                      <StatusBadge status={t.status} label={statusLabel[t.status]} />
                    </td>
                    <td className="td font-mono text-[11px] text-ink-400">{relative(t.openedAt)}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState title="Nenhum ticket nesse filtro" hint="Quando alguém abrir um ticket no Discord, ele aparece aqui." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <MessagesSquare size={14} className="text-ink-400" />
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
              {ticket ? ticket.id : 'Selecione um ticket'}
            </h2>
          </div>
          {ticket ? (
            <>
              <div className="mb-3 flex items-center justify-between border border-ink-800 px-3 py-2.5">
                <div>
                  <p className="text-[12.5px] text-white">{ticket.subject}</p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-ink-500">
                    <Hash size={9} /> {ticket.product}
                  </p>
                </div>
                <StatusBadge status={ticket.status} label={statusLabel[ticket.status]} />
              </div>
              <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
                {thread.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.staff ? 'flex-row-reverse' : ''}`}>
                    <Avatar label={m.author.slice(0, 1)} hue={m.staff ? 60 : 20} size={24} />
                    <div className={`max-w-[78%] border px-2.5 py-2 ${m.staff ? 'border-ink-500 bg-ink-800' : 'border-ink-700 bg-black'}`}>
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                        {m.author} · {m.at}
                      </p>
                      <p className="text-[11.5px] leading-relaxed text-ink-100">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Responder no ticket…"
                  className="field"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reply.trim()) {
                      setReply('')
                      toast('Resposta enviada (simulação)')
                    }
                  }}
                />
                <button
                  className="btn-primary px-3"
                  onClick={() => {
                    if (!reply.trim()) return
                    setReply('')
                    toast('Resposta enviada (simulação)')
                  }}
                >
                  <Send size={13} />
                </button>
              </div>
              <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-600">
                aberto em {dateTime(ticket.openedAt)} · responsável: {ticket.assignee ?? 'ninguém'}
              </p>
            </>
          ) : (
            <EmptyState title="Nenhum ticket selecionado" hint="Clique em uma linha da tabela para ver a conversa." />
          )}
        </Card>
      </div>

      {toastNode}
    </div>
  )
}
