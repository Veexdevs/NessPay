import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useSession } from '@/lib/session'
import { buildAuthUrl, oauthConfigured, redirectUri } from '@/lib/discord'

export default function Login() {
  const { authenticated, keyVerified, signIn } = useSession()
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)
  const configured = oauthConfigured()

  useEffect(() => {
    document.title = 'Entrar — NessPay'
  }, [])

  if (authenticated) return <Navigate to={keyVerified ? '/servidores' : '/chave'} replace />

  const startDiscord = () => {
    if (configured) {
      window.location.href = buildAuthUrl()
    } else {
      signIn({ token: null, user: null, guilds: [], mode: 'setup' })
      navigate('/chave')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [background-size:44px_44px] opacity-[0.35]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-3xl" />

      <div className="relative w-full max-w-[900px] border border-ink-700 bg-ink-900/80 backdrop-blur-xl">
        <div className="grid md:grid-cols-2">
          {/* institucional */}
          <div className="grain relative hidden flex-col justify-between border-r border-ink-800 p-8 md:flex">
            <div className="hatch pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative">
              <div className="display-tight text-[26px]">
                <span className="chrome-type">NESS</span>
                <span className="text-white">PAY</span>
              </div>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.34em] text-ink-500">application</p>
            </div>

            <img
              src="/assets/nesspay-mascot.png"
              alt="Mascote NessPay"
              className="relative mx-auto my-6 h-[150px] w-auto object-contain saturate-0"
            />

            <ul className="relative space-y-2.5">
              {[
                ['Login obrigatório pelo Discord', 'Só quem tem cargo de administrador entra.'],
                ['Acesso por Key', 'Uma Key por instalação do bot.'],
                ['Painel por servidor', 'Cada servidor com seus produtos e vendas.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0 text-ink-400" />
                  <div>
                    <p className="text-[12px] text-ink-100">{t}</p>
                    <p className="text-[11px] leading-relaxed text-ink-500">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* login */}
          <div className="p-7 sm:p-9">
            <div className="mb-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse-dot bg-white" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400">acesso restrito</span>
            </div>

            <h1 className="display-tight text-[26px] text-white">ENTRAR COM DISCORD</h1>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-400">
              O login pelo Discord é obrigatório. Usamos apenas os escopos{' '}
              <span className="font-mono text-ink-200">identify</span> e{' '}
              <span className="font-mono text-ink-200">guilds</span>.
            </p>

            <button
              onClick={startDiscord}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className="mt-6 flex w-full items-center justify-between border border-white bg-white px-4 py-3 text-black transition-all hover:bg-ink-100"
            >
              <span className="flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.3.7a14 14 0 0 1 4.2 1.4 13.9 13.9 0 0 0-11-.5l-.4.5A19 19 0 0 0 3.7 4.5C.6 9.2-.2 13.8.2 18.4a19.2 19.2 0 0 0 5.8 3l.7-1.2c-.8-.3-1.6-.7-2.3-1.1l.5-.4a13.7 13.7 0 0 0 10.4 0l.5.4c-.7.4-1.5.8-2.3 1.1l.7 1.2a19.2 19.2 0 0 0 5.8-3c.5-5.3-.8-9.8-2.7-13.9ZM8.3 15.5c-1.1 0-2-1-2-2.2 0-1.3.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.2-2 2.2Zm7.4 0c-1.1 0-2-1-2-2.2 0-1.3.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.2-2 2.2Z" />
                </svg>
                Continuar com Discord
              </span>
              <ArrowRight size={15} className={`transition-transform ${hover ? 'translate-x-1' : ''}`} />
            </button>

            {!configured && (
              <div className="mt-4 border border-ink-600 bg-ink-850/70 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                  <TriangleAlert size={12} /> OAuth ainda não configurada
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
                  Sem <span className="font-mono text-ink-200">VITE_DISCORD_CLIENT_ID</span> não é possível ler seus
                  servidores. O botão acima entra em modo de configuração para você navegar no painel vazio — nenhum
                  dado de exemplo é exibido.
                </p>
                <div className="mt-2 space-y-1 font-mono text-[10px] text-ink-500">
                  <p>redirect: {redirectUri()}</p>
                  <p>escopos: identify guilds</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-2 text-[11px] text-ink-500">
              <KeyRound size={12} />
              Depois do login você vai informar a sua Key de licença.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
