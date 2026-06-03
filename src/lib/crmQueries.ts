import { crmQuery } from './crmClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Clinica {
  id: string;
  nome_clinica: string;
  email: string;
  created_at: string;
  total_clientes: number;
  total_agendamentos: number;
  total_equipe: number;
  receita_total: number;
  health_score: number;
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
    crmQuery<{ id: string; nome_clinica: string; email: string; created_at: string }>(
      'usuarios',
      { select: 'id,nome_clinica,email,created_at', filters: { role: 'eq.dono' }, order: 'created_at.desc' }
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
      total_clientes: cli,
      total_agendamentos: ags.length,
      total_equipe: eqp,
      receita_total: receita,
      health_score: calcHealth(cli, ags.length, eqp, receita),
    };
  });
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
    select: 'id,user_id,nome,descricao,ativo,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'created_at.desc',
  });
}

export async function fetchAgendamentosClinica(clinicaId: string): Promise<Agendamento[]> {
  return crmQuery<Agendamento>('agendamentos', {
    select: 'id,user_id,data,hora_inicio,profissional,procedimento,valor,status,metodo_pagamento,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'data.desc',
    limit: 100,
  });
}

export async function fetchClinicaInfo(clinicaId: string): Promise<{ nome_clinica: string; email: string } | null> {
  const rows = await crmQuery<{ nome_clinica: string; email: string }>('usuarios', {
    select: 'nome_clinica,email',
    filters: { id: `eq.${clinicaId}` },
    limit: 1,
  });
  return rows[0] ?? null;
}
