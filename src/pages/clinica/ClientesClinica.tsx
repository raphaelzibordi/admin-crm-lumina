import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Card, CardHeader, Button } from '../../components/ui';
import { fetchClientesClinica, type Cliente } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const ClientesClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!clinicId) return;
    fetchClientesClinica(clinicId)
      .then(setClientes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase();
    return (
      !q ||
      (c.nome || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telefone || '').toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <Card>
        <CardHeader
          title="Clientes da Clínica"
          subtitle={loading ? 'Carregando…' : `${clientes.length} clientes cadastrados`}
          action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar cliente…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  width: 180,
                }}
              />
              <Button variant="outline" size="sm">Exportar</Button>
            </div>
          }
        />
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando clientes…
          </div>
        ) : error ? (
          <div className="alert a-danger" style={{ margin: 16 }}>{error}</div>
        ) : clientes.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum cliente cadastrado nesta clínica.
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum cliente encontrado para "<strong>{busca}</strong>".
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => {
                const initials = c.nome
                  ? c.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : (c.email || '?').slice(0, 2).toUpperCase();
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{initials}</div>
                        <strong style={{ fontSize: 12.5 }}>{c.nome || '—'}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {c.telefone || <Badge variant="neutral">Não informado</Badge>}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
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

export default ClientesClinica;
