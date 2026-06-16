import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, HealthBar } from '../components/ui';
import { fetchClinicas, updateClinica, adminChangePlan, adminSuspendClinica, adminReactivateClinica, createClinica, deleteClinica, archiveClinica, resendInvite, type Clinica, type PlanoClinica } from '../lib/crmQueries';
import '../components/ui/ui.css';

type StatusFilter = 'all' | 'ativa' | 'risco' | 'critica' | 'arquivada';

const BILLING_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  pending:   { label: 'Aguardando ativação', variant: 'info'    },
  active:    { label: 'Ativo',               variant: 'success' },
  past_due:  { label: 'Inadimplente',        variant: 'warning' },
  suspended: { label: 'Suspenso',            variant: 'danger'  },
  canceled:  { label: 'Cancelado',           variant: 'neutral' },
};


function billingInfo(c: Clinica) {
  if (!c.abacatepay_subscription_status) return null;
  return BILLING_STATUS[c.abacatepay_subscription_status] ?? { label: c.abacatepay_subscription_status, variant: 'neutral' as const };
}

function trialDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

const PLANOS: { value: PlanoClinica; label: string; badge: 'neutral' | 'info' | 'purple' | 'teal' }[] = [
  { value: 'basico',     label: 'Básico',     badge: 'neutral' },
  { value: 'pro',        label: 'Pro',        badge: 'info'    },
  { value: 'enterprise', label: 'Enterprise', badge: 'purple'  },
  { value: 'vip',        label: 'VIP',        badge: 'teal'    },
];

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

const Clinicas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (location.state as { statusFilter?: StatusFilter } | null)?.statusFilter ?? 'all'
  );
  const [selected, setSelected] = useState<Clinica | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlano, setEditPlano] = useState<PlanoClinica>('basico');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [resending, setResending] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlano, setNewPlano] = useState<PlanoClinica>('basico');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadClinicas = () => {
    setLoading(true);
    fetchClinicas()
      .then(setClinicas)
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

  const filtered = clinicas.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nome_clinica.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === 'arquivada') return c.arquivado;
    if (c.arquivado) return false;
    if (statusFilter === 'ativa')   return c.health_score >= 60;
    if (statusFilter === 'risco')   return c.health_score >= 35 && c.health_score < 60;
    if (statusFilter === 'critica') return c.health_score < 35;
    return true;
  });

  const openDetail = (c: Clinica) => {
    setSelected(c);
    setEditName(c.nome_clinica);
    setEditEmail(c.email);
    setEditPlano(c.plano);
    setSaveResult(null);
    setConfirmDelete(false);
    setConfirmSuspend(false);
    setConfirmArchive(false);
  };

  const closePanel = () => { setSelected(null); setConfirmDelete(false); setConfirmSuspend(false); setConfirmArchive(false); };

  const handleSuspend = async () => {
    if (!selected) return;
    setSuspending(true);
    try {
      await adminSuspendClinica(selected.id);
      const updated = { ...selected, admin_suspended: true };
      setClinicas(prev => prev.map(c => c.id === selected.id ? updated : c));
      setSelected(updated);
      setConfirmSuspend(false);
      setSaveResult({ ok: true, msg: 'Clínica suspensa com sucesso.' });
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    if (!selected) return;
    setSuspending(true);
    try {
      await adminReactivateClinica(selected.id);
      const updated = { ...selected, admin_suspended: false };
      setClinicas(prev => prev.map(c => c.id === selected.id ? updated : c));
      setSelected(updated);
      setSaveResult({ ok: true, msg: 'Clínica reativada com sucesso.' });
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSuspending(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteClinica(selected.id);
      setSelected(null);
      setConfirmDelete(false);
      loadClinicas();
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      if (err.code === 'SIGNED_RECORDS') {
        setConfirmDelete(false);
        setConfirmArchive(true);
        setSaveResult({ ok: false, msg: 'Esta clínica possui prontuários assinados e não pode ser excluída (CFM 1.638/2002). Você pode arquivá-la: o acesso é bloqueado e o e-mail liberado para reutilização.' });
      } else {
        setSaveResult({ ok: false, msg: err.message });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!selected) return;
    setArchiving(true);
    try {
      await archiveClinica(selected.id);
      setSelected(null);
      setConfirmArchive(false);
      loadClinicas();
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setArchiving(false);
    }
  };

  const handleResendInvite = async () => {
    if (!selected) return;
    setResending(true);
    setSaveResult(null);
    try {
      await resendInvite(selected.email, selected.nome_clinica);
      setSaveResult({ ok: true, msg: 'Convite reenviado com sucesso.' });
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setResending(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await updateClinica(selected.id, { nome_clinica: editName, email: editEmail });
      if (editPlano !== selected.plano) {
        await adminChangePlan(selected.id, editPlano);
      }
      setClinicas(prev => prev.map(c =>
        c.id === selected.id ? { ...c, nome_clinica: editName, email: editEmail, plano: editPlano } : c
      ));
      setSelected(prev => prev ? { ...prev, nome_clinica: editName, email: editEmail, plano: editPlano } : null);
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
      <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>Exportar</Button>
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
          <option value="arquivada">Arquivada</option>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <HealthBar value={c.health_score} />
                  <Badge variant={PLANOS.find(p => p.value === c.plano)?.badge ?? 'neutral'}>
                    {PLANOS.find(p => p.value === c.plano)?.label ?? c.plano}
                  </Badge>
                  {c.admin_suspended
                    ? <Badge variant="danger">Suspensa</Badge>
                    : <Badge variant={status.variant}>{status.label}</Badge>
                  }
                  {!c.admin_suspended && billingInfo(c) && (
                    <Badge variant={billingInfo(c)!.variant}>{billingInfo(c)!.label}</Badge>
                  )}
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

      {/* ── Nova Clínica modal ──────────────────────────────────────── */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 420, background: 'var(--surface)',
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
              <div style={{ display: 'flex', gap: 8, marginBottom: newPlano === 'vip' ? 8 : 20 }}>
                {PLANOS.map(p => {
                  const isActive = newPlano === p.value;
                  const isVip = p.value === 'vip';
                  return (
                    <button key={p.value} type="button" onClick={() => setNewPlano(p.value)} style={{
                      flex: 1, padding: '8px 0',
                      border: isActive
                        ? `2px solid ${isVip ? '#0d9488' : 'var(--primary)'}`
                        : '2px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      background: isActive
                        ? (isVip ? '#f0fdfa' : 'var(--primary-light)')
                        : 'var(--surface)',
                      color: isActive
                        ? (isVip ? '#0d9488' : 'var(--primary-dark)')
                        : 'var(--text-secondary)',
                      fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {newPlano === 'vip' && (
                <div style={{
                  marginBottom: 16, padding: '8px 12px',
                  background: '#f0fdfa', border: '1px solid #99f6e4',
                  borderRadius: 'var(--r-sm)', fontSize: 11.5, color: '#0d9488',
                }}>
                  ✦ Parceiro VIP — acesso gratuito com todas as permissões Enterprise. Nenhuma cobrança será gerada.
                </div>
              )}
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

              {/* Billing status */}
              {selected.abacatepay_subscription_status && (() => {
                const info = billingInfo(selected);
                const days = selected.abacatepay_subscription_status === 'pending'
                  ? trialDaysLeft(selected.acesso_expira_em)
                  : null;
                return (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                      Billing
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {info && <Badge variant={info.variant}>{info.label}</Badge>}
                      <Badge variant="neutral">
                        {selected.plano_periodicidade === 'anual' ? 'Anual' : 'Mensal'}
                      </Badge>
                      {days !== null && (
                        <span style={{ fontSize: 11.5, color: days <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {days === 0 ? 'Acesso expirado' : `Acesso: ${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`}
                        </span>
                      )}
                      {selected.acesso_expira_em && selected.abacatepay_subscription_status === 'active' && (
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          Expira {new Date(selected.acesso_expira_em).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    {selected.admin_suspended && (
                      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--danger, #e05252)', background: 'var(--danger-light, #fef2f2)', border: '1px solid var(--danger, #e05252)', borderRadius: 6, padding: '8px 10px' }}>
                        ⛔ Clínica suspensa manualmente pelo administrador. O acesso ao sistema está bloqueado.
                      </div>
                    )}
                    {selected.plano === 'vip' && !selected.admin_suspended && (
                      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--purple, #7c3aed)', background: 'var(--purple-light, #f3eeff)', border: '1px solid var(--purple-border, #c4b5fd)', borderRadius: 6, padding: '8px 10px' }}>
                        ✦ Parceiro VIP — acesso gratuito e sem cobrança. Nenhuma ação de billing se aplica.
                      </div>
                    )}
                    {selected.abacatepay_subscription_status === 'suspended' && !selected.admin_suspended && selected.suspended_at && (
                      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--danger)' }}>
                        Acesso suspenso em {new Date(selected.suspended_at).toLocaleDateString('pt-BR')} após 3 tentativas de cobrança sem sucesso. O acesso é restaurado automaticamente quando o pagamento for confirmado.
                      </div>
                    )}
                    {selected.abacatepay_subscription_status === 'past_due' && !selected.admin_suspended && (
                      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--warning)' }}>
                        Pagamento em atraso — o sistema tentará cobrar novamente automaticamente. Após 3 tentativas sem sucesso, o acesso será suspenso.
                      </div>
                    )}
                  </div>
                );
              })()}

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

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plano</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {PLANOS.map(p => {
                    const isVip = p.value === 'vip';
                    const isActive = editPlano === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditPlano(p.value)}
                        style={{
                          flex: '1 1 0',
                          minWidth: 60,
                          padding: '8px 0',
                          border: isActive
                            ? `2px solid ${isVip ? 'var(--purple, #7c3aed)' : 'var(--primary)'}`
                            : '2px solid var(--border)',
                          borderRadius: 'var(--r-sm)',
                          background: isActive
                            ? (isVip ? 'var(--purple-light, #f3eeff)' : 'var(--primary-light)')
                            : 'var(--surface)',
                          color: isActive
                            ? (isVip ? 'var(--purple, #7c3aed)' : 'var(--primary-dark)')
                            : 'var(--text-secondary)',
                          fontSize: 12.5,
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
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

              {/* Save / action feedback */}
              {saveResult && (
                <div className={`alert ${saveResult.ok ? 'a-info' : 'a-danger'}`} style={{ marginBottom: 14 }}>
                  {saveResult.msg}
                </div>
              )}

              {/* Confirm suspend zone */}
              {confirmSuspend && (
                <div style={{ background: 'var(--danger-light, #fef2f2)', border: '1px solid var(--danger, #e05252)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger, #e05252)', marginBottom: 6 }}>
                    Suspender acesso desta clínica?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                    A clínica perderá acesso imediato ao sistema. Nenhum dado é excluído. Você pode reativar a qualquer momento.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={handleSuspend} disabled={suspending}
                      style={{ background: 'var(--danger, #e05252)', borderColor: 'var(--danger, #e05252)' }}>
                      {suspending ? 'Suspendendo…' : 'Confirmar suspensão'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmSuspend(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Confirm delete zone */}
              {confirmDelete && (
                <div style={{ background: 'var(--danger-light, #fef2f2)', border: '1px solid var(--danger, #e05252)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger, #e05252)', marginBottom: 6 }}>
                    Excluir clínica permanentemente?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                    Isso remove o acesso do dono, todos os dados vinculados e o usuário do sistema. <strong>Irreversível.</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={handleDelete} disabled={deleting}
                      style={{ background: 'var(--danger, #e05252)', borderColor: 'var(--danger, #e05252)' }}>
                      {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Confirm archive zone */}
              {confirmArchive && (
                <div style={{ background: '#fffbeb', border: '1px solid #d97706', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706', marginBottom: 6 }}>
                    Arquivar clínica?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                    A clínica será suspensa permanentemente, os dados serão mantidos e o e-mail será liberado para uso em outro cadastro.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={handleArchive} disabled={archiving}
                      style={{ background: '#d97706', borderColor: '#d97706' }}>
                      {archiving ? 'Arquivando…' : 'Confirmar arquivamento'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmArchive(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="primary" size="sm" onClick={handleSave}
                disabled={saving || (editName === selected.nome_clinica && editEmail === selected.email && editPlano === selected.plano)}
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/clinicas/${selected.id}/equipe`)}>
                Entrar na clínica
              </Button>
              <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={resending}>
                {resending ? 'Enviando…' : 'Reenviar convite'}
              </Button>
              {!selected.arquivado && (
                selected.admin_suspended ? (
                  <Button variant="outline" size="sm" onClick={handleReactivate} disabled={suspending}
                    style={{ color: 'var(--success, #16a34a)', borderColor: 'var(--success, #16a34a)' }}>
                    {suspending ? 'Reativando…' : 'Reativar clínica'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setSaveResult(null); setConfirmDelete(false); setConfirmArchive(false); setConfirmSuspend(true); }}
                    style={{ color: 'var(--danger, #e05252)', borderColor: 'var(--danger, #e05252)' }}>
                    Suspender clínica
                  </Button>
                )
              )}
              {selected.arquivado ? (
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#d97706', fontWeight: 600 }}>Clínica arquivada</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setSaveResult(null); setConfirmSuspend(false); setConfirmArchive(false); setConfirmDelete(true); }}
                  style={{ marginLeft: 'auto', color: 'var(--danger, #e05252)', borderColor: 'var(--danger, #e05252)', opacity: 0.7 }}>
                  Excluir clínica
                </Button>
              )}
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
