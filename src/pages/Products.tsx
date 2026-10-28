import { useState } from 'react'
import { Boxes, Package, Pencil, Plus, Search, Trash2, Truck, Wand2, Zap } from 'lucide-react'
import { Card, CardHeader, CopyButton, EmptyState, Modal, StatCard, Switch, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import type { DeliveryMode, Product, ProductCategory, ProductInput } from '@/lib/store'
import { brl, num, parseMoney } from '@/lib/format'

const categories: ProductCategory[] = ['Assinaturas', 'Contas', 'Boosts', 'Scripts', 'Outros']

const emptyDraft = {
  name: '',
  description: '',
  category: 'Assinaturas' as ProductCategory,
  price: '',
  deliveryMode: 'auto' as DeliveryMode,
}

export default function Products() {
  const { store, reload } = useGuild()
  const { products, source } = store
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [stockFor, setStockFor] = useState<Product | null>(null)
  const [stockText, setStockText] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast, toastNode } = useToast()

  const filtered = products.filter((product) =>
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(q.toLowerCase()),
  )

  const openNew = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setDraft({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toFixed(2).replace('.', ','),
      deliveryMode: product.deliveryMode,
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!draft.name.trim()) {
      toast('Dê um nome ao produto')
      return
    }
    const payload: ProductInput = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      price: parseMoney(draft.price),
      deliveryMode: draft.deliveryMode,
    }
    if (payload.price <= 0) {
      toast('Informe um preço válido')
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await store.updateProduct(editing.id, payload)
        toast('Produto atualizado no bot')
      } else {
        await store.addProduct(payload)
        toast(source === 'api' ? 'Produto criado no bot' : 'Produto salvo localmente')
      }
      setOpen(false)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao salvar')
    } finally {
      setBusy(false)
    }
  }

  const submitStock = async () => {
    if (!stockFor) return
    const items = stockText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (items.length === 0) {
      toast('Adicione pelo menos um item')
      return
    }
    if (source !== 'api') {
      toast('Conecte a API do bot para abastecer o estoque real')
      return
    }
    setBusy(true)
    try {
      const result = await store.addStock(stockFor.id, items)
      toast(`${result.added} itens adicionados - estoque ${result.available}`)
      setStockFor(null)
      setStockText('')
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao abastecer')
    } finally {
      setBusy(false)
    }
  }

  const totalStock = products.reduce((sum, product) => sum + product.stock, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Produtos"
          value={num(products.length)}
          hint={source === 'api' ? 'sincronizados com o bot' : 'somente neste navegador'}
        />
        <StatCard label="Ativos" value={num(products.filter((product) => product.active).length)} hint="visíveis na loja" />
        <StatCard label="Itens em estoque" value={num(totalStock)} hint="entregas automáticas disponíveis" />
        <StatCard
          label="Entrega manual"
          value={num(products.filter((product) => product.deliveryMode === 'manual').length)}
          hint="abrem atendimento"
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-ink-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar produto" className="field pl-9" />
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
                  : source === 'api'
                    ? 'Cadastre o primeiro produto: ele aparece na loja do bot imediatamente.'
                    : 'Sem a API do bot, os produtos ficam só neste navegador e não chegam ao Discord.'
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
            {filtered.map((product) => (
              <div key={product.id} className="group border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight text-white">{product.name}</p>
                    <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                      {product.category} - {product.id}
                    </p>
                  </div>
                  <Switch
                    checked={product.active}
                    onChange={(value) => {
                      void store
                        .updateProduct(product.id, { active: value })
                        .then(() => toast(value ? 'Produto ativado' : 'Produto pausado'))
                        .catch((error: Error) => toast(error.message))
                    }}
                  />
                </div>

                {product.description && (
                  <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-400">{product.description}</p>
                )}

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="font-display text-[20px] leading-none text-white">{brl(product.price)}</p>
                    <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                      {product.sold > 0 ? `${num(product.sold)} vendidos` : 'sem vendas ainda'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-[11.5px] ${product.stock > 0 ? 'text-ink-200' : 'text-ink-500'}`}>
                      {num(product.stock)}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-600">estoque</p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  {product.deliveryMode === 'auto' ? (
                    <span className="tag border-white bg-white text-black">
                      <Zap size={9} /> automática
                    </span>
                  ) : (
                    <span className="tag border-ink-500 text-ink-200">
                      <Truck size={9} /> manual
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-ink-800 pt-2.5">
                  <button
                    onClick={() => openEdit(product)}
                    className="flex items-center gap-1 border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
                  >
                    <Pencil size={9} /> editar
                  </button>
                  <button
                    onClick={() => {
                      setStockFor(product)
                      setStockText('')
                    }}
                    className="flex items-center gap-1 border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
                  >
                    <Boxes size={9} /> estoque
                  </button>
                  <CopyButton value={product.id} label="id" />
                  <button
                    className="ml-auto p-1 text-ink-600 transition-colors hover:text-white"
                    aria-label="Remover produto"
                    onClick={() => setConfirmDelete(product)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Entrega por produto" subtitle="a regra que o bot aplica em cada venda" icon={<Wand2 size={14} />} />
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
              {products.map((product) => (
                <tr key={product.id} className="border-b border-ink-800/70 hover:bg-ink-850/60">
                  <td className="td text-white">{product.name}</td>
                  <td className="td font-mono text-[11px] text-ink-400">{product.category}</td>
                  <td className="td font-mono">{brl(product.price)}</td>
                  <td className="td font-mono">{num(product.stock)}</td>
                  <td className="td">
                    <span
                      className={`tag ${
                        product.deliveryMode === 'auto' ? 'border-white bg-white text-black' : 'border-ink-600 text-ink-300'
                      }`}
                    >
                      {product.deliveryMode === 'auto' ? 'automática' : 'manual'}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`tag ${product.active ? 'border-ink-500 text-white' : 'border-ink-700 text-ink-500'}`}>
                      {product.active ? 'ativo' : 'pausado'}
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
            <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
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
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Nitro Full 1 Mês"
            />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea
              className="field min-h-[70px] resize-y"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="O que o cliente recebe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select
                className="field"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as ProductCategory })}
              >
                {categories.map((category) => (
                  <option key={category} className="bg-ink-900">
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Preço (R$)</label>
              <input
                className="field"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                placeholder="34,90"
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label className="label">Modo de entrega</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['auto', 'Automática', 'consome o estoque e entrega na hora'],
                  ['manual', 'Manual', 'abre atendimento com a equipe'],
                ] as const
              ).map(([value, title, hint]) => (
                <button
                  key={value}
                  onClick={() => setDraft({ ...draft, deliveryMode: value })}
                  className={`border p-2.5 text-left transition-colors ${
                    draft.deliveryMode === value ? 'border-white bg-white text-black' : 'border-ink-700 text-ink-300 hover:border-ink-500'
                  }`}
                >
                  <span className="block text-[12px] font-semibold uppercase tracking-[0.08em]">{title}</span>
                  <span className={`mt-0.5 block text-[10.5px] ${draft.deliveryMode === value ? 'text-ink-700' : 'text-ink-500'}`}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!stockFor}
        onClose={() => setStockFor(null)}
        title="Abastecer estoque"
        eyebrow={stockFor?.name}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setStockFor(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={() => void submitStock()} disabled={busy}>
              Adicionar itens
            </button>
          </>
        }
      >
        <p className="mb-3 text-[11.5px] leading-relaxed text-ink-400">
          Um item por linha. Cada linha é uma entrega automática real, então nunca coloque conteúdo de teste.
        </p>
        <textarea
          className="field min-h-[150px] resize-y font-mono text-[12px]"
          value={stockText}
          onChange={(event) => setStockText(event.target.value)}
          placeholder={'conta1@email.com:senha\nconta2@email.com:senha\nhttps://link-de-acesso'}
        />
        <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-600">
          {stockText.split('\n').filter((line) => line.trim()).length} itens
        </p>
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
                const target = confirmDelete
                setConfirmDelete(null)
                if (!target) return
                void store
                  .removeProduct(target.id)
                  .then(() => toast('Produto removido'))
                  .catch((error: Error) => toast(error.message))
              }}
            >
              Remover
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-300">
          Remover <span className="text-white">{confirmDelete?.name}</span> também apaga o estoque desse produto. O
          histórico de vendas continua registrado.
        </p>
      </Modal>
      {toastNode}
    </div>
  )
}
