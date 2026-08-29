# Дизайн-система Meridian Cockpit (3D Labs)

> **Единый золотой стандарт визуального, структурного и компонентного стиля приложения 3D Labs.**  
> Все страницы системы (`/calculator`, `/orders`, `/stats`, `/products`, `/filaments`, `/printers`, `/settings`, `/admin`, `/about`, `/login`) должны быть построены по **точно такой же архитектуре, сетке, цветовой гамме и стилистике**, эталоном которой является страница **«Калькулятор» (`/calculator`)**.

---

## 🚫 Главные правила и категорические запреты

1. **Абсолютная идентичность страниц**:
   - Каждая рабочая страница приложения обязана использовать единую базовую оболочку **Meridian Cockpit Container** с верхним статус-баром телеметрии, терминальными светодиодами, инженерным штампом, индикатором базы данных (Supabase/LocalStorage) и нижним статус-баром.
   - Запрещено создавать произвольные шапки страниц с цветными неоновыми пятнами (`blur-3xl`, `bg-[#16181d]`).
2. **БЕЗ КИСЛОТНОГО НЕОНА И КИБЕРПАНКА**:
   - Запрещены: цветные радужные кнопки (`bg-gradient-to-r from-sky-600 to-sky-400`, `from-purple-500 to-indigo-600` и т.д.), фоновые цветные размытия (`blur-[140px]`), разноцветные рамки карточек и декоративные неоновые ореолы.
3. **Главный принцип**:
   - **Монохромная сдержанность, глубокий матовый графит, швейцарская точность, высокая контрастность и моноширинная инженерная телеметрия (`JetBrains Mono / tabular-nums`)**.

---

## 📐 1. Анатомия и каркас любой страницы (Page Anatomy)

Каждая страница (`app/*/page.tsx`) обязана повторять точный каркас страницы Калькулятора:

```tsx
'use client';

import React from 'react';
import { useData } from '../../entities/model/DataProvider';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { SectionWidget } from '../../widgets/SectionWidget';

export default function SectionPage() {
  const { isLoading } = useData();

  // 1. Единый экран загрузки (Unified Loading Skeleton)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Инициализация [Название раздела] 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  // 2. Основной каркас рабочей страницы
  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans selection:bg-white/20 selection:text-white">
      
      <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-none space-y-6">
        {/* Главный верхний таббар навигации */}
        <div className="flex justify-center">
          <MainNavbar />
        </div>

        {/* Главный виджет раздела */}
        <SectionWidget />
      </main>

      {/* 3. Единый глобальный подвал страницы */}
      <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>§ 3D LABS · ENGINE v2.4 · [SECTION_NAME] RUNTIME</span>
          <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
        </div>
      </footer>
    </div>
  );
}
```

---

## 🎛️ 2. Базовый контейнер — Meridian Cockpit Container

Весь рабочий контент страницы (виджет) упаковывается в единый контейнер консоли:

```tsx
<div className="w-full max-w-[1500px] mx-auto select-none font-sans">
  <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
    
    {/* 1. Верхняя панель телеметрии и статуса (Cockpit Topbar) */}
    <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-3 bg-neutral-900/60 gap-3">
      {/* Левая часть: Терминальные точки + Инженерный штамп + Статус облака */}
      <div className="flex items-center gap-3">
        {/* Светодиоды терминала */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
        </div>

        {/* Штамп раздела */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
          <span className="text-white font-bold">§ 3D-LABS</span>
          <span className="text-neutral-600">//</span>
          <span className="text-neutral-400 hidden sm:inline">НАЗВАНИЕ РАЗДЕЛА</span>
          
          {/* Индикатор синхронизации */}
          {isOnline ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Cloud
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              LocalStorage
            </span>
          )}
        </div>
      </div>

      {/* Правая часть: Телеметрические бейджи и быстрые инженерные кнопки */}
      <div className="flex items-center gap-2.5 text-xs font-mono">
        {/* Информационный бейдж */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
          <span className="text-neutral-400">Метрика:</span>
          <span className="text-white font-bold">Значение</span>
        </div>

        {/* Скобочная кнопка действия */}
        <button
          type="button"
          onClick={handleAction}
          className="px-2.5 py-1 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer border bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/15"
        >
          <RotateCcw className="w-3 h-3" />
          <span>[ Действие ]</span>
        </button>
      </div>
    </div>

    {/* 2. Тело консоли (Cockpit Canvas) */}
    <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/90">
      {/* Рабочий контент раздела (сетка 2 колонки или таблица) */}
    </div>

    {/* 3. Подвал консоли (Cockpit Status Bar) */}
    <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500">
      <div className="flex items-center gap-3">
        <span>DATABASE: SUPABASE CLOUD</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">CACHE: LOCALSTORAGE SYNCED</span>
      </div>
      <div>FPS: 60 · RECORDS: 42</div>
    </div>

  </div>
</div>
```

---

## 🎨 3. Цветовая палитра и материалы (Materials & Colors)

### 🌑 Поверхности и фоны (Surfaces)
- **Основной фон страницы**: `#0a0a0a` с субтильной микросеткой `.bg-dot-grid`.
- **Каркас консоли**: `bg-neutral-950/90` с рамкой `border-white/15` и тенью `shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)]`.
- **Верхние и нижние панели консоли**: `bg-neutral-900/60` и `bg-neutral-950`.
- **Интерактивные карточки / тайлы метрик**: `bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all rounded-xl p-3.5`.
- **Вложенные разделители и подстроки внутри карточек**: `border-t border-white/5 pt-2 mt-2`.
- **Поля ввода и выпадающие списки**: `bg-neutral-950/80` или `bg-neutral-900`, рамка `border-white/15`, при фокусе `focus:border-cyan-400 ring-1 ring-cyan-400/30`.

### ⚪ Контраст текста и функциональные акценты
- **Заголовки и первичный текст**: `text-white font-bold`.
- **Вторичный текст и пояснения**: `text-neutral-300` и `text-neutral-400`.
- **Подписи, штампы и метаданные**: `text-neutral-500 font-mono text-[10px] / text-[11px]`.
- **Приглушенный Cyan (активные опции, кастомные расходы, инфо-чипы)**:
  - Текст: `text-cyan-300` / `text-cyan-400`
  - Фон: `bg-cyan-950/40`
  - Рамка: `border-cyan-500/40`
- **Сдержанный Emerald (прибыль, наценка, успех, статус «Готово»)**:
  - Текст: `text-emerald-400` / `text-emerald-300`
  - Фон: `bg-emerald-950/40`
  - Рамка: `border-emerald-800/40`
- **Приглушенный Amber (предупреждения, скидки, в обработке)**:
  - Текст: `text-amber-400` / `text-amber-300`
  - Фон: `bg-amber-950/40`
  - Рамка: `border-amber-800/40`
- **Сдержанный Rose (ошибки, удаление, списание)**:
  - Текст: `text-rose-400` / `text-rose-300`
  - Фон: `bg-rose-950/40`
  - Рамка: `border-rose-800/40`

---

## 🔤 4. Типографика и микро-штампы (Typography & Stamps)

1. **Шрифты**:
   - Текстовый интерфейс, заголовки, описания: `DM Sans` / `Inter` / `font-sans`.
   - **Все цифры, цены, таймкоды, вес, мощности, штампы и артикулы**: `JetBrains Mono` / `font-mono` (`tabular-nums`).
2. **Заголовки секций (Section Headers)**:
   ```tsx
   <div className="flex items-center justify-between border-b border-white/10 pb-2">
     <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
       // ПАРАМЕТРЫ ОБОРУДОВАНИЯ
     </span>
     <span className="font-mono text-xs text-cyan-400 font-bold">
       3 АКТИВНЫХ
     </span>
   </div>
   ```
3. **Инженерные микро-штампы**:
   - `§ 3D-LABS // ORDERS_ENGINE_V2.4`
   - `[ MOD 01 // MATERIAL_MATRIX ]`
   - `[ LIVE ]`, `[ Сбросить ]`, `[ + Сборка ]`
4. **Тултипы с формулами (`CustomTooltip`)**:
   Все важные параметры и метрики снабжаются иконкой `<HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white transition-colors cursor-help" />` с описанием и математической формулой расчета.

---

## 🧩 5. Компонентная база UI Kit (Стандарты Калькулятора)

### 1. Карточка параметра / метрики (Parameter Tile)
Базовая единица ввода и отображения параметров:
```tsx
<div className="bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all p-3.5 rounded-xl flex flex-col justify-between">
  <div>
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-mono text-neutral-400 block uppercase">
        Мощность нагрева
      </label>
      <CustomTooltip title="Мощность" description="..." formula="...">
        <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white cursor-help" />
      </CustomTooltip>
    </div>
    <div className="mt-1 flex items-baseline gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="text-xl sm:text-2xl font-bold font-mono text-white bg-transparent focus:outline-none"
      />
      <span className="text-sm font-mono text-neutral-400">Вт</span>
    </div>
  </div>

  {/* Нижняя встроенная подстрока с пресетами или быстрым контролом */}
  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
    <span className="text-neutral-500">Пресет:</span>
    <div className="flex gap-1">
      <button className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
        350W
      </button>
    </div>
  </div>
</div>
```

### 2. Выпадающие списки (`CockpitDropdown`)
Заменяют любые стандартные HTML-селекты во всем приложении:
- Варианты: `ghost` (для шапки), `card` (внутри карточки), `input` (для форм), `pill` (капсула).
- Свойства: темное меню `bg-neutral-950 border border-white/15 rounded-2xl shadow-2xl`, встроенный поиск, цветные статус-точки (`cyan`, `green`, `orange`, `red`), моно-футер подсчета строк.

### 3. Интерактивные чипы услуг и опций (Expandable Chips)
- **Неактивный**: компактная кнопка `bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-mono`.
- **Активный**: раскрывающийся чип `bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-lg text-xs font-mono` с инлайн-полем редактирования цены и тумблером `за шт / за заказ`.
- **Добавление расхода**: кнопка с пунктирной рамкой `border-dashed border-white/20`.

### 4. Швейцарская сводка / Чек (Matte Receipt / Ledger Summary)
Используется в правой колонке калькулятора, сводках заказов, деталях партии:
- Матовый контрастный фон `#b8b6ae` или темный графит с точечными линиями-лидерами:
  ```tsx
  <div className="flex items-baseline justify-between font-mono text-xs">
    <span className="shrink-0">• Пластик (120 г)</span>
    <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
    <span className="font-bold shrink-0">450 ₽</span>
  </div>
  ```
- Перфорация билета (Ticket punch circular cutouts).
- Штрихкод и хеш аутентификации `AUTH · 0X3DLABS2026`.

### 5. Кнопки действий (Cockpit Buttons)
- **Primary (Главное действие)**: Белая капсула — `bg-white text-neutral-950 hover:bg-neutral-200 active:scale-[0.98] font-bold text-xs py-3 px-5 rounded-full shadow-md cursor-pointer transition-all`.
- **Action Dark (Вторичное крупное)**: `bg-neutral-950/10 hover:bg-neutral-950/20 border border-neutral-950/30 text-neutral-950 font-bold text-xs py-2.5 rounded-xl cursor-pointer`.
- **Secondary (Консольная)**: `bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 font-semibold text-xs py-2 px-3 rounded-xl cursor-pointer`.
- **Bracket Quick (Инженерная)**: `font-mono text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10`.

### 6. Модальные окна (Cockpit Modals)
- Фон: `fixed inset-0 bg-black/80 backdrop-blur-md z-50`.
- Окно: `bg-neutral-950 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 max-w-lg`.
- Шапка: штамп `§ 3D-LABS // REGISTRY_NAME` с кнопкой `X`.
- Инпуты: `bg-neutral-900 border border-white/15 rounded-xl px-3 h-10 text-xs text-white font-mono`.

---

## 🗺️ 6. Матрица унификации всех страниц системы

| Раздел | URL | Требуемый стиль и архитектура |
| :--- | :--- | :--- |
| **Калькулятор** | `/calculator` | **ЭТАЛОН СТИЛЯ**. Двухколоночный Cockpit Container, 6 плиток параметров, раскрывающиеся чипы опций, швейцарский чек справа. |
| **Заказы** | `/orders` | Единый Cockpit Container. В шапке: терминальные точки, штамп `§ 3D-LABS // ORDERS_PIPELINE`, счетчик активных заказов, кнопка `[ + Новый заказ ]`. Таблица заказов в моно-стиле с бейджами статусов. Сводка месяца справа/снизу в стиле Ledger Row. |
| **Статистика** | `/stats` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // STATS_ENGINE`, бейдж `В разработке`. Карточки планируемых модулей аналитики, P&L, загрузки оборудования и расхода сырья. |
| **Каталог товаров** | `/products` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // CATALOG_REGISTRY`, тулбар действий `[ + Сборка ]`, `[ + Коллекция ]`, `[ Пересчитать ]`. Фильтры по категориям в виде чипов калькулятора. Таблица товаров с моно-ценами и материалами. |
| **Филаменты** | `/filaments` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // FILAMENT_STORAGE`, суммарный вес катушек на складе, кнопка `[ + Добавить катушку ]`. Плитки пластиков со сквирклами цветов, расчетом `₽/г` и остатка в граммах. |
| **Принтеры** | `/printers` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // HARDWARE_FLEET`, статус `N ОНЛАЙН`, кнопка `[ + Добавить принтер ]`. Плитки оборудования в стиле параметров калькулятора: мощность (W), тариф, износ и амортизация в час (`₽/ч`). |
| **Настройки** | `/settings` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // SYSTEM_CONFIG`. Матовые плитки настроек тарифов (электричество, ставка мастера, брак, наценка) с моно-инпутами и тултипами. |
| **Админ-панель** | `/admin` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // ADMIN_SECURITY`. Таблица пользователей мастерской, роли и аудит логов в матовом стиле. |
| **О проекте** | `/about` | Единый Cockpit Container. В шапке: штамп `§ 3D-LABS // ABOUT_MANIFEST`. Спецификация системы, технический стек и журнал версий в стиле швейцарской инженерной документации. |
| **Вход / Авторизация** | `/login` | Центрированная карточка Cockpit Card `border border-white/15 bg-neutral-950/90 shadow-2xl rounded-2xl p-6` со штампом и белой Primary-кнопкой входа. |

---

## ✅ 7. Чеклист проверки соответствия страницы (Design QA)

Перед завершением работы над любой страницей проверьте:
- [ ] Обернута ли страница в стандартный `min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans`?
- [ ] Используется ли единый спиннер загрузки `w-9 h-9 border-2 border-white/10 border-t-white animate-spin` с моно-текстом?
- [ ] Установлен ли единый центрированный навбар `<MainNavbar />`?
- [ ] Упакован ли виджет в **Meridian Cockpit Container** с 3 светодиодами терминала, штампом `§ 3D-LABS // ...` и статусом Supabase/LocalStorage?
- [ ] Имеются ли внизу консоли статус-бар с телеметрией и глобальный футер страницы со штампом runtime?
- [ ] Все ли числовые значения, цены, даты и артикулы оформлены шрифтом `JetBrains Mono / tabular-nums`?
- [ ] Отсутствуют ли любые цветные радужные кнопки, неоновые пятна `blur-3xl` и разнородные рамки?
- [ ] Заменены ли все стандартные `select` на компонент `CockpitDropdown`?
- [ ] Имеют ли карточки параметров стандартные отступы `p-3.5`, скругление `rounded-xl` и матовый фон `bg-white/[0.03] border-white/10`?
- [ ] Оформлены ли модальные окна в строгом стиле Cockpit Modal?

