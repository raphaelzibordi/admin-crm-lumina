import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card } from '../../components/ui';
import { fetchSalasClinica, type Sala } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const SalasClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    fetchSalasClinica(clinicId)
      .then(setSalas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const ativas = salas.filter(s => s.ativo).length;
  const inativas = salas.filter(s => !s.ativo).length;

  const topbarRight = (
    <Button variant="primary" size="sm">+ Nova Sala</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
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
          <div className="m-val" style={{ color: inativas > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{loading ? '…' : inativas}</div>
          <div className="m-delta down">Desativadas</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando salas…
        </div>
      ) : error ? (
        <div className="alert a-danger">{error}</div>
      ) : salas.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma sala cadastrada nesta clínica.</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {salas.map(sala => (
            <Card key={sala.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{sala.nome}</div>
                  {sala.descricao && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sala.descricao}</div>
                  )}
                </div>
                <Badge variant={sala.ativo ? 'success' : 'neutral'}>
                  {sala.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                Cadastrada em {new Date(sala.created_at).toLocaleDateString('pt-BR')}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Button variant="outline" size="sm" style={{ flex: 1 }}>Ver Agenda</Button>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default SalasClinica;
