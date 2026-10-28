import { PaymentMethod, Product } from './store'
import type { ApiCustomer, ApiOrder } from './api'

export type Order = ApiOrder

export const methodLabel: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  crypto: 'Cripto',
  saldo: 'Saldo',
}

export const statusLabel: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  reembolsado: 'Reembolsado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
  aberto: 'Aberto',
  aguardando: 'Aguardando',
  resolvido: 'Resolvido',
  conectado: 'Conectado',
  pendente_integracao: 'Pendente',
  desconectado: 'Desconectado',
}

export interface DayPoint {
  label: string
  receita: number
  pedidos: number
  date: string
}

export function revenueSeries(orders: Order[], days = 30): DayPoint[] {
  const paid = orders.filter((o) => o.status === 'pago')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const inDay = paid.filter((o) => {
      const t = new Date(o.createdAt).getTime()
      return t >= d.getTime() && t < next.getTime()
    })
    return {
      date: d.toISOString(),
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      receita: inDay.reduce((s, o) => s + o.amount, 0),
      pedidos: inDay.length,
    }
  })
}

export function computeMetrics(
  orders: Order[],
  products: Product[],
  remoteCustomers: ApiCustomer[] = [],
) {
  const paid = orders.filter((o) => o.status === 'pago')
  const revenue = paid.reduce((s, o) => s + o.amount, 0)
  const avgTicket = paid.length ? revenue / paid.length : 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayOrders = paid.filter((o) => new Date(o.createdAt).getTime() >= todayStart.getTime())

  const pending = orders.filter((o) => o.status === 'pendente')
  const refunded = orders.filter((o) => o.status === 'reembolsado')

  const methods = new Map<string, number>()
  paid.forEach((o) => methods.set(o.method, (methods.get(o.method) ?? 0) + 1))
  const methodSplit = [...methods.entries()]
    .map(([k, v]) => ({ name: methodLabel[k], value: Math.round((v / paid.length) * 100) }))
    .sort((a, b) => b.value - a.value)

  const catByProduct = new Map(products.map((p) => [p.id, p.category]))
  const cats = new Map<string, number>()
  paid.forEach((o) => {
    const c = catByProduct.get(o.productId) ?? 'Outros'
    cats.set(c, (cats.get(c) ?? 0) + o.amount)
  })
  const categorySplit = [...cats.entries()]
    .map(([k, v]) => ({ name: k, value: revenue ? Math.round((v / revenue) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)

  const productRevenue = products
    .map((p) => {
      const items = paid.filter((o) => o.productId === p.id)
      return {
        ...p,
        sold: items.length,
        revenue: items.reduce((s, o) => s + o.amount, 0),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const customers = new Map<
    string,
    { id: string; name: string; orders: number; spent: number; lastOrder: string; firstOrder: string }
  >()
  remoteCustomers.forEach((row) => {
    customers.set(row.id, {
      id: row.id,
      name: row.name,
      orders: row.orders,
      spent: row.spent,
      lastOrder: row.lastOrder,
      firstOrder: row.firstOrder,
    })
  })
  if (remoteCustomers.length === 0) paid.forEach((o) => {
    const current = customers.get(o.customerId)
    if (!current) {
      customers.set(o.customerId, {
        id: o.customerId,
        name: o.customerName,
        orders: 1,
        spent: o.amount,
        lastOrder: o.createdAt,
        firstOrder: o.createdAt,
      })
    } else {
      current.orders += 1
      current.spent += o.amount
      if (new Date(o.createdAt) > new Date(current.lastOrder)) current.lastOrder = o.createdAt
      if (new Date(o.createdAt) < new Date(current.firstOrder)) current.firstOrder = o.createdAt
    }
  })

  return {
    revenue,
    paidCount: paid.length,
    orderCount: orders.length,
    avgTicket,
    todayRevenue: todayOrders.reduce((s, o) => s + o.amount, 0),
    todayCount: todayOrders.length,
    pendingCount: pending.length,
    refundedCount: refunded.length,
    refundedValue: refunded.reduce((s, o) => s + o.amount, 0),
    conversion: orders.length ? (paid.length / orders.length) * 100 : 0,
    methodSplit,
    categorySplit,
    productRevenue,
    customers: [...customers.values()].sort((a, b) => b.spent - a.spent),
    series: revenueSeries(orders),
  }
}

export function tierOf(orders: number) {
  if (orders >= 10) return 'vip'
  if (orders >= 3) return 'recorrente'
  return 'novo'
}
