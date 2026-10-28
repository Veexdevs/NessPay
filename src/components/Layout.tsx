import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  TicketPercent,
  MessagesSquare,
  Plug,
  Settings,
  Menu,
  X,
  ChevronsUpDown,
  LogOut,
  Server,
  KeyRound,
  Check,
  CircleDot,
  CircleDashed,
} from 'lucide-react'
import { useSession } from '@/lib/session'
import { API_URL, useApiResource } from '@/lib/store'
import { guildIcon, userAvatar, canManage } from '@/lib/discord'
import type { Ticket } from '@/lib/store'

const nav = [
  { path: '', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { path: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { path: 'produtos', label: 'Produtos', icon: Package },
  { path: 'clientes', label: 'Clientes', icon: Users },
  { path: 'cupons', label: 'Cupons', icon: TicketPercent },
  { path: 'tickets', label: 'Tickets', icon: MessagesSquare },
  { path: 'integracoes', label: 'Integrações', icon: Plug },
  { path: 'configuracoes', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const { guildId } = useParams<{ guildId: string }>()
  const { guilds, user, keyValue, signOut, resetKey } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const guild = guilds.find((g) => g.id === guildId) ?? null
  const tickets = useApiResource<Ticket>('/tickets', guildId)
  const openTickets = tickets.data.filter((t) => t.status !== 'resolvido').length
  const icon = guildIcon(guild, 128)

  const base = `/app/${guildId}`
  const current = nav.find((n) => (n.end ? pathname === base || pathname === `${base}/` : pathname.startsWith(`${base}/${n.path}`)))

  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcher(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="display-tight text-[19px]">
          <span className="chrome-type">NESS</span>
          <span className="text-white">PAY</span>
        </div>
        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-ink-600">dashboard</div>
      </div>

      {/* seletor de servidor */}
      <div className="relative mx-3 mb-4" ref={switcherRef}>
        <button
          onClick={() => setSwitcher((v) => !v)}
          className="flex w-full items-center gap-2.5 border border-ink-700 bg-ink-900/70 px-2.5 py-2.5 text-left transition-colors hover:border-ink-500"
        >
          {icon ? (
            <img src={icon} alt="" className="h-8 w-8 shrink-0 border border-ink-600 object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink-600 bg-ink-850 font-mono text-[10px] text-ink-300">
              {(guild?.name ?? 'NP').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-white">{guild?.name ?? 'Servidor local'}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
              {guild ? 'servidor gerenciado' : 'sem discord conectado'}
            </p>
          </div>
          <ChevronsUpDown size={13} className="shrink-0 text-ink-500" />
        </button>

        {switcher && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 border border-ink-600 bg-ink-950 shadow-[0_20px_50px_-20px_#000]">
            <p className="border-b border-ink-800 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600">
              seus servidores
            </p>
            <div className="max-h-56 overflow-y-auto">
              {guilds.filter(canManage).length === 0 && (
                <p className="px-3 py-3 text-[11px] text-ink-500">Nenhum servidor com permissão.</p>
              )}
              {guilds
                .filter(canManage)
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSwitcher(false)
                      onNavigate?.()
                      navigate(`/app/${g.id}`)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-ink-850"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-ink-700 bg-ink-850 text-[8px] text-ink-300">
                      {g.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-200">{g.name}</span>
                    {g.id === guildId && <Check size={11} className="text-white" />}
                  </button>
                ))}
            </div>
            <button
              onClick={() => {
                setSwitcher(false)
                onNavigate?.()
                navigate('/servidores')
              }}
              className="flex w-full items-center gap-2 border-t border-ink-800 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-ink-400 transition-colors hover:bg-ink-850 hover:text-white"
            >
              <Server size={11} /> todos os servidores
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 no-scrollbar">
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path ? `${base}/${item.path}` : base}
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
                {item.path === 'tickets' && openTickets > 0 && (
                  <span className="border border-ink-500 bg-black px-1.5 py-0.5 font-mono text-[9.5px] text-white">
                    {openTickets}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <div className="mb-2 space-y-1.5 border border-ink-800 bg-ink-900/50 px-2.5 py-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600">status das conexões</p>
          <StatusRow ok={!!guild} label="Discord" />
          <StatusRow ok={!!keyValue} label={keyValue ? 'Key informada' : 'Key não informada'} />
          <StatusRow ok={!!API_URL} label={API_URL ? 'API configurada' : 'API do bot'} />
        </div>

        <button
          onClick={() => {
            resetKey()
            navigate('/chave')
          }}
          className="mb-1.5 flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500 transition-colors hover:text-white"
        >
          <KeyRound size={11} /> trocar key
        </button>

        <div className="flex items-center gap-2.5 border border-ink-700 bg-ink-900/60 px-2.5 py-2">
          <img src={userAvatar(user, 64) ?? undefined} alt="" className="h-7 w-7 border border-ink-600 bg-ink-800 object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] text-white">{user ? (user.global_name ?? user.username) : 'Sessão local'}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-ink-500">
              {user ? `@${user.username}` : 'sem discord'}
            </p>
          </div>
          <button
            onClick={() => {
              signOut()
              navigate('/entrar')
            }}
            className="shrink-0 text-ink-500 transition-colors hover:text-white"
            aria-label="Sair"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[246px] border-r border-ink-800 bg-black/70 backdrop-blur-xl lg:block">
        {sidebar()}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] animate-fade-up border-r border-ink-700 bg-black">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 p-1.5 text-ink-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
            {sidebar(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[246px]">
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
              <h1 className="truncate font-display text-[15px] tracking-tight text-white">{current?.label ?? 'Painel'}</h1>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-600 md:block">
                {guild ? guild.name : 'servidor local'}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 border border-ink-700 px-2.5 py-[7px] sm:flex">
                <span className={`h-1.5 w-1.5 ${API_URL ? 'animate-pulse-dot bg-white' : 'bg-ink-500'}`} />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-200">
                  {API_URL ? 'api conectada' : 'api não configurada'}
                </span>
              </div>
              <button
                onClick={() => navigate('/servidores')}
                className="flex items-center gap-1.5 border border-ink-700 px-2.5 py-[7px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
              >
                <Server size={11} /> trocar servidor
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>

        <footer className="mt-4 border-t border-ink-800 px-4 py-5 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-600 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} NessPay — bot de vendas para Discord</span>
            <span className="font-mono">painel v1.0 · dados reais apenas</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? <CircleDot size={9} className="text-white" /> : <CircleDashed size={9} className="text-ink-600" />}
      <span className={`font-mono text-[9.5px] uppercase tracking-[0.1em] ${ok ? 'text-ink-200' : 'text-ink-600'}`}>
        {label}
      </span>
    </div>
  )
}
