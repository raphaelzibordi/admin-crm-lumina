import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import { fetchProcedimentosClinica, type Procedimento } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const ProcedimentosClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    fetchProcedimentosClinica(clinicId)
      .then(setProcedimentos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const topbarRight = (
    <Button variant="primary" size="sm">+ Novo Procedimento</Button>
  );

  const totalReceita = procedimentos.reduce((s, p) => s + (p.preco || 0), 0);

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
          action={<Button variant="outline" size="sm">Exportar</Button>}
        />
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando procedimentos…
          </div>
        ) : error ? (
          <div className="alert a-danger" style={{ margin: 16 }}>{error}</div>
        ) : procedimentos.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum procedimento cadastrado nesta clínica.
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
                  <td><Badge variant={p.sala_requerida ? 'info' : 'neutral'}>{p.sala_requerida ? 'Sim' : 'Não'}</Badge></td>
                  <td><Badge variant={p.booking_visivel ? 'success' : 'neutral'}>{p.booking_visivel ? 'Visível' : 'Oculto'}</Badge></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppShell>
  );
};

export default ProcedimentosClinica;
