import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert, Toggle } from '../../components/ui';
import { fetchEquipeClinica, updateMembroEquipe, type MembroEquipe } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

// ── Modal de edição ────────────────────────────────────────────────────────────

interface EditModalProps {
  membro: MembroEquipe;
  onClose: () => void;
  onSaved: (updated: MembroEquipe) => void;
}

const EditModal = ({ membro, onClose, onSaved }: EditModalProps) => {
  const [nome, setNome] = useState(membro.nome || '');
  const [email, setEmail] = useState(membro.email || '');
  const [cargo, setCargo] = useState(membro.cargo || '');
  const [ativo, setAtivo] = useState(membro.ativo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMembroEquipe(membro.id, { nome, email, cargo, ativo });
      onSaved({ ...membro, nome, email, cargo, ativo });
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    fontSize: 12.5,
    fontFamily: 'Inter, sans-serif',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
  };

  const label: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '.4px',
    marginBottom: 5,
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        padding: '22px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Editar membro</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={label}>Nome</span>
            <input style={field} value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <span style={label}>E-mail</span>
            <input style={field} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <span style={label}>Cargo</span>
            <input style={field} value={cargo} onChange={e => setCargo(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={label}>Ativo</span>
            <Toggle on={ativo} onChange={setAtivo} />
          </div>
        </div>

        {error && (
          <div className="alert a-danger" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────────

const EquipeClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<MembroEquipe | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    fetchEquipeClinica(clinicId)
      .then(setMembros)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const inativos = membros.filter(m => !m.ativo).length;

  const handleSaved = (updated: MembroEquipe) => {
    setMembros(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditando(null);
  };

  const topbarRight = (
    <Button variant="primary" size="sm">+ Convidar membro</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {editando && (
        <EditModal
          membro={editando}
          onClose={() => setEditando(null)}
          onSaved={handleSaved}
        />
      )}

      {inativos > 0 && (
        <Alert variant="warning">
          <strong>{inativos} membro(s)</strong> com status inativo nesta clínica.
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Equipe da Clínica"
          subtitle={loading ? 'Carregando…' : `${membros.length} membros cadastrados`}
          action={<Button variant="outline" size="sm">Exportar</Button>}
        />
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando equipe…
          </div>
        ) : error ? (
          <div className="alert a-danger" style={{ margin: 16 }}>{error}</div>
        ) : membros.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum membro cadastrado nesta clínica.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {membros.map(m => {
                const initials = m.nome
                  ? m.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : m.email.slice(0, 2).toUpperCase();
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{initials}</div>
                        <strong style={{ fontSize: 12.5 }}>{m.nome || '—'}</strong>
                      </div>
                    </td>
                    <td>
                      <Badge variant="info">{m.cargo || 'Não definido'}</Badge>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{m.email || '—'}</td>
                    <td>
                      <Badge variant={m.ativo ? 'success' : 'neutral'}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <Button variant="outline" size="sm" onClick={() => setEditando(m)}>Ver</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </AppShell>
  );
};

export default EquipeClinica;
