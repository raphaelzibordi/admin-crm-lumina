import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Button, Card, CardHeader, Tabs, Toggle, Alert } from '../../components/ui';
import { fetchClinicaConfig, updateClinicaConfig, fetchClinicaBillingInfo } from '../../lib/crmQueries';
import type { ClinicaConfig } from '../../lib/crmQueries';
import { useFeatureFlags, normalizePlan } from '../../contexts/FeatureFlagsContext';
import '../../components/ui/ui.css';

// ── Masks ─────────────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/\s-$/, '');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

// ── Validators ────────────────────────────────────────────────────────────────

function validateCPF(v: string) {
  const d = v.replace(/\D/g, '');
  if (!d) return true;
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const sum = d.slice(0, len).split('').reduce((acc, n, i) => acc + +n * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 || r === 11 ? 0 : r;
  };
  return calc(9) === +d[9] && calc(10) === +d[10];
}

function validateCNPJ(v: string) {
  const d = v.replace(/\D/g, '');
  if (!d) return true; // optional
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = d.slice(0, len).split('').reduce((acc, n, i) => acc + +n * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

function validateEmail(v: string) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateSite(v: string) {
  if (!v) return true;
  try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; }
  catch { return false; }
}

function validateCEP(v: string) {
  if (!v) return true;
  return /^\d{5}-\d{3}$/.test(v);
}

function validateTelefone(v: string) {
  if (!v) return true;
  const d = v.replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldKey = keyof ClinicaConfig;

interface FieldDef {
  label: string;
  key: FieldKey;
  mask?: (v: string) => string;
  validate?: (v: string) => boolean;
  errorMsg?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
}

const INFO_FIELDS: FieldDef[] = [
  { label: 'Nome da Clínica', key: 'nome_clinica', placeholder: 'Ex: Clínica Lumina' },
  { label: 'Nome do Responsável', key: 'nome', placeholder: 'Ex: João da Silva' },
  {
    label: 'CPF do Responsável', key: 'cpf', mask: maskCPF,
    validate: validateCPF, errorMsg: 'CPF inválido',
    inputMode: 'numeric', placeholder: '000.000.000-00',
  },
  {
    label: 'CNPJ', key: 'cnpj', mask: maskCNPJ,
    validate: validateCNPJ, errorMsg: 'CNPJ inválido',
    inputMode: 'numeric', placeholder: '00.000.000/0000-00',
  },
  {
    label: 'Telefone', key: 'telefone', mask: maskTelefone,
    validate: validateTelefone, errorMsg: 'Telefone inválido',
    inputMode: 'tel', placeholder: '(00) 00000-0000',
  },
  {
    label: 'E-mail de contato', key: 'email',
    validate: validateEmail, errorMsg: 'E-mail inválido',
    inputMode: 'email', placeholder: 'contato@suaclinica.com.br',
  },
  {
    label: 'Site', key: 'site',
    validate: validateSite, errorMsg: 'URL inválida',
    placeholder: 'www.suaclinica.com.br',
  },
];

const ADDR_FIELDS: FieldDef[] = [
  {
    label: 'CEP', key: 'cep', mask: maskCEP,
    validate: validateCEP, errorMsg: 'CEP inválido (use 00000-000)',
    inputMode: 'numeric', placeholder: '00000-000',
  },
  { label: 'Rua', key: 'rua', placeholder: 'Ex: Av. Paulista, 1000' },
  { label: 'Bairro', key: 'bairro', placeholder: 'Ex: Bela Vista' },
  { label: 'Cidade', key: 'cidade', placeholder: 'Ex: São Paulo' },
  { label: 'Estado', key: 'estado', placeholder: 'Ex: SP' },
];

// ── Component ─────────────────────────────────────────────────────────────────

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const EMPTY: ClinicaConfig = {
  nome_clinica: '', email: '', telefone: '', cnpj: '', site: '',
  nome: '', cpf: '',
  cep: '', rua: '', bairro: '', cidade: '', estado: '',
};

const ConfiguracoesClinica = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<ClinicaConfig>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [plano, setPlano] = useState<string | null>(null);
  const { isEnabled } = useFeatureFlags();
  const [horarios, setHorarios] = useState(
    dias.map((d, i) => ({ dia: d, ativo: i < 6, abertura: '08:00', fechamento: '18:00' }))
  );
  const [notifs, setNotifs] = useState({
    confirmacaoEmail: true,
    lembreteWhatsapp: true,
    cancelamentoEmail: true,
    relatorioSemanal: false,
  });

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    fetchClinicaConfig(clinicId)
      .then(data => {
        if (!data) return;
        setForm({
          ...data,
          telefone: data.telefone ? maskTelefone(data.telefone) : '',
          cnpj:     data.cnpj     ? maskCNPJ(data.cnpj)         : '',
          cpf:      data.cpf      ? maskCPF(data.cpf)            : '',
          cep:      data.cep      ? maskCEP(data.cep)            : '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
      
    fetchClinicaBillingInfo(clinicId).then(info => {
      if (info) setPlano(info.plano);
    }).catch(() => {});
  }, [clinicId]);

  const plan = plano ? normalizePlan(plano) : null;
  const wppEnabled = isEnabled('whatsapp', plan);

  const allFields = [...INFO_FIELDS, ...ADDR_FIELDS];
  const hasErrors = allFields.some(f =>
    f.validate && !f.validate(form[f.key] ?? '')
  );

  const handleChange = (field: FieldDef) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = field.mask ? field.mask(raw) : raw;
    setForm(prev => ({ ...prev, [field.key]: val }));
  };

  const handleBlur = (key: FieldKey) => () =>
    setTouched(prev => ({ ...prev, [key]: true }));

  const handleSave = async () => {
    // Mark all fields touched to show all errors
    const all: Partial<Record<FieldKey, boolean>> = {};
    allFields.forEach(f => { all[f.key] = true; });
    setTouched(all);
    if (hasErrors || !clinicId) return;

    setSaving(true);
    try {
      await updateClinicaConfig(clinicId, form);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const renderField = (f: FieldDef) => {
    const val = form[f.key] ?? '';
    const invalid = touched[f.key] && f.validate && !f.validate(val);
    return (
      <div key={f.key}>
        <label style={{ fontSize: 11, color: invalid ? 'var(--danger, #e05252)' : 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          {f.label}
        </label>
        <input
          className="tb-input"
          value={val}
          inputMode={f.inputMode}
          placeholder={f.placeholder}
          onChange={handleChange(f)}
          onBlur={handleBlur(f.key)}
          style={{
            width: '100%', fontSize: 12.5,
            borderColor: invalid ? 'var(--danger, #e05252)' : undefined,
            outline: invalid ? 'none' : undefined,
          }}
        />
        {invalid && (
          <span style={{ fontSize: 10.5, color: 'var(--danger, #e05252)', marginTop: 3, display: 'block' }}>
            {f.errorMsg}
          </span>
        )}
      </div>
    );
  };

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
      {saving ? 'Salvando…' : 'Salvar alterações'}
    </Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {status === 'saved' && <Alert variant="info">Configurações salvas com sucesso.</Alert>}
      {status === 'error' && <Alert variant="danger">Erro ao salvar. Tente novamente.</Alert>}

      <Tabs tabs={['Geral', 'Horários', 'Notificações', 'Integrações']} active={tab} onChange={setTab} />

      {tab === 0 && (
        loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>
        ) : (
          <div className="g2">
            <Card style={{ padding: 18 }}>
              <CardHeader title="Informações da Clínica" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                {INFO_FIELDS.map(renderField)}
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <CardHeader title="Endereço" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                {ADDR_FIELDS.map(renderField)}
              </div>
            </Card>
          </div>
        )
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
              ...(wppEnabled ? [{ key: 'lembreteWhatsapp' as const, label: 'Lembrete 24h antes (WhatsApp)', desc: 'Lembrar o cliente 24h antes do procedimento via WhatsApp' }] : []),
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
            ...(wppEnabled ? [{ nome: 'WhatsApp Business', desc: 'Enviar notificações e lembretes pelo WhatsApp', conectado: true  }] : []),
            { nome: 'AbacatePay', desc: 'Processar pagamentos e assinaturas online',           conectado: false },
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
