import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Sales from '@/pages/Sales'
import Products from '@/pages/Products'
import Customers from '@/pages/Customers'
import Coupons from '@/pages/Coupons'
import Tickets from '@/pages/Tickets'
import Integrations from '@/pages/Integrations'
import SettingsPage from '@/pages/Settings'
import Login from '@/pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/vendas" element={<Sales />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/clientes" element={<Customers />} />
        <Route path="/cupons" element={<Coupons />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/integracoes" element={<Integrations />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
