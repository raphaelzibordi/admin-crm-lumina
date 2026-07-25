-- =================================================================
-- Fase 0 — Chat de suporte cliente (clínica) <-> admin Lumina
-- Ver docs/PLANO_CHAT_SUPORTE.md no repo crm-estetica.
--
-- Modelo: conversa única por clínica (D1), acessível por dono + equipe (D2)
-- via get_tenant_id() (já existe no schema do CRM). Admin (admin_members)
-- enxerga e responde todas as conversas.
-- =================================================================

-- -----------------------------------------------------------------
-- 0. is_admin_member() já existe no projeto (migration
--    admin_security_is_admin_member, 20260717222912) e é usada pelas
--    RLS de admin_members, faturas_abacatepay e feature_flags. Ela
--    NÃO compara por id = auth.uid() (admin_members.id não referencia
--    auth.users) — compara por e-mail do JWT + status ativo. Esta
--    migration só reutiliza a função existente; não recriar aqui.
-- -----------------------------------------------------------------

-- -----------------------------------------------------------------
-- 1. Conversa (1 por clínica)
-- -----------------------------------------------------------------
create table if not exists public.support_conversations (
  id                    uuid primary key default gen_random_uuid(),
  clinica_id            uuid not null references public.usuarios(id) on delete cascade,
  status                text not null default 'aberta'
                          check (status in ('aberta','pendente_admin','pendente_cliente','resolvida')),
  last_message_at       timestamptz,
  last_message_preview  text,
  last_sender_type      text check (last_sender_type in ('clinica','admin')),
  unread_admin          integer not null default 0,
  unread_clinica        integer not null default 0,
  -- Denormalizado a partir de usuarios: a RLS de `usuarios` (id = get_tenant_id()) não dá
  -- acesso de leitura ao admin, então um embed `usuarios:clinica_id(...)` no painel admin
  -- falharia silenciosamente. Preenchido por get_or_create_support_conversation() (security
  -- definer, lê usuarios sem depender da RLS do caller).
  clinica_nome          text,
  clinica_email         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (clinica_id)
);

create index if not exists idx_supconv_clinica     on public.support_conversations(clinica_id);
create index if not exists idx_supconv_lastmsg      on public.support_conversations(last_message_at desc);
create index if not exists idx_supconv_unread_admin on public.support_conversations(unread_admin) where unread_admin > 0;

-- -----------------------------------------------------------------
-- 2. Mensagens
-- -----------------------------------------------------------------
create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.support_conversations(id) on delete cascade,
  clinica_id       uuid not null references public.usuarios(id) on delete cascade,
  sender_type      text not null check (sender_type in ('clinica','admin')),
  sender_id        uuid not null references auth.users(id),
  sender_name      text,
  body             text not null check (char_length(body) between 1 and 5000),
  attachment_url   text,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_supmsg_conv    on public.support_messages(conversation_id, created_at);
create index if not exists idx_supmsg_clinica on public.support_messages(clinica_id, created_at);

-- -----------------------------------------------------------------
-- 3. Assinaturas de Web Push (usadas a partir da Fase 3, criadas já
--    agora para não precisar de outra migration de schema depois).
-- -----------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  scope       text not null default 'clinica' check (scope in ('clinica','admin')),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_user on public.push_subscriptions(user_id);

-- -----------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------
alter table public.support_conversations enable row level security;
alter table public.support_messages      enable row level security;
alter table public.push_subscriptions    enable row level security;

drop policy if exists "clinica le sua conversa"    on public.support_conversations;
drop policy if exists "clinica cria sua conversa"  on public.support_conversations;
drop policy if exists "admin gerencia conversas"   on public.support_conversations;

create policy "clinica le sua conversa" on public.support_conversations
  for select using (clinica_id = public.get_tenant_id() or public.is_admin_member());

create policy "clinica cria sua conversa" on public.support_conversations
  for insert with check (clinica_id = public.get_tenant_id());

create policy "admin gerencia conversas" on public.support_conversations
  for all using (public.is_admin_member()) with check (public.is_admin_member());

drop policy if exists "clinica le mensagens da clinica" on public.support_messages;
drop policy if exists "clinica envia como clinica"      on public.support_messages;
drop policy if exists "admin envia como admin"          on public.support_messages;
drop policy if exists "admin le mensagens"              on public.support_messages;

create policy "clinica le mensagens da clinica" on public.support_messages
  for select using (clinica_id = public.get_tenant_id() or public.is_admin_member());

create policy "clinica envia como clinica" on public.support_messages
  for insert with check (
    clinica_id = public.get_tenant_id() and sender_type = 'clinica' and sender_id = auth.uid()
  );

create policy "admin envia como admin" on public.support_messages
  for insert with check (
    public.is_admin_member() and sender_type = 'admin' and sender_id = auth.uid()
  );

drop policy if exists "user gerencia push" on public.push_subscriptions;

create policy "user gerencia push" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- 5. Trigger: mantém preview, status e contadores de não-lidas
--    sincronizados a cada mensagem inserida.
-- -----------------------------------------------------------------
create or replace function public.on_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_conversations c
     set last_message_at      = new.created_at,
         last_message_preview = left(new.body, 120),
         last_sender_type     = new.sender_type,
         updated_at           = now(),
         status               = case when new.sender_type = 'clinica' then 'pendente_admin'
                                      else 'pendente_cliente' end,
         unread_admin   = c.unread_admin   + (case when new.sender_type = 'clinica' then 1 else 0 end),
         unread_clinica = c.unread_clinica + (case when new.sender_type = 'admin'   then 1 else 0 end)
   where c.id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_support_message_insert on public.support_messages;

create trigger trg_support_message_insert
  after insert on public.support_messages
  for each row execute function public.on_support_message_insert();

-- -----------------------------------------------------------------
-- 6. RPCs
-- -----------------------------------------------------------------

-- Garante a conversa da clínica logada (cria na 1ª vez) e devolve o id.
-- security definer + clinica_id resolvido via get_tenant_id(): o client
-- nunca escolhe o clinica_id.
create or replace function public.get_or_create_support_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.get_tenant_id();
  v_conv   uuid;
  v_nome   text;
  v_email  text;
begin
  select id into v_conv from public.support_conversations where clinica_id = v_tenant;
  if v_conv is null then
    select nome_clinica, email into v_nome, v_email from public.usuarios where id = v_tenant;
    insert into public.support_conversations (clinica_id, clinica_nome, clinica_email)
      values (v_tenant, v_nome, v_email)
      on conflict (clinica_id) do update set updated_at = now()
      returning id into v_conv;
  end if;
  return v_conv;
end;
$$;

-- Zera não-lidas e marca mensagens como lidas para o lado que chamou.
create or replace function public.mark_support_read(p_conversation uuid, p_side text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_side = 'admin' and public.is_admin_member() then
    update public.support_conversations set unread_admin = 0 where id = p_conversation;
    update public.support_messages set read_at = now()
      where conversation_id = p_conversation and sender_type = 'clinica' and read_at is null;
  elsif p_side = 'clinica' then
    update public.support_conversations set unread_clinica = 0
      where id = p_conversation and clinica_id = public.get_tenant_id();
    update public.support_messages set read_at = now()
      where conversation_id = p_conversation and sender_type = 'admin' and read_at is null
        and clinica_id = public.get_tenant_id();
  end if;
end;
$$;

-- -----------------------------------------------------------------
-- 7. Realtime
-- -----------------------------------------------------------------
alter publication supabase_realtime add table public.support_conversations;
alter publication supabase_realtime add table public.support_messages;

-- -----------------------------------------------------------------
-- 8. Trava de permissões: por padrão o Supabase concede EXECUTE a
--    anon/authenticated diretamente (não só via PUBLIC) em funções
--    novas do schema public. Sem isso, um usuário anônimo conseguiria
--    chamar as RPCs, e a função de trigger ficaria exposta como RPC
--    pública (nunca deveria ser chamável diretamente).
-- -----------------------------------------------------------------
revoke execute on function public.on_support_message_insert() from public, anon, authenticated;

revoke execute on function public.get_or_create_support_conversation() from public, anon;
grant  execute on function public.get_or_create_support_conversation() to authenticated;

revoke execute on function public.mark_support_read(uuid, text) from public, anon;
grant  execute on function public.mark_support_read(uuid, text) to authenticated;
