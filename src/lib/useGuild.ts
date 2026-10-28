import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSession } from './session'
import { computeMetrics } from './metrics'
import { useGuildStore } from './store'
import { api, apiConfigured, ApiCustomer, ApiOrder, ApiTicket } from './api'

export function useGuild() {
  const { guildId } = useParams<{ guildId: string }>()
  const { guilds, user } = useSession()
  const guild = guilds.find((item) => item.id === guildId) ?? null

  const store = useGuildStore(guildId)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [state, setState] = useState<'not_configured' | 'loading' | 'ready' | 'error'>(
    apiConfigured() ? 'loading' : 'not_configured',
  )
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!apiConfigured() || !guildId) {
      setState('not_configured')
      setOrders([])
      setTickets([])
      setCustomers([])
      return
    }
    setState('loading')
    setError(null)
    try {
      const [orderRows, ticketRows, customerRows] = await Promise.all([
        api.orders(guildId),
        api.tickets(guildId),
        api.customers(guildId),
      ])
      setOrders(orderRows)
      setTickets(ticketRows)
      setCustomers(customerRows)
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar a API')
      setState('error')
    }
  }, [guildId])

  useEffect(() => {
    void reload()
  }, [reload])

  const metrics = useMemo(
    () => computeMetrics(orders, store.products, customers),
    [orders, store.products, customers],
  )

  return {
    guildId: guildId ?? '',
    guild,
    user,
    ...store,
    store,
    orders,
    tickets,
    customers,
    metrics,
    state,
    error,
    reload,
  }
}
