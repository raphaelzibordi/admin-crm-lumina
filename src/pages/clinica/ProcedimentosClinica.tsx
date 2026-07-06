import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Toggle } from '../../components/ui';
import {
  fetchProcedimentosClinica, fetchSalasClinica, fetchEquipeClinica,
  createProcedimento, updateProcedimento, deleteProcedimento,
  type Procedimento, type ProcedimentoInput, type Sala, type MembroEquipe,
} from '../../lib/crmQueries';
import '../../components/ui/ui.css';

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

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 64,
  padding: '8px 10px',
  resize: 'vertical',
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.5px',
  color: 'var(--text-muted)',
  marginBottom: 14,
};

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l10 10M13 3L3 13" />
  </svg>
);

interface FormState {
  nome: string;
  descricao: string;
  preco: string;
  duracaoMinutos: string;
  validadeDias: string;
  salaRequerida: string;
  profissionalResponsavel: string;
  bookingVisivel: boolean;
}

const emptyForm: FormState = {
  nome: '',
  descricao: '',
  preco: '',
  duracaoMinutos: '60',
  validadeDias: '120',
  salaRequerida: '',
  profissionalResponsavel: '',
  bookingVisivel: false,
};

const formToInput = (f: FormState): ProcedimentoInput => ({
  nome: f.nome.trim(),
  descricao: f.descricao.trim() || null,
  preco: parseFloat(f.preco.replace(',', '.')) || 0,
  duracao_minutos: parseInt(f.duracaoMinutos, 10) || 60,
  validade_dias: parseInt(f.validadeDias, 10) || 120,
  sala_requerida: f.salaRequerida || null,
  profissional_responsavel: f.profissionalResponsavel || null,
  booking_visivel: f.bookingVisivel,
});

const ProcedimentosClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();

  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Criar (modal)
  const [showModal, setShowModal] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Editar (painel lateral)
  const [selected, setSelected] = useState<Procedimento | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      fetchProcedimentosClinica(clinicId),
      fetchSalasClinica(clinicId),
      fetchEquipeClinica(clinicId),
    ])
      .then(([p, s, e]) => {
        setProcedimentos(p);
        setSalas(s.filter(x => x.ativo));
        setEquipe(e.filter(m => m.ativo));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [clinicId]);

  // ── Criar ───────────────────────────────────────────────────────────────────

  const openModal = () => {
    setCreateForm(emptyForm);
    setCreateError(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.nome.trim()) { setCreateError('Informe o nome do procedimento.'); return; }
    if (!clinicId) return;
    setCreating(true); setCreateError(null);
    try {
      await createProcedimento(clinicId, formToInput(createForm));
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  // ── Editar ──────────────────────────────────────────────────────────────────

  const openEdit = (p: Procedimento) => {
    setSelected(p);
    setEditForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: p.preco != null ? String(p.preco) : '',
      duracaoMinutos: String(p.duracao_minutos ?? 60),
      validadeDias: String(p.validade_dias ?? 120),
      salaRequerida: p.sala_requerida ?? '',
      profissionalResponsavel: p.profissional_responsavel ?? '',
      bookingVisivel: p.booking_visivel ?? false,
    });
    setSaveResult(null);
    setConfirmDelete(false);
  };

  const closePanel = () => { setSelected(null); setConfirmDelete(false); };

  const handleSave = async () => {
    if (!selected || !editForm.nome.trim()) return;
    setSaving(true); setSaveResult(null);
    try {
      const updates = formToInput(editForm);
      await updateProcedimento(selected.id, updates);
      setProcedimentos(prev => prev.map(p => p.id === selected.id ? { ...p, ...updates } : p));
      setSelected(prev => prev ? { ...prev, ...updates } : null);
      setSaveResult({ ok: true, msg: 'Procedimento atualizado com sucesso.' });
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteProcedimento(selected.id);
      setProcedimentos(prev => prev.filter(p => p.id !== selected.id));
      closePanel();
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  };

  // ── Form compartilhado (criar/editar) ───────────────────────────────────────

  const renderFields = (form: FormState, setForm: React.Dispatch<React.SetStateAction<FormState>>) => (
    <>
      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={labelStyle}>Nome do procedimento *</span>
        <input
          type="text"
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          style={fieldStyle}
          placeholder="Ex: Toxina Botulínica (Botox)"
        />
      </label>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={labelStyle}>Descrição</span>
        <textarea
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          style={textareaStyle}
          placeholder="Opcional"
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Preço (R$)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.preco}
            onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
            style={fieldStyle}
            placeholder="0,00"
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Duração (min)</span>
          <input
            type="number"
            min="5"
            step="5"
            value={form.duracaoMinutos}
            onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Validade (dias)</span>
          <input
            type="number"
            min="1"
            value={form.validadeDias}
            onChange={e => setForm(f => ({ ...f, validadeDias: e.target.value }))}
            style={fieldStyle}
          />
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={labelStyle}>Sala requerida</span>
        <select
          value={form.salaRequerida}
          onChange={e => setForm(f => ({ ...f, salaRequerida: e.target.value }))}
          style={selectStyle}
        >
          <option value="">— Nenhuma —</option>
          {salas.map(s => (
            <option key={s.id} value={s.nome}>{s.nome}</option>
          ))}
          {/* Preserva valor legado que não corresponde a nenhuma sala ativa */}
          {form.salaRequerida && !salas.some(s => s.nome === form.salaRequerida) && (
            <option value={form.salaRequerida}>{form.salaRequerida}</option>
          )}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={labelStyle}>Profissional responsável</span>
        <select
          value={form.profissionalResponsavel}
          onChange={e => setForm(f => ({ ...f, profissionalResponsavel: e.target.value }))}
          style={selectStyle}
        >
          <option value="">— Nenhum —</option>
          {equipe.map(m => (
            <option key={m.id} value={m.nome}>{m.nome} ({m.cargo})</option>
          ))}
          {form.profissionalResponsavel && !equipe.some(m => m.nome === form.profissionalResponsavel) && (
            <option value={form.profissionalResponsavel}>{form.profissionalResponsavel}</option>
          )}
        </select>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={labelStyle}>Visível no booking online</span>
        <Toggle on={form.bookingVisivel} onChange={v => setForm(f => ({ ...f, bookingVisivel: v }))} />
      </div>
    </>
  );

  // ── Métricas ────────────────────────────────────────────────────────────────

  const totalReceita = procedimentos.reduce((s, p) => s + (Number(p.preco) || 0), 0);

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={openModal}>+ Novo Procedimento</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="m-lbl">Total Procedimentos</div>
          <div className="m-val">{loading ? '…' : procedimentos.length}</div>
          <div className="m-delta">Cadastrados</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Ticket Médio</div>
          <div className="m-val">
            {loading || procedimentos.length === 0 ? '—' : `R$${Math.round(totalReceita / procedimentos.length).toLocaleString('pt-BR')}`}
          </div>
          <div className="m-delta">Preço médio</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Visíveis no Booking</div>
          <div className="m-val">{loading ? '…' : procedimentos.filter(p => p.booking_visivel).length}</div>
          <div className="m-delta">Disponíveis online</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Com Sala Requerida</div>
          <div className="m-val">{loading ? '…' : procedimentos.filter(p => p.sala_requerida).length}</div>
          <div className="m-delta">Precisam de sala</div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Procedimentos da Clínica"
          subtitle={loading ? 'Carregando…' : `${procedimentos.length} procedimentos cadastrados`}
        />
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando procedimentos…
          </div>
        ) : error ? (
          <div className="alert a-danger" style={{ margin: 16 }}>{error}</div>
        ) : procedimentos.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Nenhum procedimento cadastrado nesta clínica.
            </div>
            <Button variant="primary" size="sm" onClick={openModal}>+ Novo Procedimento</Button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Responsável</th>
                <th>Sala</th>
                <th>Booking</th>
                <th>Cadastrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {procedimentos.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong style={{ fontSize: 12.5 }}>{p.nome}</strong>
                    {p.descricao && (
                      <><br /><span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{p.descricao.slice(0, 60)}{p.descricao.length > 60 ? '…' : ''}</span></>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{p.duracao_minutos} min</td>
                  <td style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {p.preco ? `R$${Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {p.profissional_responsavel || '—'}
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {p.sala_requerida || '—'}
                  </td>
                  <td><Badge variant={p.booking_visivel ? 'success' : 'neutral'}>{p.booking_visivel ? 'Visível' : 'Oculto'}</Badge></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Novo Procedimento (modal) ─────────────────────────────────── */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100% - 32px)', maxWidth: 480, maxHeight: 'calc(100vh - 48px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--r)',
            zIndex: 201, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Novo Procedimento</div>
              <button onClick={() => setShowModal(false)} style={{
                width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <CloseIcon />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {renderFields(createForm, setCreateForm)}
              {createError && (
                <div className="alert a-danger" style={{ marginBottom: 14 }}>{createError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Criando…' : 'Criar procedimento'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Painel de edição ─────────────────────────────────────────── */}
      {selected && (
        <>
          <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 460,
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.nome}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Cadastrado em {new Date(selected.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <Badge variant={selected.booking_visivel ? 'success' : 'neutral'}>
                {selected.booking_visivel ? 'Visível' : 'Oculto'}
              </Badge>
              <button
                onClick={closePanel}
                style={{
                  width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                  background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', flexShrink: 0,
                }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={sectionTitle}>Informações do procedimento</div>

              {renderFields(editForm, setEditForm)}

              {saveResult && (
                <div className={`alert ${saveResult.ok ? 'a-info' : 'a-danger'}`} style={{ marginBottom: 14 }}>
                  {saveResult.msg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !editForm.nome.trim()}>
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </Button>
                <Button variant="outline" size="sm" onClick={closePanel}>Cancelar</Button>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Zona de perigo */}
              <div style={sectionTitle}>Zona de perigo</div>

              {!confirmDelete ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Excluir procedimento
                </Button>
              ) : (
                <div style={{
                  background: 'var(--danger-light, #fef2f2)', border: '1px solid var(--danger)',
                  borderRadius: 'var(--r-sm)', padding: 14,
                }}>
                  <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600, marginBottom: 10 }}>
                    Confirmar exclusão de "{selected.nome}"?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Esta ação não pode ser desfeita.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default ProcedimentosClinica;
