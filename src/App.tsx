import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { hasAuthPayload } from '@/lib/discord'
import Layout from '@/components/Layout'
import Login from '@/pages/auth/Login'
import AuthCallback from '@/pages/auth/AuthCallback'
import KeyGate from '@/pages/auth/KeyGate'
import Servers from '@/pages/auth/Servers'
import Dashboard from '@/pages/Dashboard'
import Sales from '@/pages/Sales'
import Products from '@/pages/Products'
import Customers from '@/pages/Customers'
import Coupons from '@/pages/Coupons'
import Tickets from '@/pages/Tickets'
import Integrations from '@/pages/Integrations'
import SettingsPage from '@/pages/Settings'

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 border border-ink-700 px-4 py-2.5">
        <span className="h-1.5 w-1.5 animate-pulse-dot bg-white" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">carregando sessão</span>
      </div>
    </div>
  )
}

/** Exige Discord + Key verificada. */
function RequireAccess({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, keyVerified } = useSession()
  const location = useLocation()
  if (!ready) return <Loading />
  if (!authenticated) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (!keyVerified) return <Navigate to="/chave" replace />
  return <>{children}</>
}

/** Exige apenas Discord (usado na tela da Key). */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useSession()
  if (!ready) return <Loading />
  if (!authenticated) return <Navigate to="/entrar" replace />
  return <>{children}</>
}

/**
 * O Discord pode devolver o token em qualquer rota (ex.: se você cadastrou
 * a raiz do site como redirect). Aqui garantimos que ele vá para o callback.
 */
function AuthInterceptor() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/auth/callback' && hasAuthPayload()) {
      navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true })
    }
  }, [pathname, navigate])
  return null
}

export default function App() {
  return (
    <>
      <AuthInterceptor />
      <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/chave"
        element={
          <RequireAuth>
            <KeyGate />
          </RequireAuth>
        }
      />
      <Route
        path="/servidores"
        element={
          <RequireAccess>
            <Servers />
          </RequireAccess>
        }
      />

      <Route
        path="/app/:guildId"
        element={
          <RequireAccess>
            <Layout />
          </RequireAccess>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="vendas" element={<Sales />} />
        <Route path="produtos" element={<Products />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="cupons" element={<Coupons />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="integracoes" element={<Integrations />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </>
  )
}
