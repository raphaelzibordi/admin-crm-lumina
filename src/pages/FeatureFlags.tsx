import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Button, Card, CardHeader, Toggle, Alert } from '../components/ui';
import '../components/ui/ui.css';

interface Flag {
  id: string;
  nome: string;
  desc: string;
  planos: ('Básico' | 'Pro' | 'Enterprise')[];
  on: boolean;
  beta?: boolean;
}

const initialFlags: Flag[] = [
  { id: 'agendamento-online',  nome: 'Agendamento Online',      desc: 'Link público de agendamento para clientes',         planos: ['Básico', 'Pro', 'Enterprise'], on: true  },
  { id: 'prontuario',          nome: 'Prontuário Digital',       desc: 'Fichas e histórico clínico do paciente',            planos: ['Pro', 'Enterprise'],           on: true  },
  { id: 'galeria',             nome: 'Galeria Antes/Depois',     desc: 'Upload e comparação de fotos de procedimentos',     planos: ['Básico', 'Pro', 'Enterprise'], on: true  },
  { id: 'estoque',             nome: 'Módulo de Estoque',        desc: 'Gestão de insumos e controle de validade',          planos: ['Pro', 'Enterprise'],           on: true  },
  { id: 'relatorios-avancados',nome: 'Relatórios Avançados',     desc: 'Exportação e análise detalhada de dados',           planos: ['Pro', 'Enterprise'],           on: true  },
  { id: 'comissoes',           nome: 'Comissões Escaladas',      desc: 'Cálculo com escalas progressivas por profissional', planos: ['Enterprise'],                  on: false, beta: true },
  { id: 'multi-unidades',      nome: 'Múltiplas Unidades',       desc: 'Gestão de filiais e unidades da clínica',           planos: ['Enterprise'],                  on: false, beta: true },
  { id: 'ia-sugestoes',        nome: 'Sugestões por IA',         desc: 'Recomendações automáticas para procedimentos',      planos: ['Enterprise'],                  on: false, beta: true },
];

const planVariant = (plano: string) => {
  if (plano === 'Enterprise') return 'purple' as const;
  if (plano === 'Pro') return 'info' as const;
  return 'neutral' as const;
};

const FeatureFlags = () => {
  const [flags, setFlags] = useState<Flag[]>(initialFlags);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string, v: boolean) =>
    setFlags(flags.map(f => f.id === id ? { ...f, on: v } : f));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const ativas = flags.filter(f => f.on).length;

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={handleSave}>Publicar alterações</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {saved && <Alert variant="info">Flags publicadas com sucesso para todas as clínicas.</Alert>}

      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="m-lbl">Total de flags</div>
          <div className="m-val">{flags.length}</div>
          <div className="m-delta">Cadastradas na plataforma</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Flags ativas</div>
          <div className="m-val">{ativas}</div>
          <div className="m-delta up">Disponíveis para clínicas</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Em beta</div>
          <div className="m-val">{flags.filter(f => f.beta).length}</div>
          <div className="m-delta">Somente Enterprise</div>
        </div>
        <div className="metric">
          <div className="m-lbl">Desativadas</div>
          <div className="m-val">{flags.filter(f => !f.on).length}</div>
          <div className="m-delta">Não disponíveis</div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Feature Flags Globais"
          subtitle="Flags globais se aplicam a todas as clínicas elegíveis. Flags por clínica são gerenciados dentro de cada clínica."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => setFlags(flags.map(f => ({ ...f, on: true })))}>Ativar todas</Button>
              <Button variant="outline" size="sm" onClick={() => setFlags(flags.map(f => ({ ...f, on: false })))}>Desativar todas</Button>
            </div>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {flags.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                borderBottom: '1px solid var(--border)',
                background: f.on ? 'var(--surface)' : 'var(--surface-2)',
                opacity: f.on ? 1 : 0.75,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.nome}</span>
                  {f.beta && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: '#f59e0b', color: 'white', padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase' }}>
                      beta
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{f.desc}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {f.planos.map(p => (
                    <Badge key={p} variant={planVariant(p)} className="badge-sm">{p}</Badge>
                  ))}
                </div>
              </div>
              <Toggle on={f.on} onChange={(v) => toggle(f.id, v)} />
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
};

export default FeatureFlags;
