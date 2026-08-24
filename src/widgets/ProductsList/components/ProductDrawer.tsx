import React, { useState, useEffect } from 'react';
import { SavedCalculation, Filament, Printer, Settings } from '../../../shared/types';
import { calculateCost } from '../../../features/calculate-cost/model/calculate';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';
import { SalesStatInfo } from '../types';
import { 
  X, 
  ShoppingCart, 
  Play, 
  Edit2, 
  Trash2, 
  FileCode, 
  ExternalLink, 
  Download, 
  Tag, 
  Flame, 
  TrendingUp, 
  Printer as PrinterIcon, 
  Clock, 
  Wrench, 
  Package, 
  Receipt, 
  DollarSign, 
  Layers, 
  FolderPlus,
  Copy,
  Check,
  Calendar,
  List,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { NumberCounter } from '../../../shared/ui/NumberCounter';
import { motion, AnimatePresence } from 'framer-motion';

export type ProductDrawerTab = 'all' | 'pricing' | 'print' | 'stl' | 'sales';

interface ProductDrawerProps {
  item: SavedCalculation | null;
  onClose: () => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onLoadIntoCalculator: (item: SavedCalculation) => void;
  onOpenQuickEdit: (item: SavedCalculation) => void;
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onOpenStlModal: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;
  salesStat?: SalesStatInfo;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
}

export function ProductDrawer({
  item,
  onClose,
  onSetStock,
  onCreateOrder,
  onLoadIntoCalculator,
  onOpenQuickEdit,
  onOpenMoveProduct,
  onOpenStlModal,
  onDelete,
  salesStat,
  currencySymbol,
  categoriesList,
  filaments,
  printers,
  settings,
}: ProductDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProductDrawerTab>('all');
  const [copiedId, setCopiedId] = useState(false);

  // Сброс вкладки при открытии нового товара
  useEffect(() => {
    if (item) {
      setActiveTab('all');
    }
  }, [item?.id]);

  if (!item) return null;

  const liveFilament = item.filament_id
    ? filaments.find((f) => f.id === item.filament_id)
    : filaments.find((f) => f.name === item.filament_name) || null;

  const livePrinter = item.printer_id
    ? printers.find((p) => p.id === item.printer_id)
    : printers.find((p) => p.name === item.printer_name) || null;

  const breakdown = calculateCost({
    weightG: item.weight_g || 0,
    hours: item.hours || 0,
    minutes: item.minutes || 0,
    laborMinutes: item.labor_minutes || 0,
    laborRatePerHour: item.labor_rate_per_hour,
    markupPercent: item.markup_percent,
    defectPercent: item.defect_percent,
    customCostItems: item.custom_cost_items || [],
    quantity: item.quantity || 1,
    filament: liveFilament || null,
    printer: livePrinter || null,
    settings,
  });

  const profit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
  const marginPercent =
    item.final_price && item.final_price > 0 ? Math.round((profit / item.final_price) * 1000) / 10 : 0;
  const isPositive = profit >= 0;

  const stock = item.stock_quantity || 0;
  const catObj = categoriesList.find((c) => c.label === item.category || c.id === item.category);
  const catLabel = catObj?.label || item.category || 'Разное';
  const CatIcon = getCategoryLucideIcon(catLabel);

  const hasUrl = Boolean(item.stl_url && item.stl_url.trim());
  const hasFile = Boolean(item.stl_file_data);

  const downloadStl = () => {
    if (!item.stl_file_data) return;
    const a = document.createElement('a');
    a.href = item.stl_file_data;
    a.download = item.stl_file_name || `${item.name}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyId = () => {
    if (item.id && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Затемненный фон */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-screen max-w-lg bg-[#12141a] border-l border-[#242930] shadow-2xl flex flex-col justify-between text-xs text-gray-300"
        >
          {/* 1. Шапка Drawer */}
          <div className="p-4 sm:p-5 border-b border-[#242930] bg-[#16181d] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Интерактивный ID бейдж */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={`ID: ${item.id} (Кликните, чтобы скопировать)`}
                >
                  <span>#prod-{item.id.slice(0, 6)}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                  )}
                </button>

                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <CatIcon className="w-3 h-3" />
                  <span>{catLabel}</span>
                </span>

                {item.collection_name && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1e222d] text-yellow-300 border border-[#2d3240]">
                    Коллекция: {item.collection_name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenQuickEdit(item)}
                  className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer border border-[#242930]"
                  title="Редактировать товар"
                >
                  <Edit2 className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer ml-1"
                  title="Закрыть панель"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate" title={item.name}>
                {item.name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 font-sans">
                <Calendar size={12} className="text-gray-500" />
                <span>
                  Создан:{' '}
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>

            {/* Навигационная лента вкладок */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#242930]/80 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-extrabold'
                    : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Все</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'pricing'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-extrabold'
                    : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Смета</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'print'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-extrabold'
                    : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                }`}
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>Печать</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stl')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'stl'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-extrabold'
                    : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>3D-Модель</span>
              </button>

              {salesStat && salesStat.soldQty > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'sales'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-extrabold'
                      : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Продажи</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Основное содержимое Drawer */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* KPI Блок цен и остатка */}
            {(activeTab === 'all' || activeTab === 'pricing') && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 bg-[#161820] border border-[#242930] rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Розничная цена</span>
                  <div className="text-xl font-extrabold font-mono text-amber-400 my-1">
                    {formatCurrency(item.final_price, currencySymbol)}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    себестоимость: {formatCurrency(item.base_cost, currencySymbol)}
                  </span>
                </div>

                <div className="p-3.5 bg-[#161820] border border-[#242930] rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Маржа и прибыль</span>
                  <div className={`text-xl font-extrabold font-mono my-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(profit, currencySymbol)}
                  </div>
                  <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {marginPercent}% маржинальность
                  </span>
                </div>
              </div>
            )}

            {/* Складской остаток */}
            {(activeTab === 'all' || activeTab === 'pricing') && (
              <div className="p-3.5 bg-[#161820] border border-[#242930] rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-semibold text-white block">Наличие на складе</span>
                  <span className="text-[11px] text-gray-400">
                    {stock === 0 ? '❌ Товар закончился' : stock <= 2 ? '⚠️ Заканчивается' : '✅ В наличии'}
                  </span>
                </div>
                <NumberCounter
                  value={stock}
                  min={0}
                  onChange={(val) => onSetStock(item, val)}
                />
              </div>
            )}

            {/* Параметры печати */}
            {(activeTab === 'all' || activeTab === 'print') && (
              <div className="p-4 bg-[#161820] border border-[#242930] rounded-2xl space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PrinterIcon size={14} className="text-amber-400" />
                  Параметры печати
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#12141a] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">Материал:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.filament_color && (
                        <div
                          className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: item.filament_color }}
                        />
                      )}
                      <strong className="text-white truncate">{item.filament_name || 'PLA'}</strong>
                    </div>
                  </div>

                  <div className="bg-[#12141a] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">3D-Принтер:</span>
                    <strong className="text-white truncate block mt-0.5">{item.printer_name || 'Стандартный'}</strong>
                  </div>

                  <div className="bg-[#12141a] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">Вес изделия:</span>
                    <strong className="text-white font-mono text-xs">{item.weight_g} грамм</strong>
                  </div>

                  <div className="bg-[#12141a] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">Время печати:</span>
                    <strong className="text-white font-mono text-xs">
                      {item.hours}ч {item.minutes}м
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Детализированная смета затрат */}
            {(activeTab === 'all' || activeTab === 'pricing') && (
              <div className="p-4 bg-[#161820] border border-[#242930] rounded-2xl space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-emerald-400" />
                  Структура себестоимости
                </h4>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 bg-[#12141a] rounded-xl border border-[#242930]/60">
                    <span className="text-gray-400">Пластик ({item.filament_name || 'Материал'})</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(breakdown.materialCost, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#12141a] rounded-xl border border-[#242930]/60">
                    <span className="text-gray-400">Электроэнергия</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(breakdown.electricityCost, currencySymbol)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#12141a] rounded-xl border border-[#242930]/60">
                    <span className="text-gray-400">Амортизация принтера</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(breakdown.depreciationCost, currencySymbol)}
                    </span>
                  </div>

                  {breakdown.laborCost > 0 && (
                    <div className="flex items-center justify-between p-2 bg-[#12141a] rounded-xl border border-emerald-500/30">
                      <span className="text-emerald-300 font-medium">Труд мастера ({item.labor_minutes} мин)</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatCurrency(breakdown.laborCost, currencySymbol)}
                      </span>
                    </div>
                  )}

                  {breakdown.customCostsTotal > 0 && (
                    <div className="flex items-center justify-between p-2 bg-[#12141a] rounded-xl border border-amber-500/30">
                      <span className="text-amber-300 font-medium">Дополнительные услуги</span>
                      <span className="font-mono text-amber-400 font-bold">
                        +{formatCurrency(breakdown.customCostsTotal, currencySymbol)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3D-модель (STL) */}
            {(activeTab === 'all' || activeTab === 'stl') && (
              <div className="p-4 bg-[#161820] border border-[#242930] rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode size={14} className="text-emerald-400" />
                    3D-модель (STL)
                  </h4>
                  <button
                    type="button"
                    onClick={() => onOpenStlModal(item)}
                    className="text-amber-400 hover:text-amber-300 text-xs font-medium cursor-pointer"
                  >
                    Изменить
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {hasFile && (
                    <Button
                      size="sm"
                      onClick={downloadStl}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl"
                    >
                      <Download size={13} />
                      <span>Скачать STL ({item.stl_file_name || 'файл'})</span>
                    </Button>
                  )}

                  {hasUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.stl_url, '_blank')}
                      className="flex-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl"
                    >
                      <ExternalLink size={13} />
                      <span>Открыть ссылку</span>
                    </Button>
                  )}

                  {!hasFile && !hasUrl && (
                    <div
                      onClick={() => onOpenStlModal(item)}
                      className="w-full py-3.5 text-center border border-dashed border-gray-700 hover:border-amber-500 rounded-2xl cursor-pointer text-gray-400 hover:text-white transition-colors"
                    >
                      + Добавить 3D-модель или ссылку
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Статистика продаж (историческая) */}
            {salesStat && salesStat.soldQty > 0 && (activeTab === 'all' || activeTab === 'sales') && (
              <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-400" />
                    История продаж
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {salesStat.orderCount} {salesStat.orderCount === 1 ? 'заказ' : 'заказов'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#12141a]/80 p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">Всего продано:</span>
                    <strong className="text-white text-base">{salesStat.soldQty} шт</strong>
                  </div>

                  <div className="bg-[#12141a]/80 p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-gray-400 block text-[10px]">Выручка:</span>
                    <strong className="text-emerald-400 text-base">
                      {formatCurrency(salesStat.totalRevenue, currencySymbol)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Нижняя панель действий */}
          <div className="p-4 border-t border-[#242930] bg-[#16181d] space-y-2">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  onClose();
                  onCreateOrder(item);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-extrabold flex items-center justify-center gap-1.5 py-2.5 text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                <ShoppingCart size={15} />
                <span>Создать заказ</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onLoadIntoCalculator(item);
                }}
                className="border-amber-500/50 text-amber-300 hover:bg-amber-500/15 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs rounded-xl"
                title="Загрузить в калькулятор"
              >
                <Play size={14} fill="currentColor" />
                <span>В калькулятор</span>
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenQuickEdit(item)}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-xl"
              >
                <Edit2 size={13} />
                <span>Редактировать</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenMoveProduct(item)}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-xl"
              >
                <FolderPlus size={13} />
                <span>В коллекцию</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onDelete(item.id, item.name, item.type);
                }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/15 flex items-center justify-center p-2 text-xs shrink-0 rounded-xl"
                title="Удалить товар"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
