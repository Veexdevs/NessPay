import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, Plus, RefreshCw, Server, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useSession } from '@/lib/session'
import { canManage, guildIcon, oauthConfigured, permissionLabel, redirectUri, userAvatar } from '@/lib/discord'
import { EmptyState } from '@/components/ui'

export default function Servers() {
  const { user, guilds, manageableGuilds, signOut, resetKey, mode } = useSession()
  const navigate = useNavigate()
  const setupMode = mode === 'setup' || !oauthConfigured()

  useEffect(() => {
    document.title = 'Seus servidores — NessPay'
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [background-size:44px_44px] opacity-25" />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
                <div className="mb-8 flex flex-col justify-between gap-4 border-b border-ink-800 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Link to="/servidores" className="display-tight text-[22px]">
              <span className="chrome-type">NESS</span>
              <span className="text-white">PAY</span>
            </Link>
            <span className="hidden h-6 w-px bg-ink-700 sm:block" />
            <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-500 sm:block">
              etapa 3 de 3 · escolha o servidor
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 border border-ink-700 px-2.5 py-1.5">
              <img
                src={userAvatar(user, 64) ?? undefined}
                alt=""
                className="h-5 w-5 border border-ink-600 bg-ink-800 object-cover"
              />
              <span className="font-mono text-[10.5px] text-ink-200">
                {user ? `@${user.username}` : 'sessão local'}
              </span>
            </div>
            <button
              onClick={resetKey}
              className="border border-ink-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
            >
              trocar key
            </button>
            <button
              onClick={() => {
                signOut()
                navigate('/entrar', { replace: true })
              }}
              className="flex items-center gap-1.5 border border-ink-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
            >
              <LogOut size={11} /> sair
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display-tight text-[28px] leading-none text-white">SEUS SERVIDORES</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-ink-400">
              Listamos apenas servidores onde você é dono, administrador ou tem permissão de gerenciar servidor.
            </p>
          </div>
          <span className="tag border-ink-600 text-ink-300">
            <ShieldCheck size={10} /> {manageableGuilds.length} com acesso
          </span>
        </div>

        {setupMode ? (
          <div className="space-y-3">
            <EmptyState
              icon={<TriangleAlert size={16} />}
              title="O Discord ainda não está conectado"
              hint="Para listar os seus servidores reais, configure a OAuth2 do Discord. Nada é exibido de exemplo — a lista só aparece quando o Discord responder."
            />
            <div className="panel p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">
                Como ligar (2 minutos)
              </p>
              <ol className="mt-2.5 space-y-1.5 text-[11.5px] leading-relaxed text-ink-400">
                <li>
                  1. Crie a aplicação em{' '}
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white underline decoration-ink-600 underline-offset-2"
                  >
                    discord.com/developers/applications
                  </a>
                  .
                </li>
                <li>
                  2. Em <span className="font-mono text-ink-200">OAuth2</span>, adicione o redirect{' '}
                  <span className="break-all font-mono text-ink-200">{redirectUri()}</span>
                </li>
                <li>
                  3. Copie o <span className="font-mono text-ink-200">Client ID</span> para o arquivo{' '}
                  <span className="font-mono text-ink-200">.env</span> como{' '}
                  <span className="font-mono text-ink-200">VITE_DISCORD_CLIENT_ID</span> e reinicie o servidor.
                </li>
                <li>
                  4. Saia e entre de novo: seus servidores aparecerão aqui automaticamente.
                </li>
              </ol>
            </div>
          </div>
        ) : manageableGuilds.length === 0 ? (
          <EmptyState
            icon={<Server size={16} />}
            title="Nenhum servidor com permissão"
            hint={`Encontramos ${guilds.length} servidor(es) na sua conta, mas nenhum onde você seja dono ou administrador.`}
            action={
              <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="btn-ghost">
                <Plus size={12} /> adicionar o bot a um servidor
              </a>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {manageableGuilds.map((g) => {
              const icon = guildIcon(g)
              return (
                <div key={g.id} className="panel panel-hover group flex items-center gap-4 p-4">
                  {icon ? (
                    <img src={icon} alt="" className="h-14 w-14 shrink-0 border border-ink-600 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-ink-600 bg-ink-850 font-display text-lg text-ink-200">
                      {g.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] text-white">{g.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">
                      <ShieldCheck size={9} /> {permissionLabel(g)} · {g.id}
                    </p>
                    <button
                      onClick={() => navigate(`/app/${g.id}`)}
                      className="mt-2.5 flex items-center gap-1.5 border border-ink-600 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-100 transition-colors group-hover:border-white group-hover:bg-white group-hover:text-black"
                    >
                      gerenciar <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!setupMode && guilds.length > manageableGuilds.length && (
          <div className="mt-4 border border-ink-800 bg-ink-900/40 p-3.5">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-500">
              {guilds.length - manageableGuilds.length} servidor(es) sem permissão de administrador
            </p>
            <p className="mt-1 text-[11.5px] text-ink-600">
              {guilds
                .filter((g) => !canManage(g))
                .map((g) => g.name)
                .join(' · ')}
            </p>
          </div>
        )}

        {!setupMode && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 transition-colors hover:text-white"
          >
            <RefreshCw size={10} /> recarregar lista
          </button>
        )}
      </div>
    </div>
  )
}
