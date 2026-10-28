/**
 * Dados locais por servidor (localStorage).
 * Aqui ficam apenas coisas que VOCÊ cadastra no painel — nada é pré-preenchido.
 * Vendas, clientes e tickets vêm da API quando o bot estiver conectado.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

export type ProductCategory = 'Assinaturas' | 'Contas' | 'Boosts' | 'Scripts' | 'Outros'

export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  price: number
  stock: number
  autoDelivery: boolean
  active: boolean
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  maxUses: number | null
  uses: number
  active: boolean
  expiresAt: string | null
  createdAt: string
}

export type OrderStatus = 'pago' | 'pendente' | 'reembolsado' | 'cancelado' | 'expirado'
export type PaymentMethod = 'pix' | 'cartao' | 'crypto' | 'saldo'

export interface Order {
  id: string
  productId: string
  productName: string
  customerName: string
  customerId: string
  amount: number
  method: PaymentMethod
  status: OrderStatus
  coupon?: string
  createdAt: string
}

export interface Ticket {
  id: string
  customerName: string
  subject: string
  productName: string | null
  status: 'aberto' | 'aguardando' | 'resolvido'
  priority: 'baixa' | 'media' | 'alta'
  createdAt: string
  lastMessage: string
}

export interface GuildSettings {
  prefix: string
  currency: 'BRL' | 'USD' | 'EUR'
  salesChannel: string
  logsChannel: string
  dmDelivery: boolean
  autoRefund: boolean
  antiFraud: boolean
  maintenance: boolean
  cartTimeout: number
}

export interface GuildDB {
  products: Product[]
  coupons: Coupon[]
  settings: GuildSettings
}

export const defaultSettings: GuildSettings = {
  prefix: '/',
  currency: 'BRL',
  salesChannel: '',
  logsChannel: '',
  dmDelivery: true,
  autoRefund: false,
  antiFraud: true,
  maintenance: false,
  cartTimeout: 30,
}

const emptyDB = (): GuildDB => ({ products: [], coupons: [], settings: { ...defaultSettings } })

const dbKey = (guildId: string) => `nesspay:db:${guildId}`

export function loadDB(guildId: string): GuildDB {
  try {
    const raw = localStorage.getItem(dbKey(guildId))
    if (!raw) return emptyDB()
    const parsed = JSON.parse(raw) as Partial<GuildDB>
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return emptyDB()
  }
}

function saveDB(guildId: string, db: GuildDB) {
  try {
    localStorage.setItem(dbKey(guildId), JSON.stringify(db))
  } catch {
    /* ignorado */
  }
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

export function useGuildStore(guildId: string | undefined) {
  const [db, setDb] = useState<GuildDB>(guildId ? loadDB(guildId) : emptyDB())

  useEffect(() => {
    setDb(guildId ? loadDB(guildId) : emptyDB())
  }, [guildId])

  const commit = useCallback(
    (next: GuildDB) => {
      setDb(next)
      if (guildId) saveDB(guildId, next)
    },
    [guildId],
  )

  const actions = useMemo(
    () => ({
      addProduct(input: {
        name: string
        description?: string
        category: ProductCategory
        price: number
        stock: number
        autoDelivery: boolean
      }) {
        const product: Product = {
          id: uid('PRD'),
          name: input.name,
          description: input.description ?? '',
          category: input.category,
          price: input.price,
          stock: input.stock,
          autoDelivery: input.autoDelivery,
          active: true,
          createdAt: new Date().toISOString(),
        }
        commit({ ...db, products: [product, ...db.products] })
        return product
      },
      updateProduct(id: string, patch: Partial<Product>) {
        commit({ ...db, products: db.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
      },
      removeProduct(id: string) {
        commit({ ...db, products: db.products.filter((p) => p.id !== id) })
      },
      addCoupon(input: {
        code: string
        type: 'percent' | 'fixed'
        value: number
        maxUses: number | null
        expiresAt: string | null
      }) {
        const coupon: Coupon = {
          id: uid('CPN'),
          code: input.code.trim().toUpperCase(),
          type: input.type,
          value: input.value,
          maxUses: input.maxUses,
          uses: 0,
          active: true,
          expiresAt: input.expiresAt,
          createdAt: new Date().toISOString(),
        }
        commit({ ...db, coupons: [coupon, ...db.coupons] })
        return coupon
      },
      updateCoupon(id: string, patch: Partial<Coupon>) {
        commit({ ...db, coupons: db.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
      },
      removeCoupon(id: string) {
        commit({ ...db, coupons: db.coupons.filter((c) => c.id !== id) })
      },
      updateSettings(patch: Partial<GuildSettings>) {
        commit({ ...db, settings: { ...db.settings, ...patch } })
      },
    }),
    [commit, db],
  )

  return { ...db, ...actions }
}

/* ------------------------------------------------------------------ */
/* API do bot (ainda não implementada)                                 */
/* ------------------------------------------------------------------ */

export const API_URL = (import.meta.env.VITE_API_URL ?? '').trim()

export type ApiState = 'not_configured' | 'loading' | 'ready' | 'error'

export function useApiResource<T>(path: string, guildId: string | undefined) {
  const [state, setState] = useState<ApiState>(API_URL ? 'loading' : 'not_configured')
  const [data, setData] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!API_URL || !guildId) {
      setState('not_configured')
      setData([])
      return
    }
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`${API_URL}${path}?guild=${encodeURIComponent(guildId)}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`API respondeu ${res.status}`)
      const json = (await res.json()) as T[] | { data: T[] }
      const items = Array.isArray(json) ? json : json.data
      setData(Array.isArray(items) ? items : [])
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar a API')
      setState('error')
      setData([])
    }
  }, [path, guildId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, state, error, reload }
}
