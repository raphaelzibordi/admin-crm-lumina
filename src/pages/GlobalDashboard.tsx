import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, MetricCard, Card, CardHeader, HealthBar, ProgressBar } from '../components/ui';
import { fetchClinicas, type Clinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

const GlobalDashboard = () => {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalReceita = clinicas.reduce((s, c) => s + c.receita_total, 0);
  const totalClientes = clinicas.reduce((s, c) => s + c.total_clientes, 0);
  const totalAgendamentos = clinicas.reduce((s, c) => s + c.total_agendamentos, 0);
  const emRisco = clinicas.filter(c => c.health_score < 40).length;

  const topbarRight = (
    <>
      <Button variant="outline" size="sm">Exportar</Button>
      <Button variant="primary" size="sm">+ Nova Clínica</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {error && (
        <div className="alert a-danger" style={{ marginBottom: 14 }}>
          Erro ao carregar dados do CRM: {error}
        </div>
      )}

      <div className="metrics">
        <MetricCard label="Receita Total"       value={`R$${(totalReceita / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} delta="Soma de todos agendamentos" deltaType="up" />
        <MetricCard label="Clínicas Ativas"     value={String(clinicas.length)} delta={`${clinicas.length} cadastradas`} deltaType="up" />
        <MetricCard label="Total Clientes"      value={String(totalClientes)} delta="Todos os pacientes" deltaType="up" />
        <MetricCard label="Em Risco"            value={String(emRisco)} delta={emRisco > 0 ? 'Health < 40' : 'Todas saudáveis'} deltaType={emRisco > 0 ? 'down' : 'up'} />
      </div>

      <div className="g2">
        <Card>
          <CardHeader
            title="Clínicas · Health Score"
            subtitle={`${clinicas.length} cadastradas · ordenado por risco`}
            action={<Button variant="outline" size="sm">Ver todas</Button>}
          />
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Carregando clínicas…
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clínica</th>
                  <th>Clientes</th>
                  <th>Agendamentos</th>
                  <th>Receita</th>
                  <th>Health</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clinicas.map(c => {
                  const statusVariant = c.health_score >= 60 ? 'success' as const : c.health_score >= 35 ? 'warning' as const : 'danger' as const;
                  const statusLabel = c.health_score >= 60 ? 'Ativa' : c.health_score >= 35 ? 'Em risco' : 'Crítica';
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.nome_clinica}</strong>
                        <br />
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{c.email}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{c.total_clientes}</td>
                      <td style={{ fontSize: 12 }}>{c.total_agendamentos}</td>
                      <td style={{ fontSize: 12.5, fontWeight: 700 }}>
                        R${Number(c.receita_total).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </td>
                      <td><HealthBar value={c.health_score} /></td>
                      <td><Badge variant={statusVariant}>{statusLabel}</Badge></td>
                      <td>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clinicas/${c.id}/equipe`)}>
                          Entrar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Distribuição de Agendamentos</h3>
            {clinicas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clinicas.map(c => {
                  const pct = totalAgendamentos > 0 ? Math.round((c.total_agendamentos / totalAgendamentos) * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.nome_clinica}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.total_agendamentos} agend. · {pct}%</span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem dados</div>
            )}
          </Card>

          <Card style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Distribuição de Clientes</h3>
            {clinicas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clinicas.map(c => {
                  const pct = totalClientes > 0 ? Math.round((c.total_clientes / totalClientes) * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.nome_clinica}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.total_clientes} clientes · {pct}%</span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem dados</div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default GlobalDashboard;
