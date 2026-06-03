import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, Tabs, Alert } from '../components/ui';
import '../components/ui/ui.css';

const auditLog = [
  { when: 'Hoje · 10:31', actor: 'Raphael Z.', role: 'Super Admin', action: 'Acessou dados',       entity: 'Clínica Aurora',  entityV: 'teal' as const, ip: '189.x.x.x' },
  { when: 'Hoje · 09:18', actor: 'Raphael Z.', role: 'Super Admin', action: 'Suspendeu clínica',   entity: 'Face & Form',     entityV: 'danger' as const, ip: '189.x.x.x' },
  { when: 'Ontem · 16:45', actor: 'Suporte · Ana', role: 'Support', action: 'Editou feature flag', entity: 'Studio Beleza',   entityV: 'teal' as const, ip: '177.x.x.x' },
  { when: 'Ontem · 14:02', actor: 'Raphael Z.', role: 'Super Admin', action: 'Exportou relatório', entity: 'Rejuvenece BH',   entityV: 'teal' as const, ip: '189.x.x.x' },
];

const Seguranca = () => {
  const [tab, setTab] = useState(0);

  const topbarRight = (
    <Button variant="outline" size="sm">↓ Exportar logs</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs
        tabs={['Trilha de Auditoria', 'LGPD', '2FA & Sessões', 'Restauração']}
        active={tab}
        onChange={setTab}
      />

      {tab === 0 && (
        <>
          <div className="g4" style={{ marginBottom: 16 }}>
            <MetricCard label="Ações hoje"             value="247" delta="Normal"          deltaType="up" />
            <MetricCard label="Alertas ativos"         value="3"   delta="Requer atenção"  deltaType="down" />
            <MetricCard label="Solicitações LGPD"      value="2"   delta="Pendentes" />
            <MetricCard label="Em soft-delete"         value="4"   delta="Retenção 90 dias" />
          </div>

          <Card>
            <CardHeader
              title="Trilha de Auditoria"
              subtitle="Imutável · append-only · filtro por ator, ação e data"
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
                  <th>Entidade</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.when}</td>
                    <td>
                      <strong style={{ fontSize: 12 }}>{l.actor}</strong>
                      <br />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.role}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{l.action}</td>
                    <td><Badge variant={l.entityV} className="badge-sm">{l.entity}</Badge></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 1 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Solicitações LGPD</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Gestão de direito ao esquecimento, portabilidade e consentimentos por clínica.
          </p>
          <div style={{ marginTop: 16, background: 'var(--primary-xlight)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12 }}>Nenhuma solicitação pendente no momento.</p>
          </div>
        </Card>
      )}

      {tab === 2 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>2FA & Sessões</h3>
          <Alert variant="warning">
            <strong>2 membros</strong> da equipe admin ainda não configuraram o 2FA. 2FA é obrigatório para Owner e Super Admin.
          </Alert>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Gestão de sessões ativas e configuração de autenticação de dois fatores.</p>
        </Card>
      )}

      {tab === 3 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Restauração de Clínicas</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            Clínicas canceladas ficam em soft-delete por 90 dias antes de serem permanentemente removidas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Face & Form', 'Studio XYZ', 'Clínica Beta', 'Espaço Saúde'].map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cancelada há {(i + 1) * 8} dias · Expira em {90 - (i + 1) * 8} dias</div>
                </div>
                <Button variant="outline" size="sm">Restaurar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
};

export default Seguranca;
