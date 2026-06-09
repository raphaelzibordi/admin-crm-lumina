import { crmQuery, crmPatch, crmPost, crmDelete } from './crmClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlanoClinica = 'basico' | 'pro' | 'enterprise' | 'vip';

export interface Clinica {
  id: string;
  nome_clinica: string;
  email: string;
  created_at: string;
  plano: PlanoClinica;
  total_clientes: number;
  total_agendamentos: number;
  total_equipe: number;
  receita_total: number;
  health_score: number;
  abacatepay_subscription_status: string | null;
  plano_periodicidade: string | null;
  acesso_expira_em: string | null;
  suspended_at: string | null;
  admin_suspended: boolean;
}

export interface ClinicaConfig {
  nome_clinica: string;
  email: string;
  telefone: string | null;
  cnpj: string | null;
  site: string | null;
  nome: string | null;
  cpf: string | null;
  cep: string | null;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface MembroEquipe {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  created_at: string;
}

export interface Procedimento {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  sala_requerida: boolean;
  profissional_responsavel: string | null;
  booking_visivel: boolean;
  created_at: string;
}

export interface Sala {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  profissional_id: string | null;
  created_at: string;
}

export interface Agendamento {
  id: string;
  user_id: string;
  data: string;
  hora_inicio: string;
  profissional: string | null;
  procedimento: string | null;
  valor: number | null;
  status: string | null;
  metodo_pagamento: string | null;
  created_at: string;
}

// ── Health score ──────────────────────────────────────────────────────────────

function calcHealth(clientes: number, agendamentos: number, equipe: number, receita: number): number {
  let score = 30;
  if (clientes >= 10) score += 25;
  else if (clientes >= 5) score += 15;
  else if (clientes >= 1) score += 8;

  if (agendamentos >= 10) score += 25;
  else if (agendamentos >= 5) score += 15;
  else if (agendamentos >= 1) score += 8;

  if (equipe >= 3) score += 15;
  else if (equipe >= 1) score += 8;

  if (receita >= 10000) score += 10;
  else if (receita >= 1000) score += 5;

  return Math.min(score, 100);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function fetchClinicas(): Promise<Clinica[]> {
  const [donos, clientes, agendamentos, equipe] = await Promise.all([
    crmQuery<{ id: string; nome_clinica: string; email: string; created_at: string; plano: PlanoClinica; abacatepay_subscription_status: string | null; plano_periodicidade: string | null; acesso_expira_em: string | null; suspended_at: string | null; admin_suspended: boolean }>(
      'usuarios',
      { select: 'id,nome_clinica,email,created_at,plano,abacatepay_subscription_status,plano_periodicidade,acesso_expira_em,suspended_at,admin_suspended', filters: { role: 'eq.dono' }, order: 'created_at.desc' }
    ),
    crmQuery<{ user_id: string }>('clientes', { select: 'user_id' }),
    crmQuery<{ user_id: string; valor: number }>('agendamentos', { select: 'user_id,valor' }),
    crmQuery<{ user_id: string }>('equipe', { select: 'user_id' }),
  ]);

  return donos.map(d => {
    const cli = clientes.filter(c => c.user_id === d.id).length;
    const ags = agendamentos.filter(a => a.user_id === d.id);
    const eqp = equipe.filter(e => e.user_id === d.id).length;
    const receita = ags.reduce((s, a) => s + (Number(a.valor) || 0), 0);

    return {
      id: d.id,
      nome_clinica: d.nome_clinica || d.email,
      email: d.email,
      created_at: d.created_at,
      plano: d.plano ?? 'basico',
      total_clientes: cli,
      total_agendamentos: ags.length,
      total_equipe: eqp,
      receita_total: receita,
      health_score: calcHealth(cli, ags.length, eqp, receita),
      abacatepay_subscription_status: d.abacatepay_subscription_status ?? null,
      plano_periodicidade: d.plano_periodicidade ?? null,
      acesso_expira_em: d.acesso_expira_em ?? null,
      suspended_at: d.suspended_at ?? null,
      admin_suspended: d.admin_suspended ?? false,
    };
  });
}

export async function adminSuspendClinica(clinicaId: string): Promise<void> {
  const res = await fetch(
    import.meta.env.VITE_CRM_QUERY_URL as string,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-suspend-clinica', id: clinicaId }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function adminReactivateClinica(clinicaId: string): Promise<void> {
  const res = await fetch(
    import.meta.env.VITE_CRM_QUERY_URL as string,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-reactivate-clinica', id: clinicaId }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function fetchEquipeClinica(clinicaId: string): Promise<MembroEquipe[]> {
  return crmQuery<MembroEquipe>('equipe', {
    select: 'id,user_id,nome,email,cargo,ativo,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'created_at.desc',
  });
}

export async function fetchProcedimentosClinica(clinicaId: string): Promise<Procedimento[]> {
  return crmQuery<Procedimento>('procedimentos', {
    select: 'id,user_id,nome,descricao,preco,duracao_minutos,sala_requerida,profissional_responsavel,booking_visivel,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'created_at.desc',
  });
}

export async function fetchSalasClinica(clinicaId: string): Promise<Sala[]> {
  return crmQuery<Sala>('salas', {
    select: 'id,user_id,nome,descricao,ativo,profissional_id,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'created_at.desc',
  });
}

export async function createSala(
  clinicaId: string,
  data: { nome: string; descricao?: string | null; ativo?: boolean },
): Promise<void> {
  await crmPost('salas', {
    user_id: clinicaId,
    nome: data.nome,
    descricao: data.descricao ?? null,
    ativo: data.ativo ?? true,
    profissional_id: null,
  });
}

export async function updateSala(
  salaId: string,
  updates: Partial<{ nome: string; descricao: string | null; ativo: boolean; profissional_id: string | null }>,
): Promise<void> {
  await crmPatch('salas', salaId, updates as Record<string, unknown>);
}

export async function deleteSala(salaId: string): Promise<void> {
  await crmDelete('salas', salaId);
}

export async function fetchAgendamentosClinica(clinicaId: string): Promise<Agendamento[]> {
  return crmQuery<Agendamento>('agendamentos', {
    select: 'id,user_id,data,hora_inicio,profissional,procedimento,valor,status,metodo_pagamento,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'data.desc',
    limit: 100,
  });
}

export async function updateClinica(clinicaId: string, updates: { nome_clinica?: string; email?: string; plano?: PlanoClinica }): Promise<void> {
  await crmPatch('usuarios', clinicaId, updates);
}

export async function adminChangePlan(clinicaId: string, plano: PlanoClinica): Promise<void> {
  const res = await fetch(
    import.meta.env.VITE_CRM_QUERY_URL as string,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'admin-change-plan', id: clinicaId, plano }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function deleteClinica(id: string): Promise<void> {
  const res = await fetch(
    (import.meta.env.VITE_CRM_QUERY_URL as string),
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'delete-clinica', id }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function resendInvite(email: string, nome_clinica: string): Promise<void> {
  const res = await fetch(
    (import.meta.env.VITE_CRM_QUERY_URL as string),
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'resend-invite', email, nome_clinica }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function createClinica(data: { nome_clinica: string; email: string; plano: PlanoClinica }): Promise<void> {
  const res = await fetch(
    (import.meta.env.VITE_CRM_QUERY_URL as string),
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_CRM_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_CRM_ANON_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'create-clinica', data }),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error ?? `HTTP ${res.status}`);
}

export async function fetchClinicaInfo(clinicaId: string): Promise<{ nome_clinica: string; email: string } | null> {
  const rows = await crmQuery<{ nome_clinica: string; email: string }>('usuarios', {
    select: 'nome_clinica,email',
    filters: { id: `eq.${clinicaId}` },
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function fetchClinicaConfig(clinicaId: string): Promise<ClinicaConfig | null> {
  const rows = await crmQuery<ClinicaConfig>('usuarios', {
    select: 'nome_clinica,email,telefone,cnpj,site,nome,cpf,cep,rua,bairro,cidade,estado',
    filters: { id: `eq.${clinicaId}` },
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function updateClinicaConfig(clinicaId: string, updates: Partial<ClinicaConfig>): Promise<void> {
  await crmPatch('usuarios', clinicaId, updates as Record<string, unknown>);
}
