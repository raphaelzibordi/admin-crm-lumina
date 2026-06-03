import { crm } from './crmClient';

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
  ultima_atividade: string | null;
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
  const { data: donos, error } = await crm
    .from('usuarios')
    .select('id, nome_clinica, email, created_at')
    .eq('role', 'dono')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!donos?.length) return [];

  const ids = donos.map(d => d.id);

  const [clientesRes, agendRes, equipeRes] = await Promise.all([
    crm.from('clientes').select('user_id').in('user_id', ids),
    crm.from('agendamentos').select('user_id, valor').in('user_id', ids),
    crm.from('equipe').select('user_id').in('user_id', ids),
  ]);

  return donos.map(d => {
    const clientes = (clientesRes.data || []).filter(c => c.user_id === d.id).length;
    const ags = (agendRes.data || []).filter(a => a.user_id === d.id);
    const equipe = (equipeRes.data || []).filter(e => e.user_id === d.id).length;
    const receita = ags.reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

    return {
      id: d.id,
      nome_clinica: d.nome_clinica || d.email,
      email: d.email,
      created_at: d.created_at,
      total_clientes: clientes,
      total_agendamentos: ags.length,
      total_equipe: equipe,
      receita_total: receita,
      ultima_atividade: null,
      health_score: calcHealth(clientes, ags.length, equipe, receita),
    };
  });
}

export async function fetchEquipeClinica(clinicaId: string): Promise<MembroEquipe[]> {
  const { data, error } = await crm
    .from('equipe')
    .select('id, user_id, nome, email, cargo, ativo, created_at')
    .eq('user_id', clinicaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchProcedimentosClinica(clinicaId: string): Promise<Procedimento[]> {
  const { data, error } = await crm
    .from('procedimentos')
    .select('id, user_id, nome, descricao, preco, duracao_minutos, sala_requerida, profissional_responsavel, booking_visivel, created_at')
    .eq('user_id', clinicaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchSalasClinica(clinicaId: string): Promise<Sala[]> {
  const { data, error } = await crm
    .from('salas')
    .select('id, user_id, nome, descricao, ativo, created_at')
    .eq('user_id', clinicaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAgendamentosClinica(clinicaId: string): Promise<Agendamento[]> {
  const { data, error } = await crm
    .from('agendamentos')
    .select('id, user_id, data, hora_inicio, profissional, procedimento, valor, status, metodo_pagamento, created_at')
    .eq('user_id', clinicaId)
    .order('data', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function fetchClinicaInfo(clinicaId: string): Promise<{ nome_clinica: string; email: string } | null> {
  const { data, error } = await crm
    .from('usuarios')
    .select('nome_clinica, email')
    .eq('id', clinicaId)
    .single();

  if (error) return null;
  return data;
}
