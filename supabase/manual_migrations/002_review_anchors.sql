-- ============================================================
-- alaraiz.mx — reseñas verificadas con blockchain (Sepolia)
-- Correr manualmente en el SQL Editor de Supabase, DESPUÉS de
-- 001_alaraiz_app.sql.
-- ============================================================

create type anchor_status as enum ('pendiente', 'confirmado', 'fallido');

-- ------------------------------------------------------------
-- review_anchors — un anclaje por review, escrito únicamente por
-- las Edge Functions (anchor-review / confirm-anchors) usando la
-- service_role key. Nadie más puede insertar/editar esta tabla.
-- ------------------------------------------------------------
create table review_anchors (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade unique,
  content_hash text not null,
  network text not null default 'sepolia',
  tx_hash text,
  status anchor_status not null default 'pendiente',
  block_number bigint,
  error_message text,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table review_anchors enable row level security;

-- Lectura pública: cualquiera puede verificar una reseña recalculando
-- el hash y comparándolo contra content_hash / lo anclado en Sepolia.
create policy "review_anchors: lectura pública" on review_anchors
  for select using (true);

-- Intencional: no se agrega ninguna policy de insert/update/delete
-- para authenticated/anon. Solo la service_role (que bypassa RLS)
-- escribe en esta tabla, desde las Edge Functions.

create index idx_review_anchors_status on review_anchors(status);
