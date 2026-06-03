import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, Tabs, Alert } from '../../components/ui';
import '../../components/ui/ui.css';

const historico = [
  { mes: 'Mai 2026', valor: 'R$299', status: 'Pago', statusV: 'success' as const, nf: 'NF-2026-05' },
  { mes: 'Abr 2026', valor: 'R$299', status: 'Pago', statusV: 'success' as const, nf: 'NF-2026-04' },
  { mes: 'Mar 2026', valor: 'R$299', status: 'Pago', statusV: 'success' as const, nf: 'NF-2026-03' },
  { mes: 'Fev 2026', valor: 'R$299', status: 'Pago', statusV: 'success' as const, nf: 'NF-2026-02' },
  { mes: 'Jan 2026', valor: 'R$299', status: 'Falhou', statusV: 'danger' as const, nf: '—' },
];

const recursos = [
  { nome: 'Agendamento Online',    incluido: true  },
  { nome: 'Prontuário Digital',    incluido: true  },
  { nome: 'Galeria Antes/Depois',  incluido: true  },
  { nome: 'Módulo de Estoque',     incluido: true  },
  { nome: 'Relatórios Avançados',  incluido: true  },
  { nome: 'Comissões Escaladas',   incluido: false },
  { nome: 'Múltiplas Unidades',    incluido: false },
];

const FaturamentoClinica = () => {
  const { clinicId: _clinicId } = useParams<{ clinicId: string }>();
  const [tab, setTab] = useState(0);

  const topbarRight = (
    <Button variant="outline" size="sm">Gerenciar Assinatura</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs tabs={['Assinatura', 'Histórico', 'Notas Fiscais']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Plano Atual"    value="Pro"    delta="Ativo" deltaType="up" />
            <MetricCard label="Valor Mensal"   value="R$299"  delta="Próx. venc. 18/06/2026" deltaType="neutral" />
            <MetricCard label="Meses Ativo"    value="5"      delta="Desde jan/2026" deltaType="neutral" />
            <MetricCard label="Total Pago"     value="R$1.495" delta="Acumulado no plano" deltaType="up" />
          </div>

          <div className="g2">
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Detalhes do Plano</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plano</span>
                  <Badge variant="info">Pro</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <Badge variant="success">Ativa</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ciclo</span>
                  <span style={{ fontWeight: 600 }}>Mensal</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Próximo vencimento</span>
                  <span style={{ fontWeight: 600 }}>18/06/2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Método de pagamento</span>
                  <span style={{ fontWeight: 600 }}>Cartão ···· 4242</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="outline" size="sm">Alterar plano</Button>
                  <Button variant="outline" size="sm">Atualizar cartão</Button>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Recursos Incluídos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recursos.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: r.incluido ? 'var(--primary)' : 'var(--text-muted)', fontSize: 14 }}>
                      {r.incluido ? '✓' : '✕'}
                    </span>
                    <span style={{ color: r.incluido ? 'var(--text)' : 'var(--text-muted)' }}>{r.nome}</span>
                    {!r.incluido && <Badge variant="neutral" className="badge-sm">Upgrade</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Alert variant="info">
            Para cancelar a assinatura, entre em contato com o suporte ou acesse o painel financeiro da plataforma.
          </Alert>
        </>
      )}

      {tab === 1 && (
        <Card>
          <CardHeader title="Histórico de Pagamentos" subtitle={`${historico.length} registros`} />
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Nota Fiscal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{h.mes}</td>
                  <td style={{ fontWeight: 700 }}>{h.valor}</td>
                  <td><Badge variant={h.statusV}>{h.status}</Badge></td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{h.nf}</td>
                  <td>
                    {h.nf !== '—' && <Button variant="outline" size="sm">↓ Baixar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 2 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notas Fiscais</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Notas fiscais emitidas automaticamente a cada pagamento confirmado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historico.filter(h => h.nf !== '—').map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.nf}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.mes} · {h.valor}</div>
                </div>
                <Button variant="outline" size="sm">↓ PDF</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
};

export default FaturamentoClinica;
