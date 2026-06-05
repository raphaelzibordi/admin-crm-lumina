import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, Toggle } from '../../components/ui';
import {
  fetchSalasClinica, fetchEquipeClinica,
  createSala, updateSala, deleteSala,
  type Sala, type MembroEquipe,
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
  height: 72,
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

const SalasClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit panel
  const [selected, setSelected] = useState<Sala | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editProfissionalId, setEditProfissionalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Nova sala modal
  const [showModal, setShowModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newAtivo, setNewAtivo] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([fetchSalasClinica(clinicId), fetchEquipeClinica(clinicId)])
      .then(([s, e]) => {
        setSalas(s);
        setEquipe(e.filter(m => m.ativo));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [clinicId]);

  // ── Edit panel ──────────────────────────────────────────────────────────────

  const openEdit = (sala: Sala) => {
    setSelected(sala);
    setEditNome(sala.nome);
    setEditDescricao(sala.descricao ?? '');
    setEditAtivo(sala.ativo);
    setEditProfissionalId(sala.profissional_id ?? '');
    setSaveResult(null);
    setConfirmDelete(false);
  };

  const closePanel = () => { setSelected(null); setConfirmDelete(false); };

  const handleSave = async () => {
    if (!selected || !editNome.trim()) return;
    setSaving(true); setSaveResult(null);
    try {
      const updates = {
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        ativo: editAtivo,
        profissional_id: editProfissionalId || null,
      };
      await updateSala(selected.id, updates);
      setSalas(prev => prev.map(s => s.id === selected.id ? { ...s, ...updates } : s));
      setSelected(prev => prev ? { ...prev, ...updates } : null);
      setSaveResult({ ok: true, msg: 'Sala atualizada com sucesso.' });
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
      await deleteSala(selected.id);
      setSalas(prev => prev.filter(s => s.id !== selected.id));
      closePanel();
    } catch (e: unknown) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  };

  // ── Nova sala modal ─────────────────────────────────────────────────────────

  const openModal = () => {
    setNewNome(''); setNewDescricao(''); setNewAtivo(true); setCreateError(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!newNome.trim()) { setCreateError('Informe o nome da sala.'); return; }
    if (!clinicId) return;
    setCreating(true); setCreateError(null);
    try {
      await createSala(clinicId, { nome: newNome.trim(), descricao: newDescricao.trim() || null, ativo: newAtivo });
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const profissionalNome = (id: string | null) =>
    id ? (equipe.find(m => m.id === id)?.nome ?? id) : null;

  const ativas = salas.filter(s => s.ativo).length;
  const inativas = salas.filter(s => !s.ativo).length;

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={openModal}>+ Nova Sala</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {/* ── Métricas ─────────────────────────────────────────────────── */}
      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="m-lbl">Total de Salas</div>
          <div className="m-val">{loading ? '…' : salas.length}</div>
          <div className="m-delta">Cadastradas</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Ativas</div>
          <div className="m-val" style={{ color: 'var(--success)' }}>{loading ? '…' : ativas}</div>
          <div className="m-delta up">Disponíveis</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Inativas</div>
          <div className="m-val" style={{ color: inativas > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {loading ? '…' : inativas}
          </div>
          <div className="m-delta down">Desativadas</div>
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando salas…
        </div>
      ) : error ? (
        <div className="alert a-danger">{error}</div>
      ) : salas.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Nenhuma sala cadastrada nesta clínica.
          </div>
          <Button variant="primary" size="sm" onClick={openModal}>+ Nova Sala</Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {salas.map(sala => {
            const prof = profissionalNome(sala.profissional_id);
            return (
              <Card
                key={sala.id}
                style={{
                  padding: 16,
                  border: selected?.id === sala.id ? '1px solid var(--primary)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sala.nome}
                    </div>
                    {sala.descricao && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sala.descricao}</div>
                    )}
                    {prof && (
                      <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                        {prof}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 8 }}>
                    <Badge variant={sala.ativo ? 'success' : 'neutral'}>
                      {sala.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                  Cadastrada em {new Date(sala.created_at).toLocaleDateString('pt-BR')}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/clinicas/${clinicId}/agenda`, { state: { salaId: sala.id, salaNome: sala.nome } })}
                  >
                    Ver Agenda
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(sala)}>Editar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Nova Sala modal ──────────────────────────────────────────── */}
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
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Nova Sala</div>
              <button onClick={() => setShowModal(false)} style={{
                width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <CloseIcon />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={labelStyle}>Nome da sala *</span>
                <input
                  type="text"
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  style={fieldStyle}
                  placeholder="Ex: Sala 1, Consultório A…"
                  autoFocus
                />
              </label>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={labelStyle}>Descrição</span>
                <textarea
                  value={newDescricao}
                  onChange={e => setNewDescricao(e.target.value)}
                  style={textareaStyle}
                  placeholder="Opcional"
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={labelStyle}>Ativa ao criar</span>
                <Toggle on={newAtivo} onChange={setNewAtivo} />
              </div>
              {createError && (
                <div className="alert a-danger" style={{ marginBottom: 14 }}>{createError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Criando…' : 'Criar sala'}
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
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
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
                  Cadastrada em {new Date(selected.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <Badge variant={selected.ativo ? 'success' : 'neutral'}>
                {selected.ativo ? 'Ativa' : 'Inativa'}
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

              {/* Ação rápida: Ver Agenda */}
              <div style={{ marginBottom: 24 }}>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/clinicas/${clinicId}/agenda`, { state: { salaId: selected.id, salaNome: selected.nome } })}
                >
                  Ver Agenda desta Sala
                </Button>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Informações */}
              <div style={sectionTitle}>Informações da sala</div>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={labelStyle}>Nome *</span>
                <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} style={fieldStyle} />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={labelStyle}>Descrição</span>
                <textarea
                  value={editDescricao}
                  onChange={e => setEditDescricao(e.target.value)}
                  style={textareaStyle}
                  placeholder="Opcional"
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={labelStyle}>Sala ativa</span>
                <Toggle on={editAtivo} onChange={setEditAtivo} />
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Associar profissional */}
              <div style={sectionTitle}>Profissional responsável</div>

              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={labelStyle}>Associar a um profissional</span>
                <select
                  value={editProfissionalId}
                  onChange={e => setEditProfissionalId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Sem profissional —</option>
                  {equipe.map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({m.cargo})</option>
                  ))}
                </select>
              </label>

              {/* Feedback */}
              {saveResult && (
                <div className={`alert ${saveResult.ok ? 'a-info' : 'a-danger'}`} style={{ marginBottom: 14 }}>
                  {saveResult.msg}
                </div>
              )}

              {/* Salvar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !editNome.trim()}>
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </Button>
                <Button variant="outline" size="sm" onClick={closePanel}>Cancelar</Button>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Zona de perigo */}
              <div style={sectionTitle}>Zona de perigo</div>

              {!confirmDelete ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Excluir sala
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

export default SalasClinica;
