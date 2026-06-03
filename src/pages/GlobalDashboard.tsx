import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, MetricCard, Card, CardHeader, Alert, HealthBar, MiniBarChart, ProgressBar } from '../components/ui';
import '../components/ui/ui.css';

const clinics = [
  { id: '1', name: 'Clínica Aurora',  city: 'São Paulo · SP',      plan: 'Pro',        planVariant: 'info' as const,   health: 88, status: 'Ativa',     statusVariant: 'success' as const },
  { id: '2', name: 'Rejuvenece BH',   city: 'Belo Horizonte · MG', plan: 'Enterprise', planVariant: 'purple' as const, health: 97, status: 'Ativa',     statusVariant: 'success' as const },
  { id: '3', name: 'Studio Beleza',   city: 'Campinas · SP',       plan: 'Básico',     planVariant: 'neutral' as const,health: 52, status: 'Em risco',  statusVariant: 'warning' as const },
  { id: '4', name: 'Face & Form',     city: 'Rio de Janeiro · RJ', plan: 'Básico',     planVariant: 'neutral' as const,health: 18, status: 'Em risco',  statusVariant: 'danger' as const  },
  { id: '5', name: 'Espaço Zen',      city: 'Curitiba · PR',       plan: 'Pro',        planVariant: 'info' as const,   health: 91, status: 'Ativa',     statusVariant: 'success' as const },
];

const GlobalDashboard = () => {
  const navigate = useNavigate();

  const topbarRight = (
    <>
      <button className="ib" style={{ position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2a5 5 0 0 0-5 5v2.5L1.5 11h13L13 9.5V7a5 5 0 0 0-5-5zM6.5 13.5a1.5 1.5 0 0 0 3 0"/>
        </svg>
        <div style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, background: 'var(--danger)', borderRadius: '50%', border: '1.5px solid white' }}/>
      </button>
      <Button variant="outline" size="sm">Exportar</Button>
      <Button variant="primary" size="sm">+ Nova Clínica</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Alert variant="danger">
        <strong>3 clínicas em risco de cancelamento</strong> — Inativas há 14+ dias sem acesso.{' '}
        <span style={{ textDecoration: 'underline', cursor: 'pointer', marginLeft: 4 }}>Ver detalhes →</span>
      </Alert>

      <div className="metrics">
        <MetricCard label="MRR Total"      value="R$47.3k" delta="↑ 8.2% vs mês anterior" deltaType="up" />
        <MetricCard label="Clínicas Ativas" value="124"    delta="↑ +6 novas este mês"     deltaType="up" />
        <MetricCard label="Churn Rate"      value="2.1%"   delta="↑ +0.4pp vs mês anterior" deltaType="down" />
        <MetricCard label="Em Risco"        value="3"      delta="Requer ação imediata"     deltaType="down" />
      </div>

      <div className="g2">
        {/* Clinics table */}
        <Card>
          <CardHeader
            title="Clínicas · Health Score"
            subtitle="124 ativas · ordenado por risco"
            action={<Button variant="outline" size="sm">Ver todas</Button>}
          />
          <table>
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Plano</th>
                <th>Health</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{c.city}</span>
                  </td>
                  <td><Badge variant={c.planVariant}>{c.plan}</Badge></td>
                  <td><HealthBar value={c.health} /></td>
                  <td><Badge variant={c.statusVariant}>{c.status}</Badge></td>
                  <td>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => navigate(`/clinicas/${c.id}/equipe`)}
                    >
                      Entrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* MRR Chart */}
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>MRR · Últimos 6 meses</h3>
            <MiniBarChart
              data={[40, 50, 62, 72, 85, 100]}
              labels={['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']}
              activeIndex={5}
            />
            <div className="divider" />
            <div className="g2">
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Novas assinaturas</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>+R$3.8k</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Cancelamentos</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)' }}>−R$0.9k</div>
              </div>
            </div>
          </Card>

          {/* Plan distribution */}
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Distribuição de Planos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Básico</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>68 clínicas · 55%</span>
                </div>
                <ProgressBar value={55} color="#8a9e98" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Pro</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>48 clínicas · 39%</span>
                </div>
                <ProgressBar value={39} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Enterprise</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>8 clínicas · 6%</span>
                </div>
                <ProgressBar value={6} color="#8b5cf6" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default GlobalDashboard;
