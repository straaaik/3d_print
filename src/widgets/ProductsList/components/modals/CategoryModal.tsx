import React, { useState } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { SelectOption } from '../../../../shared/ui/Select';
import { ModalDropdown } from '../../../../shared/ui/ModalDropdown';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';

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
          <CockpitButton
            type="submit"
            disabled={isSaving}
            form="category-form"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </CockpitButton>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">Категория</span>
            <CockpitButton onClick={() => setIsCreatingNew(!isCreatingNew)}>
              {isCreatingNew ? 'Выбрать из списка' : 'Создать категорию'}
            </CockpitButton>
          </div>
          {isCreatingNew ? (
            <div className="flex items-center gap-2">
              <Input aria-label="Название новой категории" placeholder="Название категории" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} autoFocus />
              <CockpitButton onClick={handleCreateNewCategory} disabled={!newCatName.trim()} className="shrink-0">Создать</CockpitButton>
            </div>
          ) : (
            <ModalDropdown ariaLabel="Категория товара" options={categoryOptions} value={category} onChange={handleSelectCategory} usePortal />
          )}
        </div>
        <Input label="Метки" aria-label="Метки товара" placeholder="Например, декор, подарок" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} hint="Необязательно. Разделяйте метки запятыми." />
      </form>
    </Modal>
  );
}
