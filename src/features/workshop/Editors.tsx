'use client';
import { useState } from 'react';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { type Furniture, type Room } from './model';

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
  min,
  max,
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className={`block space-y-1.5 text-xs ${disabled ? 'text-neutral-500' : 'text-neutral-400'}`}>
      {label}
      <input
        required
        aria-label={label}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
        maxLength={80}
        className={`w-full rounded-lg border bg-neutral-950 px-3 py-2 text-sm text-white outline-none transition-colors ${
          disabled ? 'border-white/5 opacity-50 cursor-not-allowed' : 'border-white/15 focus:border-white/40'
        }`}
      />
    </label>
  );
}

export function RoomEditor({ room, onSave, onDelete }: { room: Room; onSave: (room: Room) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(room);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <h2 className="text-base font-semibold">Параметры комнаты</h2>
      <Field label="Название комнаты" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <div className="grid grid-cols-2 gap-3">
        {(['width', 'depth'] as const).map((key, i) => (
          <Field
            key={key}
            label={i ? 'Глубина, м' : 'Ширина, м'}
            type="number"
            min={2}
            max={40}
            step={0.25}
            value={draft[key]}
            onChange={(v) => setDraft({ ...draft, [key]: Number(v) })}
          />
        ))}
      </div>
      <CockpitButton type="submit" size="md">
        Применить комнату
      </CockpitButton>
      <p className="text-xs leading-relaxed text-neutral-500">
        Размеры комнаты ограничивают размещение мебели. Удаление освобождает оборудование, сохраняя записи в справочниках.
      </p>
      <CockpitButton onClick={onDelete}>Удалить комнату</CockpitButton>
    </form>
  );
}

export function FurnitureEditor({
  furniture,
  onSave,
  onDelete,
}: {
  furniture: Furniture;
  onSave: (f: Furniture) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(furniture);
  const isLengthOnly = ['table', 'printer_rack', 'filament_rack'].includes(draft.kind);
  const fields = [
    ['width', isLengthOnly ? 'Длина, м' : 'Ширина, м'],
    ['depth', isLengthOnly ? 'Ширина профиля, м (фикс.)' : 'Глубина, м'],
    ['height', 'Высота, м'],
    ['columns', 'Слотов на уровне'],
    ['levels', 'Уровней'],
    ['x', 'X, м'],
    ['z', 'Z, м'],
  ] as const;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const depth = isLengthOnly ? furniture.depth : draft.depth;
        onSave({ ...draft, depth });
      }}
    >
      <h2 className="text-base font-semibold">Параметры мебели</h2>
      <Field label="Название мебели" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <div className="grid grid-cols-2 gap-3">
        {fields
          .filter(([key]) => key !== 'levels' || draft.kind !== 'table')
          .map(([key, label]) => (
            <Field
              key={key}
              label={label}
              type="number"
              disabled={key === 'depth' && isLengthOnly}
              step={key === 'levels' || key === 'columns' ? 1 : 0.05}
              value={draft[key]}
              onChange={(v) => setDraft({ ...draft, [key]: Number(v) })}
            />
          ))}
      </div>
      {isLengthOnly && (
        <p className="text-[11px] text-amber-400/90 font-mono">
          ⓘ Столы и стеллажи имеют фиксированную ширину профиля ({draft.depth} м) и изменяются только в длину.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <CockpitButton
          onClick={() => {
            const next = { ...draft, rotation: (draft.rotation + 90) % 360 };
            setDraft(next);
          }}
        >
          Поворот {draft.rotation}° →
        </CockpitButton>
        <CockpitButton type="submit">Применить мебель</CockpitButton>
      </div>
      <p className="text-xs text-neutral-500">
        Перетаскивайте мебель по полу. Синий контур — допустимое положение, красный — пересечение или граница.
      </p>
      <CockpitButton onClick={onDelete}>Удалить мебель</CockpitButton>
    </form>
  );
}
