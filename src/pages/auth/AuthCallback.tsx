import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, TriangleAlert } from 'lucide-react'
import { useSession } from '@/lib/session'
import {
  CLIENT_ID,
  explainAuthError,
  fetchGuilds,
  fetchMe,
  readAuthResponse,
  redirectUri,
} from '@/lib/discord'

export default function AuthCallback() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const result = readAuthResponse()
    window.history.replaceState(null, '', '/auth/callback')

    if (result.error) {
      setRaw(result.error)
      setError(explainAuthError(result.error, result.errorDescription))
      return
    }
    if (!result.token) {
      setError(
        'O Discord não devolveu um token. Isso normalmente acontece quando o redirect URI usado é diferente do que está registrado na aplicação.',
      )
      return
    }

    const token = result.token
    ;(async () => {
      try {
        const [user, guilds] = await Promise.all([fetchMe(token), fetchGuilds(token)])
        signIn({ token, expiresIn: result.expiresIn, user, guilds, mode: 'discord' })
        navigate('/chave', { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao autenticar com o Discord.')
      }
    })()
  }, [navigate, signIn])

  const copy = () => {
    navigator.clipboard?.writeText(redirectUri())
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg border border-ink-700 bg-ink-900/80">
        {error ? (
          <div className="p-6">
            <TriangleAlert size={20} className="mb-3 text-white" />
            <h1 className="display-tight text-[18px] leading-tight text-white">NÃO FOI POSSÍVEL ENTRAR</h1>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-300">{error}</p>
            {raw && (
              <p className="mt-2 border border-ink-700 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">
                código: {raw}
              </p>
            )}

            <div className="mt-4 border border-ink-700 bg-black/40 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500">
                redirect URI que este painel está enviando
              </p>
              <div className="mt-1.5 flex items-start gap-2">
                <code className="flex-1 break-all font-mono text-[11px] leading-relaxed text-white">{redirectUri()}</code>
                <button
                  onClick={copy}
                  className="flex shrink-0 items-center gap-1 border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
                >
                  <Copy size={10} /> {copied ? 'ok' : 'copiar'}
                </button>
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600">
                client id: {CLIENT_ID}
              </p>
            </div>

            <ol className="mt-4 space-y-1.5 text-[11.5px] leading-relaxed text-ink-400">
              <li>
                1. Abra o{' '}
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline decoration-ink-600 underline-offset-2"
                >
                  Developer Portal
                </a>{' '}
                → sua aplicação → <span className="font-mono text-ink-200">OAuth2</span>.
              </li>
              <li>
                2. Em <span className="font-mono text-ink-200">Redirects</span>, cole a URI acima <b>exatamente</b> como
                está (sem barra no final, mesmo domínio).
              </li>
              <li>3. Salve, volte aqui e tente de novo.</li>
            </ol>

            <div className="mt-5 flex gap-2">
              <Link to="/entrar" className="btn-ghost flex-1">
                <ArrowLeft size={12} /> Voltar
              </Link>
              <Link to="/entrar" className="btn-primary flex-1">
                Tentar novamente
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <span className="mx-auto mb-3 block h-1.5 w-1.5 animate-pulse-dot bg-white" />
            <h1 className="display-tight text-[18px] text-white">CONECTANDO AO DISCORD</h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              lendo conta e servidores…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
