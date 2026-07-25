-- Fase 2 do chat de suporte: dispara a Edge Function on-support-message a cada mensagem
-- inserida, via pg_net (HTTP assíncrono). A function decide internamente (com base no
-- unread_admin já atualizado pelo trigger de negócio) se deve notificar ou não —
-- coalescing/lógica ficam no Deno, o trigger aqui só entrega o evento.
--
-- Autenticação: a função tem verify_jwt=true; o trigger envia a anon key pública do projeto
-- (mesma usada pelo frontend, não é secreta) como Bearer token — suficiente para passar o
-- gateway. Não há segredo compartilhado adicional: o pior cenário de abuso é alguém forçar
-- uma notificação para uma conversa que já está genuinamente com unread_admin=1 (dado real,
-- não forjável pelo chamador) — sem risco de leitura/escrita indevida de dados.
create extension if not exists pg_net;

create or replace function public.notify_support_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://vbyogqenwggwtrlokkhg.supabase.co/functions/v1/on-support-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieW9ncWVud2dnd3RybG9ra2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTk2ODAsImV4cCI6MjA5NjA3NTY4MH0.zeR3WQza4esS4vOefGJ15VBTeVBFRcMse8fyVMz0VPU'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'support_messages',
      'schema', 'public',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_support_message on public.support_messages;

create trigger trg_notify_support_message
  after insert on public.support_messages
  for each row execute function public.notify_support_message();
