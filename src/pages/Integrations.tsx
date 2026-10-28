import { useState } from 'react'
import { CheckCircle2, CircleDashed, ExternalLink, KeyRound, Plug } from 'lucide-react'
import { Card, CardHeader, CopyButton, StatusBadge } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { useSession } from '@/lib/session'
import { API_BASE, apiConfigured } from '@/lib/api'
import { oauthConfigured, redirectUri } from '@/lib/discord'

type State = 'conectado' | 'pendente' | 'desconhecido'

interface Item {
  id: string
  name: string
  description: string
  category: 'discord' | 'pagamento' | 'dados' | 'infra'
  state: State
  envKeys: string[]
  docs: string
  required: boolean
  note: string
}

export default function Integrations() {
  const { guild, settings } = useGuild()
  const { keyValue, keyVerified, guilds } = useSession()
  const [cat, setCat] = useState('todas')

  const items: Item[] = [
    {
      id: 'discord-oauth',
      name: 'Discord OAuth2 (login do painel)',
      description: 'Login obrigatório pelo Discord. Lê sua conta e a lista de servidores onde você administra.',
      category: 'discord',
      state: oauthConfigured() ? (guild ? 'conectado' : 'pendente') : 'pendente',
      envKeys: ['VITE_DISCORD_CLIENT_ID'],
      docs: 'https://discord.com/developers/applications',
      required: true,
      note: oauthConfigured()
        ? `Client ID detectado · redirect ${redirectUri()}`
        : 'O painel está em modo de configuração: sem Client ID não conseguimos listar seus servidores.',
    },
    {
      id: 'discord-bot',
      name: 'Bot do Discord (token)',
      description: 'Token do bot, intents e ID do servidor onde ele vai publicar o painel de vendas.',
      category: 'discord',
      state: 'desconhecido',
      envKeys: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'],
      docs: 'https://discord.com/developers/docs/topics/gateway',
      required: true,
      note: 'Essas credenciais ficam só no backend — o painel não consegue verificá-las daqui.',
    },
    {
      id: 'license',
      name: 'API de licenças (Key)',
      description: 'Valida a Key recebida na compra e libera o acesso ao painel.',
      category: 'infra',
      state: keyVerified ? (keyValue ? 'conectado' : 'pendente') : 'pendente',
      envKeys: ['LICENSE_API_URL', 'LICENSE_SECRET'],
      docs: '#',
      required: true,
      note: keyVerified
        ? keyValue
          ? `Key informada nesta sessão (formato ${keyValue.slice(0, 4)}-••••) — ainda não validada no servidor.`
          : 'Acesso liberado sem Key: a validação real ainda não foi implementada.'
        : 'Informe a Key na tela de acesso.',
    },
    {
      id: 'api',
      name: 'API do bot (pedidos, clientes, tickets)',
      description: 'Endpoints que alimentam vendas, clientes e tickets deste painel.',
      category: 'dados',
      state: apiConfigured() ? 'pendente' : 'pendente',
      envKeys: ['VITE_API_URL'],
      docs: '#',
      required: true,
      note: apiConfigured() ? `Apontando para ${API_BASE}` : 'Não definido: todas as listas de vendas ficam vazias (sem dados simulados).',
    },
    {
      id: 'gateway',
      name: 'Gateway de pagamento',
      description: 'Mercado Pago, Stripe ou outro — cria a cobrança e confirma o pagamento por webhook.',
      category: 'pagamento',
      state: 'desconhecido',
      envKeys: ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET'],
      docs: 'https://www.mercadopago.com.br/developers',
      required: true,
      note: 'Sem webhook validado o bot não pode entregar automaticamente.',
    },
    {
      id: 'database',
      name: 'Banco de dados',
      description: 'Onde ficam produtos, pedidos, cupons, tickets e o estoque das entregas.',
      category: 'dados',
      state: 'desconhecido',
      envKeys: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      docs: 'https://supabase.com/dashboard',
      required: true,
      note: 'Hoje produtos e cupons que você cria ficam salvos no navegador (localStorage).',
    },
    {
      id: 'webhook',
      name: 'Webhook público',
      description: 'URL https que o gateway chama para avisar que o pagamento caiu.',
      category: 'infra',
      state: 'desconhecido',
      envKeys: ['PUBLIC_WEBHOOK_URL'],
      docs: '#',
      required: true,
      note: 'Precisa ser acessível pela internet — localhost não funciona.',
    },
    {
      id: 'logs',
      name: 'Canal de logs',
      description: 'Webhook do Discord onde cada venda, entrega e erro é registrado.',
      category: 'discord',
      state: settings.logsChannel ? 'pendente' : 'pendente',
      envKeys: ['DISCORD_LOG_WEBHOOK'],
      docs: 'https://support.discord.com/hc/articles/228383668',
      required: false,
      note: settings.logsChannel ? `Canal definido: ${settings.logsChannel}` : 'Defina o canal em Configurações.',
    },
  ]

  const categories = [
    { id: 'todas', label: 'Todas' },
    { id: 'discord', label: 'Discord' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'dados', label: 'Dados' },
    { id: 'infra', label: 'Infra' },
  ]
  const list = items.filter((i) => cat === 'todas' || i.category === cat)
  const done = items.filter((i) => i.state === 'conectado').length

  return (
    <div className="space-y-4">
      <Card className="grain overflow-hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-500">estado real das conexões</p>
            <h2 className="mt-2 display-tight text-[24px] leading-none text-white">
              {done} DE {items.length} CONECTADAS
            </h2>
            <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-400">
              Isto é verificado de verdade: OAuth do Discord, Key da sessão e URL da API. O que o painel não consegue
              ver (token do bot, gateway, banco) aparece como <span className="text-ink-200">não verificável</span> — não
              como conectado.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="font-display text-[26px] leading-none text-white">{guilds.length}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">servidores lidos</p>
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-ink-300">{keyVerified ? 'ok' : '—'}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">key</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
              cat === c.id ? 'border-white bg-white text-black' : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((i) => (
          <div key={i.id} className="panel panel-hover p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-600 bg-black">
                  {i.state === 'conectado' ? (
                    <CheckCircle2 size={15} className="text-white" />
                  ) : (
                    <CircleDashed size={15} className={i.state === 'pendente' ? 'text-ink-300' : 'text-ink-600'} />
                  )}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13px] font-medium text-white">{i.name}</h3>
                    {i.required && (
                      <span className="border border-ink-600 px-1 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-400">
                        essencial
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{i.description}</p>
                </div>
              </div>
              <StatusBadge
                status={i.state === 'conectado' ? 'conectado' : i.state === 'pendente' ? 'pendente' : 'desconectado'}
                label={i.state === 'conectado' ? 'ok' : i.state === 'pendente' ? 'pendente' : 'não verificável'}
              />
            </div>

            <p className="mt-3 border-l-2 border-ink-700 pl-2.5 text-[11px] leading-relaxed text-ink-500">{i.note}</p>

            <div className="mt-3 border border-ink-800 bg-black/50 p-2.5">
              <p className="mb-1.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600">
                <KeyRound size={9} /> variáveis
              </p>
              <div className="flex flex-wrap gap-1.5">
                {i.envKeys.map((k) => (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
                  >
                    {k}
                    <CopyButton value={k} label="copy" />
                  </span>
                ))}
              </div>
            </div>

            {i.docs !== '#' && (
              <a
                href={i.docs}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-400 transition-colors hover:text-white"
              >
                documentação <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Ordem recomendada"
          subtitle="para o bot sair da demonstração e começar a vender de verdade"
          icon={<Plug size={14} />}
        />
        <ol className="space-y-2">
          {[
            ['Discord — aplicação e OAuth2', 'Crie a aplicação, adicione o redirect URI do painel e copie o Client ID.'],
            ['Backend da API', 'Rotas de pedidos, produtos, clientes, tickets e licença.'],
            ['Banco de dados', 'Migrar produtos e cupons do navegador para o banco.'],
            ['Gateway de pagamento', 'Chaves de API + segredo do webhook.'],
            ['Webhook público', 'URL https apontando para a API.'],
            ['Bot no servidor', 'Convidar o bot com permissões de leitura e envio de mensagens.'],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-3 border border-ink-800 bg-ink-900/40 p-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-ink-600 font-mono text-[10px] text-ink-300">
                {i + 1}
              </span>
              <div>
                <p className="text-[12.5px] text-white">{title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
