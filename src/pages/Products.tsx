import { useState } from 'react'
import { Boxes, Plus, Search, Trash2, Zap } from 'lucide-react'
import { Card, CardHeader, CopyButton, Meter, Modal, StatCard, Switch, useToast } from '@/components/ui'
import { products as seed, type Product } from '@/data/mock'
import { brl, compactBrl, num } from '@/lib/format'

export default function Products() {
  const [items, setItems] = useState<Product[]>(seed)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { toast, toastNode } = useToast()
  const [draft, setDraft] = useState({ name: '', category: 'Assinaturas', price: '', stock: '', autoDelivery: true })

  const filtered = items.filter((p) => `${p.name} ${p.category} ${p.id}`.toLowerCase().includes(q.toLowerCase()))
  const revenue = items.reduce((s, p) => s + p.revenue, 0)

  const addProduct = () => {
    if (!draft.name || !draft.price) return
    const p: Product = {
      id: `PRD-${String(items.length + 1).padStart(3, '0')}`,
      name: draft.name,
      category: draft.category,
      price: Number(draft.price),
      stock: Number(draft.stock) || 0,
      sold: 0,
      deliveries: 0,
      active: true,
      autoDelivery: draft.autoDelivery,
      revenue: 0,
      emoji: '🆕',
    }
    setItems([p, ...items])
    setOpen(false)
    setDraft({ name: '', category: 'Assinaturas', price: '', stock: '', autoDelivery: true })
    toast('Produto criado (demonstração)')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos ativos" value={num(items.filter((p) => p.active).length)} hint={`${items.length} no total`} />
        <StatCard label="Receita do catálogo" value={compactBrl(revenue)} delta={6.4} />
        <StatCard label="Entregas automáticas" value={num(items.filter((p) => p.autoDelivery).length)} hint="sem intervenção" />
        <StatCard
          label="Sem estoque"
          value={num(items.filter((p) => p.stock === 0).length)}
          hint="repor agora"
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" className="field pl-9" />
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={13} /> Novo produto
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="group relative border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center border border-ink-600 bg-black text-[15px]">
                    {p.emoji}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium leading-tight text-white">{p.name}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                      {p.id} · {p.category}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={p.active}
                  onChange={(v) => {
                    setItems(items.map((x) => (x.id === p.id ? { ...x, active: v } : x)))
                    toast(v ? 'Produto ativado' : 'Produto pausado')
                  }}
                />
              </div>

              <div className="mt-3.5 flex items-end justify-between">
                <div>
                  <p className="font-display text-[24px] leading-none text-white">{brl(p.price)}</p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                    {num(p.sold)} vendidos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[12px] text-ink-200">{compactBrl(p.revenue)}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-600">receita</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.1em]">
                  <span className={p.stock === 0 ? 'text-white' : 'text-ink-500'}>
                    {p.stock === 0 ? 'esgotado' : `${num(p.stock)} em estoque`}
                  </span>
                  {p.autoDelivery ? (
                    <span className="flex items-center gap-1 text-ink-300">
                      <Zap size={9} /> auto
                    </span>
                  ) : (
                    <span className="text-ink-600">manual</span>
                  )}
                </div>
                <Meter value={Math.min(p.stock, 200)} max={200} />
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-ink-800 pt-2.5">
                <CopyButton value={p.id} label="copiar id" />
                <button
                  className="border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-400 transition-colors hover:border-white hover:text-white"
                  onClick={() => toast('Editor de produto em breve')}
                >
                  editar
                </button>
                <button
                  className="ml-auto p-1 text-ink-600 transition-colors hover:text-white"
                  aria-label="Remover"
                  onClick={() => {
                    setItems(items.filter((x) => x.id !== p.id))
                    toast('Produto removido')
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Estoque e entregas"
          subtitle="produtos com entrega manual precisam de atenção do staff"
          icon={<Boxes size={14} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-ink-800 bg-ink-900/50">
                <th className="th">Produto</th>
                <th className="th">Vendidos</th>
                <th className="th">Entregues</th>
                <th className="th">Fila pendente</th>
                <th className="th">Estoque</th>
                <th className="th">Modo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-ink-800/70 hover:bg-ink-850/60">
                  <td className="td text-white">{p.name}</td>
                  <td className="td font-mono">{num(p.sold)}</td>
                  <td className="td font-mono">{num(p.deliveries)}</td>
                  <td className="td font-mono">
                    <span className={p.sold - p.deliveries > 0 ? 'text-white' : 'text-ink-500'}>
                      {num(Math.max(0, p.sold - p.deliveries))}
                    </span>
                  </td>
                  <td className="td font-mono">{p.stock === 0 ? <span className="text-white">0</span> : num(p.stock)}</td>
                  <td className="td">
                    <span className={`tag ${p.autoDelivery ? 'border-white bg-white text-black' : 'border-ink-600 text-ink-300'}`}>
                      {p.autoDelivery ? 'automático' : 'manual'}
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
        title="Novo produto"
        eyebrow="catálogo"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={addProduct}>
              Criar produto
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">Nome do produto</label>
            <input
              className="field"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex.: Nitro Full 1 Mês"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select
                className="field"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {['Assinaturas', 'Contas', 'Boosts', 'Scripts'].map((c) => (
                  <option key={c} className="bg-ink-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Preço (R$)</label>
              <input
                className="field"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="34,90"
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label className="label">Estoque inicial</label>
            <input
              className="field"
              value={draft.stock}
              onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
              placeholder="100"
              inputMode="numeric"
            />
          </div>
          <div className="flex items-center justify-between border border-ink-700 px-3 py-2.5">
            <div>
              <p className="text-[12.5px] text-white">Entrega automática</p>
              <p className="text-[11px] text-ink-500">Envia o produto no DM assim que o pagamento cai</p>
            </div>
            <Switch checked={draft.autoDelivery} onChange={(v) => setDraft({ ...draft, autoDelivery: v })} />
          </div>
        </div>
      </Modal>
      {toastNode}
    </div>
  )
}
