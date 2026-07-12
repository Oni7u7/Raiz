-- Fix urgente: 007_events_read_for_bookers.sql dejó la policy de SELECT en
-- events con recursión infinita.
--
-- Causa: la policy de events consulta bookings (para saber si el usuario
-- tiene un booking en ese evento), y la policy de SELECT ya existente en
-- bookings ("bookings: el anfitrion ve las de sus eventos") a su vez
-- consulta events (para saber si el usuario es host del evento del
-- booking). Cada subquery contra una tabla con RLS dispara las policies de
-- esa tabla, así que events -> bookings -> events -> ... nunca termina.
--
-- Fix: mover el exists a una función security definer. Una función security
-- definer corre con los privilegios de su dueño, no del usuario que llama —
-- su consulta interna a bookings NO vuelve a evaluar las policies de
-- bookings, así que el ciclo se rompe ahí. set search_path = public sigue
-- el mismo patrón que las demás funciones security definer del proyecto
-- (handle_new_user, handle_booking_capacity, promote_waitlisted_booking).
create or replace function public.has_booking_for_event(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from bookings
    where bookings.event_id = p_event_id
      and bookings.participant_id = auth.uid()
  );
$$;

-- No hace falta revertir 007 primero: esto reemplaza la misma policy
-- (mismo nombre) que dejó 007, con el exists directo cambiado por la
-- llamada a la función. Corriendo solo este archivo ya arregla la
-- recursión.
drop policy if exists "events: lectura pública si publicado" on events;

create policy "events: lectura pública si publicado" on events
  for select using (
    status = 'publicado'
    or auth.uid() = host_id
    or public.has_booking_for_event(events.id)
  );
