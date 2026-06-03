import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './components/Login/Login'
import { Loader2 } from 'lucide-react'

// Platform-level pages
import GlobalDashboard from './pages/GlobalDashboard'
import Faturamento from './pages/Faturamento'
import Seguranca from './pages/Seguranca'
import EquipeAdmin from './pages/EquipeAdmin'

// Clinic drill-down pages
import EquipeClinica from './pages/clinica/EquipeClinica'
import ProcedimentosClinica from './pages/clinica/ProcedimentosClinica'
import SalasClinica from './pages/clinica/SalasClinica'
import RelatoriosClinica from './pages/clinica/RelatoriosClinica'

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
    <BrowserRouter>
      <Routes>
        {/* Platform Level */}
        <Route path="/dashboard"    element={<GlobalDashboard />} />
        <Route path="/clinicas"     element={<GlobalDashboard />} />
        <Route path="/faturamento"  element={<Faturamento />} />
        <Route path="/relatorios"   element={<Faturamento />} />
        <Route path="/feature-flags" element={<Faturamento />} />
        <Route path="/seguranca"    element={<Seguranca />} />
        <Route path="/equipe-admin" element={<EquipeAdmin />} />

        {/* Clinic Drill-down Level */}
        <Route path="/clinicas/:clinicId/equipe"        element={<EquipeClinica />} />
        <Route path="/clinicas/:clinicId/procedimentos" element={<ProcedimentosClinica />} />
        <Route path="/clinicas/:clinicId/salas"         element={<SalasClinica />} />
        <Route path="/clinicas/:clinicId/relatorios"    element={<RelatoriosClinica />} />
        <Route path="/clinicas/:clinicId/comissoes"     element={<RelatoriosClinica />} />
        <Route path="/clinicas/:clinicId/*"             element={<EquipeClinica />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
