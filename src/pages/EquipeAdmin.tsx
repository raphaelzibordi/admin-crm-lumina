import { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert } from '../components/ui';
import { supabase } from '../lib/supabase';
import '../components/ui/ui.css';

type Role = 'Owner' | 'Support' | 'Analyst';
type RoleVariant = 'purple' | 'info' | 'teal';
type TwoFAStatus = 'Ativo' | 'Inativo' | 'Pendente';
type MemberStatus = 'Ativo' | 'Inativo';

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
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthdate: string;
  role: Role;
  twoFA: TwoFAStatus;
  status: MemberStatus;
  lastAccess: string;
  isMe: boolean;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)',
  padding: 24, width: 460, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,.18)',
  maxHeight: '90vh', overflowY: 'auto',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--border)', fontSize: 12.5, fontFamily: 'Inter, sans-serif',
  background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 10, marginTop: 18, paddingBottom: 6,
  borderBottom: '1px solid var(--border)',
};

const twoFABadgeVariant = (status: TwoFAStatus) => {
  if (status === 'Ativo')   return 'success' as const;
  if (status === 'Inativo') return 'danger'  as const;
  return 'warning' as const;
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center',
      width: 38, height: 21, borderRadius: 21, border: 'none', cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--border)', transition: 'background .2s',
      padding: 0, flexShrink: 0,
    }}
    aria-checked={checked}
    role="switch"
  >
    <span style={{
      position: 'absolute', left: checked ? 19 : 2, width: 17, height: 17,
      borderRadius: '50%', background: '#fff', transition: 'left .2s',
      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
    }} />
  </button>
);

const formatCPF = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const rowFromDb = (row: Record<string, unknown>, myEmail: string): Member => ({
  id:          String(row.id),
  name:        String(row.name ?? ''),
  email:       String(row.email ?? ''),
  phone:       String(row.phone ?? ''),
  cpf:         String(row.cpf ?? ''),
  birthdate:   String(row.birthdate ?? ''),
  role:        (row.role as Role) ?? 'Support',
  twoFA:       (row.two_fa as TwoFAStatus) ?? 'Pendente',
  status:      (row.status as MemberStatus) ?? 'Ativo',
  initials:    String(row.initials ?? ''),
  lastAccess:  String(row.last_access ?? '—'),
  isMe:        String(row.email).toLowerCase() === myEmail.toLowerCase(),
});

const EquipeAdmin = () => {
  const [members,   setMembers]   = useState<Member[]>([]);
  const [myEmail,   setMyEmail]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editing,   setEditing]   = useState<Member | null>(null);
  const [inviting,  setInviting]  = useState(false);

  const [editName,      setEditName]      = useState('');
  const [editEmail,     setEditEmail]     = useState('');
  const [editPhone,     setEditPhone]     = useState('');
  const [editCpf,       setEditCpf]       = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editRole,      setEditRole]      = useState<Role>('Support');
  const [editTwoFA,     setEditTwoFA]     = useState(false);
  const [editActive,    setEditActive]    = useState(true);

  const [inviteName,  setInviteName]  = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<Role>('Support');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? '';
      setMyEmail(email);

      const { data, error } = await supabase
        .from('admin_members')
        .select('*')
        .order('created_at');

      if (!error && data) {
        const mapped = data.map(r => rowFromDb(r, email));
        mapped.sort((a, b) => {
          if (a.isMe) return -1;
          if (b.isMe) return 1;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
        setMembers(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  const openEdit = (m: Member) => {
    setEditing(m);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditPhone(m.phone);
    setEditCpf(m.cpf);
    setEditBirthdate(m.birthdate);
    setEditRole(m.role);
    setEditTwoFA(m.twoFA === 'Ativo');
    setEditActive(m.status === 'Ativo');
    setSaveError('');
  };

  const closeEdit = () => { setEditing(null); setSaveError(''); };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');

    const newInitials = editName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || editing.initials;
    const payload = {
      name:       editName.trim(),
      email:      editEmail.trim(),
      phone:      editPhone || null,
      cpf:        editCpf || null,
      birthdate:  editBirthdate || null,
      initials:   newInitials,
      two_fa:     editTwoFA ? 'Ativo' : 'Inativo',
      status:     editActive ? 'Ativo' : 'Inativo',
      ...(editing.isMe ? {} : { role: editRole }),
    };

    const { error } = await supabase
      .from('admin_members')
      .update(payload)
      .eq('id', editing.id);

    if (error) {
      setSaveError('Erro ao salvar: ' + error.message);
      setSaving(false);
      return;
    }


    setMembers(prev => prev.map(m =>
      m.id === editing.id
        ? { ...m, ...payload, role: editing.isMe ? m.role : editRole, twoFA: payload.two_fa as TwoFAStatus, status: payload.status as MemberStatus, phone: payload.phone ?? '', cpf: payload.cpf ?? '', birthdate: payload.birthdate ?? '', initials: newInitials }
        : m
    ));
    setSaving(false);
    closeEdit();
  };

  const removeMember = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('admin_members').delete().eq('id', editing.id);
    if (error) { setSaveError('Erro ao remover: ' + error.message); setSaving(false); return; }

    setMembers(prev => prev.filter(m => m.id !== editing.id));
    setSaving(false);
    closeEdit();
  };

  const openInvite = () => { setInviteName(''); setInviteEmail(''); setInviteRole('Support'); setInviting(true); setSaveError(''); };
  const closeInvite = () => { setInviting(false); setSaveError(''); };

  const sendInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setSaving(true);
    setSaveError('');

    const initials = inviteName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const { data, error } = await supabase
      .from('admin_members')
      .insert({
        name:       inviteName.trim(),
        email:      inviteEmail.trim(),
        initials,
        role:       inviteRole,
        two_fa:     'Pendente',
        status:     'Ativo',
        last_access: '—',
      })
      .select()
      .single();

    if (error) { setSaveError('Erro ao convidar: ' + error.message); setSaving(false); return; }

    setMembers(prev => [...prev, rowFromDb(data, myEmail)]);
    setSaving(false);
    closeInvite();
  };

  const pendingTwoFA = members.filter(m => m.twoFA === 'Pendente');

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={openInvite}>+ Convidar membro</Button>
  );

  if (loading) return (
    <AppShell>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando membros…</div>
    </AppShell>
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
              <th>Status</th>
              <th>Role Admin</th>
              <th>Permissões</th>
              <th>2FA</th>
              <th>Último Acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} style={{ opacity: m.status === 'Inativo' ? 0.45 : 1, transition: 'opacity .2s' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 10, filter: m.status === 'Inativo' ? 'grayscale(1)' : 'none' }}>{m.initials}</div>
                    <div>
                      <strong style={{ fontSize: 12.5 }}>{m.name}{m.isMe && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}> (você)</span>}</strong>
                      <br />
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{m.email}</span>
                    </div>
                  </div>
                </td>
                <td><Badge variant={m.status === 'Ativo' ? 'success' : 'neutral'}>{m.status}</Badge></td>
                <td><Badge variant={roleVariant[m.role]}>{m.role}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{rolePerms[m.role]}</td>
                <td><Badge variant={twoFABadgeVariant(m.twoFA)}>{m.twoFA}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.lastAccess}</td>
                <td>
                  <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                    {m.isMe ? 'Meu perfil' : 'Editar'}
                  </Button>
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

      {/* Modal: Editar membro / Meu perfil */}
      {editing && (
        <div style={overlay} onClick={closeEdit}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {editing.isMe ? 'Meu perfil' : 'Editar membro'}
            </h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              {editing.isMe ? 'Atualize suas informações pessoais e segurança de acesso.' : 'Edite as informações e permissões deste membro.'}
            </p>

            <div style={sectionTitle}>Informações pessoais</div>

            <label style={labelStyle}>Nome completo</label>
            <input style={{ ...fieldStyle, marginBottom: 12 }} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo" />

            <label style={labelStyle}>E-mail</label>
            <input style={{ ...fieldStyle, marginBottom: 12 }} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@lumina.app" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input style={fieldStyle} value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label style={labelStyle}>CPF</label>
                <input style={fieldStyle} value={editCpf} onChange={e => setEditCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>
            </div>

            <label style={labelStyle}>Data de nascimento</label>
            <input style={{ ...fieldStyle, marginBottom: 4 }} type="date" value={editBirthdate} onChange={e => setEditBirthdate(e.target.value)} />

            {!editing.isMe && (
              <>
                <div style={sectionTitle}>Permissões</div>
                <label style={labelStyle}>Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as Role)} style={{ ...fieldStyle, marginBottom: 4 }}>
                  <option value="Owner">Owner — Acesso total</option>
                  <option value="Support">Support — Ver clínicas · feature flags</option>
                  <option value="Analyst">Analyst — Apenas leitura</option>
                </select>
              </>
            )}

            <div style={sectionTitle}>Acesso</div>

            {!editing.isMe ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--r-sm)', border: `1px solid ${editActive ? 'var(--border)' : '#ef4444'}`, marginBottom: 10, background: editActive ? 'transparent' : 'rgba(239,68,68,.04)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Membro ativo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {editActive ? 'Ativo — acessa o painel normalmente' : 'Inativo — acesso bloqueado temporariamente'}
                  </div>
                </div>
                <ToggleSwitch checked={editActive} onChange={setEditActive} />
              </div>
            ) : (
              <div style={{ padding: '9px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-alt, #f9fafb)', border: '1px solid var(--border)', marginBottom: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
                Você não pode inativar sua própria conta.
              </div>
            )}

            <div style={sectionTitle}>Segurança</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Autenticação em dois fatores (2FA)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {editTwoFA ? 'Ativo — conta protegida com segundo fator' : 'Inativo — recomendado ativar para maior segurança'}
                </div>
              </div>
              <ToggleSwitch checked={editTwoFA} onChange={setEditTwoFA} />
            </div>

            {saveError && (
              <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 12, padding: '8px 10px', background: 'rgba(239,68,68,.06)', borderRadius: 'var(--r-sm)' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {!editing.isMe
                ? <Button variant="danger" size="sm" onClick={removeMember} disabled={saving}>Remover membro</Button>
                : <div />
              }
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={closeEdit} disabled={saving}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
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
            <input style={{ ...fieldStyle, marginBottom: 12 }} placeholder="Ex: João Silva" value={inviteName} onChange={e => setInviteName(e.target.value)} />

            <label style={labelStyle}>E-mail</label>
            <input style={{ ...fieldStyle, marginBottom: 12 }} placeholder="joao@lumina.app" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />

            <label style={labelStyle}>Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} style={{ ...fieldStyle, marginBottom: 20 }}>
              <option value="Owner">Owner — Acesso total</option>
              <option value="Support">Support — Ver clínicas · feature flags</option>
              <option value="Analyst">Analyst — Apenas leitura</option>
            </select>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              O membro receberá um convite por e-mail. O 2FA estará pendente até a primeira configuração.
            </p>

            {saveError && (
              <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 12, padding: '8px 10px', background: 'rgba(239,68,68,.06)', borderRadius: 'var(--r-sm)' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={closeInvite} disabled={saving}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={sendInvite} disabled={saving || !inviteName.trim() || !inviteEmail.trim()}>
                {saving ? 'Enviando…' : 'Enviar convite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default EquipeAdmin;
