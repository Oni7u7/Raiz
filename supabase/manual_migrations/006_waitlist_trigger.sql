-- Correr DESPUÉS de que 005_waitlist_enum.sql haya terminado (aunque sea en
-- otra ejecución del SQL Editor) — ver la nota en ese archivo.

-- ------------------------------------------------------------
-- Al crear un booking, si el evento ya alcanzó su capacidad (contando
-- pendiente + confirmado + asistio), se crea en 'en_espera' en vez de
-- 'pendiente'. security definer es necesario: sin esto, el conteo
-- correría con el RLS del participante que reserva, que normalmente solo
-- puede ver sus propios bookings — el conteo real necesita ver los de
-- todos los participantes de ese evento.
-- ------------------------------------------------------------
create or replace function public.handle_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_active_count integer;
begin
  if new.status = 'pendiente' then
    select capacity into v_capacity from events where id = new.event_id;

    if v_capacity is not null then
      select count(*) into v_active_count
      from bookings
      where event_id = new.event_id
        and status in ('pendiente', 'confirmado', 'asistio');

      if v_active_count >= v_capacity then
        new.status := 'en_espera';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists before_booking_insert_capacity on bookings;
create trigger before_booking_insert_capacity
  before insert on bookings
  for each row execute procedure public.handle_booking_capacity();

-- ------------------------------------------------------------
-- Al cancelar un booking, promueve automáticamente al más antiguo en
-- 'en_espera' del mismo evento a 'pendiente' (no 'confirmado' — mantiene
-- el mismo paso de revisión manual que ya existe para cualquier reserva
-- nueva). `for update skip locked` evita que dos cancelaciones casi
-- simultáneas promuevan el mismo booking dos veces: si dos transacciones
-- corren esto a la vez, la segunda salta el registro bloqueado por la
-- primera y promueve al siguiente en la fila (comportamiento correcto,
-- no un workaround).
--
-- Nota sobre recursión: el `update` interno de este trigger vuelve a
-- disparar el mismo trigger (Postgres no distingue "vengo de un trigger"),
-- pero esa segunda ejecución tiene new.status = 'pendiente', así que el
-- `if` es falso y no hace nada — se auto-frena, no hay loop infinito.
-- ------------------------------------------------------------
create or replace function public.promote_waitlisted_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_id uuid;
begin
  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    select id into v_next_id
    from bookings
    where event_id = new.event_id
      and status = 'en_espera'
    order by created_at asc
    limit 1
    for update skip locked;

    if v_next_id is not null then
      update bookings set status = 'pendiente' where id = v_next_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists after_booking_cancel_promote on bookings;
create trigger after_booking_cancel_promote
  after update of status on bookings
  for each row execute procedure public.promote_waitlisted_booking();
