import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useFeatureFlags, normalizePlan } from '../../contexts/FeatureFlagsContext';
import { supabase } from '../../lib/supabase';
import './Sidebar.css';

interface ClinicContext {
  id: string;
  name: string;
  plan: string;
  health: number;
}

interface SidebarProps {
  clinicContext?: ClinicContext | null;
  onClose?: () => void;
}

const Icon = ({ d, special }: { d?: string; special?: string }) => (
  <svg className="ni" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    {special === 'grid' && (
      <>
        <rect x="1" y="1" width="6" height="6" rx="1"/>
        <rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/>
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </>
    )}
    {special === 'list' && <path d="M2 4h12M2 8h8M2 12h10"/>}
    {special === 'credit' && <><rect x="1" y="4" width="14" height="9" rx="1.5"/><path d="M1 7h14M5 11h2"/></>}
    {special === 'bars' && <path d="M3 14V6M7 14V2M11 14V9M15 14V5"/>}
    {special === 'settings' && <><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></>}
    {special === 'shield' && <path d="M8 1L14 4v4c0 3.5-2.5 6-6 7C2 14 2 8 2 8V4L8 1z"/>}
    {special === 'users' && <><circle cx="6" cy="4" r="2.5"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/><circle cx="12" cy="4" r="2"/><path d="M14 12c-.5-1.8-1.8-3-3.2-3.2"/></>}
    {special === 'clock' && <><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5v3.5l2 1.5"/></>}
    {special === 'building' && <path d="M2 14V2h12v12H2zM5 14v-5h6v5"/>}
    {special === 'calendar' && <><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 3V1M11 3V1M2 7h12"/></>}
    {special === 'commission' && <><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5v3l-2 2"/></>}
    {special === 'person' && <><circle cx="8" cy="5" r="2.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></>}
    {special === 'chat' && <><path d="M2 2h12v8H5l-3 3V2z" strokeLinejoin="round"/></>}
    {d && <path d={d}/>}
  </svg>
);

const SidebarNavItem = ({ to, icon, label, badge, onClick }: { to: string; icon: string; label: string; badge?: number; onClick?: () => void }) => (
  <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`} onClick={onClick}>
    <Icon special={icon} />
    <span className="nt">{label}</span>
    {badge !== undefined && <span className="nb">{badge}</span>}
  </NavLink>
);


const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const Sidebar = ({ clinicContext, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  const clinicId = clinicContext?.id;
  const plan = clinicContext ? normalizePlan(clinicContext.plan) : null;

  // Badge global: soma de mensagens não lidas de clínicas em todas as conversas de suporte.
  const [supportUnread, setSupportUnread] = useState(0);
  useEffect(() => {
    const loadUnread = async () => {
      const { data } = await supabase.from('support_conversations').select('unread_admin');
      setSupportUnread((data ?? []).reduce((sum, c: any) => sum + (c.unread_admin ?? 0), 0));
    };
    loadUnread();
    const channel = supabase
      .channel('support-admin-sidebar-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="sidebar">
      <div className="sb-logo">
        <div className="sb-wordmark">
          Lumina<span className="sb-tag">Admin</span>
        </div>
      </div>

      {clinicContext ? (
        <>
          <div className="sb-clinic-ctx">
            <div className="back" onClick={() => { navigate('/dashboard'); onClose?.(); }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 2L4 6l4 4"/>
              </svg>
              Voltar à plataforma
            </div>
            <div className="clinic-name">{clinicContext.name}</div>
            <div className="clinic-plan">
              Plano {PLAN_LABELS[clinicContext.plan] ?? clinicContext.plan} · Health {clinicContext.health}
            </div>
          </div>

          <div className="sb-sec">
            <div className="sb-sec-label">Operacional</div>
            <SidebarNavItem to={`/clinicas/${clinicId}/clientes`}      icon="person"   label="Clientes" onClick={onClose} />
            <SidebarNavItem to={`/clinicas/${clinicId}/equipe`}        icon="users"    label="Equipe" onClick={onClose} />
            <SidebarNavItem to={`/clinicas/${clinicId}/procedimentos`} icon="clock"    label="Procedimentos" onClick={onClose} />
            {isEnabled('gestao-salas', plan) && (
              <SidebarNavItem to={`/clinicas/${clinicId}/salas`}         icon="building" label="Salas" onClick={onClose} />
            )}
            <SidebarNavItem to={`/clinicas/${clinicId}/agenda`}        icon="calendar" label="Agenda" onClick={onClose} />
          </div>

          <div className="sb-sec">
            <div className="sb-sec-label">Financeiro</div>
            {isEnabled('relatorios-avancados', plan) && (
              <SidebarNavItem to={`/clinicas/${clinicId}/relatorios`}  icon="bars"       label="Relatórios" onClick={onClose} />
            )}
            {isEnabled('financeiro-avancado', plan) && (
              <SidebarNavItem to={`/clinicas/${clinicId}/comissoes`}   icon="commission" label="Comissões" onClick={onClose} />
            )}
            <SidebarNavItem to={`/clinicas/${clinicId}/faturamento`} icon="credit"     label="Faturamento" onClick={onClose} />
          </div>

          <div className="sb-sec">
            <div className="sb-sec-label">Admin</div>
            <SidebarNavItem to={`/clinicas/${clinicId}/configuracoes`} icon="settings" label="Configurações" onClick={onClose} />
            <SidebarNavItem to={`/clinicas/${clinicId}/seguranca`}     icon="shield"   label="Segurança" onClick={onClose} />
          </div>
        </>
      ) : (
        <>
          <div className="sb-sec">
            <div className="sb-sec-label">Plataforma</div>
            <SidebarNavItem to="/dashboard"  icon="grid" label="Dashboard" onClick={onClose} />
            <SidebarNavItem to="/clinicas"   icon="list" label="Clínicas" onClick={onClose} />
            <SidebarNavItem to="/atendimento" icon="chat" label="Atendimento" badge={supportUnread > 0 ? supportUnread : undefined} onClick={onClose} />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Financeiro</div>
            <SidebarNavItem to="/faturamento" icon="credit" label="Faturamento" onClick={onClose} />
            <SidebarNavItem to="/relatorios"  icon="bars"   label="Relatórios" onClick={onClose} />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Controle</div>
            <SidebarNavItem to="/feature-flags" icon="settings" label="Feature Flags" onClick={onClose} />
            <SidebarNavItem to="/seguranca"     icon="shield"   label="Segurança / LGPD" badge={3} onClick={onClose} />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Acesso</div>
            <SidebarNavItem to="/equipe-admin" icon="users" label="Equipe Admin" onClick={onClose} />
          </div>
        </>
      )}

      <div className="sb-footer">
        <div className="user-chip">
          <div className="avatar">RZ</div>
          <div>
            <div className="user-name">Raphael Z.</div>
            <div className="user-role">Owner · Super Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
