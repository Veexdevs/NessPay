import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, KeyRound, Plus, RefreshCw, ShieldOff, Timer } from 'lucide-react'
import { Card, CardHeader, CopyButton, EmptyState, Modal, StatCard, useToast } from '@/components/ui'
import { useGuild } from '@/lib/useGuild'
import { api, apiConfigured, type ApiLicense } from '@/lib/api'
import { dateTime, num, relative } from '@/lib/format'

export default function Licenses() {
  const { guildId } = useGuild()
  const { toast, toastNode } = useToast()
  const [rows, setRows] = useState<ApiLicense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ userId: '', days: '30', note: '' })
  const [busy, setBusy] = useState(false)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [extendFor, setExtendFor] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState('30')

  const load = useCallback(async () => {
    if (!apiConfigured()) return
    setLoading(true)
    setError(null)
    try {
      setRows(await api.licenses())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar as Keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const active = rows.filter((row) => row.active)
  const expiring = rows.filter((row) => {
    if (!row.active) return false
    const diff = new Date(row.expiresAt).getTime() - Date.now()
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000
  })

  const generate = async () => {
    const userId = draft.userId.replace(/\D/g, '')
    const days = Number(draft.days.replace(/\D/g, ''))
    if (userId.length < 15) {
      toast('Informe o ID do Discord do usuário')
      return
    }
    if (!days || days <= 0) {
      toast('Informe a quantidade de dias')
      return
    }
    setBusy(true)
    try {
      const created = await api.createLicense({ userId, days, note: draft.note })
      setLastKey(created.key)
      setOpen(false)
      setDraft({ userId: '', days: '30', note: '' })
      await load()
      toast('Key gerada')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao gerar a Key')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (key: string) => {
    try {
      await api.revokeLicense(key)
      await load()
      toast('Key revogada')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao revogar')
    }
  }

  const extend = async () => {
    if (!extendFor) return
    const days = Number(extendDays.replace(/\D/g, ''))
    if (!days) {
      toast('Informe quantos dias adicionar')
      return
    }
    try {
      await api.extendLicense(extendFor, days)
      setExtendFor(null)
      await load()
      toast(`${days} dias adicionados`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao estender')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Keys geradas" value={num(rows.length)} hint="total no bot" />
        <StatCard label="Ativas" value={num(active.length)} hint="com acesso liberado" />
        <StatCard label="Expirando em 3 dias" value={num(expiring.length)} hint="renovar agora" />
        <StatCard
          label="Revogadas"
          value={num(rows.filter((row) => row.revoked).length)}
          hint="acesso encerrado"
        />
      </div>

      <Card className="grain overflow-hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-500">licenças por tempo</p>
            <h2 className="mt-2 display-tight text-[22px] leading-tight text-white">GERAR KEY MANUAL</h2>
            <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-ink-400">
              Cada Key pertence a um único ID do Discord e vale pelo número de dias escolhido. Quando o tempo acaba, o
              bot apaga a Key e o usuário perde o acesso automaticamente.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="btn-ghost">
              <RefreshCw size={12} /> atualizar
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)} disabled={!apiConfigured()}>
              <Plus size={13} /> Gerar Key
            </button>
          </div>
        </div>
      </Card>

      {lastKey && (
        <div className="flex flex-col gap-2 border border-white bg-white p-3.5 text-black sm:flex-row sm:items-center">
          <KeyRound size={15} />
          <span className="font-mono text-[13px] font-bold tracking-[0.16em]">{lastKey}</span>
          <span className="text-[11px] uppercase tracking-[0.1em] text-ink-700">enviada para o usuário no Discord</span>
          <div className="sm:ml-auto">
            <button onClick={() => setLastKey(null)} className="font-mono text-[10px] uppercase tracking-[0.1em] underline">
              fechar
            </button>
          </div>
        </div>
      )}

      {!apiConfigured() ? (
        <EmptyState
          icon={<KeyRound size={16} />}
          title="API do bot não configurada"
          hint="Defina VITE_API_URL apontando para a API do bot (porta 8000 por padrão) para gerar e revogar Keys por aqui."
        />
      ) : (
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">Keys</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
              {loading ? 'carregando' : `${rows.length} registros`}
            </span>
          </div>

          {error ? (
            <div className="p-4">
              <EmptyState icon={<KeyRound size={16} />} title="Erro ao carregar" hint={error} />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<KeyRound size={16} />}
                title="Nenhuma Key gerada"
                hint="Gere a primeira Key informando o ID do Discord do cliente e os dias de acesso."
                action={
                  <button className="btn-primary" onClick={() => setOpen(true)}>
                    <Plus size={13} /> Gerar Key
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-ink-900/50">
                    <th className="th">Key</th>
                    <th className="th">ID do Discord</th>
                    <th className="th">Dias</th>
                    <th className="th">Expira</th>
                    <th className="th">Situação</th>
                    <th className="th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-ink-800/70 hover:bg-ink-850/60">
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11.5px] text-white">{row.key}</span>
                          <CopyButton value={row.key} label="copiar" />
                        </div>
                      </td>
                      <td className="td font-mono text-[11px] text-ink-400">{row.userId}</td>
                      <td className="td font-mono">{row.days}</td>
                      <td className="td font-mono text-[11px] text-ink-300">
                        {dateTime(row.expiresAt)} <span className="text-ink-600">({relative(row.expiresAt)})</span>
                      </td>
                      <td className="td">
                        <span
                          className={`tag ${
                            row.revoked
                              ? 'border-ink-700 text-ink-500'
                              : row.active
                                ? 'border-white bg-white text-black'
                                : 'border-ink-600 text-ink-400'
                          }`}
                        >
                          {row.revoked ? 'revogada' : row.active ? 'ativa' : 'expirada'}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setExtendFor(row.key)
                              setExtendDays('30')
                            }}
                            className="flex items-center gap-1 border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white"
                          >
                            <Timer size={9} /> +dias
                          </button>
                          <button
                            onClick={() => setConfirmRevoke(row.key)}
                            disabled={row.revoked}
                            className="flex items-center gap-1 border border-ink-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors hover:border-white hover:text-white disabled:opacity-40"
                          >
                            <ShieldOff size={9} /> revogar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader
          title="Como a licença funciona"
          subtitle="regras aplicadas pelo bot em tempo real"
          icon={<CalendarClock size={14} />}
        />
        <ul className="space-y-2">
          {[
            ['Vínculo com o usuário', 'A Key só funciona para o ID do Discord que você informou ao gerar.'],
            ['Contagem regressiva', 'O bot verifica as licenças a cada minuto e apaga as vencidas.'],
            ['Perda de acesso', 'Sem licença ativa, os comandos da loja respondem com aviso de acesso restrito.'],
            ['Aviso por DM', 'Ao expirar, o usuário recebe uma mensagem avisando que a Key foi removida.'],
          ].map(([title, detail]) => (
            <li key={title} className="flex gap-3 border border-ink-800 bg-ink-900/40 p-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-white" />
              <div>
                <p className="text-[12.5px] text-white">{title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-600">servidor {guildId}</p>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Gerar Key manual"
        eyebrow="licenças"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={() => void generate()} disabled={busy}>
              Gerar Key
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label">ID do Discord do cliente</label>
            <input
              className="field font-mono"
              value={draft.userId}
              onChange={(event) => setDraft({ ...draft, userId: event.target.value })}
              placeholder="1561323387320668193"
              inputMode="numeric"
            />
            <p className="mt-1.5 text-[10.5px] text-ink-500">
              A Key funciona apenas para este usuário. Ative o modo desenvolvedor no Discord para copiar o ID.
            </p>
          </div>
          <div>
            <label className="label">Dias de acesso</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[7, 15, 30, 60, 90, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => setDraft({ ...draft, days: String(days) })}
                  className={`border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                    draft.days === String(days)
                      ? 'border-white bg-white text-black'
                      : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-white'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <input
              className="field font-mono"
              value={draft.days}
              onChange={(event) => setDraft({ ...draft, days: event.target.value })}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label">Observação (opcional)</label>
            <input
              className="field"
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              placeholder="cliente do plano mensal"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!extendFor}
        onClose={() => setExtendFor(null)}
        title="Adicionar dias"
        eyebrow={extendFor ?? undefined}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setExtendFor(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={() => void extend()}>
              Adicionar
            </button>
          </>
        }
      >
        <label className="label">Quantos dias adicionar</label>
        <input
          className="field font-mono"
          value={extendDays}
          onChange={(event) => setExtendDays(event.target.value)}
          inputMode="numeric"
        />
        <p className="mt-2 text-[11px] text-ink-500">
          Se a Key já expirou, a contagem recomeça a partir de agora.
        </p>
      </Modal>

      <Modal
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        title="Revogar Key"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmRevoke(null)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                const target = confirmRevoke
                setConfirmRevoke(null)
                if (target) void revoke(target)
              }}
            >
              Revogar agora
            </button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-ink-300">
          O usuário perde o acesso imediatamente e recebe um aviso por mensagem direta.
        </p>
      </Modal>
      {toastNode}
    </div>
  )
}
