'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  ShoppingCart,
  Printer,
  Boxes,
  Calculator,
  User,
  Shield,
  Trash2,
  Calendar,
  CreditCard,
  Phone,
  RefreshCw,
  Folder,
  Layers,
  FileCode,
  Tag,
  Receipt,
  Settings2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  FolderSync,
} from 'lucide-react';

import { MainNavbar } from '../../shared/ui/MainNavbar';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { PrinterFormFields, FilamentFormFields } from '../InventoryCockpit/InventoryFormFields';
import { Input } from '../../shared/ui/Input';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { CockpitDeleteModal } from '../../shared/ui/CockpitDeleteModal';
import { useToast } from '../../entities/model/ToastProvider';

// Модалки Заказов
import { OrderFormModal } from '../Orders/components/OrderFormModal';
import { DeleteOrderModal } from '../Orders/components/DeleteOrderModal';
import { ClearMonthModal } from '../Orders/components/ClearMonthModal';
import { OpenNewMonthModal } from '../Orders/components/OpenNewMonthModal';
import { GoalSettingsModal } from '../Orders/components/GoalSettingsModal';
import { OrderPaymentModal } from '../Orders/components/v2/OrderPaymentModal';
import { OrderContactsModal } from '../Orders/components/v2/OrderContactsModal';

// Модалки Каталога / Товаров
import { AddVariantModal } from '../ProductsList/components/modals/AddVariantModal';
import { AssemblyModal } from '../ProductsList/components/modals/AssemblyModal';
import { CollectionModal } from '../ProductsList/components/modals/CollectionModal';
import { CategoryModal } from '../ProductsList/components/modals/CategoryModal';
import { EditStlModal } from '../ProductsList/components/modals/EditStlModal';
import { MoveProductModal } from '../ProductsList/components/modals/MoveProductModal';
import { RecalculateModal } from '../ProductsList/components/modals/RecalculateModal';
import { DeleteProductModal } from '../ProductsList/components/modals/DeleteProductModal';
import { DeleteCollectionModal } from '../ProductsList/components/modals/DeleteCollectionModal';
import { ClearCatalogModal } from '../ProductsList/components/modals/ClearCatalogModal';

// Модалки Калькулятора
import { ClientReceiptModal } from '../Calculator/ClientReceiptModal';

// Модалки Профиля и Админки
import { EditProfileModal } from '../UserMenu/EditProfileModal';
import { GenerateKeyModal } from '../Admin/components/GenerateKeyModal';

// Круглое модальное окно удаления
import { RoundDeleteModal } from '../../shared/ui/RoundDeleteModal';

// Моковые данные
import {
  MOCK_ORDER,
  MOCK_PRODUCT,
  MOCK_ASSEMBLY_PRODUCT,
  MOCK_COLLECTION,
  MOCK_PRINTERS,
  MOCK_FILAMENTS,
  MOCK_RECEIPT_RESULT,
} from './mockData';
import { Order, PaymentItem, ContactItem } from '../Orders/types';
import { SavedCalculation, ProductCollection } from '../../shared/types';

import { usePageTransition } from '../../shared/ui/page-transition/PageTransitionProvider';

export function ModalsShowcase() {
  const { settleFallback } = usePageTransition();

  React.useEffect(() => {
    settleFallback();
  }, [settleFallback]);

  const { showSuccess, showToast } = useToast();

  // Состояния открытия модалок Заказов
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(MOCK_ORDER);
  const [isDeleteOrderOpen, setIsDeleteOrderOpen] = useState(false);
  const [isClearMonthOpen, setIsClearMonthOpen] = useState(false);
  const [isOpenMonthOpen, setIsOpenMonthOpen] = useState(false);
  const [isGoalSettingsOpen, setIsGoalSettingsOpen] = useState(false);
  const [isOrderPaymentOpen, setIsOrderPaymentOpen] = useState(false);
  const [isOrderContactsOpen, setIsOrderContactsOpen] = useState(false);

  // Состояния открытия модалок Каталога
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isEditStlOpen, setIsEditStlOpen] = useState(false);
  const [isMoveProductOpen, setIsMoveProductOpen] = useState(false);
  const [isRecalculateOpen, setIsRecalculateOpen] = useState(false);
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [isDeleteCollectionOpen, setIsDeleteCollectionOpen] = useState(false);
  const [isClearCatalogOpen, setIsClearCatalogOpen] = useState(false);

  const [demoPrinter, setDemoPrinter] = useState({ name: 'Bambu Lab X1-Carbon', price: '125000', powerW: '350', lifespanHours: '5000', color: '#71717a' });
  const [demoFilament, setDemoFilament] = useState({ name: 'PETG Carbon Black', price: '1850', weightG: '1000', color: '#27272a' });

  // Оборудование и материалы
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isDeletePrinterOpen, setIsDeletePrinterOpen] = useState(false);
  const [isFilamentModalOpen, setIsFilamentModalOpen] = useState(false);
  const [isDeleteFilamentOpen, setIsDeleteFilamentOpen] = useState(false);

  // Калькулятор
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Профиль, Админка и Настройки
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGenerateKeyOpen, setIsGenerateKeyOpen] = useState(false);
  const [isFactoryResetOpen, setIsFactoryResetOpen] = useState(false);
  const [isDataExportOpen, setIsDataExportOpen] = useState(false);
  const [isStandardCockpitModalOpen, setIsStandardCockpitModalOpen] = useState(false);

  // Круглое модальное окно удаления
  const [isRoundDeleteOpen, setIsRoundDeleteOpen] = useState(false);

  // Фильтр категорий
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const closeAll = () => {
    setIsRoundDeleteOpen(false);
    setIsOrderFormOpen(false);
    setIsDeleteOrderOpen(false);
    setIsClearMonthOpen(false);
    setIsOpenMonthOpen(false);
    setIsGoalSettingsOpen(false);
    setIsOrderPaymentOpen(false);
    setIsOrderContactsOpen(false);
    setIsAddVariantOpen(false);
    setIsAssemblyOpen(false);
    setIsCollectionOpen(false);
    setIsCategoryOpen(false);
    setIsEditStlOpen(false);
    setIsMoveProductOpen(false);
    setIsRecalculateOpen(false);
    setIsDeleteProductOpen(false);
    setIsDeleteCollectionOpen(false);
    setIsClearCatalogOpen(false);
    setIsPrinterModalOpen(false);
    setIsDeletePrinterOpen(false);
    setIsFilamentModalOpen(false);
    setIsDeleteFilamentOpen(false);
    setIsReceiptOpen(false);
    setIsProfileOpen(false);
    setIsGenerateKeyOpen(false);
    setIsFactoryResetOpen(false);
    setIsDataExportOpen(false);
    setIsStandardCockpitModalOpen(false);
    showToast('Все модальные окна закрыты', 'info');
  };

  const categories = [
    { id: 'all', label: 'Все разделы' },
    { id: 'round', label: 'Опасные окна (1)' },
    { id: 'orders', label: 'Заказы (7)' },
    { id: 'catalog', label: 'Каталог (11)' },
    { id: 'hardware', label: 'Оборудование (4)' },
    { id: 'calculator', label: 'Калькулятор (1)' },
    { id: 'system', label: 'Системные (5)' },
  ];

  const modalItems = [
    // Круглое модальное окно удаления
    {
      id: 'round-delete',
      cat: 'round',
      title: 'RoundDeleteModal (Круглое окно)',
      desc: 'Круглое окно в приглушенных винно-красных тонах интерфейса, с мягкими волнами, кружащимся DANGER и зажатием',
      type: 'Круглое окно',
      icon: AlertTriangle,
      onOpen: () => setIsRoundDeleteOpen(true),
    },

    // Заказы
    {
      id: 'order-form',
      cat: 'orders',
      title: 'OrderFormModal',
      desc: 'Полная форма создания / редактирования заказа со вкладками деталей, калькулятора, цен, статусов и клиента',
      type: 'Форма',
      icon: ShoppingCart,
      onOpen: () => setIsOrderFormOpen(true),
    },
    {
      id: 'order-delete',
      cat: 'orders',
      title: 'DeleteOrderModal',
      desc: 'Подтверждение необратимого удаления заказа из реестра',
      type: 'Подтверждение',
      icon: Trash2,
      onOpen: () => setIsDeleteOrderOpen(true),
    },
    {
      id: 'order-clear-month',
      cat: 'orders',
      title: 'ClearMonthModal',
      desc: 'Очистка всех записей за выбранный расчётный месяц с защитой от случайного клика',
      type: 'Опасное действие',
      icon: Trash2,
      onOpen: () => setIsClearMonthOpen(true),
    },
    {
      id: 'order-open-month',
      cat: 'orders',
      title: 'OpenNewMonthModal',
      desc: 'Календарный выбор и инициализация нового отчётного месяца',
      type: 'Селектор',
      icon: Calendar,
      onOpen: () => setIsOpenMonthOpen(true),
    },
    {
      id: 'order-goal-settings',
      cat: 'orders',
      title: 'GoalSettingsModal',
      desc: 'Настройка финансовых целей и KPI по выручке и чистой прибыли на месяц',
      type: 'Настройки',
      icon: SlidersHorizontal,
      onOpen: () => setIsGoalSettingsOpen(true),
    },
    {
      id: 'order-payment',
      cat: 'orders',
      title: 'OrderPaymentModal',
      desc: 'Управление платежами, предоплатой и историей транзакций по заказу',
      type: 'Форма оплаты',
      icon: CreditCard,
      onOpen: () => setIsOrderPaymentOpen(true),
    },
    {
      id: 'order-contacts',
      cat: 'orders',
      title: 'OrderContactsModal',
      desc: 'Контакты клиента, быстрый переход в мессенджеры и копирование',
      type: 'Контакты',
      icon: Phone,
      onOpen: () => setIsOrderContactsOpen(true),
    },

    // Каталог
    {
      id: 'product-add-variant',
      cat: 'catalog',
      title: 'AddVariantModal',
      desc: 'Добавление новой модификации товара (другой пластик, цвет, размер)',
      type: 'Форма',
      icon: Boxes,
      onOpen: () => setIsAddVariantOpen(true),
    },
    {
      id: 'product-assembly',
      cat: 'catalog',
      title: 'AssemblyModal',
      desc: 'Конструктор сборного изделия из нескольких печатных деталей и комплектующих',
      type: 'Конструктор',
      icon: Layers,
      onOpen: () => setIsAssemblyOpen(true),
    },
    {
      id: 'product-collection',
      cat: 'catalog',
      title: 'CollectionModal',
      desc: 'Создание и редактирование тематической коллекции товаров с тегами и цветом',
      type: 'Форма',
      icon: Folder,
      onOpen: () => setIsCollectionOpen(true),
    },
    {
      id: 'product-category',
      cat: 'catalog',
      title: 'CategoryModal',
      desc: 'Управление списком категорий каталога и привязка тегов',
      type: 'Управление',
      icon: Tag,
      onOpen: () => setIsCategoryOpen(true),
    },
    {
      id: 'product-edit-stl',
      cat: 'catalog',
      title: 'EditStlModal',
      desc: 'Просмотр, привязка и загрузка STL-файла 3D модели изделия',
      type: 'Файлы',
      icon: FileCode,
      onOpen: () => setIsEditStlOpen(true),
    },
    {
      id: 'product-move',
      cat: 'catalog',
      title: 'MoveProductModal',
      desc: 'Перемещение товара или группы товаров в другую коллекцию',
      type: 'Операция',
      icon: FolderSync,
      onOpen: () => setIsMoveProductOpen(true),
    },
    {
      id: 'product-recalculate',
      cat: 'catalog',
      title: 'RecalculateModal',
      desc: 'Массовый автоматический пересчет себестоимости и цен товаров при изменении тарифов',
      type: 'Пакетная операция',
      icon: RefreshCw,
      onOpen: () => setIsRecalculateOpen(true),
    },
    {
      id: 'product-delete',
      cat: 'catalog',
      title: 'DeleteProductModal',
      desc: 'Диалог подтверждения удаления товара из каталога',
      type: 'Подтверждение',
      icon: Trash2,
      onOpen: () => setIsDeleteProductOpen(true),
    },
    {
      id: 'product-delete-collection',
      cat: 'catalog',
      title: 'DeleteCollectionModal',
      desc: 'Подтверждение удаления коллекции с опцией сохранения или удаления товаров',
      type: 'Подтверждение',
      icon: Trash2,
      onOpen: () => setIsDeleteCollectionOpen(true),
    },
    {
      id: 'product-clear-catalog',
      cat: 'catalog',
      title: 'ClearCatalogModal',
      desc: 'Полное удаление всех товаров и коллекций из базы каталога',
      type: 'Опасное действие',
      icon: AlertTriangle,
      onOpen: () => setIsClearCatalogOpen(true),
    },

    // Оборудование
    {
      id: 'printer-edit',
      cat: 'hardware',
      title: 'PrinterModal (Редактирование)',
      desc: 'Параметры 3D-принтера: мощность, стоимость, амортизация, цветовая метка',
      type: 'Форма',
      icon: Printer,
      onOpen: () => setIsPrinterModalOpen(true),
    },
    {
      id: 'printer-delete',
      cat: 'hardware',
      title: 'DeletePrinterModal',
      desc: 'Удаление 3D-принтера из производственного парка',
      type: 'Подтверждение',
      icon: Trash2,
      onOpen: () => setIsDeletePrinterOpen(true),
    },
    {
      id: 'filament-edit',
      cat: 'hardware',
      title: 'FilamentModal (Редактирование)',
      desc: 'Свойства катушки филамента: тип пластика, вес, цена закупки, цвет',
      type: 'Форма',
      icon: Boxes,
      onOpen: () => setIsFilamentModalOpen(true),
    },
    {
      id: 'filament-delete',
      cat: 'hardware',
      title: 'DeleteFilamentModal',
      desc: 'Списание / удаление катушки филамента из склада',
      type: 'Подтверждение',
      icon: Trash2,
      onOpen: () => setIsDeleteFilamentOpen(true),
    },

    // Калькулятор
    {
      id: 'calculator-receipt',
      cat: 'calculator',
      title: 'ClientReceiptModal',
      desc: 'Генерация официального товарного чека / сметы для клиента с функцией печати и копирования',
      type: 'Смета / Чек',
      icon: Receipt,
      onOpen: () => setIsReceiptOpen(true),
    },

    // Системные
    {
      id: 'system-profile',
      cat: 'system',
      title: 'EditProfileModal',
      desc: 'Редактирование имени, email, цветовой схемы аватара и смена пароля',
      type: 'Профиль',
      icon: User,
      onOpen: () => setIsProfileOpen(true),
    },
    {
      id: 'system-generate-key',
      cat: 'system',
      title: 'GenerateKeyModal',
      desc: 'Генерация лицензионных ключей доступа и регистрационных кодов (Admin)',
      type: 'Админ-панель',
      icon: Shield,
      onOpen: () => setIsGenerateKeyOpen(true),
    },
    {
      id: 'system-factory-reset',
      cat: 'system',
      title: 'FactoryResetModal',
      desc: 'Сброс всех локальных настроек и очистка кэша к исходному состоянию',
      type: 'Опасное действие',
      icon: RotateCcw,
      onOpen: () => setIsFactoryResetOpen(true),
    },
    {
      id: 'system-export-import',
      cat: 'system',
      title: 'DataBackupModal',
      desc: 'Резервное копирование и восстановление всей базы данных в JSON',
      type: 'Бэкап данных',
      icon: Settings2,
      onOpen: () => setIsDataExportOpen(true),
    },
    {
      id: 'system-cockpit-base',
      cat: 'system',
      title: 'CockpitModal (Base Reference)',
      desc: 'Эталонное модальное окно Meridian Cockpit с терминальной шапкой, статусом и футером',
      type: 'Дизайн-система',
      icon: Sparkles,
      onOpen: () => setIsStandardCockpitModalOpen(true),
    },
  ];

  const filteredItems = modalItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.cat === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans">
      <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-[1540px] space-y-5">
        <div className="flex justify-center">
          <MainNavbar />
        </div>

        {/* Главный контейнер Meridian Cockpit Console */}
        <div className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
          {/* 1. Верхняя терминальная шапка */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-neutral-900/60 font-mono text-xs select-none">
            <div className="flex items-center gap-3">
              {/* Терминальные точки */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-px bg-white/15" />
              <span className="font-bold tracking-wider text-neutral-200 uppercase">
                KUMO-CRM // MODAL COMPONENT SHOWCASE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                {modalItems.length} КОМПОНЕНТОВ
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CockpitButton size="sm" onClick={closeAll}>
                закрыть всё
              </CockpitButton>
            </div>
          </div>

          {/* 2. Панель управления и фильтров */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-neutral-900/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Табы разделов */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border ${
                    selectedCategory === cat.id
                      ? 'bg-white/15 border-white/30 text-white font-bold'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:border-white/15'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Быстрый поиск */}
            <div className="relative min-w-[260px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск модального окна..."
                className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 3. Сетка карточек модальных окон */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-300 group-hover:text-white group-hover:border-white/25 transition-colors">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400 uppercase">
                            {item.cat}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {item.type}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-mono text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <CockpitButton
                        size="sm"
                        onClick={item.onOpen}
                        className="w-full justify-center"
                      >
                        открыть модалку
                      </CockpitButton>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* 4. Нижняя телеметрия */}
          <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 select-none gap-2">
            <div className="flex items-center gap-3">
              <span>ACTIVE_REGISTRY: {modalItems.length} MODALS</span>
              <span>•</span>
              <span>FILTERED: {filteredItems.length}</span>
              <span>•</span>
              <span>TEST_ENV: ISOLATED MOCKS</span>
            </div>
            <div className="text-neutral-400">
              KUMO CRM · MODALS SHOWCASE RUNTIME
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 5. МОДАЛЬНЫЕ ОКНА ПРИЛОЖЕНИЯ                             */}
      {/* ======================================================== */}

      {/* --- РАЗДЕЛ: ЗАКАЗЫ --- */}
      <OrderFormModal
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
        order={editingOrder}
        setOrder={setEditingOrder}
        onSave={async (e) => {
          e.preventDefault();
          showSuccess('Заказ успешно сохранен (тест)');
          setIsOrderFormOpen(false);
          return editingOrder as Order;
        }}
        savedCalculations={[MOCK_PRODUCT, MOCK_ASSEMBLY_PRODUCT]}
        allOrders={[MOCK_ORDER]}
      />

      <DeleteOrderModal
        order={isDeleteOrderOpen ? MOCK_ORDER : null}
        onClose={() => setIsDeleteOrderOpen(false)}
        onConfirm={() => {
          showSuccess('Заказ успешно удален (тест)');
          setIsDeleteOrderOpen(false);
        }}
      />

      <ClearMonthModal
        isOpen={isClearMonthOpen}
        onClose={() => setIsClearMonthOpen(false)}
        selectedMonthKey="2026-09"
        monthOrdersCount={14}
        onConfirm={() => {
          showSuccess('Месяц очищен (тест)');
          setIsClearMonthOpen(false);
        }}
      />

      <OpenNewMonthModal
        isOpen={isOpenMonthOpen}
        onClose={() => setIsOpenMonthOpen(false)}
        selectedMonthKey="2026-09"
        orders={[MOCK_ORDER]}
        onSelectMonth={(mKey) => {
          showSuccess(`Выбран месяц: ${mKey}`);
          setIsOpenMonthOpen(false);
        }}
      />

      <GoalSettingsModal
        isOpen={isGoalSettingsOpen}
        onClose={() => setIsGoalSettingsOpen(false)}
        selectedMonthKey="2026-09"
        monthLabel="Сентябрь 2026"
        currentGoal={150000}
        currentProfit={85000}
        onSave={(targetAmount, applyToAll) => {
          showSuccess(`Цель сохранена: ${targetAmount} ₽ (на все месяцы: ${applyToAll ? 'Да' : 'Нет'})`);
          setIsGoalSettingsOpen(false);
        }}
      />

      <OrderPaymentModal
        isOpen={isOrderPaymentOpen}
        order={MOCK_ORDER}
        onClose={() => setIsOrderPaymentOpen(false)}
        onSave={(orderId, total, payments) => {
          showSuccess(`Оплата сохранена: ${total} ₽ (${payments.length} платежей)`);
          setIsOrderPaymentOpen(false);
        }}
      />

      <OrderContactsModal
        isOpen={isOrderContactsOpen}
        order={MOCK_ORDER}
        onClose={() => setIsOrderContactsOpen(false)}
        onSave={(orderId, contacts, primary) => {
          showSuccess(`Контакты обновлены (${contacts.length})`);
          setIsOrderContactsOpen(false);
        }}
        onCopyContact={(text) => {
          navigator.clipboard?.writeText(text);
          showToast(`Скопировано: ${text}`, 'info');
        }}
      />

      {/* --- РАЗДЕЛ: КАТАЛОГ И ТОВАРЫ --- */}
      {isAddVariantOpen && (
        <AddVariantModal
          collection={MOCK_COLLECTION}
          savedCalculations={[MOCK_PRODUCT]}
          filaments={MOCK_FILAMENTS}
          printers={MOCK_PRINTERS}
          onClose={() => setIsAddVariantOpen(false)}
          onConfirm={async (data) => {
            showSuccess(`Модификация создана: ${data.name}`);
            setIsAddVariantOpen(false);
          }}
          onNavigateToCalculator={() => {
            showToast('Переход в калькулятор', 'info');
          }}
        />
      )}

      <AssemblyModal
        isOpen={isAssemblyOpen}
        onClose={() => setIsAssemblyOpen(false)}
        editingAssembly={MOCK_ASSEMBLY_PRODUCT}
        stagedParts={MOCK_ASSEMBLY_PRODUCT.assembly_parts || []}
        savedCalculations={[MOCK_PRODUCT, MOCK_ASSEMBLY_PRODUCT]}
        filaments={MOCK_FILAMENTS}
        printers={MOCK_PRINTERS}
        laborRate={350}
        currencySymbol="₽"
        onSave={async (data) => {
          showSuccess('Сборка сохранена');
          setIsAssemblyOpen(false);
        }}
      />

      <CollectionModal
        isOpen={isCollectionOpen}
        onClose={() => setIsCollectionOpen(false)}
        editingCollection={MOCK_COLLECTION}
        categoryOptions={[
          { value: 'Милитари', label: 'Милитари' },
          { value: 'Робототехника', label: 'Робототехника' },
        ]}
        savedCalculations={[MOCK_PRODUCT]}
        currencySymbol="₽"
        onSave={async (data) => {
          showSuccess(`Коллекция сохранена: ${data.name}`);
          setIsCollectionOpen(false);
        }}
      />

      {isCategoryOpen && (
        <CategoryModal
          item={MOCK_PRODUCT}
          categoryOptions={[
            { value: 'Милитари', label: 'Милитари' },
            { value: 'Робототехника', label: 'Робототехника' },
          ]}
          onClose={() => setIsCategoryOpen(false)}
          onSave={async (item, cat, tags) => {
            showSuccess(`Категория: ${cat}, тегов: ${tags.length}`);
            setIsCategoryOpen(false);
          }}
          onCreateCategory={(name) => {
            showSuccess(`Новая категория создана: ${name}`);
          }}
        />
      )}

      {isEditStlOpen && (
        <EditStlModal
          item={MOCK_PRODUCT}
          onClose={() => setIsEditStlOpen(false)}
          onSave={async (item, stlUrl) => {
            showSuccess(`STL файл привязан: ${stlUrl || 'файл'}`);
            setIsEditStlOpen(false);
          }}
        />
      )}

      <MoveProductModal
        movingProduct={isMoveProductOpen ? MOCK_PRODUCT : null}
        selectedIds={['prod-1']}
        isBatchMoveOpen={false}
        collections={[MOCK_COLLECTION]}
        savedCalculations={[MOCK_PRODUCT]}
        onClose={() => setIsMoveProductOpen(false)}
        onSaveSingle={async (prod, colId) => {
          showSuccess(`Товар перемещен в коллекцию ID: ${colId}`);
          setIsMoveProductOpen(false);
        }}
        onSaveBatch={async (ids, colId) => {
          showSuccess(`Перемещено товаров: ${ids.length}`);
          setIsMoveProductOpen(false);
        }}
      />

      <RecalculateModal
        isOpen={isRecalculateOpen}
        onClose={() => setIsRecalculateOpen(false)}
        selectedCount={1}
        totalCount={12}
        isRecalculating={false}
        onConfirm={async (scope) => {
          showSuccess(`Перерасчет выполнен для: ${scope}`);
          setIsRecalculateOpen(false);
        }}
      />

      <DeleteProductModal
        item={isDeleteProductOpen ? MOCK_PRODUCT : null}
        onClose={() => setIsDeleteProductOpen(false)}
        onConfirm={async (id) => {
          showSuccess(`Товар ID ${id} удален`);
          setIsDeleteProductOpen(false);
        }}
      />

      <DeleteCollectionModal
        collection={isDeleteCollectionOpen ? MOCK_COLLECTION : null}
        onClose={() => setIsDeleteCollectionOpen(false)}
        onConfirm={async (id, withProds) => {
          showSuccess(`Коллекция удалена (с товарами: ${withProds ? 'Да' : 'Нет'})`);
          setIsDeleteCollectionOpen(false);
        }}
      />

      <ClearCatalogModal
        isOpen={isClearCatalogOpen}
        onClose={() => setIsClearCatalogOpen(false)}
        onConfirm={async () => {
          showSuccess('Каталог полностью очищен');
          setIsClearCatalogOpen(false);
        }}
      />

      {/* --- РАЗДЕЛ: ОБОРУДОВАНИЕ И МАТЕРИАЛЫ --- */}
      <CockpitModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        title="Редактирование принтера"
        subtitle="Параметры печати"
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full font-mono text-xs">
            <span className="text-neutral-400">Час печати: {(Number(demoPrinter.lifespanHours) > 0 ? Number(demoPrinter.price || 0) / Number(demoPrinter.lifespanHours) : 0).toFixed(2)} ₽/ч</span>
            <div className="flex gap-2">
              <CockpitButton
                onClick={() => {
                  showSuccess('Принтер сохранен');
                  setIsPrinterModalOpen(false);
                }}
              >
                Сохранить
              </CockpitButton>
            </div>
          </div>
        }
      >
        <PrinterFormFields values={demoPrinter} onChange={(field, value) => setDemoPrinter((previous) => ({ ...previous, [field]: value }))} currencySymbol="₽" />
      </CockpitModal>

      <CockpitDeleteModal
        isOpen={isDeletePrinterOpen}
        onClose={() => setIsDeletePrinterOpen(false)}
        onConfirm={() => {
          showSuccess('Принтер удален');
          setIsDeletePrinterOpen(false);
        }}
        title="Удаление принтера"
        subtitle="Voron 2.4 350"
        itemName="Voron 2.4 350"
        itemType="принтер"
        maxWidth="md"
        swipeLabel="[ Сдвиньте для удаления принтера >>> ]"
        description="Вы уверены, что хотите удалить принтер «Voron 2.4 350»? История расчетов сохранит название оборудования."
      />

      <CockpitModal
        isOpen={isFilamentModalOpen}
        onClose={() => setIsFilamentModalOpen(false)}
        title="Редактирование катушки"
        subtitle="Материал и стоимость"
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full font-mono text-xs">
            <span className="text-neutral-400">Стоимость: {(Number(demoFilament.weightG) > 0 ? Number(demoFilament.price || 0) / Number(demoFilament.weightG) : 0).toFixed(2)} ₽/г</span>
            <div className="flex gap-2">
              <CockpitButton
                onClick={() => {
                  showSuccess('Филамент сохранен');
                  setIsFilamentModalOpen(false);
                }}
              >
                Сохранить
              </CockpitButton>
            </div>
          </div>
        }
      >
        <FilamentFormFields values={demoFilament} onChange={(field, value) => setDemoFilament((previous) => ({ ...previous, [field]: value }))} currencySymbol="₽" />
      </CockpitModal>

      <CockpitDeleteModal
        isOpen={isDeleteFilamentOpen}
        onClose={() => setIsDeleteFilamentOpen(false)}
        onConfirm={() => {
          showSuccess('Филамент удален со склада');
          setIsDeleteFilamentOpen(false);
        }}
        title="Удаление филамента"
        subtitle="PLA Neon Orange"
        itemName="PLA Neon Orange (BestFilament)"
        itemType="катушку филамента"
        maxWidth="md"
        swipeLabel="[ Сдвиньте для удаления катушки >>> ]"
        description="Вы уверены, что хотите удалить катушку «PLA Neon Orange (BestFilament)»?"
        warningDetails={
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Остаток на складе:</span>
            <span className="font-mono text-rose-300">1000 г · 1 850 ₽</span>
          </div>
        }
      />

      {/* --- РАЗДЕЛ: КАЛЬКУЛЯТОР --- */}
      <ClientReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        quantity="10"
        weightG="250"
        printerName="Bambu Lab X1-Carbon"
        filamentName="PETG Carbon Black"
        currencySymbol="₽"
        result={MOCK_RECEIPT_RESULT}
      />

      {/* --- РАЗДЕЛ: ПРОФИЛЬ, АДМИНКА, СИСТЕМА --- */}
      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <GenerateKeyModal
        isOpen={isGenerateKeyOpen}
        onClose={() => setIsGenerateKeyOpen(false)}
      />

      <CockpitModal
        isOpen={isFactoryResetOpen}
        onClose={() => setIsFactoryResetOpen(false)}
        title="Сброс к заводским настройкам"
        subtitle="Опасная системная операция"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full font-mono text-xs">
            <CockpitButton
              className="text-rose-300 border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/80 font-bold"
              onClick={() => {
                showSuccess('Сброс настроек выполнен (тест)');
                setIsFactoryResetOpen(false);
              }}
            >
              Сбросить все данные
            </CockpitButton>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-neutral-300 font-sans">
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              Все локальные кэши, несохраненные черновики и пользовательские пресеты будут очищены.
            </div>
          </div>
        </div>
      </CockpitModal>

      <CockpitModal
        isOpen={isDataExportOpen}
        onClose={() => setIsDataExportOpen(false)}
        title="Резервное копирование и экспорт"
        subtitle="Файл JSON"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full font-mono text-xs">
            <span className="text-neutral-500">2026-09-15_backup.json</span>
            <div className="flex gap-2">
              <CockpitButton
                onClick={() => {
                  showSuccess('Экспорт завершен (файл скачан)');
                  setIsDataExportOpen(false);
                }}
              >
                Скачать копию
              </CockpitButton>
            </div>
          </div>
        }
      >
        <div className="space-y-3 font-mono text-xs">
          <p className="text-neutral-300 font-sans">
            Экспорт включает в себя реестр заказов, весь каталог продукции со сборками, параметры оборудования и настройки тарифов.
          </p>
          <p className="text-[11px] leading-relaxed text-neutral-500">Сохраните файл на устройстве, чтобы позже восстановить данные или перенести их.</p>
        </div>
      </CockpitModal>

      <CockpitModal
        isOpen={isStandardCockpitModalOpen}
        onClose={() => setIsStandardCockpitModalOpen(false)}
        title="Пример формы"
        subtitle="Общий стиль окон"
        maxWidth="md"
        footer={<div className="flex w-full justify-end"><CockpitButton onClick={() => setIsStandardCockpitModalOpen(false)}>Сохранить</CockpitButton></div>}
      >
        <div className="space-y-5">
          <Input label="Название" aria-label="Название записи" placeholder="Введите название" />
          <p className="text-xs leading-relaxed text-neutral-400">Основные поля — в центре, дополнительные настройки — по необходимости. Сохранение всегда внизу окна.</p>
        </div>
      </CockpitModal>

      {/* --- КРУГЛОЕ МОДАЛЬНОЕ ОКНО УДАЛЕНИЯ С ЗАЖАТИЕМ --- */}
      <RoundDeleteModal
        isOpen={isRoundDeleteOpen}
        onClose={() => setIsRoundDeleteOpen(false)}
        onConfirm={() => {
          showSuccess('Объект успешно удалён (Круг)');
          setIsRoundDeleteOpen(false);
        }}
        title="Подтверждение действия"
        itemName="#1042 «Корпус дрона Carbon»"
        itemDetails="Сумма: 14 500 ₽ · 4 детали"
      />
    </div>
  );
}
