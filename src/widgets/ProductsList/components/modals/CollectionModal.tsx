import React, { useState, useEffect, useMemo } from 'react';
import { ProductCollection, SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { Button } from '../../../../shared/ui/Button';
import { Checkbox } from '../../../../shared/ui/Checkbox';
import { Folder, Tag, FolderPlus, Search, X, Check, FileText } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      if (editingCollection) {
        setName(editingCollection.name || '');
        setCategory(editingCollection.category || 'Разное');
        setTagsInput(editingCollection.tags ? editingCollection.tags.join(', ') : '');
        setDescription(editingCollection.description || '');
        const existingIds = savedCalculations
          .filter((c) => c.collection_id === editingCollection.id)
          .map((c) => c.id);
        setSelectedProductIds(existingIds);
      } else {
        setName('');
        setCategory('Разное');
        setTagsInput('');
        setDescription('');
        setSelectedProductIds([]);
      }
      setProductSearch('');
    }
  }, [isOpen, editingCollection, savedCalculations]);

  // Фильтрация списка товаров для выбора
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

  // Статистика по выбранным товарам
  const selectedProducts = useMemo(() => {
    return savedCalculations.filter((p) => selectedProductIds.includes(p.id));
  }, [savedCalculations, selectedProductIds]);

  const prices = selectedProducts.map((p) => p.final_price || 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const totalPotential = prices.reduce((a, b) => a + b, 0);

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
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <FolderPlus size={18} />
          </div>
          <div>
            <span className="text-white font-bold">
              {editingCollection ? `Параметры коллекции: «${editingCollection.name}»` : 'Создание новой коллекции'}
            </span>
            <div className="text-[11px] text-gray-400 font-normal">
              Группировка товаров и вариантов (размеры, цвета, модификации) под единым брендом
            </div>
          </div>
        </div>
      }
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full flex-wrap">
          {/* Сводка по выбранным товарам */}
          <div className="flex items-center gap-3 font-mono text-xs text-gray-400">
            <div>
              Выбрано: <strong className="text-purple-300 font-bold">{selectedProductIds.length}</strong> поз.
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
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="border-[#242930] text-gray-300">
              Отмена
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim()}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold px-4 py-2 rounded-xl shadow-md shadow-purple-500/25 cursor-pointer"
            >
              {isSaving ? 'Сохранение...' : editingCollection ? 'Сохранить изменения' : 'Создать коллекцию'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 select-none">
        {/* Название коллекции */}
        <div className="bg-[#161224] p-3 rounded-2xl border border-purple-500/30 shadow-inner">
          <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-1.5">
            Название коллекции *
          </label>
          <input
            type="text"
            placeholder="например: Модули мастерской Gridfinity или Шарнирные драконы"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#0d0a17] border border-[#242930] hover:border-purple-500/50 focus:border-purple-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-medium"
          />
        </div>

        {/* Категория и Теги */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#12141c] p-3 rounded-2xl border border-[#242930]">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Folder size={14} className="text-purple-400" />
              Категория коллекции
            </label>
            <Select
              options={categoryOptions.filter((o) => o.value !== '__new__')}
              value={category}
              onChange={(val: string) => setCategory(val)}
            />
          </div>

          <div className="bg-[#12141c] p-3 rounded-2xl border border-[#242930]">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag size={14} className="text-purple-400" />
              Теги (через запятую)
            </label>
            <input
              type="text"
              placeholder="напр. дракон, игрушка, 100%"
              value={tagsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#242930] hover:border-purple-500/40 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Описание */}
        <div className="bg-[#12141c] p-3 rounded-2xl border border-[#242930]">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText size={14} className="text-purple-400" />
            Описание коллекции (необязательно)
          </label>
          <input
            type="text"
            placeholder="Краткое примечание или пояснение по линейке моделей"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            className="w-full bg-[#0d0e14] border border-[#242930] hover:border-purple-500/40 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Секция включения товаров */}
        <div className="bg-[#13111f] border border-[#242930] rounded-2xl overflow-hidden">
          {/* Плашка шапки выбора товаров */}
          <div className="p-3 bg-gradient-to-r from-purple-500/20 via-[#19152b] to-[#100d1c] border-b border-[#242930] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-300 uppercase tracking-wider text-xs">
                Включить товары в коллекцию ({selectedProductIds.length})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                Из {savedCalculations.length} доступных
              </span>
            </div>

            {filteredProducts.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-purple-400 hover:text-purple-300 text-xs font-semibold cursor-pointer underline"
              >
                Выбрать все видимые ({filteredProducts.length})
              </button>
            )}
          </div>

          <div className="p-3 space-y-2.5">
            {/* Поиск по списку товаров */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Фильтр по названию или ID товара..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-[#0a0812] border border-[#242930] hover:border-purple-500/30 focus:border-purple-400 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Список товаров */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4 bg-[#0a0812] rounded-xl border border-dashed border-[#242930]">
                  Товары не найдены
                </p>
              ) : (
                filteredProducts.map((prod) => {
                  const isChecked = selectedProductIds.includes(prod.id);
                  const isOtherCollection = Boolean(prod.collection_id && prod.collection_id !== editingCollection?.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleProduct(prod.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-purple-500/20 border-purple-500/60 text-white font-medium shadow-sm'
                          : 'bg-[#0d0b14] border-[#242930] text-gray-400 hover:text-white hover:bg-[#151221]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleProduct(prod.id)}
                            variant="purple"
                            size="sm"
                          />
                        </div>

                        {prod.filament_color && (
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-black/40 shrink-0"
                            style={{ backgroundColor: prod.filament_color }}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className={`truncate block font-semibold ${isChecked ? 'text-purple-100' : 'text-gray-300'}`}>
                            {prod.name}
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                            <span>#{prod.id ? (prod.id.length > 6 ? prod.id.slice(0, 6) : prod.id) : ''}</span>
                            <span>•</span>
                            <span>{prod.filament_name || 'PLA'}</span>
                            <span>•</span>
                            <span>{prod.weight_g}г</span>
                            {isOtherCollection && (
                              <span className="text-amber-400 ml-1 font-sans">(в другой коллекции)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-purple-300 font-bold text-xs shrink-0 ml-3">
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
