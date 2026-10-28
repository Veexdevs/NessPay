import { useState } from 'react'
import { CheckCircle2, CircleDashed, ExternalLink, KeyRound, Plug, TriangleAlert } from 'lucide-react'
import { Card, CardHeader, CopyButton, StatusBadge, useToast } from '@/components/ui'
import { integrations } from '@/data/mock'

const categories: { id: string; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'discord', label: 'Discord' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'dados', label: 'Dados' },
  { id: 'infra', label: 'Infra' },
]

export default function Integrations() {
  const [cat, setCat] = useState('todas')
  const { toast, toastNode } = useToast()
  const list = integrations.filter((i) => cat === 'todas' || i.category === cat)
  const missing = integrations.filter((i) => i.status !== 'conectado')

  return (
    <div className="space-y-4">
      <Card className="grain overflow-hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-500">checklist de conexão</p>
            <h2 className="mt-2 font-display text-[26px] leading-none text-white">
              FALTAM <span className="chrome-type">{missing.length} CONEXÕES</span>
            </h2>
            <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-400">
              O painel já está pronto no front. Para os dados serem reais, cada serviço abaixo precisa de
              credenciais no <span className="font-mono text-ink-200">.env</span> do bot e do servidor.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="font-display text-[30px] leading-none text-white">
                {integrations.filter((i) => i.status === 'conectado').length}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">conectadas</p>
            </div>
            <div>
              <p className="font-display text-[30px] leading-none text-ink-300">{missing.length}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">pendentes</p>
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
                <span className="flex h-9 w-9 items-center justify-center border border-ink-600 bg-black">
                  {i.status === 'conectado' ? (
                    <CheckCircle2 size={15} className="text-white" />
                  ) : i.required ? (
                    <TriangleAlert size={15} className="text-ink-300" />
                  ) : (
                    <CircleDashed size={15} className="text-ink-500" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
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
                status={i.status}
                label={i.status === 'conectado' ? 'conectado' : i.status === 'pendente' ? 'pendente' : 'off'}
              />
            </div>

            <div className="mt-3.5 border border-ink-800 bg-black/50 p-2.5">
              <p className="mb-1.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-600">
                <KeyRound size={9} /> variáveis necessárias
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

            <div className="mt-3 flex items-center gap-2">
              <button
                className={i.status === 'conectado' ? 'btn-ghost flex-1 py-2' : 'btn-primary flex-1 py-2'}
                onClick={() =>
                  toast(i.status === 'conectado' ? 'Credencial válida (simulação)' : 'Fluxo de conexão em breve')
                }
              >
                <Plug size={12} /> {i.status === 'conectado' ? 'Testar conexão' : 'Conectar'}
              </button>
              <a href={i.docs} target="_blank" rel="noreferrer" className="btn-ghost py-2">
                docs <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="O que precisa ser ligado"
          subtitle="ordem recomendada para colocar o bot no ar"
          icon={<Plug size={14} />}
        />
        <ol className="space-y-2">
          {[
            ['Discord — aplicação e bot', 'Crie a aplicação no Developer Portal, ative os intents (Guilds, GuildMessages, MessageContent) e copie o token.'],
            ['Discord — OAuth2', 'Configure o redirect URI do painel e o cargo que pode acessar o dashboard.'],
            ['Gateway de pagamento', 'Chaves de API + segredo do webhook para o bot confirmar Pix/cartão automaticamente.'],
            ['Banco de dados', 'Rodar as migrations de produtos, pedidos, cupons, tickets e entregas.'],
            ['Webhook público', 'URL https acessível para o gateway chamar de volta (não pode ser localhost).'],
            ['Canal de logs', 'Webhook do Discord que registra venda, entrega, reembolso e erro.'],
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
      {toastNode}
    </div>
  )
}
