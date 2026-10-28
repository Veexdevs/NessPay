import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  TicketPercent,
  MessagesSquare,
  Plug,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Command,
  ExternalLink,
} from 'lucide-react'
import { botStatus, tickets } from '@/data/mock'

const nav = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/cupons', label: 'Cupons', icon: TicketPercent },
  { to: '/tickets', label: 'Tickets', icon: MessagesSquare, badge: tickets.filter((t) => t.status !== 'resolvido').length },
  { to: '/integracoes', label: 'Integrações', icon: Plug, dot: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

function Logo() {
  return (
    <NavLink to="/" className="group flex items-center gap-3 px-5 py-5">
      <div className="relative flex h-10 w-10 items-center justify-center border border-ink-600 bg-ink-850 transition-colors group-hover:border-white">
        <img src="/assets/nesspay-mascot.png" alt="" className="h-7 w-7 object-contain saturate-0" />
      </div>
      <div className="leading-none">
        <div className="font-display text-[22px] tracking-wide">
          <span className="chrome-type">NESS</span>
          <span className="text-white">PAY</span>
        </div>
        <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.34em] text-ink-500">application</div>
      </div>
    </NavLink>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Logo />
      <div className="mx-5 mb-5 border border-ink-700 bg-ink-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">gateway</span>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white">
            <span className="h-1.5 w-1.5 animate-pulse-dot bg-white" />
            online
          </span>
        </div>
        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <div className="font-display text-[20px] leading-none text-white">{botStatus.ping} <span className="text-[11px] text-ink-400">ms</span></div>
            <div className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-ink-500">latência</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11px] text-ink-200">{botStatus.uptime}</div>
            <div className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-ink-500">uptime</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 no-scrollbar">
        <p className="px-2 pb-2 pt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-600">operação</p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 border-l-2 px-3 py-2.5 text-[12.5px] transition-all duration-150 ${
                isActive
                  ? 'border-white bg-ink-800/80 text-white'
                  : 'border-transparent text-ink-400 hover:border-ink-600 hover:bg-ink-850/60 hover:text-ink-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="flex-1 font-medium tracking-wide">{item.label}</span>
                {item.badge ? (
                  <span className="border border-ink-500 bg-black px-1.5 py-0.5 font-mono text-[9.5px] text-white">
                    {item.badge}
                  </span>
                ) : null}
                {item.dot ? <span className="h-1 w-1 animate-pulse-dot bg-white" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <a
          href="https://discord.com/developers/applications"
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex items-center justify-between border border-ink-700 px-3 py-2.5 transition-colors hover:border-white"
        >
          <span className="text-[11px] uppercase tracking-[0.1em] text-ink-300">Developer Portal</span>
          <ExternalLink size={12} className="text-ink-500" />
        </a>
        <div className="flex items-center gap-2.5 border border-ink-700 bg-ink-900/60 px-3 py-2.5">
          <img src="/assets/nesspay-mascot.png" alt="" className="h-7 w-7 object-contain saturate-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-white">Ness</div>
            <div className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-500">owner · {botStatus.version}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMobileOpen(false), [pathname])

  const title = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'Painel'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[246px] border-r border-ink-800 bg-black/70 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] animate-fade-up border-r border-ink-700 bg-black">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 p-1.5 text-ink-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[246px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-ink-800 bg-black/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="p-2 text-ink-300 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>

            <div className="hidden min-w-0 items-baseline gap-3 sm:flex">
              <h1 className="truncate font-display text-[19px] tracking-wide text-white">{title}</h1>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-600 md:block">
                / {pathname === '/' ? 'home' : pathname.replace('/', '')}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  placeholder="Buscar pedido, cliente, ticket…"
                  className="h-9 w-64 border border-ink-700 bg-ink-900/60 pl-8 pr-14 text-[12px] text-white placeholder:text-ink-500 outline-none transition-colors focus:border-white"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] text-ink-500">
                  <Command size={8} />K
                </span>
              </div>

              <button className="relative flex h-9 w-9 items-center justify-center border border-ink-700 text-ink-300 transition-colors hover:border-white hover:text-white">
                <Bell size={14} />
                <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border border-black bg-white" />
              </button>

              <div className="hidden items-center gap-2 border border-ink-700 px-2.5 py-[7px] sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse-dot bg-white" />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-200">bot online</span>
              </div>
            </div>
          </div>

          {/* faixa de status */}
          <div className="flex items-center gap-4 overflow-hidden border-t border-ink-800/70 px-4 py-1.5 sm:px-6">
            <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-600">
              nesspay · painel interno
            </span>
            <span className="hidden h-1 w-1 bg-ink-700 sm:block" />
            <span className="hidden whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-600 sm:block">
              {botStatus.guilds} servidores · {botStatus.shards} shards
            </span>
            <span className="ml-auto whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-500">
              ambiente: demonstração (dados mock)
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>

        <footer className="mt-4 border-t border-ink-800 px-4 py-5 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-600 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} NessPay — bot de vendas para Discord</span>
            <span className="font-mono">build {botStatus.version} · painel v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
