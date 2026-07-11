-- ============================================================
-- alaraiz.mx — integración de la app (auth + bookings + dashboards)
-- Correr manualmente en el SQL Editor de Supabase, DESPUÉS del
-- schema base (profiles/hosts/participants/.../reviews + RLS).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Alta de perfil al registrarse (trigger en auth.users)
--
-- El frontend manda todo el detalle del registro como metadata en
-- supabase.auth.signUp({ options: { data: { role, full_name, phone,
-- business_name, bio, emergency_contact_name, emergency_contact_phone } } }).
-- Este trigger corre server-side apenas se crea la fila en auth.users
-- (antes de que el usuario confirme su correo), así que la creación
-- de profiles/hosts/participants no depende de que el cliente vuelva
-- a ejecutar código después de confirmar el email.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  v_role := (new.raw_user_meta_data->>'role')::user_role;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  );

  if v_role = 'anfitrion' then
    insert into public.hosts (id, business_name, bio)
    values (
      new.id,
      new.raw_user_meta_data->>'business_name',
      new.raw_user_meta_data->>'bio'
    );
  else
    insert into public.participants (id, emergency_contact_name, emergency_contact_phone)
    values (
      new.id,
      new.raw_user_meta_data->>'emergency_contact_name',
      new.raw_user_meta_data->>'emergency_contact_phone'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. hosts: lectura pública
--
-- Necesario para mostrar business_name/bio en el listado público
-- de eventos (quién organiza cada evento).
-- ------------------------------------------------------------
create policy "hosts: lectura pública" on hosts
  for select using (true);

-- ------------------------------------------------------------
-- 3. Visibilidad acotada del anfitrión sobre sus asistentes
--
-- El anfitrión puede ver el profile/participant/restricciones de
-- alguien SOLO si esa persona tiene un booking activo
-- (pendiente/confirmado/asistio) en uno de los eventos del anfitrión.
-- Bookings cancelados o no_asistio no otorgan visibilidad.
-- ------------------------------------------------------------
create policy "profiles: anfitrion ve las de sus asistentes" on profiles
  for select using (
    exists (
      select 1 from bookings
      where bookings.participant_id = profiles.id
        and bookings.status in ('pendiente', 'confirmado', 'asistio')
        and bookings.event_id in (
          select id from events where host_id = auth.uid()
        )
    )
  );

create policy "participants: anfitrion ve las de sus asistentes" on participants
  for select using (
    exists (
      select 1 from bookings
      where bookings.participant_id = participants.id
        and bookings.status in ('pendiente', 'confirmado', 'asistio')
        and bookings.event_id in (
          select id from events where host_id = auth.uid()
        )
    )
  );

create policy "participant_restrictions: anfitrion ve las de sus asistentes" on participant_restrictions
  for select using (
    exists (
      select 1 from bookings
      where bookings.participant_id = participant_restrictions.participant_id
        and bookings.status in ('pendiente', 'confirmado', 'asistio')
        and bookings.event_id in (
          select id from events where host_id = auth.uid()
        )
    )
  );

-- ------------------------------------------------------------
-- 4. bookings: UPDATE
--
-- El anfitrión puede actualizar (confirmar/cancelar/marcar
-- asistencia) los bookings de sus propios eventos, a cualquier
-- status. El participante solo puede cancelar el suyo: el with
-- check exige status = 'cancelado', así que no puede auto-
-- confirmarse ni marcarse como asistió.
-- ------------------------------------------------------------
create policy "bookings: el anfitrion actualiza las de sus eventos" on bookings
  for update
  using (event_id in (select id from events where host_id = auth.uid()))
  with check (event_id in (select id from events where host_id = auth.uid()));

create policy "bookings: el participante cancela la suya" on bookings
  for update
  using (auth.uid() = participant_id)
  with check (auth.uid() = participant_id and status = 'cancelado');
