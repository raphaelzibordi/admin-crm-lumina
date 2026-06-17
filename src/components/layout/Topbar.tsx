import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Topbar.css';

interface TopbarProps {
  clinicName?: string;
  right?: ReactNode;
  onToggleSidebar?: () => void;
}

const Topbar = ({ clinicName, right, onToggleSidebar }: TopbarProps) => {
  const location = useLocation();
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Derive breadcrumb from current path
  const pathMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/clinicas': 'Clínicas',
    '/faturamento': 'Faturamento',
    '/relatorios': 'Relatórios',
    '/feature-flags': 'Feature Flags',
    '/seguranca': 'Segurança / LGPD',
    '/equipe-admin': 'Equipe Admin',
  };

  const clinicSubpageMap: Record<string, string> = {
    clientes: 'Clientes',
    equipe: 'Equipe',
    procedimentos: 'Procedimentos',
    salas: 'Salas',
    agenda: 'Agenda',
    relatorios: 'Relatórios',
    comissoes: 'Comissões',
    faturamento: 'Faturamento',
    configuracoes: 'Configurações',
    seguranca: 'Segurança',
  };

  const segments = location.pathname.split('/').filter(Boolean);
  const isClinicDrilldown = segments[0] === 'clinicas' && segments.length > 2;
  const subpage = isClinicDrilldown ? segments[segments.length - 1] : null;
  const currentPageLabel = isClinicDrilldown
    ? clinicSubpageMap[subpage || ''] || subpage
    : pathMap[location.pathname] || '';

  return (
    <div className="topbar">
      {onToggleSidebar && (
        <button className="menu-toggle-btn" onClick={onToggleSidebar} title="Menu">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 3h12M2 8h12M2 13h12" />
          </svg>
        </button>
      )}
      <div className="bc">
        {isClinicDrilldown ? (
          <>
            <span className="bc-parent">Plataforma</span>
            <span className="sep bc-parent">›</span>
            <span className="bc-parent">Clínicas</span>
            <span className="sep bc-parent">›</span>
            <span className="clinic-pill">{clinicName || 'Clínica'}</span>
            <span className="sep">›</span>
            <span className="cur">{currentPageLabel}</span>
          </>
        ) : (
          <span className="cur">{currentPageLabel}</span>
        )}
      </div>
      <div className="tb-right">
        {right}
        <button className="logout-btn" onClick={handleLogout} title="Sair">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3l4 5-4 5M14 8H6M6 2H2v12h4"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
