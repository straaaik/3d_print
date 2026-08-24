import React, { useState, useEffect } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { Button } from '../../../../shared/ui/Button';
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
  categoryOptions,
  onClose,
  onSave,
  onCreateCategory,
}: CategoryModalProps) {
  const [category, setCategory] = useState('Разное');
  const [tagsInput, setTagsInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setCategory(item.category || 'Разное');
      setTagsInput(item.tags ? item.tags.join(', ') : '');
      setIsCreatingNew(false);
      setNewCatName('');
    }
  }, [item]);

  if (!item) return null;

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
      title={`Категория и теги: «${item.name}»`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Folder size={14} className="text-amber-400" />
              Категория товара
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> {isCreatingNew ? 'Выбрать из списка' : 'Создать новую'}
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
              <Button
                type="button"
                size="sm"
                onClick={handleCreateNewCategory}
                disabled={!newCatName.trim()}
                className="bg-amber-500 text-black font-bold shrink-0"
              >
                Создать
              </Button>
            </div>
          ) : (
            <Select
              options={categoryOptions}
              value={category}
              onChange={handleSelectCategory}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Tag size={14} className="text-amber-400" />
            Теги (через запятую)
          </label>
          <Input
            placeholder="например: PLA, Срочно, Популярное, Авито"
            value={tagsInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
