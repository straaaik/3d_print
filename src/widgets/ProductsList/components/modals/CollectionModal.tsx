import React, { useMemo, useState } from 'react';
import { ProductCollection, SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { ModalDropdown } from '../../../../shared/ui/ModalDropdown';
import { SelectOption } from '../../../../shared/ui/Select';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Checkbox } from '../../../../shared/ui/Checkbox';
import { Search } from 'lucide-react';
import { Input } from '../../../../shared/ui/Input';
import { ModalDetails } from '../../../../shared/ui/ModalDetails';
import { formatCurrency } from '../../../../shared/lib/format';
import { ColorPicker } from '../../../../shared/ui/ColorPicker';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCollection: ProductCollection | null;
  categoryOptions: SelectOption[];
  savedCalculations: SavedCalculation[];
  currencySymbol: string;
  onSave: (data: {
    name: string;
    category: string;
    tags: string[];
    description?: string;
    color?: string;
    productIds: string[];
  }) => Promise<void>;
}

export function CollectionModal({
  isOpen,
  onClose,
  editingCollection,
  categoryOptions,
  savedCalculations,
  currencySymbol,
  onSave,
}: CollectionModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Разное');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previousSource, setPreviousSource] = useState({
    isOpen,
    editingCollection,
    savedCalculations,
  });

  if (
    previousSource.isOpen !== isOpen ||
    previousSource.editingCollection !== editingCollection ||
    previousSource.savedCalculations !== savedCalculations
  ) {
    setPreviousSource({ isOpen, editingCollection, savedCalculations });
    if (isOpen) {
      if (editingCollection) {
        setName(editingCollection.name || '');
        setCategory(editingCollection.category || 'Разное');
        setTagsInput(editingCollection.tags?.join(', ') || '');
        setDescription(editingCollection.description || '');
        setColor(editingCollection.color || '#3b82f6');
        setSelectedProductIds(
          savedCalculations
            .filter((calculation) => calculation.collection_id === editingCollection.id)
            .map((calculation) => calculation.id)
        );
      } else {
        setName('');
        setCategory('Разное');
        setTagsInput('');
        setDescription('');
        setColor('#3b82f6');
        setSelectedProductIds([]);
      }
      setProductSearch('');
    }
  }

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return savedCalculations;
    const query = productSearch.toLowerCase();
    return savedCalculations.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.id && p.id.toLowerCase().includes(query)) ||
        (p.filament_name && p.filament_name.toLowerCase().includes(query))
    );
  }, [savedCalculations, productSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t: string) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await onSave({
        name: name.trim(),
        category,
        tags: parsedTags,
        description: description.trim() || undefined,
        color,
        productIds: selectedProductIds,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCollection ? 'Редактирование коллекции' : 'Новая коллекция'}
      subtitle="Группа товаров"
      maxWidth="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-neutral-500">Товаров: {selectedProductIds.length}</span>
          <CockpitButton type="submit" form="collection-form" disabled={isSaving || !name.trim()}>
            {isSaving ? 'Сохранение...' : editingCollection ? 'Сохранить' : 'Создать коллекцию'}
          </CockpitButton>
        </div>
      }
    >
      <form id="collection-form" onSubmit={handleSubmit} className="space-y-5">
        <Input label="Название" aria-label="Название коллекции" placeholder="Например, аксессуары для мастерской" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <ModalDropdown
          label="Категория"
          ariaLabel="Категория коллекции"
          options={categoryOptions.filter((o) => o.value !== '__new__').map((o) => ({ value: o.value, label: o.label }))}
          value={category}
          onChange={setCategory}
          usePortal
        />
        <section className="space-y-3" aria-label="Товары коллекции">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-300">Товары в коллекции</span>
            {filteredProducts.length > 0 && (
              <CockpitButton type="button" onClick={handleSelectAllVisible}>
                {filteredProducts.every((p) => selectedProductIds.includes(p.id)) ? 'Снять выбор' : 'Выбрать все'}
              </CockpitButton>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <Input aria-label="Поиск товаров коллекции" placeholder="Найти товар" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-[#26262b]">
            {filteredProducts.length === 0 ? (
              <p className="py-5 text-center text-xs text-neutral-500">Товары не найдены</p>
            ) : filteredProducts.map((prod) => {
              const isChecked = selectedProductIds.includes(prod.id);
              return (
                <div key={prod.id} className="flex items-center gap-3 py-3">
                  <Checkbox checked={isChecked} onChange={() => handleToggleProduct(prod.id)} label={prod.name} variant="neutral" size="sm" />
                  <span className="ml-auto shrink-0 text-[11px] tabular-nums text-neutral-400">{formatCurrency(prod.final_price, currencySymbol)}</span>
                </div>
              );
            })}
          </div>
        </section>
        <ModalDetails title="Дополнительно" summary="Метки, описание и цвет">
          <Input label="Метки" aria-label="Метки коллекции" placeholder="Например, декор, подарок" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} hint="Разделяйте метки запятыми" />
          <Input label="Описание" aria-label="Описание коллекции" placeholder="Короткая заметка о коллекции" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-400">Цвет в каталоге</span>
            <ColorPicker value={color} onChange={setColor} defaultVariant="matrix" align="right" />
          </div>
        </ModalDetails>
      </form>
    </Modal>
  );
}
