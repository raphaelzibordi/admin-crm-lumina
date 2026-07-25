import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Badge, Card } from '../components/ui';
import { supabase } from '../lib/supabase';
import '../components/ui/ui.css';

// ── Tipos ────────────────────────────────────────────────────────────────

type ConversationStatus = 'aberta' | 'pendente_admin' | 'pendente_cliente' | 'resolvida';

interface ConversationRow {
  id: string;
  clinica_id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_type: 'clinica' | 'admin' | null;
  unread_admin: number;
  unread_clinica: number;
  // Denormalizados em support_conversations (não via join): a RLS de `usuarios` só permite
  // leitura do próprio tenant (id = get_tenant_id()), sem cláusula para is_admin_member() — um
  // embed `usuarios:clinica_id(...)` falha silenciosamente para o admin. Ver migration
  // support_chat_fix_admin_clinic_name_visibility.
  clinica_nome: string | null;
  clinica_email: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: 'clinica' | 'admin';
  sender_name: string | null;
  body: string;
  created_at: string;
}

const STATUS_LABEL: Record<ConversationStatus, string> = {
  aberta: 'Aberta',
  pendente_admin: 'Aguardando você',
  pendente_cliente: 'Aguardando clínica',
  resolvida: 'Resolvida',
};

const STATUS_VARIANT: Record<ConversationStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  aberta: 'neutral',
  pendente_admin: 'warning',
  pendente_cliente: 'info',
  resolvida: 'success',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Componente ───────────────────────────────────────────────────────────

const Atendimento = () => {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meRef = useRef<{ id: string; name: string } | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const listEndRef = useRef<HTMLDivElement | null>(null);

  // ── Identidade do admin logado (para sender_id / sender_name) ──────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from('admin_members')
        .select('name')
        .ilike('email', user.email)
        .maybeSingle();
      meRef.current = { id: user.id, name: data?.name ?? user.email };
    })();
  }, []);

  // ── Lista de conversas ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('support_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (err) throw err;
      setConversations((data ?? []) as unknown as ConversationRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar as conversas.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Thread da conversa selecionada ──────────────────────────────────────
  const openConversation = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingThread(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setMessages((data ?? []) as MessageRow[]);
      await supabase.rpc('mark_support_read', { p_conversation: id, p_side: 'admin' });
      loadConversations();
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar a conversa.');
    } finally {
      setLoadingThread(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Realtime: novas mensagens e mudanças de conversa (admin vê tudo) ────
  useEffect(() => {
    const channel = supabase
      .channel('support-admin-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const row = payload.new as MessageRow;
          if (row.conversation_id === selectedIdRef.current) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            if (row.sender_type === 'clinica') {
              supabase.rpc('mark_support_read', { p_conversation: row.conversation_id, p_side: 'admin' }).then(() => {}, () => {});
            }
          }
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_conversations' },
        () => loadConversations()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  // ── Enviar resposta ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const body = texto.trim();
    const conv = conversations.find((c) => c.id === selectedId);
    if (!body || !conv || !meRef.current) return;
    setSending(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('support_messages')
        .insert([{
          conversation_id: conv.id,
          clinica_id: conv.clinica_id,
          sender_type: 'admin',
          sender_id: meRef.current.id,
          sender_name: meRef.current.name,
          body,
        }])
        .select()
        .single();
      if (err) throw err;
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as MessageRow]));
      setTexto('');
      loadConversations();
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível enviar a resposta.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Marcar como resolvida / reabrir ──────────────────────────────────────
  // Reabre sozinha na próxima mensagem: o trigger de negócio (on_support_message_insert)
  // sempre recalcula o status a partir de quem mandou a última mensagem, então "resolvida"
  // não trava a conversa — é só um jeito do admin sinalizar "não precisa de mim agora".
  const handleToggleResolved = async () => {
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    const novoStatus = conv.status === 'resolvida' ? 'aberta' : 'resolvida';
    setError(null);
    try {
      const { error: err } = await supabase
        .from('support_conversations')
        .update({ status: novoStatus })
        .eq('id', conv.id);
      if (err) throw err;
      loadConversations();
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível atualizar o status da conversa.');
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <AppShell>
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 104px)' }}>
        {/* Lista de conversas */}
        <Card style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Conversas</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {conversations.filter((c) => c.unread_admin > 0).length} não lida(s)
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Carregando...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma conversa ainda.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'block', padding: '12px 16px',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: c.id === selectedId ? 'var(--primary-xlight)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.clinica_nome || 'Clínica'}
                    </span>
                    {c.unread_admin > 0 && (
                      <span style={{
                        background: 'var(--danger)', color: '#fff', borderRadius: 100, minWidth: 16, height: 16,
                        fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', flexShrink: 0,
                      }}>
                        {c.unread_admin > 9 ? '9+' : c.unread_admin}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message_preview || 'Sem mensagens'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDateTime(c.last_message_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Thread */}
        <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {!selectedConv ? (
            <div style={{ margin: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              Selecione uma conversa para ver as mensagens.
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{selectedConv.clinica_nome || 'Clínica'}</h3>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {selectedConv.clinica_email}
                  </p>
                </div>
                <button
                  onClick={handleToggleResolved}
                  className="btn btn-o btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {selectedConv.status === 'resolvida' ? 'Reabrir conversa' : 'Marcar como resolvida'}
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loadingThread ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Carregando mensagens...</div>
                ) : (
                  messages.map((m) => <MsgBubble key={m.id} msg={m} />)
                )}
                <div ref={listEndRef} />
              </div>

              {error && (
                <div style={{ margin: '0 16px 8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
                  {error}
                </div>
              )}

              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva a resposta..."
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', padding: '9px 12px', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)', fontSize: 13, fontFamily: 'inherit',
                    color: 'var(--text-main)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !texto.trim()}
                  className="btn btn-p"
                  style={{ height: 38, opacity: sending || !texto.trim() ? 0.5 : 1 }}
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

function MsgBubble({ msg }: { msg: MessageRow }) {
  const isAdmin = msg.sender_type === 'admin';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '78%',
        background: isAdmin ? 'var(--primary-light)' : '#f1f5f9',
        border: `1px solid ${isAdmin ? 'var(--border-strong)' : '#e2e8f0'}`,
        borderRadius: 'var(--r)', padding: '9px 13px',
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>
          {isAdmin ? (msg.sender_name || 'Você') : (msg.sender_name || 'Clínica')}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-main)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {msg.body}
        </p>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{formatDateTime(msg.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default Atendimento;
