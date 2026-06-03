import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert } from '../components/ui';
import '../components/ui/ui.css';

type Role = 'Owner' | 'Support' | 'Analyst';
type RoleVariant = 'purple' | 'info' | 'teal';

const roleVariant: Record<Role, RoleVariant> = {
  Owner:   'purple',
  Support: 'info',
  Analyst: 'teal',
};

const rolePerms: Record<Role, string> = {
  Owner:   'Acesso total',
  Support: 'Ver clínicas · feature flags · sem faturamento',
  Analyst: 'Apenas leitura · relatórios · sem edição',
};

interface Member {
  id: number;
  initials: string;
  name: string;
  email: string;
  role: Role;
  twoFA: 'Ativo' | 'Pendente';
  lastAccess: string;
  isMe: boolean;
}

const initialMembers: Member[] = [
  { id: 1, initials: 'RZ', name: 'Raphael Z. (você)', email: 'raphael@lumina.app', role: 'Owner',   twoFA: 'Ativo',    lastAccess: 'Agora',  isMe: true  },
  { id: 2, initials: 'AP', name: 'Ana P.',             email: 'ana@lumina.app',     role: 'Support', twoFA: 'Pendente', lastAccess: '1 dia',  isMe: false },
  { id: 3, initials: 'LM', name: 'Lucas M.',            email: 'lucas@lumina.app',   role: 'Analyst', twoFA: 'Ativo',    lastAccess: '3 dias', isMe: false },
];

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)',
  padding: 24, width: 420, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,.18)',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--border)', fontSize: 12.5, fontFamily: 'Inter, sans-serif',
  background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block',
};

const EquipeAdmin = () => {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [editing, setEditing]   = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);

  const [editRole, setEditRole] = useState<Role>('Support');

  const [inviteName,  setInviteName]  = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<Role>('Support');

  const openEdit = (m: Member) => { setEditing(m); setEditRole(m.role); };
  const closeEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!editing) return;
    setMembers(prev => prev.map(m =>
      m.id === editing.id ? { ...m, role: editRole } : m
    ));
    closeEdit();
  };

  const removeMember = () => {
    if (!editing) return;
    setMembers(prev => prev.filter(m => m.id !== editing.id));
    closeEdit();
  };

  const openInvite = () => { setInviteName(''); setInviteEmail(''); setInviteRole('Support'); setInviting(true); };
  const closeInvite = () => setInviting(false);

  const sendInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const initials = inviteName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    setMembers(prev => [...prev, {
      id: Date.now(),
      initials,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      twoFA: 'Pendente',
      lastAccess: '—',
      isMe: false,
    }]);
    closeInvite();
  };

  const pendingTwoFA = members.filter(m => !m.isMe && m.twoFA === 'Pendente');

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={openInvite}>+ Convidar membro</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {pendingTwoFA.length > 0 && (
        <Alert variant="warning">
          {pendingTwoFA.map(m => <strong key={m.id}>{m.name}</strong>).reduce((a, b) => <>{a}, {b}</>)}
          {' '}ainda não {pendingTwoFA.length > 1 ? 'configuraram' : 'configurou'} o 2FA. Para roles Owner e Super Admin, o 2FA é obrigatório.
        </Alert>
      )}

      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Membros da Equipe Admin"
          subtitle={`${members.length} ${members.length === 1 ? 'membro' : 'membros'}`}
        />
        <table>
          <thead>
            <tr>
              <th>Membro</th>
              <th>Role Admin</th>
              <th>Permissões</th>
              <th>2FA</th>
              <th>Último Acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{m.initials}</div>
                    <div>
                      <strong style={{ fontSize: 12.5 }}>{m.name}</strong>
                      <br />
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{m.email}</span>
                    </div>
                  </div>
                </td>
                <td><Badge variant={roleVariant[m.role]}>{m.role}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{rolePerms[m.role]}</td>
                <td><Badge variant={m.twoFA === 'Ativo' ? 'success' : 'warning'}>{m.twoFA}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.lastAccess}</td>
                <td>
                  {!m.isMe && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>Editar</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ padding: 18 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Roles do Admin (permissões)</h3>
        <div className="g3">
          {[
            { role: 'Owner' as Role,   color: '#8b5cf6', desc: 'Tudo · 2FA obrigatório · RBAC · faturamento · exclusão' },
            { role: 'Support' as Role, color: 'var(--info)', desc: 'Ver + editar clínicas · feature flags · sem faturamento · sem RBAC' },
            { role: 'Analyst' as Role, color: 'var(--primary)', desc: 'Apenas leitura · relatórios · nenhuma escrita · sem dados sensíveis' },
          ].map(r => (
            <div key={r.role} style={{ borderRadius: 'var(--r-sm)', padding: 12, border: '1px solid var(--border)', borderLeft: `3px solid ${r.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{r.role}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal: Editar membro */}
      {editing && (
        <div style={overlay} onClick={closeEdit}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Editar membro</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>{editing.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{editing.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{editing.email}</div>
              </div>
            </div>

            <label style={labelStyle}>Role</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value as Role)}
              style={{ ...fieldStyle, marginBottom: 20 }}
            >
              <option value="Owner">Owner — Acesso total</option>
              <option value="Support">Support — Ver clínicas · feature flags</option>
              <option value="Analyst">Analyst — Apenas leitura</option>
            </select>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <Button variant="danger" size="sm" onClick={removeMember}>Remover membro</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={closeEdit}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={saveEdit}>Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Convidar membro */}
      {inviting && (
        <div style={overlay} onClick={closeInvite}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Convidar membro</h3>

            <label style={labelStyle}>Nome</label>
            <input
              style={{ ...fieldStyle, marginBottom: 12 }}
              placeholder="Ex: João Silva"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
            />

            <label style={labelStyle}>E-mail</label>
            <input
              style={{ ...fieldStyle, marginBottom: 12 }}
              placeholder="joao@lumina.app"
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />

            <label style={labelStyle}>Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              style={{ ...fieldStyle, marginBottom: 20 }}
            >
              <option value="Owner">Owner — Acesso total</option>
              <option value="Support">Support — Ver clínicas · feature flags</option>
              <option value="Analyst">Analyst — Apenas leitura</option>
            </select>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={closeInvite}>Cancelar</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={sendInvite}
                disabled={!inviteName.trim() || !inviteEmail.trim()}
              >
                Enviar convite
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default EquipeAdmin;
