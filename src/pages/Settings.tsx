import { useEffect, useState } from 'react'
import { Bot, KeyRound, Save, Webhook } from 'lucide-react'
import { Card, CardHeader, KV, Switch, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { useSession } from '@/lib/session'
import { API_BASE, apiConfigured } from '@/lib/api'
import { guildIcon, userAvatar } from '@/lib/discord'

export default function SettingsPage() {
  const { settings, store, guild, guildId, store: { source } } = useGuild()
  const { updateSettings } = store
  const { user, keyValue, keyVerified, token } = useSession()
  const { toast, toastNode } = useToast()
  const [form, setForm] = useState(settings)

  useEffect(() => setForm(settings), [settings])

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)
  const icon = guildIcon(guild, 128)

  const save = async () => {
    try {
      await updateSettings(form)
      toast(source === 'api' ? 'Configurações enviadas ao bot' : 'Configurações salvas neste navegador')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao salvar')
    }
  }

  return (
    <div className="space-y-4">
      {dirty && (
        <div className="flex items-center justify-between border border-white bg-white px-4 py-2.5 text-black">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em]">alterações não salvas</span>
          <button onClick={() => void save()} className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em]">
            <Save size={11} /> salvar
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bot" subtitle="comportamento no seu servidor" icon={<Bot size={14} />} />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prefixo dos comandos</label>
                <input
                  className="field font-mono"
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value.slice(0, 3) })}
                />
              </div>
              <div>
                <label className="label">Moeda</label>
                <select
                  className="field"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value as 'BRL' | 'USD' | 'EUR' })}
                >
                  {['BRL', 'USD', 'EUR'].map((c) => (
                    <option key={c} className="bg-ink-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Canal de vendas</label>
              <input
                className="field"
                value={form.salesChannel}
                onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}
                placeholder="#vendas ou ID do canal"
              />
            </div>
            <div>
              <label className="label">Canal de logs</label>
              <input
                className="field"
                value={form.logsChannel}
                onChange={(e) => setForm({ ...form, logsChannel: e.target.value })}
                placeholder="#logs-nesspay ou ID do canal"
              />
            </div>
            <div>
              <label className="label">Expirar carrinho após (minutos)</label>
              <input
                className="field"
                value={String(form.cartTimeout)}
                onChange={(e) => setForm({ ...form, cartTimeout: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                inputMode="numeric"
              />
            </div>
            <button className="btn-primary w-full" onClick={() => void save()}>
              <Save size={13} /> Salvar configurações
            </button>
            <p className="text-[10.5px] leading-relaxed text-ink-600">
              Salvo neste navegador para o servidor {guild?.name ?? guildId}. Quando a API existir, esses valores passam
              a ser enviados para o banco.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Automação" subtitle="regras aplicadas em cada pedido" icon={<Webhook size={14} />} />
            <div className="space-y-2">
              {(
                [
                  ['dmDelivery', 'Entrega automática no DM', 'Enviar o produto assim que o pagamento for confirmado.'],
                  ['autoRefund', 'Reembolso automático', 'Devolver o valor se a entrega falhar.'],
                  ['antiFraud', 'Análise antifraude', 'Bloquear compras com padrão suspeito.'],
                  ['maintenance', 'Modo manutenção', 'Fechar o checkout e avisar os clientes.'],
                ] as const
              ).map(([key, title, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 border border-ink-800 bg-ink-900/40 px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] text-white">{title}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{desc}</p>
                  </div>
                  <Switch checked={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
                </div>
              ))}
            </div>
            <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-600">
              estas regras são aplicadas pelo bot — o painel apenas guarda a preferência
            </p>
          </Card>

          <Card>
            <CardHeader title="Sessão e licença" subtitle="o que está ativo agora" icon={<KeyRound size={14} />} />
            <div className="flex items-center gap-3 border border-ink-800 bg-ink-900/40 p-3">
              <img
                src={icon ?? userAvatar(user, 128) ?? undefined}
                alt=""
                className="h-11 w-11 border border-ink-600 bg-ink-800 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] text-white">{guild?.name ?? 'Servidor local'}</p>
                <p className="truncate font-mono text-[10px] text-ink-500">
                  {user ? `@${user.username}` : 'sem discord'} · {guildId}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <KV k="Key" v={keyVerified ? (keyValue ? `${keyValue.slice(0, 4)}-••••-••••` : 'acesso sem key') : 'não informada'} />
              <KV k="Token Discord" v={token ? 'ativo nesta sessão' : 'nenhum'} />
              <KV k="API" v={API_BASE || 'não configurada'} />
            </div>
          </Card>
        </div>
      </div>
      {toastNode}
    </div>
  )
}
