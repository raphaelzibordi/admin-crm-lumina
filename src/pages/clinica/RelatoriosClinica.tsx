import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, MetricCard, ProgressBar, MiniBarChart } from '../../components/ui';
import '../../components/ui/ui.css';

const commissionData = [
  { name: 'Carla Mendes',  role: 'Médica',      roleV: 'purple' as const, procedures: 52, revenue: 9800, commission: 3430, rate: '35%', change: '+12%', changeDir: 'up' as const },
  { name: 'João Pedro',    role: 'Técnico',     roleV: 'info'   as const, procedures: 38, revenue: 4720, commission: 1180, rate: '25%', change: '+8%',  changeDir: 'up' as const },
  { name: 'Lara Costa',    role: 'Esteticista', roleV: 'teal'   as const, procedures: 29, revenue: 2970, commission: 891,  rate: '30%', change: '-5%',  changeDir: 'down' as const },
];

const topProcedures = [
  { name: 'Depilação Laser',    revenue: 8120, sessions: 29, avg: 280, share: 43 },
  { name: 'Botox Facial',       revenue: 5100, sessions: 6,  avg: 850, share: 27 },
  { name: 'Microagulhamento',   revenue: 2520, sessions: 6,  avg: 420, share: 13 },
  { name: 'Peeling Químico',    revenue: 1920, sessions: 6,  avg: 320, share: 10 },
  { name: 'Radiofrequência',    revenue: 1160, sessions: 4,  avg: 290, share: 6  },
];

const captacaoData = [
  { channel: 'Instagram',       leads: 48, conversions: 31, rate: '64%', cpa: 'R$28' },
  { channel: 'Google Ads',      leads: 35, conversions: 19, rate: '54%', cpa: 'R$62' },
  { channel: 'Indicação',       leads: 22, conversions: 20, rate: '91%', cpa: 'R$0'  },
  { channel: 'WhatsApp Ativo',  leads: 18, conversions: 11, rate: '61%', cpa: 'R$15' },
  { channel: 'Walk-in',         leads: 12, conversions: 10, rate: '83%', cpa: 'R$0'  },
];

const healthMetrics = [
  { label: 'NPS Score',          value: '74',   target: '70',  status: 'success' as const, bar: 74  },
  { label: 'Taxa de Retorno',    value: '68%',  target: '65%', status: 'success' as const, bar: 68  },
  { label: 'Ticket Médio',       value: 'R$312',target: 'R$280',status: 'success' as const, bar: 78 },
  { label: 'Agend. Cancelados',  value: '8%',   target: '<10%',status: 'success' as const, bar: 8   },
  { label: 'Dias s/ Acesso App', value: '0',    target: '< 7', status: 'success' as const, bar: 0   },
  { label: 'Score de Saúde',     value: '88/100',target: '> 80',status: 'success' as const, bar: 88 },
];

const RelatoriosClinica = () => {
  const [activeTab, setActiveTab] = useState<'geral' | 'comissoes' | 'captacao' | 'saude'>('geral');

  const topbarRight = (
    <>
      <Button variant="outline" size="sm">Exportar PDF</Button>
      <Button variant="outline" size="sm">Exportar Excel</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === 'geral' ? 'on' : ''}`}     onClick={() => setActiveTab('geral')}>Visão Geral</button>
        <button className={`tab ${activeTab === 'comissoes' ? 'on' : ''}`} onClick={() => setActiveTab('comissoes')}>Comissões</button>
        <button className={`tab ${activeTab === 'captacao' ? 'on' : ''}`}  onClick={() => setActiveTab('captacao')}>Captação</button>
        <button className={`tab ${activeTab === 'saude' ? 'on' : ''}`}     onClick={() => setActiveTab('saude')}>Saúde</button>
      </div>

      {activeTab === 'geral' && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Receita · Jun"        value="R$18.9k" delta="↑ +11% vs. mai" deltaType="up" />
            <MetricCard label="Procedimentos"        value="142"     delta="↑ +18 vs. mai"  deltaType="up" />
            <MetricCard label="Novos Pacientes"      value="28"      delta="↑ +5 vs. mai"   deltaType="up" />
            <MetricCard label="Ticket Médio"         value="R$312"   delta="↑ +R$22 vs. mai" deltaType="up" />
          </div>

          <div className="g2">
            <Card>
              <CardHeader title="Receita · Últimos 6 meses" subtitle="Receita bruta total" />
              <MiniBarChart
                data={[72, 81, 90, 104, 118, 100]}
                labels={['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']}
                activeIndex={5}
              />
            </Card>

            <Card>
              <CardHeader title="Top Procedimentos" subtitle="Por receita · Jun" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                {topProcedures.map((p, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>R$ {p.revenue.toLocaleString('pt-BR')} · {p.sessions} sessões</span>
                    </div>
                    <ProgressBar value={p.share} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'comissoes' && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Total Comissões · Jun" value="R$5.501"  delta="↑ +12% vs. mai"  deltaType="up"   />
            <MetricCard label="% Receita Comissionada" value="29%"     delta="Meta: abaixo 35%" deltaType="up"   />
            <MetricCard label="Profissionais Ativos"   value="3"       delta="Comissionados/mês" deltaType="neutral" />
            <MetricCard label="Maior Comissão"         value="R$3.430" delta="Carla Mendes · 35%" deltaType="neutral" />
          </div>

          <Card>
            <CardHeader
              title="Comissões por Profissional"
              subtitle="Mês atual · Jun 2026"
              action={<Button variant="outline" size="sm">Exportar</Button>}
            />
            <table>
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Role</th>
                  <th>Procedimentos</th>
                  <th>Receita Gerada</th>
                  <th>Taxa</th>
                  <th>Comissão</th>
                  <th>Variação</th>
                </tr>
              </thead>
              <tbody>
                {commissionData.map((c, i) => (
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
                    <td style={{ fontSize: 12 }}>{c.procedures}</td>
                    <td style={{ fontSize: 12.5, fontWeight: 600 }}>R$ {c.revenue.toLocaleString('pt-BR')}</td>
                    <td><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{c.rate}</span></td>
                    <td style={{ fontSize: 13, fontWeight: 700 }}>R$ {c.commission.toLocaleString('pt-BR')}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.changeDir === 'up' ? 'var(--success)' : 'var(--danger)' }}>
                        {c.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {activeTab === 'captacao' && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Total Leads · Jun"    value="135"   delta="↑ +22 vs. mai"   deltaType="up"   />
            <MetricCard label="Conversões"           value="91"    delta="67% taxa média"   deltaType="up"   />
            <MetricCard label="Melhor Canal"         value="Indicação" delta="91% conversão" deltaType="up" />
            <MetricCard label="CPA Médio"            value="R$26"  delta="↓ -R$8 vs. mai"  deltaType="up"   />
          </div>

          <Card>
            <CardHeader
              title="Captação por Canal"
              subtitle="Leads e conversões · Jun 2026"
              action={<Button variant="outline" size="sm">Exportar</Button>}
            />
            <table>
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Leads</th>
                  <th>Conversões</th>
                  <th>Taxa de Conv.</th>
                  <th>CPA</th>
                  <th>Participação</th>
                </tr>
              </thead>
              <tbody>
                {captacaoData.map((c, i) => {
                  const share = Math.round((c.conversions / 91) * 100);
                  return (
                    <tr key={i}>
                      <td><strong style={{ fontSize: 12.5 }}>{c.channel}</strong></td>
                      <td style={{ fontSize: 12 }}>{c.leads}</td>
                      <td style={{ fontSize: 12 }}>{c.conversions}</td>
                      <td>
                        <span style={{
                          fontSize: 12.5, fontWeight: 700,
                          color: parseInt(c.rate) >= 70 ? 'var(--success)' : 'var(--text)'
                        }}>{c.rate}</span>
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{c.cpa}</td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressBar value={share} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {activeTab === 'saude' && (
        <>
          <div className="metrics" style={{ marginBottom: 16 }}>
            <MetricCard label="Health Score"         value="88/100" delta="↑ +4 vs. mês ant." deltaType="up"   />
            <MetricCard label="NPS"                  value="74"     delta="Zona de Excelência" deltaType="up"  />
            <MetricCard label="Taxa de Retorno"      value="68%"    delta="↑ +3pp vs. mai"    deltaType="up"   />
            <MetricCard label="Cancelamentos"        value="8%"     delta="Abaixo da meta 10%" deltaType="up"  />
          </div>

          <div className="g2">
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Indicadores de Saúde</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {healthMetrics.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Meta: {m.target}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{m.value}</span>
                        <Badge variant={m.status}>OK</Badge>
                      </div>
                    </div>
                    <ProgressBar value={m.bar === 0 ? 5 : Math.min(m.bar, 100)} />
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Card style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Evolução NPS · 6 meses</h3>
                <MiniBarChart
                  data={[60, 65, 68, 71, 70, 74]}
                  labels={['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']}
                  activeIndex={5}
                />
              </Card>

              <Card style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Retenção de Pacientes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: '1ª visita → retorno',  pct: 68 },
                    { label: '3+ visitas no ano',    pct: 44 },
                    { label: 'Pacientes recorrentes',pct: 38 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500 }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{item.pct}%</span>
                      </div>
                      <ProgressBar value={item.pct} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default RelatoriosClinica;
