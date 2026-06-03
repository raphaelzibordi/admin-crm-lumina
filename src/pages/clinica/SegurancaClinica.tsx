import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Tabs, Alert, Toggle } from '../../components/ui';
import '../../components/ui/ui.css';

const acessos = [
  { nome: 'Dr. Carlos Silva',  cargo: 'Dono',          ultimo: 'Hoje · 09:45',   status: 'Ativo',    statusV: 'success' as const, twofa: true  },
  { nome: 'Ana Beatriz',       cargo: 'Recepcionista', ultimo: 'Hoje · 08:30',   status: 'Ativo',    statusV: 'success' as const, twofa: false },
  { nome: 'Maria Santos',      cargo: 'Esteticista',   ultimo: 'Ontem · 17:20',  status: 'Ativo',    statusV: 'success' as const, twofa: true  },
  { nome: 'João Pereira',      cargo: 'Massoterapeuta',ultimo: 'há 5 dias',      status: 'Inativo',  statusV: 'neutral' as const, twofa: false },
];

const auditLog = [
  { quando: 'Hoje · 09:45',    ator: 'Dr. Carlos Silva', acao: 'Login realizado',        ip: '177.x.x.x' },
  { quando: 'Hoje · 08:30',    ator: 'Ana Beatriz',      acao: 'Agendamento criado',     ip: '189.x.x.x' },
  { quando: 'Ontem · 17:20',   ator: 'Maria Santos',     acao: 'Procedimento atualizado',ip: '201.x.x.x' },
  { quando: 'Ontem · 14:10',   ator: 'Dr. Carlos Silva', acao: 'Relatório exportado',    ip: '177.x.x.x' },
  { quando: '30/05 · 11:00',   ator: 'Ana Beatriz',      acao: 'Cliente cadastrado',     ip: '189.x.x.x' },
];

const SegurancaClinica = () => {
  const [tab, setTab] = useState(0);
  const [ip2faRequired, setIp2faRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(true);

  const semTwofa = acessos.filter(a => !a.twofa && a.status === 'Ativo').length;

  const topbarRight = (
    <Button variant="outline" size="sm">↓ Exportar logs</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs tabs={['Acessos', '2FA & Sessões', 'Auditoria']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <>
          {semTwofa > 0 && (
            <Alert variant="warning">
              <strong>{semTwofa} membro(s)</strong> ativos sem 2FA configurado. Recomendamos exigir 2FA para toda a equipe.
            </Alert>
          )}
          <Card>
            <CardHeader
              title="Controle de Acessos"
              subtitle={`${acessos.length} membros · ${acessos.filter(a => a.status === 'Ativo').length} ativos`}
              action={<Button variant="primary" size="sm">+ Convidar</Button>}
            />
            <table>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Cargo</th>
                  <th>Último acesso</th>
                  <th>2FA</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {acessos.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{a.nome}</td>
                    <td><Badge variant="info">{a.cargo}</Badge></td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.ultimo}</td>
                    <td>
                      <Badge variant={a.twofa ? 'success' : 'warning'}>
                        {a.twofa ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </td>
                    <td><Badge variant={a.statusV}>{a.status}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="outline" size="sm">Editar</Button>
                        <Button variant="danger" size="sm">Revogar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Configurações de Segurança</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>2FA Obrigatório</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Exigir autenticação de dois fatores para todos os membros ativos</div>
                </div>
                <Toggle on={ip2faRequired} onChange={setIp2faRequired} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Timeout de sessão (4h)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Encerrar sessão automaticamente após 4 horas de inatividade</div>
                </div>
                <Toggle on={sessionTimeout} onChange={setSessionTimeout} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Sessões Ativas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {acessos.filter(a => a.status === 'Ativo').map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.cargo} · Último acesso: {a.ultimo}</div>
                  </div>
                  <Button variant="danger" size="sm">Encerrar</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 2 && (
        <Card>
          <CardHeader
            title="Trilha de Auditoria"
            subtitle="Ações realizadas na clínica"
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="tb-input" placeholder="Filtrar ação…" />
                <Button variant="outline" size="sm">Data</Button>
              </div>
            }
          />
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ator</th>
                <th>Ação</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.quando}</td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{l.ator}</td>
                  <td style={{ fontSize: 12 }}>{l.acao}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
};

export default SegurancaClinica;
