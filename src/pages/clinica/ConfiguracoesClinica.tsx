import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Button, Card, CardHeader, Tabs, Toggle, Alert } from '../../components/ui';
import '../../components/ui/ui.css';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const ConfiguracoesClinica = () => {
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);
  const [horarios, setHorarios] = useState(
    dias.map((d, i) => ({ dia: d, ativo: i < 6, abertura: '08:00', fechamento: '18:00' }))
  );
  const [notifs, setNotifs] = useState({
    confirmacaoEmail: true,
    lembreteWhatsapp: true,
    cancelamentoEmail: true,
    relatorioSemanal: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={handleSave}>Salvar alterações</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {saved && <Alert variant="info">Configurações salvas com sucesso.</Alert>}

      <Tabs tabs={['Geral', 'Horários', 'Notificações', 'Integrações']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div className="g2">
          <Card style={{ padding: 18 }}>
            <CardHeader title="Informações da Clínica" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {[
                { label: 'Nome da Clínica', value: 'Clínica Aurora' },
                { label: 'CNPJ', value: '12.345.678/0001-90' },
                { label: 'Telefone', value: '(31) 98765-4321' },
                { label: 'E-mail de contato', value: 'contato@clinicaaurora.com.br' },
                { label: 'Site', value: 'www.clinicaaurora.com.br' },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    className="tb-input"
                    defaultValue={f.value}
                    style={{ width: '100%', fontSize: 12.5 }}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <CardHeader title="Endereço" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {[
                { label: 'CEP', value: '30310-010' },
                { label: 'Rua', value: 'Av. Afonso Pena, 1500' },
                { label: 'Bairro', value: 'Centro' },
                { label: 'Cidade', value: 'Belo Horizonte' },
                { label: 'Estado', value: 'MG' },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    className="tb-input"
                    defaultValue={f.value}
                    style={{ width: '100%', fontSize: 12.5 }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 1 && (
        <Card style={{ padding: 18 }}>
          <CardHeader title="Horário de Funcionamento" subtitle="Configure os dias e horários de atendimento" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {horarios.map((h, i) => (
              <div key={h.dia} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <Toggle
                  on={h.ativo}
                  onChange={(v) => setHorarios(horarios.map((x, j) => j === i ? { ...x, ativo: v } : x))}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 80, color: h.ativo ? 'var(--text)' : 'var(--text-muted)' }}>
                  {h.dia}
                </span>
                {h.ativo ? (
                  <>
                    <input
                      type="time"
                      value={h.abertura}
                      onChange={(e) => setHorarios(horarios.map((x, j) => j === i ? { ...x, abertura: e.target.value } : x))}
                      className="tb-input"
                      style={{ width: 90, fontSize: 12 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>até</span>
                    <input
                      type="time"
                      value={h.fechamento}
                      onChange={(e) => setHorarios(horarios.map((x, j) => j === i ? { ...x, fechamento: e.target.value } : x))}
                      className="tb-input"
                      style={{ width: 90, fontSize: 12 }}
                    />
                  </>
                ) : (
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Fechado</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 2 && (
        <Card style={{ padding: 18 }}>
          <CardHeader title="Notificações Automáticas" subtitle="Configure o envio de mensagens para clientes e equipe" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            {[
              { key: 'confirmacaoEmail' as const, label: 'Confirmação de agendamento (E-mail)', desc: 'Enviar e-mail ao cliente após novo agendamento' },
              { key: 'lembreteWhatsapp' as const, label: 'Lembrete 24h antes (WhatsApp)', desc: 'Lembrar o cliente 24h antes do procedimento via WhatsApp' },
              { key: 'cancelamentoEmail' as const, label: 'Notificação de cancelamento (E-mail)', desc: 'Avisar o profissional e o cliente em caso de cancelamento' },
              { key: 'relatorioSemanal' as const, label: 'Relatório semanal (E-mail)', desc: 'Enviar resumo semanal de desempenho ao dono da clínica' },
            ].map((n) => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.desc}</div>
                </div>
                <Toggle
                  on={notifs[n.key]}
                  onChange={(v) => setNotifs({ ...notifs, [n.key]: v })}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { nome: 'Google Calendar', desc: 'Sincronizar agendamentos com o Google Calendar', conectado: true  },
            { nome: 'WhatsApp Business', desc: 'Enviar notificações e lembretes pelo WhatsApp', conectado: true  },
            { nome: 'Stripe', desc: 'Processar pagamentos e assinaturas online',               conectado: false },
            { nome: 'Prontuário Digital', desc: 'Integração com sistema de prontuário eletrônico', conectado: false },
          ].map((integ, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{integ.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{integ.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11.5, color: integ.conectado ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {integ.conectado ? 'Conectado' : 'Não conectado'}
                </span>
                <Button variant={integ.conectado ? 'outline' : 'primary'} size="sm">
                  {integ.conectado ? 'Gerenciar' : 'Conectar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default ConfiguracoesClinica;
