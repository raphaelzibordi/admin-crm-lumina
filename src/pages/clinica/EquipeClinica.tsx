import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Alert } from '../../components/ui';
import { fetchEquipeClinica, type MembroEquipe } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const EquipeClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    fetchEquipeClinica(clinicId)
      .then(setMembros)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const inativos = membros.filter(m => !m.ativo).length;

  const topbarRight = (
    <Button variant="primary" size="sm">+ Convidar membro</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
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
                    <td><Button variant="outline" size="sm">Ver</Button></td>
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
