// Proxy server-side (service role) usado pelo painel admin Lumina.
// Reescrito em 17/07/2026 após perda do projeto original — mesmo contrato do crmClient.ts,
// agora com allowlist de tabelas + ações administrativas dedicadas (criação/exclusão/
// arquivamento/suspensão/troca de plano/reenvio de convite de clínica).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_TABLES = new Set([
  'usuarios',
  'clientes',
  'agendamentos',
  'equipe',
  'procedimentos',
  'rooms',
  'prontuarios_evolucoes',
  'faturas_abacatepay',
]);

const ALLOWED_PLANOS = new Set(['basico', 'pro', 'enterprise', 'vip']);

const CRM_URL = 'https://app.luminaclin.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function handleCreateClinica(data: Record<string, unknown> | undefined) {
  const nome_clinica = typeof data?.nome_clinica === 'string' ? data.nome_clinica.trim() : '';
  const email = typeof data?.email === 'string' ? data.email.trim() : '';
  const plano = typeof data?.plano === 'string' ? data.plano : '';

  if (!nome_clinica || !email) return json({ error: 'Nome e e-mail são obrigatórios.' }, 400);
  if (!ALLOWED_PLANOS.has(plano)) return json({ error: `Plano inválido: ${plano}` }, 400);

  // O trigger `on_auth_user_created` (handle_new_user) cria a linha em `usuarios`
  // automaticamente a partir de raw_user_meta_data — não inserir manualmente aqui
  // (causaria "duplicate key value violates unique constraint usuarios_pkey").
  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${CRM_URL}/definir-senha`,
    data: { nome_clinica, plano },
  });

  if (inviteErr || !inviteData?.user) {
    const msg = /already.*registered/i.test(inviteErr?.message ?? '')
      ? 'Já existe uma conta com este e-mail.'
      : (inviteErr?.message ?? 'Não foi possível criar o usuário de acesso.');
    return json({ error: msg }, 400);
  }

  return json({ success: true });
}

async function handleDeleteClinica(id: string | undefined) {
  if (!id) return json({ error: 'id é obrigatório' }, 400);

  const { data: signed, error: signedErr } = await supabase
    .from('prontuarios_evolucoes')
    .select('id')
    .eq('user_id', id)
    .not('assinado_em', 'is', null)
    .limit(1);

  if (signedErr) return json({ error: signedErr.message }, 400);
  if (signed && signed.length > 0) {
    return json({
      error: 'Esta clínica possui prontuários assinados e não pode ser excluída (CFM 1.638/2002).',
      code: 'SIGNED_RECORDS',
    }, 400);
  }

  // Sem FK para `usuarios`; precisa ser limpo manualmente.
  await supabase.from('faturas_abacatepay').delete().eq('clinica_id', id);

  // Deleta `usuarios` primeiro — todo o resto (clientes, agendamentos, equipe,
  // procedimentos, rooms, prontuários etc.) tem FK ON DELETE CASCADE para ele.
  const { error: delErr } = await supabase.from('usuarios').delete().eq('id', id);
  if (delErr) return json({ error: delErr.message }, 400);

  const { error: authDelErr } = await supabase.auth.admin.deleteUser(id);
  if (authDelErr) {
    console.error('[admin-query] falha ao deletar usuário auth após excluir clínica:', authDelErr.message);
  }

  return json({ success: true });
}

async function handleArchiveClinica(id: string | undefined) {
  if (!id) return json({ error: 'id é obrigatório' }, 400);

  const { data: usuario, error: fetchErr } = await supabase
    .from('usuarios')
    .select('email')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return json({ error: fetchErr.message }, 400);
  if (!usuario) return json({ error: 'Clínica não encontrada.' }, 404);

  // Libera o e-mail original renomeando o e-mail no auth.users (único ali) e bane o login.
  const archivedEmail = `archived+${Date.now()}+${usuario.email}`;
  const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
    email: archivedEmail,
    email_confirm: true,
    ban_duration: '876000h', // ~100 anos
  });
  if (authErr) return json({ error: authErr.message }, 400);

  const { error: updErr } = await supabase.from('usuarios')
    .update({ arquivado: true, admin_suspended: true })
    .eq('id', id);
  if (updErr) return json({ error: updErr.message }, 400);

  return json({ success: true });
}

async function handleSetSuspended(id: string | undefined, suspended: boolean) {
  if (!id) return json({ error: 'id é obrigatório' }, 400);
  const { error } = await supabase.from('usuarios')
    .update({ admin_suspended: suspended, suspended_at: suspended ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return json({ error: error.message }, 400);
  return json({ success: true });
}

async function handleChangePlan(id: string | undefined, plano: string | undefined) {
  if (!id) return json({ error: 'id é obrigatório' }, 400);
  if (!plano || !ALLOWED_PLANOS.has(plano)) return json({ error: `Plano inválido: ${plano}` }, 400);
  const { error } = await supabase.from('usuarios').update({ plano }).eq('id', id);
  if (error) return json({ error: error.message }, 400);
  return json({ success: true });
}

async function handleResendInvite(email: string | undefined, nome_clinica: string | undefined) {
  if (!email) return json({ error: 'email é obrigatório' }, 400);

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${CRM_URL}/definir-senha` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return json({ error: linkErr?.message ?? 'Não foi possível gerar o link de acesso.' }, 400);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY não configurado no projeto Supabase — não é possível reenviar o convite por e-mail.' }, 500);
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Lumina <no-reply@luminaclin.com>',
      to: [email],
      subject: `Convite de acesso — ${nome_clinica ?? 'Lumina'}`,
      html: `<p>Olá! Aqui está seu link de acesso à plataforma Lumina${nome_clinica ? ` para <strong>${nome_clinica}</strong>` : ''}:</p><p><a href="${linkData.properties.action_link}">${linkData.properties.action_link}</a></p>`,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => '');
    return json({ error: `Falha ao enviar e-mail: ${detail}` }, 502);
  }

  return json({ success: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const { table, action } = body as { table?: string; action?: string };

    switch (action) {
      case 'create-clinica':
        return await handleCreateClinica((body as { data?: Record<string, unknown> }).data);
      case 'delete-clinica':
        return await handleDeleteClinica((body as { id?: string }).id);
      case 'archive-clinica':
        return await handleArchiveClinica((body as { id?: string }).id);
      case 'admin-suspend-clinica':
        return await handleSetSuspended((body as { id?: string }).id, true);
      case 'admin-reactivate-clinica':
        return await handleSetSuspended((body as { id?: string }).id, false);
      case 'admin-change-plan':
        return await handleChangePlan((body as { id?: string }).id, (body as { plano?: string }).plano);
      case 'resend-invite':
        return await handleResendInvite((body as { email?: string }).email, (body as { nome_clinica?: string }).nome_clinica);
      default:
        break;
    }

    if (!table || !ALLOWED_TABLES.has(table)) {
      return json({ error: `Tabela não permitida: ${table}` }, 400);
    }

    if (action === 'patch') {
      const { id, updates } = body as { id: string; updates: Record<string, unknown> };
      if (!id || !updates) return json({ error: 'id e updates são obrigatórios' }, 400);
      const { error } = await supabase.from(table).update(updates).eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === 'insert') {
      const { data } = body as { data: Record<string, unknown> };
      if (!data) return json({ error: 'data é obrigatório' }, 400);
      const { error } = await supabase.from(table).insert(data);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === 'delete') {
      const { id } = body as { id: string };
      if (!id) return json({ error: 'id é obrigatório' }, 400);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // Query (default): { table, select?, filters?, order?, limit? }
    const { select, filters, order, limit } = body as {
      select?: string;
      filters?: Record<string, string>;
      order?: string;
      limit?: number;
    };

    let q = supabase.from(table).select(select ?? '*');

    if (filters) {
      for (const [column, expr] of Object.entries(filters)) {
        const dot = expr.indexOf('.');
        if (dot === -1) continue;
        const op = expr.slice(0, dot);
        const value = expr.slice(dot + 1);
        q = q.filter(column, op, value);
      }
    }

    if (order) {
      const [column, dir] = order.split('.');
      q = q.order(column, { ascending: dir !== 'desc' });
    }

    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 400);
    return json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[admin-query]', msg);
    return json({ error: msg }, 500);
  }
});
