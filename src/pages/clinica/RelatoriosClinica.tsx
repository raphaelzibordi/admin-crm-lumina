import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, ProgressBar } from '../../components/ui';
import { fetchAgendamentosClinica, type Agendamento } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const RelatoriosClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'agendamentos'>('geral');

  useEffect(() => {
    if (!clinicId) return;
    fetchAgendamentosClinica(clinicId)
      .then(setAgendamentos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const receitaTotal = agendamentos.reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;
  const ticketMedio = agendamentos.length > 0 ? receitaTotal / agendamentos.length : 0;

  // Group by procedure for top procedures
  const porProcedimento = agendamentos.reduce((acc, a) => {
    const key = a.procedimento || 'Não especificado';
    if (!acc[key]) acc[key] = { count: 0, receita: 0 };
    acc[key].count++;
    acc[key].receita += Number(a.valor) || 0;
    return acc;
  }, {} as Record<string, { count: number; receita: number }>);

  const topProcs = Object.entries(porProcedimento)
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 5);

  // Group by profissional
  const porProfissional = agendamentos.reduce((acc, a) => {
    const key = a.profissional || 'Não atribuído';
    if (!acc[key]) acc[key] = { count: 0, receita: 0 };
    acc[key].count++;
    acc[key].receita += Number(a.valor) || 0;
    return acc;
  }, {} as Record<string, { count: number; receita: number }>);

  const topProfissionais = Object.entries(porProfissional)
    .sort((a, b) => b[1].receita - a[1].receita)
    .slice(0, 5);

  const statusVariant = (s: string | null) => {
    if (s === 'concluido' || s === 'confirmado') return 'success' as const;
    if (s === 'cancelado') return 'danger' as const;
    if (s === 'pendente') return 'warning' as const;
    return 'neutral' as const;
  };

  const topbarRight = (
    <Button variant="outline" size="sm">Exportar</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === 'geral' ? 'on' : ''}`} onClick={() => setActiveTab('geral')}>Visão Geral</button>
        <button className={`tab ${activeTab === 'agendamentos' ? 'on' : ''}`} onClick={() => setActiveTab('agendamentos')}>Agendamentos</button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando relatórios…
        </div>
      ) : error ? (
        <div className="alert a-danger">{error}</div>
      ) : (
        <>
          {activeTab === 'geral' && (
            <>
              <div className="metrics" style={{ marginBottom: 16 }}>
                <MetricCard label="Receita Total"      value={`R$${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} delta="Soma dos agendamentos" deltaType="up" />
                <MetricCard label="Total Agendamentos" value={String(agendamentos.length)} delta="Todos os registros" deltaType="neutral" />
                <MetricCard label="Ticket Médio"       value={`R$${Math.round(ticketMedio).toLocaleString('pt-BR')}`} delta="Por agendamento" deltaType="neutral" />
                <MetricCard label="Cancelamentos"      value={String(cancelados)} delta={`${agendamentos.length > 0 ? Math.round((cancelados / agendamentos.length) * 100) : 0}% do total`} deltaType={cancelados > 2 ? 'down' : 'up'} />
              </div>

              <div className="g2">
                <Card>
                  <CardHeader title="Top Procedimentos" subtitle="Por receita gerada" />
                  {topProcs.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>Sem dados de procedimentos.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                      {topProcs.map(([nome, d]) => (
                        <div key={nome}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{nome}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              R${d.receita.toLocaleString('pt-BR')} · {d.count}x
                            </span>
                          </div>
                          <ProgressBar value={receitaTotal > 0 ? Math.round((d.receita / receitaTotal) * 100) : 0} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Top Profissionais" subtitle="Por receita gerada" />
                  {topProfissionais.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>Sem dados de profissionais.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                      {topProfissionais.map(([nome, d]) => (
                        <div key={nome}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{nome}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              R${d.receita.toLocaleString('pt-BR')} · {d.count} agend.
                            </span>
                          </div>
                          <ProgressBar value={receitaTotal > 0 ? Math.round((d.receita / receitaTotal) * 100) : 0} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {activeTab === 'agendamentos' && (
            <Card>
              <CardHeader
                title="Histórico de Agendamentos"
                subtitle={`${agendamentos.length} registros`}
                action={<Button variant="outline" size="sm">Exportar</Button>}
              />
              {agendamentos.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Nenhum agendamento encontrado.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Procedimento</th>
                      <th>Profissional</th>
                      <th>Valor</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentos.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontSize: 12 }}>
                          {new Date(a.data).toLocaleDateString('pt-BR')}
                          <br />
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{a.hora_inicio?.slice(0, 5)}</span>
                        </td>
                        <td style={{ fontSize: 12.5, fontWeight: 600 }}>{a.procedimento || '—'}</td>
                        <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{a.profissional || '—'}</td>
                        <td style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {a.valor ? `R$${Number(a.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                        </td>
                        <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.metodo_pagamento || '—'}</td>
                        <td><Badge variant={statusVariant(a.status)}>{a.status || 'pendente'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
};

export default RelatoriosClinica;
