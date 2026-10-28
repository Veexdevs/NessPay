/**
 * Sessão do painel: usuário Discord, servidores e validação da Key.
 * Persistida em localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DiscordGuild, DiscordUser, canManage } from './discord'

export type AuthMode = 'discord' | 'setup' | null

export interface Session {
  token: string | null
  /** epoch ms em que o token do Discord expira (7 dias no implicit grant) */
  expiresAt: number | null
  user: DiscordUser | null
  guilds: DiscordGuild[]
  mode: AuthMode
  keyVerified: boolean
  keyValue: string | null
}

const EMPTY: Session = {
  token: null,
  expiresAt: null,
  user: null,
  guilds: [],
  mode: null,
  keyVerified: false,
  keyValue: null,
}

const SESSION_KEY = 'nesspay:session'

interface SessionContextValue extends Session {
  ready: boolean
  authenticated: boolean
  expired: boolean
  manageableGuilds: DiscordGuild[]
  signIn: (data: {
    token: string | null
    expiresIn?: number | null
    user: DiscordUser | null
    guilds: DiscordGuild[]
    mode: AuthMode
  }) => void
  verifyKey: (key: string | null) => void
  resetKey: () => void
  signOut: () => void
}

const Ctx = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setSession({ ...EMPTY, ...(JSON.parse(raw) as Partial<Session>) })
    } catch {
      /* ignora sessão corrompida */
    }
    setReady(true)
  }, [])

  const persist = useCallback((next: Session) => {
    setSession(next)
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    } catch {
      /* armazenamento cheio/indisponível */
    }
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(EMPTY)
  }, [])

  const expired = !!session.expiresAt && session.expiresAt <= Date.now()

  // token vencido: limpa a sessão para não ficar em loop de 401
  useEffect(() => {
    if (ready && expired) signOut()
  }, [ready, expired, signOut])

  const signIn = useCallback<SessionContextValue['signIn']>(
    ({ token, expiresIn, user, guilds, mode }) => {
      persist({
        token,
        expiresAt: token && expiresIn ? Date.now() + expiresIn * 1000 : null,
        user,
        guilds,
        mode,
        keyVerified: false,
        keyValue: null,
      })
    },
    [persist],
  )

  const verifyKey = useCallback(
    (key: string | null) => {
      persist({ ...session, keyVerified: true, keyValue: key && key.trim() ? key.trim() : null })
    },
    [persist, session],
  )

  const resetKey = useCallback(() => {
    persist({ ...session, keyVerified: false, keyValue: null })
  }, [persist, session])

  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      ready,
      expired,
      authenticated: session.mode !== null,
      manageableGuilds: session.guilds.filter(canManage),
      signIn,
      verifyKey,
      resetKey,
      signOut,
    }),
    [session, ready, expired, signIn, verifyKey, resetKey, signOut],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>')
  return ctx
}
