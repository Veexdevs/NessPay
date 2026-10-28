import { useState } from 'react'
import { Plus, Tag, TicketPercent } from 'lucide-react'
import { Card, CardHeader, CopyButton, Meter, Modal, StatCard, Switch, useToast } from '@/components/ui'
import { coupons as seed, type Coupon } from '@/data/mock'
import { dateShort, num } from '@/lib/format'

export default function Coupons() {
  const [items, setItems] = useState<Coupon[]>(seed)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ code: '', discount: '', type: 'percent' as 'percent' | 'fixed', maxUses: '' })
  const { toast, toastNode } = useToast()

  const create = () => {
    if (!draft.code || !draft.discount) return
    setItems([
      {
        code: draft.code.toUpperCase(),
        discount: draft.type === 'percent' ? `${draft.discount}%` : `R$ ${draft.discount}`,
        type: draft.type,
        uses: 0,
        maxUses: draft.maxUses ? Number(draft.maxUses) : null,
        active: true,
        expiresAt: null,
      },
      ...items,
    ])
    setOpen(false)
    setDraft({ code: '', discount: '', type: 'percent', maxUses: '' })
    toast('Cupom criado (demonstração)')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cupons ativos" value={num(items.filter((c) => c.active).length)} />
        <StatCard label="Resgates" value={num(items.reduce((s, c) => s + c.uses, 0))} delta={18.2} hint="total" />
        <StatCard label="Mais usado" value={items.reduce((a, b) => (a.uses > b.uses ? a : b)).code} hint="cupom" />
        <StatCard label="Expirados" value={num(items.filter((c) => !c.active).length)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg text-white">CUPONS</h2>
          <p className="mt-1 text-[11.5px] text-ink-400">Descontos aplicáveis no checkout do bot.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={13} /> Criar cupom
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <div
            key={c.code}
            className={`group relative overflow-hidden border p-4 transition-all ${
              c.active ? 'border-ink-700 bg-ink-900/60 hover:border-white' : 'border-ink-800 bg-ink-950/60 opacity-60'
            }`}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rotate-45 border border-ink-800" />
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-ink-500" />
                  <span className="font-mono text-[14px] font-bold tracking-[0.06em] text-white">{c.code}</span>
                </div>
                <p className="mt-1 font-display text-[26px] leading-none text-white">{c.discount}</p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                  {c.type === 'percent' ? 'desconto percentual' : 'desconto fixo'}
                </p>
              </div>
              <Switch
                checked={c.active}
                onChange={(v) => {
                  setItems(items.map((x) => (x.code === c.code ? { ...x, active: v } : x)))
                  toast(v ? 'Cupom ativado' : 'Cupom desativado')
                }}
              />
            </div>

            <div className="mt-3.5">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-ink-400">
                <span>
                  {num(c.uses)} uso{c.uses !== 1 ? 's' : ''}
                  {c.maxUses ? ` / ${num(c.maxUses)}` : ' / ilimitado'}
                </span>
                <span>{c.expiresAt ? `até ${dateShort(c.expiresAt)}` : 'sem validade'}</span>
              </div>
              <Meter value={c.maxUses ? (c.uses / c.maxUses) * 100 : Math.min(c.uses / 5, 100)} />
            </div>

            <div className="mt-3 flex items-center gap-1.5 border-t border-ink-800 pt-2.5">
              <CopyButton value={c.code} label="copiar código" />
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-ink-600">
                {c.active ? 'ativo' : 'inativo'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Regras de desconto"
          subtitle="como o bot valida o cupom no momento da compra"
          icon={<TicketPercent size={14} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-ink-800 bg-ink-900/50">
                <th className="th">Regra</th>
                <th className="th">Descrição</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Um cupom por pedido', 'O bot bloqueia a combinação de dois códigos no mesmo checkout.', true],
                ['Limite por usuário', 'Cada cliente pode usar o mesmo cupom 2 vezes.', true],
                ['Cupom em produto promocional', 'Cupons não acumulam com produtos já em promoção.', true],
                ['Cupom em assinatura recorrente', 'Aplicado apenas na primeira cobrança.', false],
              ].map(([rule, desc, on]) => (
                <tr key={String(rule)} className="border-b border-ink-800/70">
                  <td className="td text-white">{rule}</td>
                  <td className="td whitespace-normal text-ink-400">{desc}</td>
                  <td className="td">
                    <span className={`tag ${on ? 'border-white bg-white text-black' : 'border-ink-600 text-ink-400'}`}>
                      {on ? 'ativa' : 'inativa'}
                    </span>
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
            <button className="btn-primary" onClick={create}>
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
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
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
                value={draft.discount}
                onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                placeholder={draft.type === 'percent' ? '15' : '10'}
                inputMode="numeric"
              />
            </div>
          </div>
          <div>
            <label className="label">Limite de usos (vazio = ilimitado)</label>
            <input
              className="field"
              value={draft.maxUses}
              onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })}
              placeholder="100"
              inputMode="numeric"
            />
          </div>
        </div>
      </Modal>
      {toastNode}
    </div>
  )
}
