import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Circle,
  Package,
  Plug,
  Receipt,
  ShoppingCart,
  TicketPercent,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Banner, Card, CardHeader, EmptyState, Meter, StatCard, StatusBadge } from '@/components/ui'
import { ChartEmpty, RevenueChart, MethodBars, CategoryDonut } from '@/components/charts'
import { useGuild } from '@/lib/useGuild'
import { useSession } from '@/lib/session'
import { apiConfigured } from '@/lib/api'
import { brl, compactMoney, num, dateTime, relative, methodLabel, statusLabel } from '@/lib/format'

export default function Dashboard() {
  const { guild, guildId, orders, metrics, store, state, error, tickets, customers } = useGuild()
  const { products, coupons, settings, source } = store
  const { keyVerified } = useSession()

  const hasSales = metrics.paidCount > 0
  const hasProducts = products.length > 0
  const apiState = state

  const checklist = [
    {
      done: !!guild,
      label: 'Discord conectado',
      detail: guild ? `servidor: ${guild.name}` : 'faça login com Discord para vincular seus servidores',
      to: '/servidores',
    },
    {
      done: keyVerified,
      label: 'Key de licença informada',
      detail: keyVerified ? 'acesso liberado nesta sessão' : 'informe a Key recebida na compra',
      to: '/chave',
    },
    {
      done: hasProducts,
      label: 'Cadastrar o primeiro produto',
      detail: hasProducts
        ? `${products.length} produto(s) no catálogo do ${source === 'api' ? 'bot' : 'navegador'}`
        : 'sem produtos o bot não tem o que vender',
      to: `/app/${guildId}/produtos`,
    },
    {
      done: apiState === 'ready',
      label: 'API do bot respondendo',
      detail:
        apiState === 'ready'
          ? `${orders.length} pedido(s) e ${tickets.length} ticket(s) lidos do bot`
          : apiState === 'error'
            ? error ?? 'erro ao consultar a API'
            : apiConfigured()
              ? 'aguardando resposta'
              : 'defina VITE_API_URL com o endereço da API do bot',
      to: `/app/${guildId}/integracoes`,
    },
    {
      done: !!settings.salesChannel,
      label: 'Canal de vendas definido',
      detail: settings.salesChannel || 'escolha o canal onde o bot publica o painel de vendas',
      to: `/app/${guildId}/configuracoes`,
    },
  ]
  const completed = checklist.filter((c) => c.done).length

  const topProducts = metrics.productRevenue.slice(0, 5)
  const maxRevenue = topProducts[0]?.revenue ?? 0

  return (
    <div className="space-y-5">
            <section className="panel grain relative overflow-hidden">
        <div className="hatch pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-ink-600 px-2.5 py-1">
              <span
                className={`h-1.5 w-1.5 ${apiState === 'ready' ? 'animate-pulse-dot bg-white' : 'bg-ink-500'}`}
              />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-200">
                {apiState === 'ready' ? 'bot conectado à api' : 'painel pronto · aguardando backend'}
              </span>
            </div>

            <h2 className="display-tight text-[30px] leading-[0.98] text-white sm:text-[42px]">
              {guild ? guild.name.toUpperCase() : 'SEU SERVIDOR'}
              <br />
              <span className="chrome-type">NO CONTROLE.</span>
            </h2>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-ink-400">
              Produtos, cupons e configurações que você cadastra aqui ficam salvos neste servidor. Vendas e clientes
              aparecem assim que o bot estiver enviando pedidos para a API.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/app/${guildId}/produtos`} className="btn-primary">
                <Package size={13} /> Cadastrar produto
              </Link>
              <Link to={`/app/${guildId}/integracoes`} className="btn-ghost">
                <Plug size={13} /> Ver o que falta
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-end">
            <div className="pointer-events-none absolute right-2 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full border border-ink-700" />
            <div className="pointer-events-none absolute right-8 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-ink-800" />
            <img
              src="/assets/nesspay-mascot.png"
              alt="Mascote NessPay"
              className="relative z-10 h-[150px] w-auto object-contain saturate-0 contrast-125 drop-shadow-[0_18px_30px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>

        <div className="relative grid grid-cols-2 divide-x divide-ink-800 border-t border-ink-800 md:grid-cols-4">
          {[
            { k: 'receita registrada', v: hasSales ? compactMoney(metrics.revenue) : '—' },
            { k: 'pedidos pagos', v: hasSales ? num(metrics.paidCount) : '—' },
            { k: 'produtos ativos', v: num(products.filter((p) => p.active).length) },
            { k: 'cupons ativos', v: num(coupons.filter((c) => c.active).length) },
          ].map((item) => (
            <div key={item.k} className="px-5 py-3.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">{item.k}</div>
              <div className="mt-1 font-display text-[17px] leading-none text-white">{item.v}</div>
            </div>
          ))}
        </div>
      </section>

      {apiState !== 'ready' && (
        <Banner
          title="Sem dados de vendas ainda"
          tone="info"
          action={
            <Link to={`/app/${guildId}/integracoes`} className="btn-ghost whitespace-nowrap py-1.5">
              integrar <ArrowUpRight size={11} />
            </Link>
          }
        >
          {apiState === 'error'
            ? error ?? 'A API respondeu com erro.'
            : apiConfigured()
              ? 'A API está configurada e conectada ao bot.'
              : 'Os números deste painel só aparecem quando VITE_API_URL apontar para a API do bot. Nada é simulado.'}
        </Banner>
      )}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receita hoje"
          value={metrics.todayRevenue > 0 ? brl(metrics.todayRevenue) : '—'}
          hint={metrics.todayCount > 0 ? `${num(metrics.todayCount)} pedido(s) hoje` : 'nenhuma venda registrada hoje'}
          icon={<BadgeDollarSign size={15} />}
          muted={metrics.todayRevenue === 0}
        />
        <StatCard
          label="Pedidos pagos"
          value={hasSales ? num(metrics.paidCount) : '—'}
          hint={metrics.pendingCount ? `${num(metrics.pendingCount)} pendente(s)` : 'aguardando o bot enviar pedidos'}
          icon={<ShoppingCart size={15} />}
          muted={!hasSales}
        />
        <StatCard
          label="Ticket médio"
          value={hasSales ? brl(metrics.avgTicket) : '—'}
          hint={hasSales ? 'calculado sobre pedidos pagos' : 'sem dados suficientes'}
          icon={<Receipt size={15} />}
          muted={!hasSales}
        />
        <StatCard
          label="Conversão"
          value={metrics.orderCount ? `${metrics.conversion.toFixed(1).replace('.', ',')}%` : '—'}
          hint={metrics.orderCount ? 'pagos ÷ total de pedidos' : 'sem checkout registrado'}
          icon={<TrendingUp size={15} />}
          muted={!metrics.orderCount}
        />
      </section>

            <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Receita · últimos 30 dias"
            subtitle={hasSales ? `${compactMoney(metrics.revenue)} no total acumulado` : 'nenhum pedido registrado no período'}
            icon={<Zap size={14} />}
          />
          {hasSales ? <RevenueChart data={metrics.series} /> : <ChartEmpty message="sem pedidos nos últimos 30 dias" />}
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader title="Métodos de pagamento" subtitle="distribuição dos pedidos pagos" />
            {metrics.methodSplit.length ? (
              <MethodBars data={metrics.methodSplit} />
            ) : (
              <EmptyState compact title="Sem pagamentos" hint="A distribuição aparece após o primeiro pedido pago." />
            )}
          </Card>
          <Card>
            <CardHeader title="Mix de categorias" subtitle="participação na receita" />
            {metrics.categorySplit.length ? (
              <CategoryDonut data={metrics.categorySplit} />
            ) : (
              <EmptyState compact title="Sem receita por categoria" hint="Depende de produtos vendidos." />
            )}
          </Card>
        </div>
      </section>

            <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">Últimas vendas</h2>
              <p className="mt-1 text-[11.5px] text-ink-400">
                {hasSales ? `${num(orders.length)} pedidos recebidos do bot` : 'pedidos enviados pelo bot'}
              </p>
            </div>
            <Link
              to={`/app/${guildId}/vendas`}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300 transition-colors hover:text-white"
            >
              ver todas <ArrowUpRight size={11} />
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<ShoppingCart size={16} />}
                title="Nenhuma venda registrada"
                hint="Quando o bot processar o primeiro pagamento, ele aparece aqui automaticamente."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-y border-ink-800 bg-ink-900/50">
                    <th className="th">Pedido</th>
                    <th className="th">Cliente</th>
                    <th className="th">Produto</th>
                    <th className="th">Método</th>
                    <th className="th">Valor</th>
                    <th className="th">Status</th>
                    <th className="th">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 7).map((o) => (
                    <tr key={o.id} className="border-b border-ink-800/70 transition-colors hover:bg-ink-850/70">
                      <td className="td font-mono text-[11.5px] text-ink-300">{o.id}</td>
                      <td className="td text-ink-100">{o.customerName}</td>
                      <td className="td max-w-[180px] truncate text-ink-300">{o.productName}</td>
                      <td className="td font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                        {methodLabel[o.method]}
                      </td>
                      <td className="td font-mono text-[12px] text-white">{brl(o.amount)}</td>
                      <td className="td">
                        <StatusBadge status={o.status} label={statusLabel[o.status]} />
                      </td>
                      <td className="td text-[11.5px] text-ink-400">{relative(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader
              title="Checklist de ativação"
              subtitle={`${completed} de ${checklist.length} concluído`}
              icon={<CheckCircle2 size={14} />}
            />
            <div className="mb-3">
              <Meter value={completed} max={checklist.length} />
            </div>
            <ul className="space-y-0">
              {checklist.map((c) => (
                <li key={c.label} className="border-b border-ink-800/70 py-2.5 last:border-0">
                  <Link to={c.to} className="group flex items-start gap-2.5">
                    {c.done ? (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-white" />
                    ) : (
                      <Circle size={13} className="mt-0.5 shrink-0 text-ink-600" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-[12px] ${c.done ? 'text-ink-400 line-through' : 'text-ink-100 group-hover:text-white'}`}>
                        {c.label}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-ink-600">{c.detail}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Resumo do servidor" subtitle="dados que você cadastrou" icon={<TicketPercent size={14} />} />
            <div className="space-y-2">
              {[
                ['Produtos cadastrados', num(products.length), `/app/${guildId}/produtos`],
                ['Cupons criados', num(coupons.length), `/app/${guildId}/cupons`],
                ['Clientes', num(customers.length), `/app/${guildId}/clientes`],
                ['Tickets abertos', num(tickets.filter((t) => t.status !== 'resolvido').length), `/app/${guildId}/tickets`],
              ].map(([label, value, to]) => (
                <Link
                  key={String(label)}
                  to={String(to)}
                  className="flex items-center justify-between border border-ink-700 bg-ink-850/40 px-3 py-2.5 transition-colors hover:border-white"
                >
                  <span className="text-[12px] text-ink-200">{label}</span>
                  <span className="font-mono text-[12px] text-white">{value}</span>
                </Link>
              ))}
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600">
              atualizado em {dateTime(new Date().toISOString())}
            </p>
          </Card>
        </div>
      </section>

            <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Produtos por receita"
            subtitle="ranking calculado com as vendas reais"
            icon={<Package size={14} />}
            action={
              <Link
                to={`/app/${guildId}/produtos`}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300 hover:text-white"
              >
                gerenciar
              </Link>
            }
          />
          {topProducts.length === 0 ? (
            <EmptyState
              icon={<Package size={16} />}
              title="Nenhum produto cadastrado"
              hint="Cadastre o que você vende para começar a acompanhar a receita por produto."
              action={
                <Link to={`/app/${guildId}/produtos`} className="btn-primary">
                  Cadastrar produto
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3.5">
              {topProducts.map((p, i) => (
                <li key={p.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-4 font-mono text-[10px] text-ink-600">{String(i + 1).padStart(2, '0')}</span>
                      <span className="truncate text-[13px] text-white">{p.name}</span>
                      <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-500 sm:inline">
                        {p.category}
                      </span>
                    </div>
                    <span className="font-mono text-[11.5px] text-ink-200">
                      {p.sold > 0 ? brl(p.revenue) : 'sem vendas'}
                    </span>
                  </div>
                  <Meter value={p.revenue} max={maxRevenue || 1} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Integrações" subtitle="o que ainda falta ligar" icon={<Plug size={14} />} />
          <div className="space-y-2">
            {[
              ['Discord OAuth2', !!guild],
              ['Key de licença', keyVerified],
              ['API do bot', apiState === 'ready'],
              ['Produtos no bot', source === 'api'],
              ['Canal de vendas', !!settings.salesChannel],
              ['Canal de logs', !!settings.logsChannel],
            ].map(([label, done]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-ink-800 py-2 last:border-0">
                <span className="flex items-center gap-2 text-[11.5px] text-ink-300">
                  <span className={`h-1.5 w-1.5 ${done ? 'bg-white' : 'bg-ink-600'}`} />
                  {label}
                </span>
                <span className={`font-mono text-[10.5px] uppercase tracking-[0.1em] ${done ? 'text-white' : 'text-ink-500'}`}>
                  {done ? 'ok' : 'pendente'}
                </span>
              </div>
            ))}
          </div>
          <Link to={`/app/${guildId}/integracoes`} className="btn-ghost mt-3 w-full py-2">
            abrir integrações <ArrowUpRight size={11} />
          </Link>
        </Card>
      </section>
    </div>
  )
}
