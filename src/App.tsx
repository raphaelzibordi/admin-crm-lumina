import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './components/Login/Login'
import { Loader2 } from 'lucide-react'
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext'

// Platform-level pages
import GlobalDashboard from './pages/GlobalDashboard'
import Clinicas from './pages/Clinicas'
import Faturamento from './pages/Faturamento'
import RelatoriosPlataforma from './pages/RelatoriosPlataforma'
import FeatureFlags from './pages/FeatureFlags'
import Seguranca from './pages/Seguranca'
import EquipeAdmin from './pages/EquipeAdmin'

// Clinic drill-down pages
import EquipeClinica from './pages/clinica/EquipeClinica'
import ProcedimentosClinica from './pages/clinica/ProcedimentosClinica'
import SalasClinica from './pages/clinica/SalasClinica'
import RelatoriosClinica from './pages/clinica/RelatoriosClinica'
import AgendaClinica from './pages/clinica/AgendaClinica'
import FaturamentoClinica from './pages/clinica/FaturamentoClinica'
import SegurancaClinica from './pages/clinica/SegurancaClinica'
import ConfiguracoesClinica from './pages/clinica/ConfiguracoesClinica'
import ClientesClinica from './pages/clinica/ClientesClinica'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)' }}>
        <Loader2 className="animate-spin" size={40} color="#587c71" />
      </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />
  }

  return (
    <FeatureFlagsProvider>
    <BrowserRouter>
      <Routes>
        {/* Platform Level */}
        <Route path="/dashboard"     element={<GlobalDashboard />} />
        <Route path="/clinicas"      element={<Clinicas />} />
        <Route path="/faturamento"   element={<Faturamento />} />
        <Route path="/relatorios"    element={<RelatoriosPlataforma />} />
        <Route path="/feature-flags" element={<FeatureFlags />} />
        <Route path="/seguranca"     element={<Seguranca />} />
        <Route path="/equipe-admin"  element={<EquipeAdmin />} />

        {/* Clinic Drill-down Level */}
        <Route path="/clinicas/:clinicId/clientes"       element={<ClientesClinica />} />
        <Route path="/clinicas/:clinicId/equipe"        element={<EquipeClinica />} />
        <Route path="/clinicas/:clinicId/procedimentos" element={<ProcedimentosClinica />} />
        <Route path="/clinicas/:clinicId/salas"         element={<SalasClinica />} />
        <Route path="/clinicas/:clinicId/agenda"        element={<AgendaClinica />} />
        <Route path="/clinicas/:clinicId/relatorios"    element={<RelatoriosClinica />} />
        <Route path="/clinicas/:clinicId/comissoes"     element={<RelatoriosClinica />} />
        <Route path="/clinicas/:clinicId/faturamento"   element={<FaturamentoClinica />} />
        <Route path="/clinicas/:clinicId/seguranca"     element={<SegurancaClinica />} />
        <Route path="/clinicas/:clinicId/configuracoes" element={<ConfiguracoesClinica />} />
        <Route path="/clinicas/:clinicId/*"             element={<EquipeClinica />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </FeatureFlagsProvider>
  )
}

export default App
