import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Plan = 'basico' | 'pro' | 'enterprise' | 'vip';

export interface FeatureFlag {
  id: string;
  nome: string;
  desc: string;
  modulo: string;
  enabledForPlans: Record<Plan, boolean>;
  beta?: boolean;
}

export const INITIAL_FLAGS: FeatureFlag[] = [
  // ─── Agenda ───────────────────────────────────────────────────────────────
  {
    id: 'agenda-basica',
    nome: 'Agendamento Multiprofissional',
    desc: 'Agenda com visão dia, semana e ano para múltiplos profissionais',
    modulo: 'Agenda',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'agenda-avancada',
    nome: 'Agendamento Avançado',
    desc: 'Precisão ao minuto, smart-fit algorítmico e encaixes automáticos',
    modulo: 'Agenda',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  // ─── Recepção ─────────────────────────────────────────────────────────────
  {
    id: 'sala-de-espera',
    nome: 'Sala de Espera Kanban',
    desc: 'Kanban de recepção em tempo real com status de pacientes',
    modulo: 'Recepção',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'jornada-paciente',
    nome: 'Jornada do Paciente',
    desc: 'Rastreamento de jornada com alertas cromáticos',
    modulo: 'Recepção',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  // ─── Clínico ──────────────────────────────────────────────────────────────
  {
    id: 'prontuario-digital',
    nome: 'Prontuário Digital',
    desc: 'Timeline, anamnese e histórico clínico completo do paciente',
    modulo: 'Clínico',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'galeria-antes-depois',
    nome: 'Galeria Antes/Depois',
    desc: 'Upload e comparação de fotos de procedimentos',
    modulo: 'Clínico',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  // ─── Operacional ──────────────────────────────────────────────────────────
  {
    id: 'gestao-salas',
    nome: 'Gestão de Salas',
    desc: 'Salas com calendário de ocupação e controle de recursos',
    modulo: 'Operacional',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'estoque',
    nome: 'Módulo de Estoque',
    desc: 'Gestão de insumos com alertas de estoque mínimo',
    modulo: 'Operacional',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  // ─── CRM ──────────────────────────────────────────────────────────────────
  {
    id: 'crm-vendas',
    nome: 'CRM de Vendas',
    desc: 'Pipeline de leads, ranking de pacientes e follow-up automático com orçamentos',
    modulo: 'CRM',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  // ─── Financeiro ───────────────────────────────────────────────────────────
  {
    id: 'financeiro-basico',
    nome: 'Financeiro Básico',
    desc: 'Dashboard financeiro, fluxo de caixa e catálogo de procedimentos',
    modulo: 'Financeiro',
    enabledForPlans: { basico: true, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'financeiro-avancado',
    nome: 'Financeiro Avançado',
    desc: 'Comissões por profissional, trilha de auditoria e gestão prospectiva',
    modulo: 'Financeiro',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'relatorios-avancados',
    nome: 'Relatórios Avançados',
    desc: 'Exportação e análise detalhada de dados financeiros e operacionais',
    modulo: 'Financeiro',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  // ─── Segurança ────────────────────────────────────────────────────────────
  {
    id: 'lgpd',
    nome: 'Conformidade LGPD',
    desc: 'Ferramentas de conformidade com a Lei Geral de Proteção de Dados',
    modulo: 'Segurança',
    enabledForPlans: { basico: false, pro: true, enterprise: true, vip: true },
  },
  {
    id: 'permissoes-granulares',
    nome: 'Permissões Granulares',
    desc: 'Controle de acesso detalhado por unidade e profissional',
    modulo: 'Segurança',
    enabledForPlans: { basico: false, pro: false, enterprise: true, vip: true },
  },
  // ─── IA ───────────────────────────────────────────────────────────────────
  {
    id: 'ia-clinica',
    nome: 'IA Clínica',
    desc: 'Resumo clínico por IA e transcrição automática de consultas',
    modulo: 'IA',
    enabledForPlans: { basico: false, pro: false, enterprise: true, vip: true },
    beta: true,
  },
  // ─── Comunicação ──────────────────────────────────────────────────────────
  {
    id: 'whatsapp',
    nome: 'Integração WhatsApp',
    desc: 'WhatsApp com disparos em massa e automações de follow-up',
    modulo: 'Comunicação',
    enabledForPlans: { basico: false, pro: false, enterprise: true, vip: true },
    beta: true,
  },
  // ─── Plataforma ───────────────────────────────────────────────────────────
  {
    id: 'multi-unidades',
    nome: 'Múltiplas Unidades',
    desc: 'Dashboard multi-unidades e relatórios comparativos entre filiais',
    modulo: 'Plataforma',
    enabledForPlans: { basico: false, pro: false, enterprise: true, vip: true },
    beta: true,
  },
];

interface FeatureFlagsContextValue {
  flags: FeatureFlag[];
  setFlags: React.Dispatch<React.SetStateAction<FeatureFlag[]>>;
  isEnabled: (flagId: string, plan: Plan | null) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);

  const isEnabled = (flagId: string, plan: Plan | null): boolean => {
    if (!plan) return true;
    const flag = flags.find(f => f.id === flagId);
    if (!flag) return true;
    return flag.enabledForPlans[plan];
  };

  return (
    <FeatureFlagsContext.Provider value={{ flags, setFlags, isEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}

export function normalizePlan(plan: string): Plan | null {
  const p = plan.toLowerCase().trim();
  if (p === 'vip') return 'vip';
  if (p.includes('enterprise')) return 'enterprise';
  if (p.includes('pro')) return 'pro';
  if (p.includes('básico') || p.includes('basico') || p.includes('basic')) return 'basico';
  return null;
}
