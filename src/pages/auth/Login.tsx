import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Copy, KeyRound, Settings2, ShieldCheck } from 'lucide-react'
import { useSession } from '@/lib/session'
import { CLIENT_ID, buildAuthUrl, clientIdSource, hasAuthPayload, redirectUri } from '@/lib/discord'

export default function Login() {
  const { authenticated, keyVerified, signIn } = useSession()
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    document.title = 'Entrar — NessPay'
  }, [])

  // Se o Discord devolver o token em qualquer rota, manda para o callback.
  useEffect(() => {
    if (hasAuthPayload()) {
      navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true })
    }
  }, [navigate])

  if (authenticated) return <Navigate to={keyVerified ? '/servidores' : '/chave'} replace />

  const startDiscord = () => {
    window.location.href = buildAuthUrl()
  }

  const copy = (value: string, id: string) => {
    navigator.clipboard?.writeText(value)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [background-size:44px_44px] opacity-[0.35]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-3xl" />

      <div className="relative w-full max-w-[900px] border border-ink-700 bg-ink-900/80 backdrop-blur-xl">
        <div className="grid md:grid-cols-2">
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

            <div className="mt-5 flex items-center gap-2 text-[11px] text-ink-500">
              <KeyRound size={12} />
              Depois do login você informa a sua Key de licença.
            </div>

            <button
              onClick={() => setShowConfig((v) => !v)}
              className="mt-5 flex w-full items-center justify-between border border-ink-700 px-3 py-2 text-left transition-colors hover:border-ink-500"
            >
              <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400">
                <Settings2 size={11} /> configuração do login
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-600">
                {showConfig ? 'ocultar' : 'ver'}
              </span>
            </button>

            {showConfig && (
              <div className="mt-2 space-y-2.5 border border-ink-800 bg-black/50 p-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">client id ({clientIdSource})</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate font-mono text-[11px] text-white">{CLIENT_ID}</code>
                    <button
                      onClick={() => copy(CLIENT_ID, 'client')}
                      className="flex items-center gap-1 border border-ink-600 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-300 hover:border-white hover:text-white"
                    >
                      <Copy size={9} /> {copied === 'client' ? 'ok' : 'copiar'}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">
                    redirect uri (precisa estar cadastrado)
                  </p>
                  <div className="mt-1 flex items-start gap-2">
                    <code className="flex-1 break-all font-mono text-[11px] leading-relaxed text-white">{redirectUri()}</code>
                    <button
                      onClick={() => copy(redirectUri(), 'redirect')}
                      className="flex shrink-0 items-center gap-1 border border-ink-600 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-300 hover:border-white hover:text-white"
                    >
                      <Copy size={9} /> {copied === 'redirect' ? 'ok' : 'copiar'}
                    </button>
                  </div>
                </div>
                <p className="text-[10.5px] leading-relaxed text-ink-500">
                  No Vercel, cadastre essa URI (e a de produção/preview) em OAuth2 → Redirects. Se mudar o domínio, o
                  redirect muda junto — copie e atualize no portal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
