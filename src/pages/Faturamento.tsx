import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Tabs, Toggle } from '../components/ui';
import '../components/ui/ui.css';

const subscriptions = [
  { name: 'Rejuvenece BH',  plan: 'Enterprise', planV: 'purple' as const, price: 'R$599',  due: '15/06/2026',           payStatus: 'Pago',       payV: 'success' as const, status: 'Ativa',     statusV: 'success' as const },
  { name: 'Clínica Aurora', plan: 'Pro',         planV: 'info' as const,   price: 'R$299',  due: '18/06/2026',           payStatus: 'Pago',       payV: 'success' as const, status: 'Ativa',     statusV: 'success' as const },
  { name: 'Studio Beleza',  plan: 'Básico',      planV: 'neutral' as const,price: 'R$149',  due: '02/06/2026 · HOJE',    payStatus: 'Pendente',   payV: 'warning' as const, status: 'Em risco',  statusV: 'warning' as const },
  { name: 'Face & Form',    plan: 'Básico',      planV: 'neutral' as const,price: 'R$149',  due: '22/05/2026 · VENCIDO', payStatus: 'Falhou (3x)',payV: 'danger'  as const, status: 'Suspensa',  statusV: 'danger'  as const },
];

const globalFlags = [
  { name: 'Prontuário Digital',        desc: 'Fichas e histórico clínico · Disponível para Pro e Enterprise', on: true  },
  { name: 'Galeria Antes/Depois',      desc: 'Upload e comparação de fotos · Todos os planos',                on: true  },
  { name: 'Módulo de Estoque',         desc: 'Gestão de insumos · Apenas Pro e Enterprise',                   on: true  },
  { name: 'Comissões Avançadas (escalas)', desc: 'ADMIN-COM-05 · Escalas progressivas · Beta',               on: false },
];

const Faturamento = () => {
  const [tab, setTab] = useState(0);
  const [flags, setFlags] = useState(globalFlags);

  const topbarRight = (
    <Button variant="outline" size="sm">Sincronizar Stripe</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs
        tabs={['Assinaturas', 'Feature Flags', 'Histórico']}
        active={tab}
        onChange={setTab}
      />

      {tab === 0 && (
        <Card>
          <CardHeader title="Assinaturas Ativas" subtitle="124 clínicas · ordenado por vencimento" />
          <table>
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Plano</th>
                <th>Valor/mês</th>
                <th>Vencimento</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s, i) => (
                <tr key={i}>
                  <td><strong>{s.name}</strong></td>
                  <td><Badge variant={s.planV}>{s.plan}</Badge></td>
                  <td><strong>{s.price}</strong></td>
                  <td style={{ fontSize: 12, color: s.due.includes('VENCIDO') ? 'var(--danger)' : s.due.includes('HOJE') ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: s.due.includes('VENCIDO') || s.due.includes('HOJE') ? 600 : 400 }}>{s.due}</td>
                  <td><Badge variant={s.payV}>{s.payStatus}</Badge></td>
                  <td><Badge variant={s.statusV}>{s.status}</Badge></td>
                  <td><Button variant="outline" size="sm">Gerenciar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 1 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            Feature Flags Globais{' '}
            <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, background: '#f59e0b', color: 'white', padding: '1px 5px', borderRadius: 3, marginLeft: 5, textTransform: 'uppercase' }}>novo</span>
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
            Flags globais se aplicam a todas as clínicas. Flags por clínica são gerenciados dentro de cada clínica.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {flags.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
                <Toggle on={f.on} onChange={(v) => setFlags(flags.map((fl, j) => j === i ? { ...fl, on: v } : fl))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 2 && (
        <Card style={{ padding: 18 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Histórico de pagamentos será exibido aqui.</p>
        </Card>
      )}
    </AppShell>
  );
};

export default Faturamento;
