
export const DISCORD_API = 'https://discord.com/api/v10'

const ENV_CLIENT_ID = (import.meta.env.VITE_DISCORD_CLIENT_ID ?? '').trim()
const FALLBACK_CLIENT_ID = '1561323387320668193'

export const CLIENT_ID = /^\d{15,25}$/.test(ENV_CLIENT_ID) ? ENV_CLIENT_ID : FALLBACK_CLIENT_ID
export const clientIdSource: 'env' | 'padrão' = /^\d{15,25}$/.test(ENV_CLIENT_ID) ? 'env' : 'padrão'

export const oauthConfigured = () => /^\d{15,25}$/.test(CLIENT_ID)

export const redirectUri = () => {
  const fromEnv = (import.meta.env.VITE_DISCORD_REDIRECT_URI ?? '').trim()
  if (fromEnv) return fromEnv
  return `${window.location.origin}/auth/callback`
}

export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

const STATE_KEY = 'nesspay:oauth_state'

export function buildAuthUrl() {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    scope: 'identify guilds',
    redirect_uri: redirectUri(),
    state,
    prompt: 'consent',
  })
  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

export interface AuthResult {
  token: string | null
  expiresIn: number | null
  scope: string | null
  error: string | null
  errorDescription: string | null
}

export function readAuthResponse(): AuthResult {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)

  const pick = (key: string) => hash.get(key) || search.get(key)

  const error = pick('error')
  const errorDescription = pick('error_description')
  const token = hash.get('access_token') || search.get('access_token')

  if (token) {
    const expected = sessionStorage.getItem(STATE_KEY)
    const state = pick('state')
    if (expected && state && expected !== state) {
      return {
        token: null,
        expiresIn: null,
        scope: null,
        error: 'state_mismatch',
        errorDescription: 'Estado de autenticação inválido. Tente entrar novamente.',
      }
    }
    sessionStorage.removeItem(STATE_KEY)
  }

  const expiresIn = Number(pick('expires_in'))

  return {
    token,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
    scope: pick('scope'),
    error: error ? decodeURIComponent(error) : null,
    errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : null,
  }
}

export const hasAuthPayload = () => {
  const url = `${window.location.search}${window.location.hash}`
  return /(^|[?&#])(access_token|error)=/.test(url)
}

export function explainAuthError(error: string | null, description: string | null): string {
  const detail = description ? ` (${description})` : ''
  switch (error) {
    case 'invalid_redirect_uri':
    case 'redirect_uri_mismatch':
      return `O redirect URI usado não está registrado no Developer Portal${detail}. Registre exatamente: ${redirectUri()}`
    case 'invalid_client':
      return `O Client ID ${CLIENT_ID} não foi reconhecido pelo Discord${detail}. Confira se ele pertence à sua aplicação.`
    case 'invalid_scope':
      return `Os escopos identify/guilds não estão habilitados na aplicação${detail}.`
    case 'access_denied':
      return 'Você cancelou a autorização no Discord. É preciso aceitar para usar o painel.'
    case 'state_mismatch':
      return description ?? 'Estado de autenticação inválido. Tente novamente.'
    default:
      return `${error ?? 'Erro desconhecido'}${detail}`
  }
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sessão do Discord expirada. Entre novamente.')
    if (res.status === 429) throw new Error('Muitas requisições ao Discord. Aguarde alguns segundos.')
    throw new Error(`Discord respondeu ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const fetchMe = (token: string) => get<DiscordUser>('/users/@me', token)

export const fetchGuilds = (token: string) => get<DiscordGuild[]>('/users/@me/guilds', token)

export function canManage(guild: DiscordGuild) {
  if (guild.owner) return true
  try {
    const perms = BigInt(guild.permissions || '0')
    return (perms & 8n) === 8n || (perms & 32n) === 32n
  } catch {
    return false
  }
}

export function permissionLabel(guild: DiscordGuild) {
  if (guild.owner) return 'dono'
  try {
    const perms = BigInt(guild.permissions || '0')
    if ((perms & 8n) === 8n) return 'administrador'
    if ((perms & 32n) === 32n) return 'gerenciar servidor'
  } catch {
    return 'sem permissão'
  }
}

export const guildIcon = (guild: DiscordGuild | null, size = 96) =>
  guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null

export const userAvatar = (user: DiscordUser | null, size = 64) =>
  user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`
    : null
