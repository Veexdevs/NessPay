const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const API_BASE = RAW_BASE || (import.meta.env.DEV ? '/api' : '')
const API_KEY = (import.meta.env.VITE_API_KEY ?? '').trim()

export const apiConfigured = () => API_BASE.length > 0

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new ApiError('API não configurada', 0)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } })
  } catch {
    throw new ApiError('Não foi possível alcançar a API do bot', 0)
  }
  if (!response.ok) {
    let detail = `API respondeu ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      detail = `API respondeu ${response.status}`
    }
    throw new ApiError(detail, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export interface ApiOrder {
  id: string
  productId: string
  productName: string
  customerName: string
  customerId: string
  amount: number
  method: string
  status: string
  coupon?: string | null
  createdAt: string
  delivered: boolean
  deliveryMode: string
  guildId: string
}

export interface ApiTicket {
  id: string
  customerName: string
  subject: string
  productName: string | null
  status: string
  priority: string
  createdAt: string
  lastMessage: string
  guildId: string
}

export interface ApiProduct {
  id: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  sold: number
  autoDelivery: boolean
  deliveryMode: 'auto' | 'manual'
  active: boolean
  createdAt: string
}

export interface ApiCoupon {
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

export interface ApiSettings {
  prefix: string
  currency: string
  salesChannel: string
  logsChannel: string
  dmDelivery: boolean
  autoRefund: boolean
  antiFraud: boolean
  maintenance: boolean
  cartTimeout: number
}

export interface ApiHealth {
  ok: boolean
  bot: { ready: boolean; user: string | null; latency_ms: number | null; guilds: number; uptime_seconds: number }
  gateway: { enabled: boolean; webhook: boolean }
  auth: boolean
}

export interface ApiLicenseCheck {
  valid: boolean
  reason: string | null
  message: string
  key: string | null
  expiresAt: string | null
  days: number | null
}

export interface ApiLicense {
  key: string
  userId: string
  days: number
  note: string
  active: boolean
  revoked: boolean
  createdAt: string
  expiresAt: string
}

export interface ApiCustomer {
  id: string
  name: string
  orders: number
  spent: number
  firstOrder: string
  lastOrder: string
}

export const api = {
  health: () => request<ApiHealth>('/health'),
  stats: (guild: string) => request<Record<string, unknown>>(`/stats${q({ guild })}`),
  orders: (guild: string, limit = 200) => request<ApiOrder[]>(`/orders${q({ guild, limit })}`),
  confirmOrder: (id: string) => request<ApiOrder>(`/orders/${id}/confirm`, { method: 'POST' }),
  refundOrder: (id: string) => request<ApiOrder>(`/orders/${id}/refund`, { method: 'POST' }),
  tickets: (guild: string) => request<ApiTicket[]>(`/tickets${q({ guild })}`),
  customers: (guild: string) => request<ApiCustomer[]>(`/customers${q({ guild })}`),
  products: (guild: string) => request<ApiProduct[]>(`/products${q({ guild })}`),
  createProduct: (guild: string, body: Record<string, unknown>) =>
    request<ApiProduct>(`/products${q({ guild })}`, { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    request<ApiProduct>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  addStock: (id: string, items: string[]) =>
    request<{ added: number; available: number }>(`/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  coupons: (guild: string) => request<ApiCoupon[]>(`/coupons${q({ guild })}`),
  createCoupon: (guild: string, body: Record<string, unknown>) =>
    request<ApiCoupon>(`/coupons${q({ guild })}`, { method: 'POST', body: JSON.stringify(body) }),
  updateCoupon: (id: string, body: Record<string, unknown>) =>
    request<ApiCoupon>(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCoupon: (id: string) => request<{ ok: boolean }>(`/coupons/${id}`, { method: 'DELETE' }),
  settings: (guild: string) => request<ApiSettings>(`/settings${q({ guild })}`),
  updateSettings: (guild: string, body: Record<string, unknown>) =>
    request<ApiSettings>(`/settings${q({ guild })}`, { method: 'PATCH', body: JSON.stringify(body) }),
  licenses: () => request<ApiLicense[]>('/licenses'),
  createLicense: (body: Record<string, unknown>) =>
    request<{ key: string; userId: string; days: number; expiresAt: string }>('/licenses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revokeLicense: (key: string) => request<{ ok: boolean }>(`/licenses/${encodeURIComponent(key)}/revoke`, { method: 'POST' }),
  extendLicense: (key: string, days: number) =>
    request<{ ok: boolean; expiresAt: string }>(`/licenses/${encodeURIComponent(key)}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),
  verifyLicense: (key: string, userId: string) =>
    request<ApiLicenseCheck>('/license/verify', {
      method: 'POST',
      body: JSON.stringify({ key, userId }),
    }),
}
