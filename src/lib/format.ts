export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const compactBrl = (v: number) => {
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace('.', ',')}M`
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
  return brl(v)
}

export const num = (v: number) => v.toLocaleString('pt-BR')

export const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m} min atrás`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h atrás`
  const d = Math.round(h / 24)
  return `${d} d atrás`
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

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
  desconectado: 'Desconectado',
}
