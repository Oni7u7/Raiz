-- Rate limiting para los chatbots de IA (participante + anfitrión).
-- No hay tabla de historial de mensajes: el historial vive en memoria del
-- frontend. Esta tabla solo cuenta mensajes por usuario/día para poder
-- aplicar el límite server-side (un contador en el frontend es evadible
-- con solo recargar la página).

create table chat_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  usage_date date not null default current_date,
  message_count int not null default 0,
  primary key (user_id, usage_date)
);

alter table chat_usage enable row level security;

create policy "chat_usage: propio" on chat_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
