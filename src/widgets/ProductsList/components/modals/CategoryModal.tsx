import React, { useState } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Folder, Tag, Plus } from 'lucide-react';

interface CategoryModalProps {
  item: SavedCalculation | null;
  categoryOptions: SelectOption[];
  onClose: () => void;
  onSave: (item: SavedCalculation, category: string, tags: string[]) => Promise<void>;
  onCreateCategory: (name: string, icon?: string) => void;
}

export function CategoryModal({
  item,
  ...props
}: CategoryModalProps) {
  if (!item) return null;

  return <CategoryModalForm key={item.id} item={item} {...props} />;
}

function CategoryModalForm({
  item,
  categoryOptions,
  onClose,
  onSave,
  onCreateCategory,
}: CategoryModalProps & { item: SavedCalculation }) {
  const [category, setCategory] = useState(() => item.category || 'Разное');
  const [tagsInput, setTagsInput] = useState(() => item.tags?.join(', ') || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectCategory = (val: string) => {
    if (val === '__new__') {
      setIsCreatingNew(true);
    } else {
      setCategory(val);
    }
  };

  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) return;
    onCreateCategory(newCatName.trim(), 'tag');
    setCategory(newCatName.trim());
    setIsCreatingNew(false);
    setNewCatName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t: string) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await onSave(item, category, parsedTags);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title="Категория и метки"
      subtitle={item.name}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="submit"
            disabled={isSaving}
            isActive={true}
            onClick={handleSubmit}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </CockpitButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 font-mono text-xs">
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10 space-y-2">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Folder size={13} className="text-cyan-400" />
              Категория товара
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer font-mono"
            >
              <Plus size={11} /> {isCreatingNew ? '[ Выбрать из списка ]' : '[ Создать новую ]'}
            </button>
          </label>

          {isCreatingNew ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Название новой категории"
                value={newCatName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCatName(e.target.value)}
                autoFocus
              />
              <CockpitButton
                type="button"
                onClick={handleCreateNewCategory}
                disabled={!newCatName.trim()}
                isActive={true}
                className="shrink-0 border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
              >
                Создать
              </CockpitButton>
            </div>
          ) : (
            <Select
              options={categoryOptions}
              value={category}
              onChange={handleSelectCategory}
            />
          )}
        </div>

        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10 space-y-2">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tag size={13} className="text-amber-400" />
            Теги (через запятую)
          </label>
          <Input
            placeholder="например: PLA, Срочно, Популярное, Авито"
            value={tagsInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
