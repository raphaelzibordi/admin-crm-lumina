import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import '../../components/ui/ui.css';

const procedures = [
  { name: 'Depilação Laser',     category: 'Laser',       price: 280,  duration: 60,  commission: 35, status: 'Ativo',   statusV: 'success' as const, sessions: 142, catV: 'info' as const    },
  { name: 'Botox Facial',        category: 'Injetáveis',  price: 850,  duration: 45,  commission: 30, status: 'Ativo',   statusV: 'success' as const, sessions: 89,  catV: 'purple' as const  },
  { name: 'Peeling Químico',     category: 'Facial',      price: 320,  duration: 50,  commission: 30, status: 'Ativo',   statusV: 'success' as const, sessions: 67,  catV: 'teal' as const    },
  { name: 'Microagulhamento',    category: 'Facial',      price: 420,  duration: 60,  commission: 25, status: 'Ativo',   statusV: 'success' as const, sessions: 54,  catV: 'teal' as const    },
  { name: 'Criolipólise',        category: 'Corporal',    price: 650,  duration: 90,  commission: 30, status: 'Ativo',   statusV: 'success' as const, sessions: 38,  catV: 'neutral' as const },
  { name: 'Radiofrequência',     category: 'Corporal',    price: 290,  duration: 45,  commission: 25, status: 'Ativo',   statusV: 'success' as const, sessions: 71,  catV: 'neutral' as const },
  { name: 'Preenchimento Labial',category: 'Injetáveis',  price: 920,  duration: 40,  commission: 35, status: 'Ativo',   statusV: 'success' as const, sessions: 29,  catV: 'purple' as const  },
  { name: 'Drenagem Linfática',  category: 'Corporal',    price: 120,  duration: 60,  commission: 20, status: 'Inativo', statusV: 'neutral' as const, sessions: 12,  catV: 'neutral' as const },
];

const packages = [
  { name: 'Pacote Laser Full Body', procedures: 'Depilação Laser · 8 sessões', price: 1980,  discount: '12%',  sales: 22, status: 'Ativo',  statusV: 'success' as const },
  { name: 'Protocolo Anti-Aging',   procedures: 'Botox + Peeling + Microag.',  price: 1450,  discount: '18%',  sales: 15, status: 'Ativo',  statusV: 'success' as const },
  { name: 'Corpo Fit 3x',           procedures: 'Criolipólise · 3 sessões',     price: 1650,  discount: '15%',  sales: 8,  status: 'Ativo',  statusV: 'success' as const },
  { name: 'Essencial Facial',       procedures: 'Peeling + Radiofrequência',    price: 540,   discount: '8%',   sales: 31, status: 'Ativo',  statusV: 'success' as const },
];

const commissions = [
  { name: 'Carla Mendes',  role: 'Médica',      roleV: 'purple' as const, rate: '35%', thisMonth: 3420, totalYear: 28500, procedures: 'Laser · Botox · Preenchimento' },
  { name: 'João Pedro',   role: 'Técnico',     roleV: 'info'   as const, rate: '25%', thisMonth: 1180, totalYear: 11200, procedures: 'Estética Avançada · Peeling' },
  { name: 'Lara Costa',   role: 'Esteticista', roleV: 'teal'   as const, rate: '30%', thisMonth: 890,  totalYear: 8900,  procedures: 'Peeling · Drenagem · Radio' },
];

const ProcedimentosClinica = () => {
  const [activeTab, setActiveTab] = useState<'procedimentos' | 'pacotes' | 'comissoes'>('procedimentos');

  const topbarRight = (
    <>
      <Button variant="outline" size="sm">Importar</Button>
      <Button variant="primary" size="sm">+ Novo Procedimento</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === 'procedimentos' ? 'on' : ''}`} onClick={() => setActiveTab('procedimentos')}>Procedimentos</button>
        <button className={`tab ${activeTab === 'pacotes' ? 'on' : ''}`} onClick={() => setActiveTab('pacotes')}>Pacotes</button>
        <button className={`tab ${activeTab === 'comissoes' ? 'on' : ''}`} onClick={() => setActiveTab('comissoes')}>Comissões</button>
      </div>

      {activeTab === 'procedimentos' && (
        <Card>
          <CardHeader
            title="Procedimentos da Clínica"
            subtitle={`${procedures.length} procedimentos cadastrados`}
            action={<Button variant="outline" size="sm">Exportar tabela</Button>}
          />
          <table>
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Categoria</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Comissão</th>
                <th>Sessões/mês</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p, i) => (
                <tr key={i}>
                  <td><strong style={{ fontSize: 12.5 }}>{p.name}</strong></td>
                  <td><Badge variant={p.catV}>{p.category}</Badge></td>
                  <td style={{ fontSize: 12 }}>{p.duration} min</td>
                  <td style={{ fontSize: 12.5, fontWeight: 700 }}>R$ {p.price.toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{p.commission}%</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.sessions}</td>
                  <td><Badge variant={p.statusV}>{p.status}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="outline" size="sm">Editar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'pacotes' && (
        <Card>
          <CardHeader
            title="Pacotes de Procedimentos"
            subtitle={`${packages.length} pacotes ativos`}
            action={<Button variant="primary" size="sm">+ Novo Pacote</Button>}
          />
          <table>
            <thead>
              <tr>
                <th>Pacote</th>
                <th>Procedimentos Incluídos</th>
                <th>Preço</th>
                <th>Desconto</th>
                <th>Vendas/mês</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p, i) => (
                <tr key={i}>
                  <td><strong style={{ fontSize: 12.5 }}>{p.name}</strong></td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-secondary)', maxWidth: 200 }}>{p.procedures}</td>
                  <td style={{ fontSize: 12.5, fontWeight: 700 }}>R$ {p.price.toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>{p.discount} off</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.sales}</td>
                  <td><Badge variant={p.statusV}>{p.status}</Badge></td>
                  <td><Button variant="outline" size="sm">Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'comissoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <CardHeader
              title="Regras de Comissão"
              subtitle="Por profissional · mês atual"
              action={<Button variant="outline" size="sm">Editar Regras</Button>}
            />
            <table>
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Role</th>
                  <th>Taxa</th>
                  <th>Este Mês</th>
                  <th>Total no Ano</th>
                  <th>Procedimentos</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <strong style={{ fontSize: 12.5 }}>{c.name}</strong>
                      </div>
                    </td>
                    <td><Badge variant={c.roleV}>{c.role}</Badge></td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{c.rate}</span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 700 }}>R$ {c.thisMonth.toLocaleString('pt-BR')}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>R$ {c.totalYear.toLocaleString('pt-BR')}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>{c.procedures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="g3">
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Comissões · Jun</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>R$ 5.490</div>
              <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>↑ +12% vs. mai</div>
            </Card>
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Maior comissão</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Carla Mendes</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>R$ 3.420 · 35% taxa</div>
            </Card>
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>% Receita em comissões</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>29%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Meta: abaixo de 35%</div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default ProcedimentosClinica;
