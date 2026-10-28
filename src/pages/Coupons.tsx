import { useState } from 'react'
import { Plus, Tag, TicketPercent, Trash2 } from 'lucide-react'
import { Card, CardHeader, CopyButton, EmptyState, Modal, StatCard, Switch, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { dateShort, num, parseMoney } from '@/lib/format'

export default function Coupons() {
  const { coupons, addCoupon, updateCoupon, removeCoupon } = useGuild()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ code: '', type: 'percent' as 'percent' | 'fixed', value: '', maxUses: '', expiresAt: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { toast, toastNode } = useToast()

  const submit = () => {
    if (!draft.code.trim()) {
      toast('Informe o código do cupom')
      return
    }
    if (coupons.some((c) => c.code === draft.code.trim().toUpperCase())) {
      toast('Já existe um cupom com esse código')
      return
    }
    const value = draft.type === 'percent' ? Number(draft.value.replace(/\D/g, '')) : parseMoney(draft.value)
    if (!value) {
      toast('Informe o valor do desconto')
      return
    }
    addCoupon({
      code: draft.code,
      type: draft.type,
      value,
      maxUses: draft.maxUses ? Number(draft.maxUses.replace(/\D/g, '')) : null,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
    })
    setDraft({ code: '', type: 'percent', value: '', maxUses: '', expiresAt: '' })
    setOpen(false)
    toast('Cupom criado')
  }

  const active = coupons.filter((c) => c.active)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cupons" value={num(coupons.length)} hint="cadastrados neste servidor" />
        <StatCard label="Ativos" value={num(active.length)} hint="válidos no checkout" />
        <StatCard label="Com limite de uso" value={num(coupons.filter((c) => c.maxUses).length)} />
        <StatCard
          label="Usos registrados"
          value="—"
          hint="contabilizado pela API quando o bot processar cupons"
          muted
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-[15px] uppercase tracking-tight text-white">Cupons</h2>
          <p className="mt-1 text-[11.5px] text-ink-400">Descontos que o bot aplica no checkout.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={13} /> Criar cupom
        </button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={<TicketPercent size={16} />}
          title="Nenhum cupom criado"
          hint="Crie um código de desconto percentual ou de valor fixo. O bot vai validar quando a API estiver conectada."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={13} /> Criar cupom
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`group relative overflow-hidden border p-4 transition-all ${
                c.active ? 'border-ink-700 bg-ink-900/60 hover:border-white' : 'border-ink-800 bg-ink-950/60 opacity-60'
              }`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rotate-45 border border-ink-800" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="shrink-0 text-ink-500" />
                    <span className="truncate font-mono text-[13.5px] font-bold tracking-[0.06em] text-white">{c.code}</span>
                  </div>
                  <p className="mt-1 font-display text-[22px] leading-none text-white">
                    {c.type === 'percent' ? `${c.value}%` : `R$ ${c.value.toFixed(2).replace('.', ',')}`}
                  </p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                    {c.type === 'percent' ? 'percentual' : 'valor fixo'}
                  </p>
                </div>
                <Switch
                  checked={c.active}
                  onChange={(v) => {
                    updateCoupon(c.id, { active: v })
                    toast(v ? 'Cupom ativado' : 'Cupom desativado')
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-ink-400">
                <span>{c.maxUses ? `limite ${num(c.maxUses)} usos` : 'sem limite de usos'}</span>
                <span>{c.expiresAt ? `até ${dateShort(c.expiresAt)}` : 'sem validade'}</span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-ink-800 pt-2.5">
                <CopyButton value={c.code} label="copiar" />
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-ink-600">
                  {c.active ? 'ativo' : 'inativo'}
                </span>
                <button
                  className="p-1 text-ink-600 transition-colors hover:text-white"
                  aria-label="Remover cupom"
                  onClick={() => setConfirmDelete(c.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title="Regras de desconto"
          subtitle="o que o bot precisa validar no checkout"
          icon={<TicketPercent size={14} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-ink-800 bg-ink-900/50">
                <th className="th">Regra</th>
                <th className="th">Descrição</th>
                <th className="th">Implementação</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Um cupom por pedido', 'Não acumular dois códigos no mesmo checkout.', 'pendente no bot'],
                ['Limite por cliente', 'Definir quantas vezes o mesmo cliente pode usar.', 'pendente no bot'],
                ['Cupom expirado', 'Bloquear automaticamente após a data final.', 'pendente no bot'],
                ['Produto em promoção', 'Definir se cupom acumula com preço promocional.', 'pendente no bot'],
              ].map(([rule, desc, status]) => (
                <tr key={rule} className="border-b border-ink-800/70">
                  <td className="td text-white">{rule}</td>
                  <td className="td whitespace-normal text-ink-400">{desc}</td>
                  <td className="td">
                    <span className="tag border-ink-600 text-ink-400">{status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Criar cupom"
        eyebrow="checkout"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={submit}>
              Criar cupom
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">Código</label>
            <input
              className="field font-mono uppercase"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
              placeholder="BLACKFRIDAY"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select
                className="field"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as 'percent' | 'fixed' })}
              >
                <option value="percent" className="bg-ink-900">
                  Percentual (%)
                </option>
                <option value="fixed" className="bg-ink-900">
                  Valor fixo (R$)
                </option>
              </select>
            </div>
            <div>
              <label className="label">Desconto</label>
              <input
                className="field"
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                placeholder={draft.type === 'percent' ? '15' : '10,00'}
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Limite de usos</label>
              <input
                className="field"
                value={draft.maxUses}
                onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })}
                placeholder="ilimitado"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label">Validade</label>
              <input
                type="date"
                className="field"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remover cupom"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (confirmDelete) removeCoupon(confirmDelete)
                setConfirmDelete(null)
                toast('Cupom removido')
              }}
            >
              Remover
            </button>
          </>
        }
      >
        <p className="text-[12.5px] text-ink-300">O código deixa de ser válido no checkout.</p>
      </Modal>
      {toastNode}
    </div>
  )
}
