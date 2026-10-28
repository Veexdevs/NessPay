import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { useSession } from '@/lib/session'
import { fetchGuilds, fetchMe, readAuthResponse } from '@/lib/discord'

export default function AuthCallback() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const { token, error: oauthError } = readAuthResponse()
    window.history.replaceState(null, '', window.location.pathname)

    if (oauthError) {
      setError(oauthError)
      return
    }
    if (!token) {
      setError('O Discord não retornou um token de acesso.')
      return
    }

    ;(async () => {
      try {
        const [user, guilds] = await Promise.all([fetchMe(token), fetchGuilds(token)])
        signIn({ token, user, guilds, mode: 'discord' })
        navigate('/chave', { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao autenticar com o Discord.')
      }
    })()
  }, [navigate, signIn])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md border border-ink-700 bg-ink-900/80 p-6 text-center">
        {error ? (
          <>
            <TriangleAlert size={20} className="mx-auto mb-3 text-white" />
            <h1 className="display-tight text-[18px] text-white">NÃO FOI POSSÍVEL ENTRAR</h1>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-400">{error}</p>
            <Link to="/entrar" className="btn-primary mt-5 w-full">
              Tentar novamente
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto mb-3 block h-1.5 w-1.5 animate-pulse-dot bg-white" />
            <h1 className="display-tight text-[18px] text-white">CONECTANDO AO DISCORD</h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              lendo conta e servidores…
            </p>
          </>
        )}
      </div>
    </div>
  )
}
