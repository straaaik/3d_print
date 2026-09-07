import React, { useMemo, useState } from 'react';
import { ProductCollection, SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Checkbox } from '../../../../shared/ui/Checkbox';
import { Folder, Tag, Search, X, FileText } from 'lucide-react';
import { formatCurrency } from '../../../../shared/lib/format';

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

  const selectedProducts = useMemo(() => {
    return savedCalculations.filter((p) => selectedProductIds.includes(p.id));
  }, [savedCalculations, selectedProductIds]);

  const prices = selectedProducts.map((p) => p.final_price || 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

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
      subtitle={editingCollection ? editingCollection.name : 'Группа товаров'}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full flex-wrap font-mono text-xs">
          <div className="flex items-center gap-3 font-mono text-xs text-neutral-400">
            <div>
              Выбрано: <strong className="text-white font-bold">{selectedProductIds.length}</strong> поз.
            </div>
            {selectedProductIds.length > 0 && (
              <div>
                Цены:{' '}
                <strong className="text-white">
                  {minPrice === maxPrice
                    ? formatCurrency(minPrice, currencySymbol)
                    : `${formatCurrency(minPrice, currencySymbol)} – ${formatCurrency(maxPrice, currencySymbol)}`}
                </strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
              Закрыть
            </CockpitButton>
            <CockpitButton
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim()}
              isActive={true}
              className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
            >
              {isSaving ? 'Сохранение...' : editingCollection ? 'Сохранить изменения' : 'Создать коллекцию'}
            </CockpitButton>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 select-none font-mono text-xs">
        {/* Название коллекции */}
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Название коллекции *
          </label>
          <input
            type="text"
            placeholder="например: Модули мастерской Gridfinity или Шарнирные драконы"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none font-mono"
          />
        </div>

        {/* Категория и Теги */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Folder size={13} className="text-cyan-400" />
              Категория коллекции
            </label>
            <Select
              options={categoryOptions.filter((o) => o.value !== '__new__')}
              value={category}
              onChange={(val: string) => setCategory(val)}
            />
          </div>

          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-amber-400" />
              Теги (через запятую)
            </label>
            <input
              type="text"
              placeholder="напр. дракон, игрушка, 100%"
              value={tagsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Описание */}
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText size={13} className="text-neutral-400" />
            Описание коллекции (необязательно)
          </label>
          <input
            type="text"
            placeholder="Краткое примечание или пояснение по линейке моделей"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none font-mono"
          />
        </div>

        {/* Секция включения товаров */}
        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 bg-neutral-950 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-300 uppercase tracking-wider text-xs font-mono">
                Включить товары в коллекцию ({selectedProductIds.length})
              </span>
            </div>

            {filteredProducts.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-mono cursor-pointer"
              >
                [ Выбрать все видимые ({filteredProducts.length}) ]
              </button>
            )}
          </div>

          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Фильтр по названию или ID товара..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 focus:border-cyan-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none font-mono"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-3 bg-neutral-950 rounded-lg">
                  [ Товары не найдены ]
                </p>
              ) : (
                filteredProducts.map((prod) => {
                  const isChecked = selectedProductIds.includes(prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleProduct(prod.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none ${
                        isChecked
                          ? 'bg-white/10 border-white/20 text-white font-medium'
                          : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleProduct(prod.id)}
                            variant="primary"
                            size="sm"
                          />
                        </div>

                        {prod.filament_color && (
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: prod.filament_color }}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className={`truncate block font-mono ${isChecked ? 'text-white font-bold' : 'text-neutral-300'}`}>
                            {prod.name}
                          </span>
                          <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
                            <span>{prod.filament_name || 'PLA'}</span>
                            <span>•</span>
                            <span>{prod.weight_g}г</span>
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-cyan-400 font-bold text-xs shrink-0 ml-3">
                        {formatCurrency(prod.final_price, currencySymbol)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
