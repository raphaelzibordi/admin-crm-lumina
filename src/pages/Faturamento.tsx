import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, Tabs, HealthBar } from '../components/ui';
import { fetchClinicas, type Clinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

const planFromHealth = (h: number): { label: string; variant: 'purple' | 'info' | 'neutral' } => {
  if (h >= 80) return { label: 'Enterprise', variant: 'purple' };
  if (h >= 50) return { label: 'Pro',        variant: 'info'   };
  return               { label: 'Básico',    variant: 'neutral' };
};

const priceFromHealth = (h: number) => h >= 80 ? 599 : h >= 50 ? 299 : 149;

const statusFromHealth = (h: number): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  if (h >= 50) return { label: 'Ativa',    variant: 'success' };
  if (h >= 30) return { label: 'Em risco', variant: 'warning' };
  return               { label: 'Crítica', variant: 'danger'  };
};

const Faturamento = () => {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const ativas   = clinicas.filter(c => c.health_score >= 50).length;
  const emRisco  = clinicas.filter(c => c.health_score >= 30 && c.health_score < 50).length;
  const criticas = clinicas.filter(c => c.health_score < 30).length;
  const mrr      = clinicas.reduce((s, c) => s + priceFromHealth(c.health_score), 0);

  const topbarRight = (
    <Button variant="outline" size="sm">Sincronizar Stripe</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="MRR Estimado"      value={`R$${mrr.toLocaleString('pt-BR')}`}  delta="Receita mensal recorrente" deltaType="up" />
        <MetricCard label="Assinaturas Ativas" value={String(ativas)}                       delta={`de ${clinicas.length} clínicas`} deltaType="up" />
        <MetricCard label="Em Risco"           value={String(emRisco)}                      delta="Health entre 30–49"  deltaType={emRisco  > 0 ? 'down' : 'up'} />
        <MetricCard label="Críticas"           value={String(criticas)}                     delta="Health abaixo de 30" deltaType={criticas > 0 ? 'down' : 'up'} />
      </div>

      <Tabs tabs={['Assinaturas', 'Histórico']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <Card>
          <CardHeader
            title="Assinaturas"
            subtitle={loading ? 'Carregando…' : `${clinicas.length} clínicas · ordenado por health score`}
            action={<Button variant="outline" size="sm">↓ Exportar</Button>}
          />
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Carregando clínicas…
            </div>
          ) : error ? (
            <div className="alert a-danger" style={{ margin: 16 }}>{error}</div>
          ) : clinicas.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhuma clínica encontrada.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clínica</th>
                  <th>Plano</th>
                  <th>Valor/mês</th>
                  <th>Agendamentos</th>
                  <th>Health</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...clinicas].sort((a, b) => b.health_score - a.health_score).map(c => {
                  const plan   = planFromHealth(c.health_score);
                  const status = statusFromHealth(c.health_score);
                  const price  = priceFromHealth(c.health_score);
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontSize: 12.5 }}>{c.nome_clinica}</strong>
                        <br />
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{c.email}</span>
                      </td>
                      <td><Badge variant={plan.variant}>{plan.label}</Badge></td>
                      <td><strong>R${price}</strong></td>
                      <td style={{ fontSize: 12 }}>{c.total_agendamentos}</td>
                      <td><HealthBar value={c.health_score} /></td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clinicas/${c.id}/faturamento`)}>
                          Gerenciar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 1 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Histórico de Cobranças</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Registros de cobranças processadas via Stripe. Integração de webhook em andamento.
          </p>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clínica</th>
                  <th>Valor</th>
                  <th>Agendamentos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...clinicas].sort((a, b) => b.health_score - a.health_score).map(c => {
                  const status = statusFromHealth(c.health_score);
                  const price  = priceFromHealth(c.health_score);
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.nome_clinica}</strong></td>
                      <td><strong>R${price}</strong></td>
                      <td style={{ fontSize: 12 }}>{c.total_agendamentos} agendamentos</td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </AppShell>
  );
};

export default Faturamento;
