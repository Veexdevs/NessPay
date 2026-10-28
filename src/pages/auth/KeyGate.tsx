import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, KeyRound, LogOut, ShieldQuestion } from 'lucide-react'
import { useSession } from '@/lib/session'
import { userAvatar } from '@/lib/discord'
import { api, apiConfigured } from '@/lib/api'

const KEY_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

export default function KeyGate() {
  const { user, mode, keyVerified, verifyKey, signOut, guilds } = useSession()
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Verificar Key — NessPay'
  }, [])

  if (keyVerified) return <Navigate to="/servidores" replace />

  const formatted = key.trim().toUpperCase()
  const looksValid = KEY_PATTERN.test(formatted)

  const submit = async () => {
    setError(null)
    setChecking(true)
    if (!apiConfigured()) {
      setTimeout(() => {
        verifyKey(formatted || null)
        navigate('/servidores', { replace: true })
      }, 500)
      return
    }
    try {
      const result = await api.verifyLicense(formatted, user?.id ?? '')
      if (result.valid) {
        verifyKey(formatted)
        navigate('/servidores', { replace: true })
        return
      }
      setError(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível validar a Key agora.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [background-size:44px_44px] opacity-[0.3]" />

      <div className="relative w-full max-w-[560px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="display-tight text-[20px]">
            <span className="chrome-type">NESS</span>
            <span className="text-white">PAY</span>
          </div>
          <button
            onClick={() => {
              signOut()
              navigate('/entrar', { replace: true })
            }}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400 transition-colors hover:text-white"
          >
            <LogOut size={11} /> sair
          </button>
        </div>

        <div className="border border-ink-700 bg-ink-900/85 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              {user ? (
                <img
                  src={userAvatar(user, 64) ?? undefined}
                  alt=""
                  className="h-8 w-8 border border-ink-600 bg-ink-800 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center border border-ink-600 bg-ink-850 text-[11px] text-ink-300">
                  ?
                </span>
              )}
              <div>
                <p className="text-[12px] text-white">
                  {user ? (user.global_name ?? user.username) : 'Sessão de configuração'}
                </p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-500">
                  {user ? `@${user.username}` : 'discord não conectado'}
                  {mode === 'discord' && guilds.length > 0 ? ` · ${guilds.length} servidores` : ''}
                </p>
              </div>
            </div>
            <span className="tag border-ink-600 text-ink-300">
              <span className="h-1 w-1 bg-current" /> etapa 2 de 3
            </span>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center border border-ink-600 bg-black">
              <KeyRound size={18} className="text-white" />
            </div>

            <h1 className="display-tight text-[24px] leading-[1.05] text-white">
              INFORME SUA KEY<br />
              <span className="text-ink-500">DE LICENÇA</span>
            </h1>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-400">
              A Key é enviada quando você compra o NessPay. Ela libera o painel e vincula o bot ao seu servidor.
            </p>

            <div className="mt-5">
              <label className="label" htmlFor="license-key">
                Key de acesso
              </label>
              <div className="relative">
                <input
                  id="license-key"
                  value={key}
                  onChange={(e) => {
                    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
                    setKey(raw.replace(/(.{4})/g, '$1-').replace(/-$/, ''))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit()
                  }}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="field pr-24 font-mono tracking-[0.22em] uppercase"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  {looksValid ? (
                    <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white">
                      <BadgeCheck size={11} /> formato ok
                    </span>
                  ) : (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-600">
                      {formatted.length}/19
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-600">
                formato esperado: 4 blocos de 4 caracteres
              </p>
              {error && (
                <p className="mt-2 border border-ink-600 bg-ink-850/70 px-2.5 py-2 text-[11.5px] leading-relaxed text-white">
                  {error}
                </p>
              )}
            </div>

            <button onClick={() => void submit()} disabled={checking} className="btn-primary mt-5 w-full">
              {checking ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse-dot bg-black" /> verificando…
                </>
              ) : (
                <>
                  Verificar Key <ArrowRight size={13} />
                </>
              )}
            </button>

            <div className="mt-4 border border-dashed border-ink-700 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-400">
                <ShieldQuestion size={11} /> {apiConfigured() ? 'validação no bot ativa' : 'validação sem API'}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
                {apiConfigured()
                  ? 'A Key é verificada na API do bot e precisa pertencer ao seu ID do Discord. Key de outra pessoa ou expirada é recusada.'
                  : 'Sem VITE_API_URL o painel não tem como validar a Key, então qualquer valor libera o acesso. Configure a API do bot para a validação real.'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Link
                to="/entrar"
                onClick={() => signOut()}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500 hover:text-white"
              >
                trocar conta do discord
              </Link>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600">nesspay v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
