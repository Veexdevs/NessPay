import { useState } from 'react'
import { Bot, Palette, Save, ShieldCheck, Webhook } from 'lucide-react'
import { Card, CardHeader, KV, Switch, useToast } from '@/components/ui'

export default function SettingsPage() {
  const { toast, toastNode } = useToast()
  const [settings, setSettings] = useState({
    dmDelivery: true,
    autoRefund: false,
    maintenance: false,
    antiFraud: true,
    publicPanel: false,
  })
  const [form, setForm] = useState({
    prefix: '/',
    currency: 'BRL',
    channel: '🛒・vendas',
    logs: '📊・logs-nesspay',
    timeout: '30',
  })
  const flip = (k: keyof typeof settings) => setSettings({ ...settings, [k]: !settings[k] })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bot" subtitle="comportamento do NessPay no Discord" icon={<Bot size={14} />} />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prefixo</label>
                <input className="field font-mono" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
              </div>
              <div>
                <label className="label">Moeda</label>
                <select className="field" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {['BRL', 'USD', 'EUR'].map((c) => (
                    <option key={c} className="bg-ink-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Canal de vendas</label>
                <input className="field" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
              </div>
              <div>
                <label className="label">Canal de logs</label>
                <input className="field" value={form.logs} onChange={(e) => setForm({ ...form, logs: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Expirar carrinho após (minutos)</label>
              <input className="field" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: e.target.value })} inputMode="numeric" />
            </div>
            <button className="btn-primary w-full" onClick={() => toast('Configurações salvas (demonstração)')}>
              <Save size={13} /> Salvar alterações
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Automação e segurança" subtitle="regras aplicadas em todo pedido" icon={<ShieldCheck size={14} />} />
          <div className="space-y-2">
            {[
              ['dmDelivery', 'Entrega automática no DM', 'Envia o produto assim que o pagamento é confirmado.'],
              ['autoRefund', 'Reembolso automático', 'Devolve o valor se a entrega falhar duas vezes.'],
              ['antiFraud', 'Análise antifraude', 'Bloqueia compras com padrão suspeito de cartão.'],
              ['maintenance', 'Modo manutenção', 'Fecha o checkout e avisa os clientes no canal de vendas.'],
              ['publicPanel', 'Painel público', 'Permite que clientes consultem pedidos pelo site.'],
            ].map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between gap-4 border border-ink-800 bg-ink-900/40 px-3 py-2.5">
                <div>
                  <p className="text-[12.5px] text-white">{title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">{desc}</p>
                </div>
                <Switch checked={settings[key as keyof typeof settings]} onChange={() => flip(key as keyof typeof settings)} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Aparência do painel" subtitle="identidade visual" icon={<Palette size={14} />} />
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-white p-3">
              <div className="mb-2 flex gap-1">
                {['#000000', '#1a1a1a', '#5c5c5c', '#ffffff'].map((c) => (
                  <span key={c} className="h-6 flex-1 border border-ink-700" style={{ background: c }} />
                ))}
              </div>
              <p className="text-[12px] text-white">Mono Black</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-500">ativo</p>
            </div>
            <div className="border border-ink-700 p-3 opacity-50">
              <div className="mb-2 flex gap-1">
                {['#0ea5e9', '#6366f1', '#a855f7', '#ec4899'].map((c) => (
                  <span key={c} className="h-6 flex-1" style={{ background: c }} />
                ))}
              </div>
              <p className="text-[12px] text-ink-200">Colorful</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-600">indisponível</p>
            </div>
          </div>
          <div className="mt-3">
            <KV k="Fonte display" v="Anton" />
            <KV k="Fonte interface" v="Space Grotesk" />
            <KV k="Fonte mono" v="JetBrains Mono" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Webhook e API" subtitle="endpoints usados pelo bot" icon={<Webhook size={14} />} />
          <div className="space-y-2">
            {[
              ['POST', '/api/webhooks/pagamento'],
              ['POST', '/api/webhooks/discord'],
              ['GET', '/api/orders'],
              ['POST', '/api/orders/:id/refund'],
            ].map(([m, path]) => (
              <div key={path} className="flex items-center gap-2 border border-ink-800 bg-black/50 px-2.5 py-2">
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                    m === 'GET' ? 'border-ink-600 text-ink-300' : 'border-white bg-white text-black'
                  }`}
                >
                  {m}
                </span>
                <span className="font-mono text-[11px] text-ink-200">{path}</span>
                <span className="ml-auto tag border-ink-600 text-ink-500">não implementado</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border border-dashed border-ink-700 p-2.5 text-[11px] leading-relaxed text-ink-400">
            Esses endpoints ainda não existem no projeto — é o próximo passo do backend para o painel deixar de
            usar dados de demonstração.
          </p>
        </Card>
      </div>
      {toastNode}
    </div>
  )
}
