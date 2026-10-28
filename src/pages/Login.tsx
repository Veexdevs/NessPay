import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { useState } from 'react'

export default function Login() {
  const [hover, setHover] = useState(false)

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [background-size:44px_44px] opacity-[0.35]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-3xl" />

      <div className="relative w-full max-w-[880px] border border-ink-700 bg-ink-900/80 backdrop-blur-xl">
        <div className="grid md:grid-cols-2">
          {/* lado esquerdo */}
          <div className="grain relative hidden flex-col justify-between border-r border-ink-800 p-8 md:flex">
            <div className="hatch pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative">
              <div className="font-display text-[30px] leading-none">
                <span className="chrome-type">NESS</span>
                <span className="text-white">PAY</span>
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.34em] text-ink-500">application</p>
            </div>
            <img
              src="/assets/nesspay-mascot.png"
              alt="Mascote"
              className="relative mx-auto my-6 h-[150px] w-auto object-contain saturate-0"
            />
            <div className="relative">
              <p className="text-[13px] leading-relaxed text-ink-300">
                O painel de quem vende no Discord. Pedidos, entregas e suporte sem sair do preto e branco.
              </p>
              <div className="mt-4 flex gap-4">
                {[
                  ['3', 'servidores'],
                  ['2.7k', 'pedidos'],
                  ['34,8%', 'conversão'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <p className="font-display text-[18px] leading-none text-white">{v}</p>
                    <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* lado direito */}
          <div className="p-7 sm:p-9">
            <div className="mb-6 flex items-center gap-2">
              <Lock size={13} className="text-ink-400" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400">acesso restrito</span>
            </div>
            <h1 className="font-display text-[30px] leading-none text-white">ENTRAR NO PAINEL</h1>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
              Autentique com a conta Discord que possui o cargo de administrador do NessPay.
            </p>

            <Link
              to="/"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className="mt-6 flex w-full items-center justify-between border border-white bg-white px-4 py-3 text-black transition-all hover:bg-ink-100"
            >
              <span className="flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.3.7a14 14 0 0 1 4.2 1.4 13.9 13.9 0 0 0-11-.5l-.4.5A19 19 0 0 0 3.7 4.5C.6 9.2-.2 13.8.2 18.4a19.2 19.2 0 0 0 5.8 3l.7-1.2c-.8-.3-1.6-.7-2.3-1.1l.5-.4a13.7 13.7 0 0 0 10.4 0l.5.4c-.7.4-1.5.8-2.3 1.1l.7 1.2a19.2 19.2 0 0 0 5.8-3c.5-5.3-.8-9.8-2.7-13.9ZM8.3 15.5c-1.1 0-2-1-2-2.2 0-1.3.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.2-2 2.2Zm7.4 0c-1.1 0-2-1-2-2.2 0-1.3.9-2.3 2-2.3s2 1 2 2.3c0 1.2-.9 2.2-2 2.2Z" />
                </svg>
                Continuar com Discord
              </span>
              <ArrowRight size={15} className={`transition-transform ${hover ? 'translate-x-1' : ''}`} />
            </Link>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-800" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600">ou</span>
              <span className="h-px flex-1 bg-ink-800" />
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="label">E-mail do staff</label>
                <input className="field" placeholder="voce@nesspay.gg" />
              </div>
              <div>
                <label className="label">Senha</label>
                <input type="password" className="field" placeholder="••••••••" />
              </div>
              <Link to="/" className="btn-ghost w-full">
                Entrar com e-mail
              </Link>
            </div>

            <p className="mt-5 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.1em] text-ink-600">
              demonstração · nenhuma credencial é validada nesta tela
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
