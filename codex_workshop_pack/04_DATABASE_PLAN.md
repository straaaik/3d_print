# План данных для Supabase

Codex обязан сначала сверить этот план с фактической схемой ветки `test`. Если `printers` является каталогом моделей, а не физическими экземплярами, нельзя ставить `UNIQUE(printer_id)` без дополнительного слоя физических `printer_units`.

## Новые сущности

### workshop_rooms
- id uuid PK
- user_id uuid NOT NULL
- name text NOT NULL
- width_m numeric NOT NULL
- depth_m numeric NOT NULL
- sort_order integer DEFAULT 0
- camera_target_x/y/z numeric nullable
- camera_zoom numeric nullable
- created_at / updated_at

### workshop_furniture
- id uuid PK
- user_id uuid NOT NULL
- room_id uuid FK workshop_rooms
- name text
- kind text CHECK in (`table`,`printer_rack`,`filament_rack`)
- position_x/y/z numeric
- rotation_y numeric
- width/depth/height numeric
- levels integer nullable
- metadata jsonb DEFAULT '{}'
- created_at / updated_at

### workshop_slots
- id uuid PK
- user_id uuid NOT NULL
- furniture_id uuid FK workshop_furniture
- slot_kind text CHECK in (`printer`,`filament`)
- slot_index integer
- local_x/y/z numeric
- rotation_y numeric
- UNIQUE(furniture_id, slot_kind, slot_index)

### workshop_printer_placements
- id uuid PK
- user_id uuid NOT NULL
- printer_id uuid FK existing printers or printer_units
- slot_id uuid FK workshop_slots
- visual_model_key text CHECK in (`a1`,`p1`)
- created_at / updated_at

### workshop_filament_placements
- id uuid PK
- user_id uuid NOT NULL
- filament_id uuid FK existing filaments
- slot_id uuid FK workshop_slots
- created_at / updated_at

## Правила

- RLS во всех новых таблицах по существующему паттерну `auth.uid() = user_id`.
- Index на `user_id`, `room_id`, `furniture_id`, `slot_id` и внешние ключи placement.
- Не дублировать `printer.name`, `filament.name`, `color`, `price`, `weight`.
- Migration должна быть отдельным SQL-файлом плюс обновление canonical schema.
- До применения migration — localStorage fallback без crash.
- Удаление room/furniture удаляет placement/slots, но НЕ существующие printers/filaments.
