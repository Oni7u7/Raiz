-- Nuevo valor del enum booking_status para la lista de espera por cupo.
--
-- IMPORTANTE: correr ESTE archivo solo, y esperar a que termine, antes de
-- correr 006_waitlist_trigger.sql. Postgres no deja usar un valor de enum
-- recién agregado dentro del mismo bloque de transacción en el que se
-- agregó — si se corren juntos en una sola ejecución del SQL Editor,
-- 006 fallará.
alter type booking_status add value if not exists 'en_espera';
