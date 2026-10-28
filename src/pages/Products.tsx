import { useState } from 'react'
import { Package, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react'
import { Card, CardHeader, CopyButton, EmptyState, Meter, Modal, StatCard, Switch, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import type { Product, ProductCategory } from '@/lib/store'
import { brl, num, parseMoney } from '@/lib/format'

const categories: ProductCategory[] = ['Assinaturas', 'Contas', 'Boosts', 'Scripts', 'Outros']

const emptyDraft = {
  name: '',
  description: '',
  category: 'Assinaturas' as ProductCategory,
  price: '',
  stock: '',
  autoDelivery: true,
}

export default function Products() {
  const { products, addProduct, updateProduct, removeProduct, metrics } = useGuild()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const { toast, toastNode } = useToast()

  const filtered = products.filter((p) =>
    `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q.toLowerCase()),
  )
  const soldById = new Map(metrics.productRevenue.map((p) => [p.id, p]))

  const openNew = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setDraft({
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price.toFixed(2).replace('.', ','),
      stock: String(p.stock),
      autoDelivery: p.autoDelivery,
    })
    setOpen(true)
  }

  const submit = () => {
    if (!draft.name.trim()) {
      toast('Dê um nome ao produto')
      return
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      price: parseMoney(draft.price),
      stock: Number(draft.stock.replace(/\D/g, '')) || 0,
      autoDelivery: draft.autoDelivery,
    }
    if (editing) {
      updateProduct(editing.id, payload)
      toast('Produto atualizado')
    } else {
      addProduct(payload)
      toast('Produto cadastrado')
    }
    setOpen(false)
  }

  const totalStock = products.reduce((s, p) => s + p.stock, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos" value={num(products.length)} hint={products.length ? 'cadastrados neste servidor' : 'cadastre o primeiro'} />
        <StatCard label="Ativos" value={num(products.filter((p) => p.active).length)} hint="visíveis no bot" />
        <StatCard label="Unidades em estoque" value={num(totalStock)} hint="soma dos produtos" />
        <StatCard label="Com entrega automática" value={num(products.filter((p) => p.autoDelivery).length)} hint="envio no DM" />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" className="field pl-9" />
          </div>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={13} /> Novo produto
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Package size={16} />}
              title={products.length ? 'Nenhum produto com esse nome' : 'Nenhum produto cadastrado'}
              hint={
                products.length
                  ? 'Tente outro termo de busca.'
                  : 'Cadastre o que você vende: nome, preço, estoque e se a entrega é automática. Fica salvo neste servidor.'
              }
              action={
                products.length ? undefined : (
                  <button className="btn-primary" onClick={openNew}>
                    <Plus size={13} /> Cadastrar produto
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const sold = soldById.get(p.id)
              return (
                <div key={p.id} className="group relative border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium leading-tight text-white">{p.name}</p>
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                        {p.category} · {p.id}
                      </p>
                    </div>
                    <Switch
                      checked={p.active}
                      onChange={(v) => {
                        updateProduct(p.id, { active: v })
                        toast(v ? 'Produto ativado' : 'Produto pausado')
                      }}
                    />
                  </div>

                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-400">{p.description}</p>
                  )}

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="font-display text-[20px] leading-none text-white">{brl(p.price)}</p>
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                        {sold && sold.sold > 0 ? `${num(sold.sold)} vendidos` : 'sem vendas ainda'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[11.5px] text-ink-200">{p.stock > 0 ? num(p.stock) : '0'}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-600">estoque</p>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Meter value={Math.min(p.stock, 100)} max={100} />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-ink-800 pt-2.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
                    >
                      <Pencil size={9} /> editar
                    </button>
                    <CopyButton value={p.id} label="id" />
                    {p.autoDelivery && (
                      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
                        <Zap size={9} /> auto
                      </span>
                    )}
                    <button
                      className="ml-auto p-1 text-ink-600 transition-colors hover:text-white"
                      aria-label="Remover produto"
                      onClick={() => setConfirmDelete(p)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Como o bot entrega"
          subtitle="configuração aplicada por produto"
          icon={<Package size={14} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-ink-800 bg-ink-900/50">
                <th className="th">Produto</th>
                <th className="th">Categoria</th>
                <th className="th">Preço</th>
                <th className="th">Estoque</th>
                <th className="th">Entrega</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-ink-500">
                    Sem produtos cadastrados.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink-800/70 hover:bg-ink-850/60">
                  <td className="td text-white">{p.name}</td>
                  <td className="td font-mono text-[11px] text-ink-400">{p.category}</td>
                  <td className="td font-mono">{brl(p.price)}</td>
                  <td className="td font-mono">{num(p.stock)}</td>
                  <td className="td">
                    <span className={`tag ${p.autoDelivery ? 'border-white bg-white text-black' : 'border-ink-600 text-ink-300'}`}>
                      {p.autoDelivery ? 'automática' : 'manual'}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`tag ${p.active ? 'border-ink-500 text-white' : 'border-ink-700 text-ink-500'}`}>
                      {p.active ? 'ativo' : 'pausado'}
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
        title={editing ? 'Editar produto' : 'Novo produto'}
        eyebrow={editing ? editing.id : 'catálogo'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={submit}>
              {editing ? 'Salvar alterações' : 'Cadastrar'}
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
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea
              className="field min-h-[70px] resize-y"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="O que o cliente recebe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select
                className="field"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as ProductCategory })}
              >
                {categories.map((c) => (
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
            <label className="label">Estoque</label>
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

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remover produto"
        eyebrow={confirmDelete?.id}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (confirmDelete) removeProduct(confirmDelete.id)
                setConfirmDelete(null)
                toast('Produto removido')
              }}
            >
              Remover
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-300">
          Tem certeza que deseja remover <span className="text-white">{confirmDelete?.name}</span>? O histórico de
          vendas na API não é afetado.
        </p>
      </Modal>
      {toastNode}
    </div>
  )
}
