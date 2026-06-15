import { NavLink, useNavigate } from 'react-router-dom';
import { useFeatureFlags, normalizePlan } from '../../contexts/FeatureFlagsContext';
import './Sidebar.css';

interface ClinicContext {
  id: string;
  name: string;
  plan: string;
  health: number;
}

interface SidebarProps {
  clinicContext?: ClinicContext | null;
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
    {special === 'lock' && (
      <>
        <rect x="3" y="7" width="10" height="7" rx="1.5"/>
        <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
      </>
    )}
    {d && <path d={d}/>}
  </svg>
);

const SidebarNavItem = ({ to, icon, label, badge }: { to: string; icon: string; label: string; badge?: number }) => (
  <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
    <Icon special={icon} />
    <span className="nt">{label}</span>
    {badge !== undefined && <span className="nb">{badge}</span>}
  </NavLink>
);

const LockedNavItem = ({ icon, label, requiredPlan }: { icon: string; label: string; requiredPlan: string }) => (
  <div className="nav-item" style={{ opacity: 0.45, cursor: 'default', userSelect: 'none' }}>
    <Icon special={icon} />
    <span className="nt">{label}</span>
    <span
      style={{
        marginLeft: 'auto',
        fontSize: 9,
        fontWeight: 700,
        color: '#7c3aed',
        background: '#f5f3ff',
        padding: '1px 5px',
        borderRadius: 3,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Icon special="lock" />
      {requiredPlan}
    </span>
  </div>
);

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const Sidebar = ({ clinicContext }: SidebarProps) => {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  const clinicId = clinicContext?.id;
  const plan = normalizePlan(clinicContext?.plan ?? '');

  const canAccess = (flagId: string) => isEnabled(flagId, plan);

  const planLabel = (requiredPlan: 'pro' | 'enterprise') => PLAN_LABELS[requiredPlan];

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
            <div className="back" onClick={() => navigate('/dashboard')}>
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
            <SidebarNavItem to={`/clinicas/${clinicId}/equipe`}        icon="users"    label="Equipe" />
            <SidebarNavItem to={`/clinicas/${clinicId}/procedimentos`} icon="clock"    label="Procedimentos" />
            {canAccess('gestao-salas')
              ? <SidebarNavItem to={`/clinicas/${clinicId}/salas`} icon="building" label="Salas" />
              : <LockedNavItem icon="building" label="Salas" requiredPlan={planLabel('pro')} />
            }
            <SidebarNavItem to={`/clinicas/${clinicId}/agenda`}        icon="calendar" label="Agenda" />
          </div>

          <div className="sb-sec">
            <div className="sb-sec-label">Financeiro</div>
            {canAccess('relatorios-avancados')
              ? <SidebarNavItem to={`/clinicas/${clinicId}/relatorios`} icon="bars" label="Relatórios" />
              : <LockedNavItem icon="bars" label="Relatórios" requiredPlan={planLabel('pro')} />
            }
            {canAccess('financeiro-avancado')
              ? <SidebarNavItem to={`/clinicas/${clinicId}/comissoes`} icon="commission" label="Comissões" />
              : <LockedNavItem icon="commission" label="Comissões" requiredPlan={planLabel('pro')} />
            }
            <SidebarNavItem to={`/clinicas/${clinicId}/faturamento`} icon="credit" label="Faturamento" />
          </div>

          <div className="sb-sec">
            <div className="sb-sec-label">Admin</div>
            <SidebarNavItem to={`/clinicas/${clinicId}/configuracoes`} icon="settings" label="Configurações" />
            {canAccess('lgpd')
              ? <SidebarNavItem to={`/clinicas/${clinicId}/seguranca`} icon="shield" label="Segurança" />
              : <LockedNavItem icon="shield" label="Segurança" requiredPlan={planLabel('pro')} />
            }
          </div>
        </>
      ) : (
        <>
          <div className="sb-sec">
            <div className="sb-sec-label">Plataforma</div>
            <SidebarNavItem to="/dashboard"  icon="grid" label="Dashboard" />
            <SidebarNavItem to="/clinicas"   icon="list" label="Clínicas" />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Financeiro</div>
            <SidebarNavItem to="/faturamento" icon="credit" label="Faturamento" />
            <SidebarNavItem to="/relatorios"  icon="bars"   label="Relatórios" />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Controle</div>
            <SidebarNavItem to="/feature-flags" icon="settings" label="Feature Flags" />
            <SidebarNavItem to="/seguranca"     icon="shield"   label="Segurança / LGPD" badge={3} />
          </div>
          <div className="sb-sec">
            <div className="sb-sec-label">Acesso</div>
            <SidebarNavItem to="/equipe-admin" icon="users" label="Equipe Admin" />
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
