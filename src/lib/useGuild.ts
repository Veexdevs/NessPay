import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useSession } from './session'
import { computeMetrics } from './metrics'
import { Order, Ticket, useApiResource, useGuildStore } from './store'

/**
 * Contexto do servidor selecionado.
 * - produtos/cupons/configurações: salvos localmente por servidor
 * - pedidos/tickets: vêm da API do bot (vazios até ela existir)
 */
export function useGuild() {
  const { guildId } = useParams<{ guildId: string }>()
  const { guilds, user } = useSession()

  const guild = guilds.find((g) => g.id === guildId) ?? null
  const store = useGuildStore(guildId)
  const orders = useApiResource<Order>('/orders', guildId)
  const tickets = useApiResource<Ticket>('/tickets', guildId)

  const metrics = useMemo(() => computeMetrics(orders.data, store.products), [orders.data, store.products])

  return {
    guildId: guildId ?? '',
    guild,
    user,
    orders,
    tickets,
    metrics,
    ...store,
  }
}
