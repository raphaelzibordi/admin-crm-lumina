import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert } from '../components/ui';
import '../components/ui/ui.css';

const members = [
  { initials: 'RZ', name: 'Raphael Z. (você)', email: 'raphael@lumina.app', role: 'Owner',   roleV: 'purple' as const, perms: 'Acesso total',                             twoFA: 'Ativo',   twoFAV: 'success' as const, lastAccess: 'Agora',  isMe: true },
  { initials: 'AP', name: 'Ana P.',             email: 'ana@lumina.app',     role: 'Support', roleV: 'info' as const,   perms: 'Ver clínicas · feature flags · sem faturamento', twoFA: 'Pendente',twoFAV: 'warning' as const, lastAccess: '1 dia',  isMe: false },
  { initials: 'LM', name: 'Lucas M.',            email: 'lucas@lumina.app',   role: 'Analyst', roleV: 'teal' as const,   perms: 'Apenas leitura · relatórios · sem edição',twoFA: 'Ativo',   twoFAV: 'success' as const, lastAccess: '3 dias', isMe: false },
];

const EquipeAdmin = () => {
  const topbarRight = (
    <Button variant="primary" size="sm">+ Convidar membro</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Alert variant="warning">
        <strong>Ana Costa</strong> ainda não configurou o 2FA. Para roles Owner e Super Admin, o 2FA é obrigatório.
      </Alert>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Membros da Equipe Admin" subtitle="4 membros · você + 3 colaboradores" />
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
            {members.map((m, i) => (
              <tr key={i}>
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
                <td><Badge variant={m.roleV}>{m.role}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{m.perms}</td>
                <td><Badge variant={m.twoFAV}>{m.twoFA}</Badge></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.lastAccess}</td>
                <td>{!m.isMe && <Button variant="outline" size="sm">Editar</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ padding: 18 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Roles do Admin (permissões)</h3>
        <div className="g3">
          {[
            { role: 'Owner',   color: '#8b5cf6', desc: 'Tudo · 2FA obrigatório · RBAC · faturamento · exclusão' },
            { role: 'Support', color: 'var(--info)', desc: 'Ver + editar clínicas · feature flags · sem faturamento · sem RBAC' },
            { role: 'Analyst', color: 'var(--primary)', desc: 'Apenas leitura · relatórios · nenhuma escrita · sem dados sensíveis' },
          ].map((r) => (
            <div key={r.role} style={{ borderRadius: 'var(--r-sm)', padding: 12, border: '1px solid var(--border)', borderLeft: `3px solid ${r.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{r.role}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
};

export default EquipeAdmin;
