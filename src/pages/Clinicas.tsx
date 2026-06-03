import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, HealthBar } from '../components/ui';
import { fetchClinicas, updateClinica, type Clinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

type StatusFilter = 'all' | 'ativa' | 'risco' | 'critica';

function getStatus(score: number): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (score >= 60) return { label: 'Ativa', variant: 'success' };
  if (score >= 35) return { label: 'Em risco', variant: 'warning' };
  return { label: 'Crítica', variant: 'danger' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatReais(cents: number) {
  return `R$${Number(cents).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '0 10px 0 32px',
  fontSize: 12.5,
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-main)',
  background: 'var(--surface)',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  height: 34,
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '0 10px',
  fontSize: 12.5,
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-main)',
  background: 'var(--surface)',
  outline: 'none',
  cursor: 'pointer',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '0 10px',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-main)',
  background: 'var(--surface)',
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: 4,
};

const Clinicas = () => {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Clinica | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchClinicas()
      .then(setClinicas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clinicas.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nome_clinica.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === 'ativa')   return c.health_score >= 60;
    if (statusFilter === 'risco')   return c.health_score >= 35 && c.health_score < 60;
    if (statusFilter === 'critica') return c.health_score < 35;
    return true;
  });

  const openDetail = (c: Clinica) => {
    setSelected(c);
    setEditName(c.nome_clinica);
    setEditEmail(c.email);
    setSaveResult(null);
  };

  const closePanel = () => setSelected(null);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await updateClinica(selected.id, { nome_clinica: editName, email: editEmail });
      setClinicas(prev => prev.map(c =>
        c.id === selected.id ? { ...c, nome_clinica: editName, email: editEmail } : c
      ));
      setSelected(prev => prev ? { ...prev, nome_clinica: editName, email: editEmail } : null);
      setSaveResult({ ok: true, msg: 'Alterações salvas com sucesso.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveResult({ ok: false, msg });
    } finally {
      setSaving(false);
    }
  };

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

      {/* ── Search / filter bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <svg
            width="14" height="14"
            viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.6"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5l3 3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar clínica por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          style={selectStyle}
        >
          <option value="all">Todos os status</option>
          <option value="ativa">Ativa</option>
          <option value="risco">Em risco</option>
          <option value="critica">Crítica</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {loading ? 'Carregando…' : `${filtered.length} de ${clinicas.length} clínicas`}
        </span>
      </div>

      {/* ── Clinic list ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando clínicas…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Nenhuma clínica encontrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => {
            const status = getStatus(c.health_score);
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-xlight)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}
              >
                {/* Identity */}
                <div style={{ minWidth: 200, flex: '0 0 200px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{c.nome_clinica}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.email}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    Desde {formatDate(c.created_at)}
                  </div>
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 28, flex: 1 }}>
                  <Metric label="Clientes" value={String(c.total_clientes)} />
                  <Metric label="Agendamentos" value={String(c.total_agendamentos)} />
                  <Metric label="Equipe" value={String(c.total_equipe)} />
                  <Metric label="Receita" value={formatReais(c.receita_total)} bold />
                </div>

                {/* Health + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <HealthBar value={c.health_score} />
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                    stroke="var(--text-muted)" strokeWidth="1.8"
                    style={{ flexShrink: 0 }}>
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail / edit panel ─────────────────────────────────────── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePanel}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.25)',
              zIndex: 100,
            }}
          />

          {/* Slide-over panel */}
          <div style={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0,
            width: 440,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.nome_clinica}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selected.email}</div>
              </div>
              <Badge variant={getStatus(selected.health_score).variant}>
                {getStatus(selected.health_score).label}
              </Badge>
              <button
                onClick={closePanel}
                style={{
                  width: 30, height: 30, border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', background: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>

            {/* Panel body — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

              {/* Metrics grid */}
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                Métricas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                <PanelMetric label="Clientes"      value={String(selected.total_clientes)} />
                <PanelMetric label="Agendamentos"  value={String(selected.total_agendamentos)} />
                <PanelMetric label="Equipe"        value={String(selected.total_equipe)} />
                <PanelMetric label="Receita Total" value={formatReais(selected.receita_total)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)' }}>
                  Health Score
                </div>
                <HealthBar value={selected.health_score} />
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Edit form */}
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: 14 }}>
                Informações da clínica
              </div>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da clínica</span>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={fieldStyle}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>E-mail</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  style={fieldStyle}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cadastro</span>
                <div style={{
                  marginTop: 4, padding: '8px 10px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--text-muted)',
                }}>
                  {formatDate(selected.created_at)}
                </div>
              </label>

              {/* Save feedback */}
              {saveResult && (
                <div className={`alert ${saveResult.ok ? 'a-info' : 'a-danger'}`} style={{ marginBottom: 14 }}>
                  {saveResult.msg}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
            }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || (editName === selected.nome_clinica && editEmail === selected.email)}
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/clinicas/${selected.id}/equipe`)}
              >
                Entrar na clínica
              </Button>
              <Button variant="outline" size="sm" onClick={closePanel} style={{ marginLeft: 'auto' }}>
                Fechar
              </Button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

// ── Small helpers ────────────────────────────────────────────────────────────

function Metric({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: 'var(--text-main)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
        {value}
      </div>
    </div>
  );
}

export default Clinicas;
