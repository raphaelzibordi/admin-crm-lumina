import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, Tabs, Alert } from '../../components/ui';
import { fetchClinicaBillingInfo, fetchFaturasClinica, type FaturaAbacatePay, abacatepayCheckoutUrl, abacatepayUpdatePaymentMethodUrl } from '../../lib/crmQueries';
import '../../components/ui/ui.css';

const RECURSOS_POR_PLANO: Record<string, { nome: string; inclusos: string[] }> = {
  basico: {
    nome: 'Básico',
    inclusos: ['Agendamento Online', 'Prontuário Digital']
  },
  pro: {
    nome: 'Pro',
    inclusos: ['Agendamento Online', 'Prontuário Digital', 'Galeria Antes/Depois', 'Módulo de Estoque']
  },
  enterprise: {
    nome: 'Enterprise',
    inclusos: ['Agendamento Online', 'Prontuário Digital', 'Galeria Antes/Depois', 'Módulo de Estoque', 'Relatórios Avançados']
  },
  vip: {
    nome: 'VIP',
    inclusos: ['Agendamento Online', 'Prontuário Digital', 'Galeria Antes/Depois', 'Módulo de Estoque', 'Relatórios Avançados', 'Comissões Escaladas', 'Múltiplas Unidades']
  }
};

const TODOS_RECURSOS = [
  'Agendamento Online',
  'Prontuário Digital',
  'Galeria Antes/Depois',
  'Módulo de Estoque',
  'Relatórios Avançados',
  'Comissões Escaladas',
  'Múltiplas Unidades'
];

const BILLING_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  pending:   { label: 'Aguardando',  variant: 'info'    },
  active:    { label: 'Ativa',       variant: 'success' },
  past_due:  { label: 'Inadimplente', variant: 'warning' },
  suspended: { label: 'Suspensa',    variant: 'danger'  },
  canceled:  { label: 'Cancelada',   variant: 'neutral' },
};

const formatPreco = (v: number) => `R$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FaturamentoClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<{ plano: string; abacatepay_subscription_status: string | null; acesso_expira_em: string | null; created_at: string; } | null>(null);
  const [faturas, setFaturas] = useState<FaturaAbacatePay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      fetchClinicaBillingInfo(clinicId),
      fetchFaturasClinica(clinicId)
    ]).then(([info, faturasData]) => {
      setBillingInfo(info);
      setFaturas(faturasData);
    }).catch(err => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [clinicId]);

  const handleAlterarPlano = async () => {
    if (!clinicId || !billingInfo) return;
    try {
      setActionLoading(true);
      const url = await abacatepayCheckoutUrl(clinicId, billingInfo.plano);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(`Erro ao gerar link de pagamento: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAtualizarCartao = async () => {
    if (!clinicId) return;
    try {
      setActionLoading(true);
      const url = await abacatepayUpdatePaymentMethodUrl(clinicId);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(`Erro ao gerar link de atualização: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const topbarRight = (
    <Button variant="outline" size="sm" onClick={() => setTab(0)}>Gerenciar Assinatura</Button>
  );

  if (loading) {
    return <AppShell topbarRight={topbarRight}><div style={{ padding: 32, textAlign: 'center' }}>Carregando dados de faturamento...</div></AppShell>;
  }

  if (error) {
    return <AppShell topbarRight={topbarRight}><div className="alert a-danger" style={{ margin: 16 }}>{error}</div></AppShell>;
  }

  if (!billingInfo) {
    return <AppShell topbarRight={topbarRight}><div style={{ padding: 32, textAlign: 'center' }}>Informações não encontradas.</div></AppShell>;
  }

  const planoAtual = RECURSOS_POR_PLANO[billingInfo.plano || 'basico'] || RECURSOS_POR_PLANO.basico;
  const statusInfo = billingInfo.abacatepay_subscription_status ? BILLING_STATUS[billingInfo.abacatepay_subscription_status] || { label: billingInfo.abacatepay_subscription_status, variant: 'neutral' } : { label: 'Sem assinatura', variant: 'neutral' };
  
  const totalPago = faturas.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.valor), 0);
  const faturasPagas = faturas.filter(f => f.status === 'paid');
  const mesesAtivo = faturasPagas.length;
  
  // Data de vencimento baseada no acesso_expira_em ou na ultima fatura
  const dataVencimento = billingInfo.acesso_expira_em ? new Date(billingInfo.acesso_expira_em).toLocaleDateString('pt-BR') : '—';
  const dataCriacao = new Date(billingInfo.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const valorMensalUltimaFatura = faturas.length > 0 ? formatPreco(faturas[0].valor) : 'R$ 0,00';

  return (
    <AppShell topbarRight={topbarRight}>
      <Tabs tabs={['Assinatura', 'Histórico', 'Notas Fiscais']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Plano Atual"    value={planoAtual.nome}    delta={statusInfo.label} deltaType={statusInfo.variant === 'success' ? 'up' : statusInfo.variant === 'danger' ? 'down' : 'neutral'} />
            <MetricCard label="Valor Mensal"   value={valorMensalUltimaFatura}  delta={`Próx. venc. ${dataVencimento}`} deltaType="neutral" />
            <MetricCard label="Meses Ativo"    value={String(mesesAtivo)}      delta={`Desde ${dataCriacao}`} deltaType="neutral" />
            <MetricCard label="Total Pago"     value={formatPreco(totalPago)} delta="Acumulado" deltaType="up" />
          </div>

          <div className="g2">
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Detalhes do Plano</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plano</span>
                  <Badge variant="info">{planoAtual.nome}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ciclo</span>
                  <span style={{ fontWeight: 600 }}>Mensal</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Próximo vencimento</span>
                  <span style={{ fontWeight: 600 }}>{dataVencimento}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Método de pagamento</span>
                  <span style={{ fontWeight: 600 }}>Gerenciado pelo AbacatePay</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={handleAlterarPlano} disabled={actionLoading}>
                    {actionLoading ? 'Processando...' : 'Alterar plano'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAtualizarCartao} disabled={actionLoading}>
                    Atualizar cartão
                  </Button>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Recursos Incluídos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TODOS_RECURSOS.map((nomeRecurso, i) => {
                  const incluido = planoAtual.inclusos.includes(nomeRecurso);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: incluido ? 'var(--primary)' : 'var(--text-muted)', fontSize: 14 }}>
                        {incluido ? '✓' : '✕'}
                      </span>
                      <span style={{ color: incluido ? 'var(--text)' : 'var(--text-muted)' }}>{nomeRecurso}</span>
                      {!incluido && <Badge variant="neutral" className="badge-sm">Upgrade</Badge>}
                    </div>
                  );
                })}
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
          <CardHeader title="Histórico de Pagamentos" subtitle={`${faturas.length} registros sincronizados via AbacatePay`} />
          {faturas.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma fatura encontrada.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Nota Fiscal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{new Date(f.mes_referencia).toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: 700 }}>{formatPreco(f.valor)}</td>
                    <td><Badge variant={f.status === 'paid' ? 'success' : f.status === 'failed' ? 'danger' : 'warning'}>{f.status === 'paid' ? 'Pago' : f.status === 'failed' ? 'Falhou' : f.status}</Badge></td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{f.abacatepay_invoice_id || '—'}</td>
                    <td>
                      {f.url_nota_fiscal && (
                        <Button variant="outline" size="sm" onClick={() => window.open(f.url_nota_fiscal!, '_blank')}>
                          ↓ Baixar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 2 && (
        <Card style={{ padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notas Fiscais</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Notas fiscais emitidas automaticamente a cada pagamento confirmado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faturas.filter(f => f.url_nota_fiscal).length === 0 ? (
               <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma nota fiscal disponível.</div>
            ) : faturas.filter(f => f.url_nota_fiscal).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Nota Fiscal {f.abacatepay_invoice_id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(f.mes_referencia).toLocaleDateString('pt-BR')} · {formatPreco(f.valor)}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(f.url_nota_fiscal!, '_blank')}>
                  ↓ PDF
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
};

export default FaturamentoClinica;
