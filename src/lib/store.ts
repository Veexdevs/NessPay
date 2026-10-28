import { useCallback, useEffect, useState } from 'react'
import { api, apiConfigured, ApiCoupon, ApiProduct, ApiSettings, ApiOrder, ApiTicket } from './api'

export type ProductCategory = 'Assinaturas' | 'Contas' | 'Boosts' | 'Scripts' | 'Outros'
export type DeliveryMode = 'auto' | 'manual'

export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  price: number
  stock: number
  sold: number
  autoDelivery: boolean
  deliveryMode: DeliveryMode
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

export type Order = ApiOrder
export type Ticket = ApiTicket
export type OrderStatus = 'pago' | 'pendente' | 'reembolsado' | 'cancelado' | 'expirado'
export type PaymentMethod = 'pix' | 'cartao' | 'crypto' | 'saldo'

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

export interface ProductInput {
  name: string
  description: string
  category: ProductCategory
  price: number
  deliveryMode: DeliveryMode
  active?: boolean
}

export interface CouponInput {
  [key: string]: unknown
  code: string
  type: 'percent' | 'fixed'
  value: number
  maxUses: number | null
  expiresAt: string | null
}

const localKey = (guildId: string) => `nesspay:db:${guildId}`

interface LocalDB {
  products: Product[]
  coupons: Coupon[]
  settings: GuildSettings
}

const emptyLocal = (): LocalDB => ({ products: [], coupons: [], settings: { ...defaultSettings } })

function readLocal(guildId: string): LocalDB {
  try {
    const raw = localStorage.getItem(localKey(guildId))
    if (!raw) return emptyLocal()
    const parsed = JSON.parse(raw) as Partial<LocalDB>
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return emptyLocal()
  }
}

function writeLocal(guildId: string, db: LocalDB) {
  try {
    localStorage.setItem(localKey(guildId), JSON.stringify(db))
  } catch {
    return
  }
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

const mapProduct = (row: ApiProduct): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category as ProductCategory,
  price: row.price,
  stock: row.stock,
  sold: row.sold,
  autoDelivery: row.deliveryMode === 'auto',
  deliveryMode: row.deliveryMode,
  active: row.active,
  createdAt: row.createdAt,
})

const mapCoupon = (row: ApiCoupon): Coupon => ({
  id: row.id,
  code: row.code,
  type: row.type,
  value: row.value,
  maxUses: row.maxUses,
  uses: row.uses,
  active: row.active,
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
})

const mapSettings = (row: ApiSettings): GuildSettings => ({
  prefix: row.prefix,
  currency: row.currency as GuildSettings['currency'],
  salesChannel: row.salesChannel,
  logsChannel: row.logsChannel,
  dmDelivery: row.dmDelivery,
  autoRefund: row.autoRefund,
  antiFraud: row.antiFraud,
  maintenance: row.maintenance,
  cartTimeout: row.cartTimeout,
})

export type Source = 'api' | 'local' | 'loading'

export function useGuildStore(guildId: string | undefined) {
  const remote = apiConfigured() && !!guildId
  const [source, setSource] = useState<Source>(remote ? 'loading' : 'local')
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [settings, setSettings] = useState<GuildSettings>({ ...defaultSettings })

  const loadLocal = useCallback(
    (id: string | undefined) => {
      if (!id) {
        setProducts([])
        setCoupons([])
        setSettings({ ...defaultSettings })
        return
      }
      const local = readLocal(id)
      setProducts(local.products)
      setCoupons(local.coupons)
      setSettings(local.settings)
    },
    [],
  )

  const reload = useCallback(async () => {
    if (!remote || !guildId) {
      setSource('local')
      loadLocal(guildId)
      return
    }
    setError(null)
    try {
      const [productRows, couponRows, settingsRow] = await Promise.all([
        api.products(guildId),
        api.coupons(guildId),
        api.settings(guildId),
      ])
      setProducts(productRows.map(mapProduct))
      setCoupons(couponRows.map(mapCoupon))
      setSettings(mapSettings(settingsRow))
      setSource('api')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao falar com a API')
      setSource('local')
      loadLocal(guildId)
    }
  }, [remote, guildId, loadLocal])

  useEffect(() => {
    void reload()
  }, [reload])

  const commitLocal = (next: Partial<LocalDB>) => {
    if (!guildId) return
    const current: LocalDB = { products, coupons, settings, ...next }
    writeLocal(guildId, current)
  }

  const addProduct = async (input: ProductInput) => {
    if (remote && guildId) {
      await api.createProduct(guildId, {
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        deliveryMode: input.deliveryMode,
        active: true,
      })
      await reload()
      return
    }
    const product: Product = {
      id: uid('PRD'),
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price,
      stock: 0,
      sold: 0,
      autoDelivery: input.deliveryMode === 'auto',
      deliveryMode: input.deliveryMode,
      active: true,
      createdAt: new Date().toISOString(),
    }
    const next = [product, ...products]
    setProducts(next)
    commitLocal({ products: next })
  }

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    if (remote) {
      const current = products.find((product) => product.id === id)
      if (!current) return
      await api.updateProduct(id, {
        name: patch.name ?? current.name,
        description: patch.description ?? current.description,
        category: patch.category ?? current.category,
        price: patch.price ?? current.price,
        deliveryMode: patch.deliveryMode ?? current.deliveryMode,
        active: patch.active ?? current.active,
      })
      await reload()
      return
    }
    const next = products.map((product) => (product.id === id ? { ...product, ...patch } : product))
    setProducts(next)
    commitLocal({ products: next })
  }

  const removeProduct = async (id: string) => {
    if (remote) {
      await api.deleteProduct(id)
      await reload()
      return
    }
    const next = products.filter((product) => product.id !== id)
    setProducts(next)
    commitLocal({ products: next })
  }

  const addStock = async (id: string, items: string[]) => {
    if (remote) {
      const result = await api.addStock(id, items)
      await reload()
      return result
    }
    return { added: 0, available: 0 }
  }

  const addCoupon = async (input: CouponInput) => {
    if (remote && guildId) {
      await api.createCoupon(guildId, { ...input })
      await reload()
      return
    }
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
    const next = [coupon, ...coupons]
    setCoupons(next)
    commitLocal({ coupons: next })
  }

  const updateCoupon = async (id: string, patch: Partial<Coupon>) => {
    if (remote) {
      const current = coupons.find((coupon) => coupon.id === id)
      if (!current) return
      await api.updateCoupon(id, {
        code: patch.code ?? current.code,
        type: patch.type ?? current.type,
        value: patch.value ?? current.value,
        maxUses: patch.maxUses ?? current.maxUses,
        expiresAt: patch.expiresAt ?? current.expiresAt,
        active: patch.active ?? current.active,
      })
      await reload()
      return
    }
    const next = coupons.map((coupon) => (coupon.id === id ? { ...coupon, ...patch } : coupon))
    setCoupons(next)
    commitLocal({ coupons: next })
  }

  const removeCoupon = async (id: string) => {
    if (remote) {
      await api.deleteCoupon(id)
      await reload()
      return
    }
    const next = coupons.filter((coupon) => coupon.id !== id)
    setCoupons(next)
    commitLocal({ coupons: next })
  }

  const updateSettings = async (patch: Partial<GuildSettings>) => {
    if (remote && guildId) {
      await api.updateSettings(guildId, patch)
      await reload()
      return
    }
    const next = { ...settings, ...patch }
    setSettings(next)
    commitLocal({ settings: next })
  }

  return {
    source,
    error,
    reload,
    products,
    coupons,
    settings,
    addProduct,
    updateProduct,
    removeProduct,
    addStock,
    addCoupon,
    updateCoupon,
    removeCoupon,
    updateSettings,
  }
}
