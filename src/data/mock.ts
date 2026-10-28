export type SaleStatus = 'pago' | 'pendente' | 'reembolsado' | 'cancelado' | 'expirado'
export type PaymentMethod = 'pix' | 'cartao' | 'crypto' | 'saldo'
export type TicketStatus = 'aberto' | 'aguardando' | 'resolvido'

export interface Sale {
  id: string
  product: string
  productId: string
  customer: string
  discordId: string
  avatarHue: number
  amount: number
  method: PaymentMethod
  status: SaleStatus
  coupon?: string
  createdAt: string
  ticketId?: string
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  sold: number
  deliveries: number
  active: boolean
  autoDelivery: boolean
  revenue: number
  emoji: string
}

export interface Customer {
  id: string
  name: string
  discordTag: string
  joinedAt: string
  orders: number
  spent: number
  lastOrder: string
  tier: 'novo' | 'recorrente' | 'vip'
  banned: boolean
}

export interface Coupon {
  code: string
  discount: string
  type: 'percent' | 'fixed'
  uses: number
  maxUses: number | null
  active: boolean
  expiresAt: string | null
}

export interface Ticket {
  id: string
  customer: string
  subject: string
  product: string
  status: TicketStatus
  openedAt: string
  lastMessage: string
  assignee: string | null
  priority: 'baixa' | 'media' | 'alta'
}

export interface Integration {
  id: string
  name: string
  description: string
  category: 'discord' | 'pagamento' | 'dados' | 'infra'
  status: 'conectado' | 'pendente' | 'desconectado'
  envKeys: string[]
  docs: string
  required: boolean
}

/* ------------------------------------------------------------------ */
/* Série temporal (últimos 30 dias)                                    */
/* ------------------------------------------------------------------ */
export const revenueSeries = Array.from({ length: 30 }, (_, i) => {
  const day = 30 - i
  const wave = Math.sin(i / 3.1) * 900 + Math.cos(i / 1.7) * 380
  const trend = i * 118
  const base = 2400 + wave + trend
  return {
    label: `${day}d`,
    receita: Math.max(600, Math.round(base)),
    pedidos: Math.max(3, Math.round(base / 96)),
  }
})

export const methodSplit = [
  { name: 'Pix', value: 58 },
  { name: 'Cartão', value: 29 },
  { name: 'Cripto', value: 9 },
  { name: 'Saldo', value: 4 },
]

export const categorySplit = [
  { name: 'Assinaturas', value: 44 },
  { name: 'Contas', value: 27 },
  { name: 'Boosts', value: 18 },
  { name: 'Scripts', value: 11 },
]

export const products: Product[] = [
  {
    id: 'PRD-001',
    name: 'Nitro Full 1 Mês',
    category: 'Assinaturas',
    price: 34.9,
    stock: 128,
    sold: 942,
    deliveries: 942,
    active: true,
    autoDelivery: true,
    revenue: 32877.8,
    emoji: '⚡',
  },
  {
    id: 'PRD-002',
    name: 'Boost Server x14',
    category: 'Boosts',
    price: 89.9,
    stock: 42,
    sold: 312,
    deliveries: 310,
    active: true,
    autoDelivery: true,
    revenue: 28048.8,
    emoji: '🚀',
  },
  {
    id: 'PRD-003',
    name: 'Conta Steam Premium',
    category: 'Contas',
    price: 149.9,
    stock: 7,
    sold: 96,
    deliveries: 91,
    active: true,
    autoDelivery: false,
    revenue: 14390.4,
    emoji: '🎮',
  },
  {
    id: 'PRD-004',
    name: 'Bot Custom — Setup',
    category: 'Scripts',
    price: 499.0,
    stock: 999,
    sold: 18,
    deliveries: 16,
    active: true,
    autoDelivery: false,
    revenue: 8982.0,
    emoji: '🤖',
  },
  {
    id: 'PRD-005',
    name: 'Nitro Basic 1 Mês',
    category: 'Assinaturas',
    price: 12.9,
    stock: 240,
    sold: 1284,
    deliveries: 1284,
    active: true,
    autoDelivery: true,
    revenue: 16563.6,
    emoji: '💠',
  },
  {
    id: 'PRD-006',
    name: 'Pacote 50 Contas Alt',
    category: 'Contas',
    price: 79.9,
    stock: 0,
    sold: 54,
    deliveries: 54,
    active: false,
    autoDelivery: true,
    revenue: 4314.6,
    emoji: '📦',
  },
]

const names = [
  'Lucas Ferreira',
  'Ana Beatriz',
  'Pedro Henrique',
  'Marina Souza',
  'Gabriel Rocha',
  'Julia Martins',
  'Rafael Alves',
  'Isabela Lima',
  'Thiago Nunes',
  'Camila Prado',
  'Vitor Hugo',
  'Larissa Dias',
  'Bruno Carvalho',
  'Helena Castro',
  'Diego Moreira',
  'Sofia Ribeiro',
  'Matheus Barros',
  'Yasmin Costa',
]

const statuses: SaleStatus[] = ['pago', 'pago', 'pago', 'pendente', 'pago', 'reembolsado', 'expirado', 'pago', 'cancelado']
const methods: PaymentMethod[] = ['pix', 'pix', 'cartao', 'pix', 'crypto', 'cartao', 'pix', 'saldo']

export const sales: Sale[] = Array.from({ length: 46 }, (_, i) => {
  const p = products[i % products.length]
  const n = names[i % names.length]
  const created = new Date(Date.UTC(2026, 9, 28, 14, 32) - i * 1000 * 60 * (37 + (i % 11) * 9))
  return {
    id: `NP-${(10428 - i).toString()}`,
    product: p.name,
    productId: p.id,
    customer: n,
    discordId: `${170000000000000000n + BigInt(i * 17713)}`.slice(0, 18),
    avatarHue: (i * 47) % 360,
    amount: p.price,
    method: methods[i % methods.length],
    status: statuses[i % statuses.length],
    coupon: i % 6 === 0 ? 'NESSPAY10' : undefined,
    createdAt: created.toISOString(),
    ticketId: i % 5 === 0 ? `TCK-${880 - i}` : undefined,
  }
})

export const customers: Customer[] = names.map((name, i) => {
  const orders = [1, 3, 8, 2, 14, 1, 5, 22, 4, 2, 7, 1, 11, 3, 6, 2, 9, 1][i]
  const spent = orders * [34.9, 89.9, 149.9, 12.9][i % 4] * (1 + (i % 3) * 0.12)
  return {
    id: `CUS-${1200 + i}`,
    name,
    discordTag: `${name.split(' ')[0].toLowerCase()}_${100 + i}`,
    joinedAt: new Date(Date.UTC(2025, (i * 3) % 12, ((i * 7) % 27) + 1)).toISOString(),
    orders,
    spent: Math.round(spent * 100) / 100,
    lastOrder: new Date(Date.UTC(2026, 9, 28 - (i % 20))).toISOString(),
    tier: orders >= 10 ? 'vip' : orders >= 4 ? 'recorrente' : 'novo',
    banned: i === 16,
  }
})

export const coupons: Coupon[] = [
  { code: 'NESSPAY10', discount: '10%', type: 'percent', uses: 218, maxUses: null, active: true, expiresAt: null },
  { code: 'BLACK50', discount: '50%', type: 'percent', uses: 87, maxUses: 100, active: true, expiresAt: '2026-11-30T23:59:59Z' },
  { code: 'BEMVINDO', discount: 'R$ 15', type: 'fixed', uses: 412, maxUses: null, active: true, expiresAt: null },
  { code: 'VIP20', discount: '20%', type: 'percent', uses: 34, maxUses: 50, active: true, expiresAt: '2026-12-15T23:59:59Z' },
  { code: 'PROMO2025', discount: '30%', type: 'percent', uses: 100, maxUses: 100, active: false, expiresAt: '2026-01-10T23:59:59Z' },
  { code: 'AFILIADO5', discount: 'R$ 5', type: 'fixed', uses: 61, maxUses: 500, active: true, expiresAt: null },
]

export const tickets: Ticket[] = [
  {
    id: 'TCK-880',
    customer: 'Lucas Ferreira',
    subject: 'Não recebi o produto',
    product: 'Nitro Full 1 Mês',
    status: 'aberto',
    openedAt: new Date(Date.UTC(2026, 9, 28, 13, 12)).toISOString(),
    lastMessage: 'paguei no pix e até agora nada no privado 😥',
    assignee: null,
    priority: 'alta',
  },
  {
    id: 'TCK-879',
    customer: 'Marina Souza',
    subject: 'Dúvida sobre boost',
    product: 'Boost Server x14',
    status: 'aguardando',
    openedAt: new Date(Date.UTC(2026, 9, 28, 11, 40)).toISOString(),
    lastMessage: 'demora quanto tempo pra cair?',
    assignee: 'Ness',
    priority: 'media',
  },
  {
    id: 'TCK-878',
    customer: 'Rafael Alves',
    subject: 'Pedido de reembolso',
    product: 'Conta Steam Premium',
    status: 'aberto',
    openedAt: new Date(Date.UTC(2026, 9, 28, 9, 5)).toISOString(),
    lastMessage: 'a conta veio com senha trocada',
    assignee: null,
    priority: 'alta',
  },
  {
    id: 'TCK-877',
    customer: 'Julia Martins',
    subject: 'Cupom não aplicou',
    product: 'Nitro Basic 1 Mês',
    status: 'resolvido',
    openedAt: new Date(Date.UTC(2026, 9, 27, 22, 18)).toISOString(),
    lastMessage: 'aplicado manualmente, obrigado!',
    assignee: 'Ness',
    priority: 'baixa',
  },
  {
    id: 'TCK-876',
    customer: 'Diego Moreira',
    subject: 'Erro no comando /pagar',
    product: 'Bot Custom — Setup',
    status: 'aguardando',
    openedAt: new Date(Date.UTC(2026, 9, 27, 18, 44)).toISOString(),
    lastMessage: 'o bot respondeu "interação falhou"',
    assignee: 'Suporte 02',
    priority: 'media',
  },
  {
    id: 'TCK-875',
    customer: 'Helena Castro',
    subject: 'Segunda via do produto',
    product: 'Nitro Full 1 Mês',
    status: 'resolvido',
    openedAt: new Date(Date.UTC(2026, 9, 27, 15, 2)).toISOString(),
    lastMessage: 'reenviado com sucesso',
    assignee: 'Ness',
    priority: 'baixa',
  },
]

export const integrations: Integration[] = [
  {
    id: 'discord-bot',
    name: 'Discord Bot',
    description: 'Token do bot, ID do servidor e permissões de leitura de mensagens.',
    category: 'discord',
    status: 'pendente',
    envKeys: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'],
    docs: 'https://discord.com/developers/applications',
    required: true,
  },
  {
    id: 'discord-oauth',
    name: 'Discord OAuth2 (login)',
    description: 'Login do painel com a conta Discord + verificação de cargo de staff.',
    category: 'discord',
    status: 'pendente',
    envKeys: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'],
    docs: 'https://discord.com/developers/docs/topics/oauth2',
    required: true,
  },
  {
    id: 'mercado-pago',
    name: 'Mercado Pago / Pix',
    description: 'Geração de cobranças Pix, cartão e confirmação automática de pagamento.',
    category: 'pagamento',
    status: 'desconectado',
    envKeys: ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET'],
    docs: 'https://www.mercadopago.com.br/developers',
    required: true,
  },
  {
    id: 'stripe',
    name: 'Stripe (cartão internacional)',
    description: 'Opcional: cobrança em cartão para clientes fora do Brasil.',
    category: 'pagamento',
    status: 'desconectado',
    envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    docs: 'https://dashboard.stripe.com/apikeys',
    required: false,
  },
  {
    id: 'supabase',
    name: 'Supabase (banco + auth)',
    description: 'Produtos, pedidos, cupons, tickets e histórico de entregas.',
    category: 'dados',
    status: 'conectado',
    envKeys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    docs: 'https://supabase.com/dashboard',
    required: true,
  },
  {
    id: 'webhooks',
    name: 'Webhook Endpoint',
    description: 'Endpoint público que recebe a confirmação do gateway e libera a entrega.',
    category: 'infra',
    status: 'pendente',
    envKeys: ['PUBLIC_WEBHOOK_URL'],
    docs: '/docs/webhooks',
    required: true,
  },
  {
    id: 'logging',
    name: 'Canal de logs Discord',
    description: 'Webhook do canal onde cada venda e cada erro é registrado.',
    category: 'discord',
    status: 'pendente',
    envKeys: ['DISCORD_LOG_WEBHOOK'],
    docs: 'https://support.discord.com/hc/articles/228383668',
    required: false,
  },
  {
    id: 'email',
    name: 'Resend (e-mail)',
    description: 'Envio de recibo e entrega por e-mail além do DM.',
    category: 'infra',
    status: 'desconectado',
    envKeys: ['RESEND_API_KEY'],
    docs: 'https://resend.com/api-keys',
    required: false,
  },
]

export const activity = [
  { time: 'agora', text: 'Nova venda NP-10428 · Nitro Full 1 Mês · Pix', kind: 'sale' as const },
  { time: '2 min', text: 'Entrega automática concluída para lucas_100', kind: 'delivery' as const },
  { time: '9 min', text: 'Ticket TCK-880 aberto por Lucas Ferreira', kind: 'ticket' as const },
  { time: '24 min', text: 'Cupom NESSPAY10 usado no pedido NP-10421', kind: 'coupon' as const },
  { time: '41 min', text: 'Estoque de "Pacote 50 Contas Alt" esgotado', kind: 'alert' as const },
  { time: '1 h', text: 'Reembolso aprovado em NP-10403', kind: 'refund' as const },
  { time: '2 h', text: 'Bot reconectado ao gateway do Discord', kind: 'system' as const },
]

export const botStatus = {
  online: true,
  ping: 38,
  uptime: '12d 4h 51m',
  guilds: 3,
  shards: 2,
  version: 'v2.4.1',
  commandsToday: 1284,
}
