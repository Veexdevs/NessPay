/**
 * Integração real com o Discord (OAuth2 implicit grant, sem backend).
 * Para funcionar, defina VITE_DISCORD_CLIENT_ID no .env.
 */

export const DISCORD_API = 'https://discord.com/api/v10'

export const CLIENT_ID = (import.meta.env.VITE_DISCORD_CLIENT_ID ?? '').trim()

export const oauthConfigured = () => /^\d{15,25}$/.test(CLIENT_ID)

export const redirectUri = () => `${window.location.origin}/auth/callback`

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

export function readAuthResponse(): { token: string | null; error: string | null } {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return { token: null, error: null }
  const params = new URLSearchParams(hash)
  const error = params.get('error_description') ?? params.get('error')
  const token = params.get('access_token')
  if (token) {
    const expected = sessionStorage.getItem(STATE_KEY)
    const state = params.get('state')
    if (expected && state && expected !== state) {
      return { token: null, error: 'Estado de autenticação inválido. Tente novamente.' }
    }
    sessionStorage.removeItem(STATE_KEY)
  }
  return { token, error }
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sessão do Discord expirada. Entre novamente.')
    throw new Error(`Discord respondeu ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const fetchMe = (token: string) => get<DiscordUser>('/users/@me', token)

export const fetchGuilds = (token: string) => get<DiscordGuild[]>('/users/@me/guilds', token)

/** ADMINISTRATOR (0x8) ou MANAGE_GUILD (0x20) ou ser o dono */
export function canManage(guild: DiscordGuild) {
  if (guild.owner) return true
  const perms = BigInt(guild.permissions || '0')
  const ADMIN = 8n
  const MANAGE_GUILD = 32n
  return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD
}

export function permissionLabel(guild: DiscordGuild) {
  if (guild.owner) return 'dono'
  const perms = BigInt(guild.permissions || '0')
  if ((perms & 8n) === 8n) return 'administrador'
  if ((perms & 32n) === 32n) return 'gerenciar servidor'
  return 'sem permissão'
}

export const guildIcon = (guild: DiscordGuild | null, size = 96) =>
  guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null

export const userAvatar = (user: DiscordUser | null, size = 64) =>
  user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`
    : null
