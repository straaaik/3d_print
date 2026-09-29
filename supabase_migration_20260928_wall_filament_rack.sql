-- Supabase Dashboard → SQL Editor, after the workshop base/spatial migrations.
-- Existing rows, slot IDs, inventory links and revision checks are preserved.
begin;
alter table public.workshop_furniture drop constraint if exists workshop_furniture_kind_check;
alter table public.workshop_furniture add constraint workshop_furniture_kind_check
  check (kind in ('table','printer_rack','filament_rack','wall_filament_rack','plant','boxes','cabinet'));
commit;
