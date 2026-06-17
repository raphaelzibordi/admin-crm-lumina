import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, MetricCard, Card, CardHeader, HealthBar, ProgressBar } from '../components/ui';
import { fetchClinicas, createClinica, type Clinica, type PlanoClinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

const PLANOS_MODAL: { value: PlanoClinica; label: string }[] = [
  { value: 'basico',     label: 'Básico'     },
  { value: 'pro',        label: 'Pro'        },
  { value: 'enterprise', label: 'Enterprise' },
];

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 36,
  border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  padding: '0 10px', fontSize: 13,
  fontFamily: 'Inter, sans-serif', color: 'var(--text-main)',
  background: 'var(--surface)', outline: 'none', boxSizing: 'border-box', marginTop: 4,
};

function exportCSV(clinicas: Clinica[]) {
  const headers = ['Nome', 'Email', 'Plano', 'Clientes', 'Agendamentos', 'Equipe', 'Receita', 'Health Score', 'Status'];
  const rows = clinicas.map(c => [
    `"${c.nome_clinica.replace(/"/g, '""')}"`,
    c.email,
    c.plano,
    c.total_clientes,
    c.total_agendamentos,
    c.total_equipe,
    c.receita_total,
    c.health_score,
    c.health_score >= 60 ? 'Ativa' : c.health_score >= 35 ? 'Em risco' : 'Crítica',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clinicas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const GlobalDashboard = () => {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlano, setNewPlano] = useState<PlanoClinica>('basico');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadClinicas = () => {
    setLoading(true);
    fetchClinicas()
      .then(data => setClinicas(data.filter(c => !c.arquivado)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClinicas(); }, []);

  const openModal = () => {
    setNewNome(''); setNewEmail(''); setNewPlano('basico'); setCreateError(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!newNome.trim() || !newEmail.trim()) { setCreateError('Preencha todos os campos.'); return; }
    setCreating(true); setCreateError(null);
    try {
      await createClinica({ nome_clinica: newNome.trim(), email: newEmail.trim(), plano: newPlano });
      setShowModal(false);
      loadClinicas();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const totalReceita = clinicas.reduce((s, c) => s + c.receita_total, 0);
  const totalClientes = clinicas.reduce((s, c) => s + c.total_clientes, 0);
  const totalAgendamentos = clinicas.reduce((s, c) => s + c.total_agendamentos, 0);
  const emRisco = clinicas.filter(c => c.health_score < 40).length;

  const topbarRight = (
    <>
      <Button variant="outline" size="sm" onClick={() => exportCSV(clinicas)} disabled={clinicas.length === 0}>Exportar</Button>
      <Button variant="primary" size="sm" onClick={openModal}>+ Nova Clínica</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {error && (
        <div className="alert a-danger" style={{ marginBottom: 14 }}>
          Erro ao carregar dados do CRM: {error}
        </div>
      )}

      {!loading && emRisco > 0 && (
        <div className="alert a-danger" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" /><path d="M8 5v4M8 11h.01" />
          </svg>
          <span>
            <strong>{emRisco} {emRisco === 1 ? 'clínica em risco' : 'clínicas em risco'} de cancelamento</strong>
            {' '}— Health score crítico.{' '}
            <span
              onClick={() => navigate('/clinicas', { state: { statusFilter: 'critica' } })}
              style={{ textDecoration: 'underline', cursor: 'pointer', marginLeft: 4 }}
            >
              Ver detalhes →
            </span>
          </span>
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
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100% - 32px)', maxWidth: 420, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--r)',
            zIndex: 201, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Nova Clínica</div>
              <button onClick={() => setShowModal(false)} style={{
                width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da clínica</span>
                <input type="text" value={newNome} onChange={e => setNewNome(e.target.value)} style={fieldStyle} placeholder="Ex: Clínica São Paulo" autoFocus />
              </label>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>E-mail</span>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={fieldStyle} placeholder="contato@clinica.com.br" />
              </label>
              <label style={{ display: 'block', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plano</span>
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {PLANOS_MODAL.map(p => (
                  <button key={p.value} type="button" onClick={() => setNewPlano(p.value)} style={{
                    flex: 1, padding: '8px 0',
                    border: `2px solid ${newPlano === p.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)',
                    background: newPlano === p.value ? 'var(--primary-light)' : 'var(--surface)',
                    color: newPlano === p.value ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    fontSize: 12.5, fontWeight: newPlano === p.value ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {createError && (
                <div className="alert a-danger" style={{ marginBottom: 14 }}>{createError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Criando…' : 'Criar clínica'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default GlobalDashboard;
