import { crmQuery, crmPost } from './crmClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClienteRow {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  status_retencao: string | null;
  tags: string[] | null;
  created_at: string;
}

interface ProntuarioRow {
  id: string;
  cliente_id: string | null;
  data: string;
  profissional: string | null;
  procedimento: string | null;
  relato_natural: string | null;
  observacoes_tecnicas: string | null;
}

interface AgendamentoRow {
  id: string;
  cliente_id: string | null;
  data: string;
  hora_inicio: string;
  profissional: string | null;
  procedimento: string | null;
  valor: number | null;
  status: string | null;
  metodo_pagamento: string | null;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function fetchClientesForExport(clinicaId: string): Promise<ClienteRow[]> {
  return crmQuery<ClienteRow>('clientes', {
    select: 'id,nome,telefone,email,data_nascimento,status_retencao,tags,created_at',
    filters: { user_id: `eq.${clinicaId}` },
    order: 'created_at.asc',
    limit: 50000,
  });
}

export async function fetchProntuariosForExport(
  clinicaId: string,
): Promise<(ProntuarioRow & { paciente_nome: string; paciente_email: string })[]> {
  const [clientes, prontuarios] = await Promise.all([
    fetchClientesForExport(clinicaId),
    crmQuery<ProntuarioRow>('prontuarios_evolucoes', {
      select: 'id,cliente_id,data,profissional,procedimento,relato_natural,observacoes_tecnicas',
      filters: { user_id: `eq.${clinicaId}` },
      order: 'data.asc',
      limit: 50000,
    }),
  ]);

  const clienteMap = new Map(clientes.map(c => [c.id, c]));
  return prontuarios.map(p => ({
    ...p,
    paciente_nome: p.cliente_id ? (clienteMap.get(p.cliente_id)?.nome ?? '') : '',
    paciente_email: p.cliente_id ? (clienteMap.get(p.cliente_id)?.email ?? '') : '',
  }));
}

export async function fetchAgendamentosForExport(
  clinicaId: string,
): Promise<(AgendamentoRow & { paciente_nome: string; paciente_email: string })[]> {
  const [clientes, agendamentos] = await Promise.all([
    fetchClientesForExport(clinicaId),
    crmQuery<AgendamentoRow>('agendamentos', {
      select: 'id,cliente_id,data,hora_inicio,profissional,procedimento,valor,status,metodo_pagamento',
      filters: { user_id: `eq.${clinicaId}` },
      order: 'data.asc',
      limit: 50000,
    }),
  ]);

  const clienteMap = new Map(clientes.map(c => [c.id, c]));
  return agendamentos.map(a => ({
    ...a,
    paciente_nome: a.cliente_id ? (clienteMap.get(a.cliente_id)?.nome ?? '') : '',
    paciente_email: a.cliente_id ? (clienteMap.get(a.cliente_id)?.email ?? '') : '',
  }));
}

// ─── Import helpers ───────────────────────────────────────────────────────────

async function buildClienteCache(clinicaId: string): Promise<{
  byEmail: Map<string, string>;
  byNome: Map<string, string>;
}> {
  const rows = await crmQuery<{ id: string; nome: string; email: string | null }>('clientes', {
    select: 'id,nome,email',
    filters: { user_id: `eq.${clinicaId}` },
    limit: 50000,
  });
  const byEmail = new Map<string, string>();
  const byNome = new Map<string, string>();
  for (const c of rows) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c.id);
    byNome.set(c.nome.toLowerCase(), c.id);
  }
  return { byEmail, byNome };
}

function resolveClienteId(
  email: string | undefined,
  nome: string | undefined,
  cache: { byEmail: Map<string, string>; byNome: Map<string, string> },
): string | null {
  if (email) {
    const id = cache.byEmail.get(email.toLowerCase());
    if (id) return id;
  }
  if (nome) {
    const id = cache.byNome.get(nome.toLowerCase());
    if (id) return id;
  }
  return null;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importClientes(
  clinicaId: string,
  rows: Record<string, string>[],
): Promise<ImportResult> {
  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const nome = row['nome']?.trim();
    if (!nome) { skipped++; continue; }
    try {
      const tags = row['tags']
        ? row['tags'].split(';').map(t => t.trim()).filter(Boolean)
        : [];
      await crmPost('clientes', {
        user_id: clinicaId,
        nome,
        telefone: row['telefone']?.trim() || null,
        email: row['email']?.trim() || null,
        data_nascimento: row['data_nascimento']?.trim() || null,
        status_retencao: row['status_retencao']?.trim() || 'ativo',
        tags,
      });
      created++;
    } catch (e) {
      errors.push(`"${nome}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}

export async function importProntuarios(
  clinicaId: string,
  rows: Record<string, string>[],
): Promise<ImportResult> {
  let created = 0, skipped = 0;
  const errors: string[] = [];
  const cache = await buildClienteCache(clinicaId);

  for (const row of rows) {
    const data = row['data']?.trim();
    if (!data) { skipped++; continue; }
    try {
      const clienteId = resolveClienteId(row['paciente_email'], row['paciente_nome'], cache);
      await crmPost('prontuarios_evolucoes', {
        user_id: clinicaId,
        cliente_id: clienteId,
        data,
        profissional: row['profissional']?.trim() || null,
        procedimento: row['procedimento']?.trim() || null,
        relato_natural: row['relato_natural']?.trim() || null,
        observacoes_tecnicas: row['observacoes_tecnicas']?.trim() || null,
      });
      created++;
    } catch (e) {
      errors.push(`${data}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}

export async function importAgendamentos(
  clinicaId: string,
  rows: Record<string, string>[],
): Promise<ImportResult> {
  let created = 0, skipped = 0;
  const errors: string[] = [];
  const cache = await buildClienteCache(clinicaId);

  for (const row of rows) {
    const data = row['data']?.trim();
    if (!data) { skipped++; continue; }
    try {
      const clienteId = resolveClienteId(row['paciente_email'], row['paciente_nome'], cache);
      const valorRaw = row['valor']?.trim();
      await crmPost('agendamentos', {
        user_id: clinicaId,
        cliente_id: clienteId,
        data,
        hora_inicio: row['hora_inicio']?.trim() || '00:00',
        profissional: row['profissional']?.trim() || null,
        procedimento: row['procedimento']?.trim() || null,
        valor: valorRaw ? parseFloat(valorRaw.replace(',', '.')) : null,
        status: row['status']?.trim() || null,
        metodo_pagamento: row['metodo_pagamento']?.trim() || null,
      });
      created++;
    } catch (e) {
      errors.push(`${data}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, skipped, errors };
}
