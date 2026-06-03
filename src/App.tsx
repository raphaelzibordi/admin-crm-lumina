import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './components/Login/Login'
import Dashboard from './components/Dashboard/Dashboard'
import { Loader2 } from 'lucide-react'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f3' }}>
        <Loader2 className="animate-spin" size={40} color="#587c71" />
      </div>
    )
  }

  return (
    <div className="App">
      {!session ? (
        <Login onLoginSuccess={() => {}} />
      ) : (
        <Dashboard onLogout={() => {}} />
      )}
    </div>
  )
}

export default App
