-- Coordenadas del lugar del evento, capturadas por el autocompletado de
-- Google Places en el formulario del anfitrión. Nullable: eventos ya
-- existentes (o creados sin elegir una sugerencia) quedan sin coordenadas.
alter table events
  add column latitude numeric,
  add column longitude numeric;
