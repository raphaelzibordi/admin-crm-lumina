// Chat de suporte (docs/PLANO_CHAT_SUPORTE.md no repo crm-estetica) — notifica fora do painel
// quando alguém manda mensagem no chat de suporte. Disparado por um trigger de banco (AFTER
// INSERT em support_messages, via pg_net) — não é chamado pelo frontend. Payload no formato
// padrão de Database Webhook do Supabase: { type, table, schema, record, old_record }.
//
// Fase 2: sender_type='clinica' -> notifica a equipe Lumina (e-mail + Slack).
// Fase 3: sender_type='admin'   -> notifica a clínica (Web Push + fallback e-mail).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7?target=deno';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const CRM_URL = 'https://app.luminaclin.com';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Best-effort: nunca lança — a notificação é um extra, não pode derrubar o fluxo do chat.
async function tryResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('[on-support-message] RESEND_API_KEY não configurada — e-mail não enviado.');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Lumina <no-reply@luminaclin.com>', to: [to], subject, html }),
    });
    if (!res.ok) console.error('[on-support-message] Resend error:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('[on-support-message] falha ao enviar e-mail via Resend:', err);
    return false;
  }
}

// Best-effort: webhook genérico de Slack/Discord/Google Chat, todos aceitam { text }.
async function trySlackWebhook(text: string): Promise<boolean> {
  const url = Deno.env.get('SUPPORT_SLACK_WEBHOOK_URL');
  if (!url) {
    console.warn('[on-support-message] SUPPORT_SLACK_WEBHOOK_URL não configurada — aviso não enviado.');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error('[on-support-message] Slack webhook error:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('[on-support-message] falha ao enviar webhook Slack:', err);
    return false;
  }
}

// Best-effort: manda Web Push pra todas as inscrições passadas; limpa do banco as que o
// provedor rejeitou como definitivamente inválidas (404/410 — dispositivo desinscreveu).
async function trySendWebPush(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: Record<string, unknown>
): Promise<boolean> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:suporte@luminaclin.com';
  if (!publicKey || !privateKey) {
    console.warn('[on-support-message] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — push não enviado.');
    return false;
  }
  if (subs.length === 0) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const results = await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      return true;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      } else {
        console.error('[on-support-message] falha ao enviar Web Push:', statusCode, err?.body ?? err);
      }
      return false;
    }
  }));

  return results.some(Boolean);
}

interface SupportMessageRecord {
  id: string;
  conversation_id: string;
  clinica_id: string;
  sender_type: 'clinica' | 'admin';
  sender_name: string | null;
  body: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const payload = await req.json() as { type?: string; table?: string; record?: SupportMessageRecord };
    const msg = payload.record;

    if (!msg || payload.table !== 'support_messages' || payload.type !== 'INSERT') {
      return json({ skipped: true, reason: 'payload_nao_reconhecido' });
    }

    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .select('unread_admin, unread_clinica, clinica_nome, clinica_email')
      .eq('id', msg.conversation_id)
      .maybeSingle();

    if (convErr || !conv) {
      console.error('[on-support-message] conversa não encontrada:', convErr);
      return json({ skipped: true, reason: 'conversa_nao_encontrada' });
    }

    const clinicaNome = conv.clinica_nome || 'Uma clínica';
    const remetente = msg.sender_name || (msg.sender_type === 'admin' ? 'Suporte Lumina' : clinicaNome);

    // ── Fase 2: mensagem da clínica -> notifica a equipe Lumina ───────────
    if (msg.sender_type === 'clinica') {
      // Coalescing: só notifica na 1ª mensagem não lida da leva atual.
      if ((conv.unread_admin ?? 0) !== 1) {
        return json({ skipped: true, reason: 'coalescing_ja_notificado', unreadAdmin: conv.unread_admin });
      }

      const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'suporte@luminaclin.com';
      const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f8f8f6;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#587c71;padding:24px 32px">
      <h1 style="color:#fff;font-size:20px;margin:0">💬 Nova mensagem de suporte</h1>
      <p style="color:#e8f0ee;font-size:13px;margin:6px 0 0">${escapeHtml(clinicaNome)}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="font-size:13px;color:#6b7280;margin:0 0 6px">De <strong>${escapeHtml(remetente)}</strong>:</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#111;white-space:pre-wrap">${escapeHtml(msg.body)}</div>
      <p style="font-size:13px;color:#6b7280;margin:20px 0 0">
        Responda em <a href="https://admin.luminaclin.com/atendimento" style="color:#587c71">Atendimento</a> no painel Lumina.
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;font-size:11px;color:#9ca3af;text-align:center">Lumina — notificação automática de suporte</div>
  </div>
</body></html>`;
      const slackText = `💬 *${clinicaNome}* (${remetente}) mandou mensagem no suporte:\n> ${msg.body}`;

      const [emailSent, slackSent] = await Promise.all([
        tryResendEmail(supportEmail, `💬 Novo suporte — ${clinicaNome}`, html),
        trySlackWebhook(slackText),
      ]);

      return json({ success: true, emailSent, slackSent });
    }

    // ── Fase 3: mensagem do admin -> notifica a clínica (dono + equipe) ───
    // Coalescing: só notifica na 1ª mensagem não lida da leva atual.
    if ((conv.unread_clinica ?? 0) !== 1) {
      return json({ skipped: true, reason: 'coalescing_ja_notificado', unreadClinica: conv.unread_clinica });
    }

    // Dispositivos inscritos da clínica: o dono (id = clinica_id) e qualquer membro
    // da equipe (usuarios.owner_id = clinica_id) — cada um pode ter opt-in próprio.
    const { data: pessoas } = await supabase
      .from('usuarios')
      .select('id')
      .or(`id.eq.${msg.clinica_id},owner_id.eq.${msg.clinica_id}`);
    const userIds = (pessoas ?? []).map((p) => p.id);

    const { data: subs } = userIds.length > 0
      ? await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .in('user_id', userIds)
          .eq('scope', 'clinica')
      : { data: [] as { endpoint: string; p256dh: string; auth: string }[] };

    const pushPayload = {
      title: 'Suporte Lumina',
      body: msg.body.length > 140 ? `${msg.body.slice(0, 140)}…` : msg.body,
      url: `${CRM_URL}/?tab=suporte`,
    };

    const pushSent = await trySendWebPush(subs ?? [], pushPayload);

    // Fallback: sem inscrição ativa ou push falhou -> e-mail pra clínica.
    let emailSent = false;
    if (!pushSent && conv.clinica_email) {
      const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f8f8f6;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#587c71;padding:24px 32px">
      <h1 style="color:#fff;font-size:20px;margin:0">💬 Nova resposta do suporte Lumina</h1>
    </div>
    <div style="padding:28px 32px">
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#111;white-space:pre-wrap">${escapeHtml(msg.body)}</div>
      <p style="font-size:13px;color:#6b7280;margin:20px 0 0">
        Acesse o <a href="${CRM_URL}/?tab=suporte" style="color:#587c71">Lumina → Suporte</a> pra ver e responder.
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;font-size:11px;color:#9ca3af;text-align:center">Lumina — notificação automática de suporte</div>
  </div>
</body></html>`;
      emailSent = await tryResendEmail(conv.clinica_email, '💬 Nova resposta do suporte Lumina', html);
    }

    return json({ success: true, pushSent, emailSent, subscriptionsFound: (subs ?? []).length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[on-support-message] erro:', msg);
    // Nunca retorna erro 5xx por notificação falha — o chat em si não deve ser afetado.
    return json({ success: false, reason: msg });
  }
});
