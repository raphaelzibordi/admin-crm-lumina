import { LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Dashboard.css';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="dashboard-logo">Gerenciamento Lumina</div>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={16} />
          Sair
        </button>
      </header>
      <main className="dashboard-content">
        <h1>Bem-vindo ao Painel!</h1>
        <p>Você está logado como root. O backoffice será implementado aqui.</p>
      </main>
    </div>
  );
};

export default Dashboard;
