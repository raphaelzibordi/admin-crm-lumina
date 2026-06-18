import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Button, Card, CardHeader, Alert } from '../components/ui';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import type { Plan } from '../contexts/FeatureFlagsContext';
import { supabase } from '../lib/supabase';
import '../components/ui/ui.css';

const PLANS: { key: Plan; label: string; color: string; bg: string }[] = [
  { key: 'basico',     label: 'Básico',     color: '#4b5563', bg: '#f3f4f6' },
  { key: 'pro',        label: 'Pro',         color: '#1d4ed8', bg: '#eff6ff' },
  { key: 'enterprise', label: 'Enterprise',  color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'vip',        label: 'VIP',         color: '#ca8a04', bg: '#fefce8' },
];

const PlanToggle = ({
  on,
  color,
  bg,
  onChange,
}: {
  on: boolean;
  color: string;
  bg: string;
  onChange: (v: boolean) => void;
}) => (
  <div
    onClick={() => onChange(!on)}
    style={{
      width: 36,
      height: 20,
      borderRadius: 10,
      background: on ? color : '#d1d5db',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.15s',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: on ? bg : 'white',
        transition: 'left 0.15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}
    />
  </div>
);

const FeatureFlags = () => {
  const { flags, setFlags } = useFeatureFlags();
  const [saved, setSaved] = useState(false);

  const togglePlan = (flagId: string, plan: Plan, value: boolean) => {
    setFlags(prev =>
      prev.map(f =>
        f.id === flagId
          ? { ...f, enabledForPlans: { ...f.enabledForPlans, [plan]: value } }
          : f
      )
    );
  };

  const setAllForPlan = (plan: Plan, value: boolean) => {
    setFlags(prev =>
      prev.map(f => ({ ...f, enabledForPlans: { ...f.enabledForPlans, [plan]: value } }))
    );
  };

  const handleSave = async () => {
    try {
      const updates = flags.map(f => ({
        id: f.id,
        nome: f.nome,
        desc: f.desc,
        modulo: f.modulo,
        enabled_for_plans: f.enabledForPlans,
        beta: f.beta || false
      }));
      
      const { error } = await supabase.from('feature_flags').upsert(updates);
      if (error) throw error;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar feature flags:', err);
      alert('Erro ao salvar as configurações.');
    }
  };

  const modules = [...new Set(flags.map(f => f.modulo))];

  const countForPlan = (plan: Plan) => flags.filter(f => f.enabledForPlans[plan]).length;

  const topbarRight = (
    <Button variant="primary" size="sm" onClick={handleSave}>Publicar alterações</Button>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {saved && <Alert variant="info">Flags publicadas com sucesso para todas as clínicas.</Alert>}

      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="m-lbl">Total de features</div>
          <div className="m-val">{flags.length}</div>
          <div className="m-delta">Módulos cadastrados</div>
        </div>
        {PLANS.map(p => (
          <div className="metric" key={p.key}>
            <div className="m-lbl">Ativas · {p.label}</div>
            <div className="m-val" style={{ color: p.color }}>{countForPlan(p.key)}</div>
            <div className="m-delta up">de {flags.length} features</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Feature Flags Globais"
          subtitle="Configure quais módulos cada plano tem acesso. Alterações se aplicam a todas as clínicas elegíveis."
        />

        {/* Column header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 90px 110px',
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature</span>
          {PLANS.map(p => (
            <div key={p.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: p.color,
                  background: p.bg,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {p.label}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setAllForPlan(p.key, true)}
                  style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  Tudo
                </button>
                <button
                  onClick={() => setAllForPlan(p.key, false)}
                  style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  Nenhum
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Flags grouped by module */}
        {modules.map(modulo => {
          const moduleFlags = flags.filter(f => f.modulo === modulo);
          return (
            <div key={modulo}>
              {/* Module group header */}
              <div
                style={{
                  padding: '7px 16px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  borderTop: '1px solid var(--border)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {modulo}
              </div>

              {moduleFlags.map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 90px 110px',
                    alignItems: 'center',
                    padding: '11px 16px',
                    borderBottom: i < moduleFlags.length - 1 ? '1px solid var(--border)' : 'none',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.nome}</span>
                      {f.beta && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            background: '#f59e0b',
                            color: 'white',
                            padding: '1px 5px',
                            borderRadius: 3,
                            textTransform: 'uppercase',
                          }}
                        >
                          beta
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.desc}</div>
                  </div>

                  {PLANS.map(p => (
                    <div key={p.key} style={{ display: 'flex', justifyContent: 'center' }}>
                      <PlanToggle
                        on={f.enabledForPlans[p.key]}
                        color={p.color}
                        bg={p.bg}
                        onChange={v => togglePlan(f.id, p.key, v)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </Card>
    </AppShell>
  );
};

export default FeatureFlags;
