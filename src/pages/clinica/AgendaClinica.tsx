import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, Tabs } from '../../components/ui';
import { fetchAgendamentosClinica, type Agendamento } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

type TabKey = 'hoje' | 'semana' | 'todos';

const statusVariant = (s: string | null) => {
  if (s === 'concluido' || s === 'confirmado') return 'success' as const;
  if (s === 'cancelado') return 'danger' as const;
  if (s === 'pendente') return 'warning' as const;
  return 'neutral' as const;
};

const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

const isThisWeek = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
};

const AgendaClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const tabs: TabKey[] = ['hoje', 'semana', 'todos'];

  useEffect(() => {
    if (!clinicId) return;
    fetchAgendamentosClinica(clinicId)
      .then(setAgendamentos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const filtered = agendamentos.filter(a => {
    if (tabs[tab] === 'hoje') return isToday(a.data);
    if (tabs[tab] === 'semana') return isThisWeek(a.data);
    return true;
  });

  const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
  const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
  const hoje = agendamentos.filter(a => isToday(a.data)).length;
  const semana = agendamentos.filter(a => isThisWeek(a.data)).length;

  const topbarRight = (
    <Button variant="primary" size="sm">+ Novo Agendamento</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="metrics" style={{ marginBottom: 16 }}>
        <MetricCard label="Hoje"       value={String(hoje)}       delta="Agendamentos" deltaType="neutral" />
        <MetricCard label="Esta Semana" value={String(semana)}    delta="Agendamentos" deltaType="neutral" />
        <MetricCard label="Confirmados" value={String(confirmados)} delta="Aguardando atendimento" deltaType="up" />
        <MetricCard label="Pendentes"   value={String(pendentes)}  delta={pendentes > 0 ? 'Requer ação' : 'Tudo ok'} deltaType={pendentes > 0 ? 'down' : 'up'} />
      </div>

      <Tabs tabs={['Hoje', 'Esta Semana', 'Todos']} active={tab} onChange={setTab} />

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando agenda…
        </div>
      ) : error ? (
        <div className="alert a-danger">{error}</div>
      ) : (
        <Card>
          <CardHeader
            title={tab === 0 ? 'Agendamentos de Hoje' : tab === 1 ? 'Agendamentos da Semana' : 'Todos os Agendamentos'}
            subtitle={`${filtered.length} registro(s)`}
            action={<Button variant="outline" size="sm">Exportar</Button>}
          />
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {tab === 0 ? 'Nenhum agendamento para hoje.' : tab === 1 ? 'Nenhum agendamento esta semana.' : 'Nenhum agendamento cadastrado.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Procedimento</th>
                  <th>Profissional</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 12 }}>
                      {new Date(a.data).toLocaleDateString('pt-BR')}
                      <br />
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{a.hora_inicio?.slice(0, 5) || '—'}</span>
                    </td>
                    <td style={{ fontSize: 12.5, fontWeight: 600 }}>{a.procedimento || '—'}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{a.profissional || '—'}</td>
                    <td style={{ fontSize: 12.5, fontWeight: 700 }}>
                      {a.valor ? `R$${Number(a.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.metodo_pagamento || '—'}</td>
                    <td><Badge variant={statusVariant(a.status)}>{a.status || 'pendente'}</Badge></td>
                    <td><Button variant="outline" size="sm">Editar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </AppShell>
  );
};

export default AgendaClinica;
