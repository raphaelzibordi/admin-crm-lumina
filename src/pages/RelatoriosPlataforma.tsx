import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, ProgressBar, Tabs } from '../components/ui';
import { fetchClinicas, type Clinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

const RelatoriosPlataforma = () => {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .finally(() => setLoading(false));
  }, []);

  const receitaTotal = clinicas.reduce((s, c) => s + c.receita_total, 0);
  const totalAgendamentos = clinicas.reduce((s, c) => s + c.total_agendamentos, 0);
  const totalClientes = clinicas.reduce((s, c) => s + c.total_clientes, 0);
  const mediaHealth = clinicas.length > 0 ? Math.round(clinicas.reduce((s, c) => s + c.health_score, 0) / clinicas.length) : 0;

  const topClinicas = [...clinicas].sort((a, b) => b.receita_total - a.receita_total).slice(0, 8);

  const healthClass = (h: number) => {
    if (h >= 70) return 'success' as const;
    if (h >= 40) return 'warning' as const;
    return 'danger' as const;
  };

  const topbarRight = (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="outline" size="sm">↓ Exportar CSV</Button>
      <Button variant="outline" size="sm">Período</Button>
    </div>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs tabs={['Receita', 'Por Clínica', 'Crescimento']} active={tab} onChange={setTab} />

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando relatórios…
        </div>
      ) : (
        <>
          {tab === 0 && (
            <>
              <div className="metrics" style={{ marginBottom: 16 }}>
                <MetricCard label="Receita Total"       value={`R$${receitaTotal.toLocaleString('pt-BR')}`}   delta="Todas as clínicas" deltaType="up" />
                <MetricCard label="Total Agendamentos"  value={String(totalAgendamentos)}                       delta="Acumulado" deltaType="neutral" />
                <MetricCard label="Total Clientes"      value={String(totalClientes)}                           delta="Base ativa" deltaType="up" />
                <MetricCard label="Health Médio"        value={`${mediaHealth}%`}                               delta={mediaHealth >= 70 ? 'Saudável' : 'Atenção necessária'} deltaType={mediaHealth >= 70 ? 'up' : 'down'} />
              </div>

              <div className="g2">
                <Card>
                  <CardHeader title="Top Clínicas por Receita" subtitle="Ranking por receita gerada" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                    {topClinicas.slice(0, 5).map((c) => (
                      <div key={c.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{c.nome_clinica}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            R${c.receita_total.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <ProgressBar value={receitaTotal > 0 ? Math.round((c.receita_total / receitaTotal) * 100) : 0} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Distribuição de Health" subtitle="Score médio por faixa" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                    {[
                      { label: 'Saudável (≥70)', count: clinicas.filter(c => c.health_score >= 70).length, color: '#166534' },
                      { label: 'Atenção (40–69)', count: clinicas.filter(c => c.health_score >= 40 && c.health_score < 70).length, color: '#92400e' },
                      { label: 'Crítico (<40)', count: clinicas.filter(c => c.health_score < 40).length, color: '#991b1b' },
                    ].map((faixa) => (
                      <div key={faixa.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: faixa.color }}>{faixa.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{faixa.count} clínicas</span>
                        </div>
                        <ProgressBar
                          value={clinicas.length > 0 ? Math.round((faixa.count / clinicas.length) * 100) : 0}
                          color={faixa.color}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}

          {tab === 1 && (
            <Card>
              <CardHeader
                title="Desempenho por Clínica"
                subtitle={`${clinicas.length} clínicas`}
                action={<Button variant="outline" size="sm">↓ Exportar</Button>}
              />
              {clinicas.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Nenhuma clínica encontrada.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Clínica</th>
                      <th>Clientes</th>
                      <th>Agendamentos</th>
                      <th>Equipe</th>
                      <th>Receita</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClinicas.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, fontSize: 12.5 }}>{c.nome_clinica}</td>
                        <td style={{ fontSize: 12 }}>{c.total_clientes}</td>
                        <td style={{ fontSize: 12 }}>{c.total_agendamentos}</td>
                        <td style={{ fontSize: 12 }}>{c.total_equipe}</td>
                        <td style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {c.receita_total > 0 ? `R$${c.receita_total.toLocaleString('pt-BR')}` : '—'}
                        </td>
                        <td><Badge variant={healthClass(c.health_score)}>{c.health_score}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === 2 && (
            <>
              <div className="metrics" style={{ marginBottom: 16 }}>
                <MetricCard label="Novas clínicas (mês)"  value="3"    delta="+12% vs mês anterior" deltaType="up" />
                <MetricCard label="Churn (mês)"           value="1"    delta="-0,8%"                deltaType="up" />
                <MetricCard label="MRR"                   value={`R$${(receitaTotal * 0.1).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} delta="Receita mensal recorrente" deltaType="up" />
                <MetricCard label="NPS Médio"             value="72"   delta="Excelente"            deltaType="up" />
              </div>
              <Card style={{ padding: 18 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Crescimento Mensal</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Gráficos de crescimento detalhado disponíveis em breve com integração de analytics.
                </p>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((mes, i) => {
                    const val = 40 + i * 12;
                    return (
                      <div key={mes}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12 }}>{mes} 2026</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{val} clínicas</span>
                        </div>
                        <ProgressBar value={val} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </AppShell>
  );
};

export default RelatoriosPlataforma;
