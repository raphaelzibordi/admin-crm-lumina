import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert } from '../../components/ui';
import '../../components/ui/ui.css';

const members = [
  { initials: 'CM', name: 'Carla Mendes',  role: 'Médica',         roleV: 'purple' as const, specialty: 'Dermatologista',       status: 'Ativa',    statusV: 'success' as const, commission: '35%', lastAccess: 'Hoje',   twoFA: 'Ativo',    twoFAV: 'success' as const },
  { initials: 'JP', name: 'João Pedro',    role: 'Técnico',        roleV: 'info'   as const, specialty: 'Estética Avançada',    status: 'Ativo',    statusV: 'success' as const, commission: '25%', lastAccess: 'Ontem',  twoFA: 'Pendente', twoFAV: 'warning' as const },
  { initials: 'MR', name: 'Maria Rosa',    role: 'Recepcionista',  roleV: 'teal'   as const, specialty: 'Atendimento ao Cliente',status: 'Ativa',    statusV: 'success' as const, commission: '—',   lastAccess: 'Hoje',   twoFA: 'Ativo',    twoFAV: 'success' as const },
  { initials: 'FS', name: 'Felipe Santos', role: 'Admin Clínica',  roleV: 'neutral' as const,specialty: 'Gestão',               status: 'Ativo',    statusV: 'success' as const, commission: '—',   lastAccess: '2 dias', twoFA: 'Ativo',    twoFAV: 'success' as const },
  { initials: 'LC', name: 'Lara Costa',    role: 'Esteticista',    roleV: 'teal'   as const, specialty: 'Peeling · Botox',      status: 'Férias',   statusV: 'warning' as const, commission: '30%', lastAccess: '8 dias', twoFA: 'Pendente', twoFAV: 'warning' as const },
];

const roles = [
  { role: 'Admin Clínica', color: '#8b5cf6', desc: 'Gestão total da clínica · configurações · faturamento · RBAC interno' },
  { role: 'Médico / Profissional', color: 'var(--info)', desc: 'Acesso à agenda · prontuários · procedimentos · comissões próprias' },
  { role: 'Técnico / Esteticista', color: 'var(--primary)', desc: 'Execução de procedimentos · registros · sem acesso financeiro' },
  { role: 'Recepcionista', color: 'var(--text-muted)', desc: 'Agendamentos · atendimento · sem dados financeiros ou clínicos' },
];

const EquipeClinica = () => {
  const [activeTab, setActiveTab] = useState<'membros' | 'roles'>('membros');

  const topbarRight = (
    <Button variant="primary" size="sm">+ Convidar membro</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Alert variant="warning">
        <strong>João Pedro</strong> e <strong>Lara Costa</strong> ainda não ativaram o 2FA. Considere restringir acesso até a configuração.
      </Alert>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === 'membros' ? 'on' : ''}`} onClick={() => setActiveTab('membros')}>Membros</button>
        <button className={`tab ${activeTab === 'roles' ? 'on' : ''}`} onClick={() => setActiveTab('roles')}>Roles & Permissões</button>
      </div>

      {activeTab === 'membros' && (
        <Card>
          <CardHeader
            title="Equipe da Clínica"
            subtitle={`${members.length} membros ativos`}
            action={<Button variant="outline" size="sm">Exportar</Button>}
          />
          <table>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Role</th>
                <th>Especialidade</th>
                <th>Comissão</th>
                <th>2FA</th>
                <th>Status</th>
                <th>Último Acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{m.initials}</div>
                      <strong style={{ fontSize: 12.5 }}>{m.name}</strong>
                    </div>
                  </td>
                  <td><Badge variant={m.roleV}>{m.role}</Badge></td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{m.specialty}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{m.commission}</td>
                  <td><Badge variant={m.twoFAV}>{m.twoFA}</Badge></td>
                  <td><Badge variant={m.statusV}>{m.status}</Badge></td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.lastAccess}</td>
                  <td><Button variant="outline" size="sm">Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'roles' && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Roles da Clínica (RBAC Interno)</h3>
          <div className="g2">
            {roles.map((r) => (
              <div key={r.role} style={{ borderRadius: 'var(--r-sm)', padding: 14, border: '1px solid var(--border)', borderLeft: `3px solid ${r.color}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{r.role}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
};

export default EquipeClinica;
