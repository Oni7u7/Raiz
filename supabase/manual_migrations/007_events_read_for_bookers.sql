-- Fix: un participante con booking en un evento perdía acceso de lectura a
-- ese evento en cuanto el anfitrión lo pasaba a 'finalizado' (o cualquier
-- status distinto de 'publicado'), porque la policy original solo dejaba
-- pasar eventos publicados o al propio anfitrión. El join `bookings ->
-- events(*)` volvía null por RLS, y el frontend lo interpretaba como
-- "Evento eliminado" aunque el evento siguiera existiendo.
--
-- Se amplía para dejar leer también a cualquier participante que tenga un
-- booking asociado a ese evento, sin importar su status.
drop policy if exists "events: lectura pública si publicado" on events;

create policy "events: lectura pública si publicado" on events
  for select using (
    status = 'publicado'
    or auth.uid() = host_id
    or exists (
      select 1 from bookings
      where bookings.event_id = events.id
        and bookings.participant_id = auth.uid()
    )
  );
