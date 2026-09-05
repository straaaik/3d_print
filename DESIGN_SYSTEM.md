# Meridian Cockpit Console — Дизайн-система 3D Labs

> Обязательный стандарт для всех существующих и новых страниц, модальных окон и компонентов интерфейса 3D Labs.
> Эталоны консоли: **«Калькулятор» (`/calculator`)** и **«Заказы» (`/orders`)**.

---

## 1. Главный принцип
Инженерная консоль управления: глубокий матовый графит (`neutral-950`), точная сетка, высокая плотность полезных данных, нейтральные рамки и спокойная тактильная функциональность без декоративного мусора.

---

## 2. 🚫 СТРОГО ЗАПРЕЩЕНО (Табу)

1. **НЕОН И СВЕЧЕНИЕ (КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО):**
   - Никаких светящихся цветных ореолов, гало и неоновых теней (`shadow-[0_0_..._cyan]`, `glow`, неоновая дымка).
   - Никаких цветных неоновых рамок (`border-cyan-400`, `ring-cyan-500`). Рамки должны быть матовыми и нейтральными (`border-white/10`, `border-white/15`, при hover `border-white/25`).
   - Тени — только естественные глубокие матовые светопоглощающие (`rgba(0,0,0,0.85–0.95)`), без цветного светоизлучения.
2. **Никаких `PageHeader`** и оторванных hero-шапок.
3. **Никаких декоративных неоновых пятен** (`blur-3xl`, `blur-[140px]`, цветные подложки).
4. **Никаких градиентных и радужных кнопок**.
5. **Никаких эмодзи в интерфейсе** — использовать исключительно строгие иконки `lucide-react`.
6. **Никаких нативных `<select>`** — использовать `CockpitDropdown`.

---

## 3. Каркас страницы и Cockpit-контейнер

Каждая рабочая страница помещается в единый кокпит:

```tsx
<div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans">
  <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-[1540px] space-y-5">
    <div className="flex justify-center">
      <MainNavbar />
    </div>

    {/* Meridian Cockpit Container */}
    <div className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
      {/* 1. Верхняя панель (Topbar) */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-neutral-900/60 font-mono text-xs select-none">
        <div className="flex items-center gap-3">
          {/* Терминальные точки */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/15" />
          {/* Инженерный штамп */}
          <span className="font-bold tracking-wider text-neutral-200 uppercase">3D-LABS // НАЗВАНИЕ_РАЗДЕЛА</span>
          {/* Статус */}
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">ONLINE</span>
        </div>
        {/* Действия */}
        <div className="flex items-center gap-2">
          <CockpitButton size="sm">[ действие ]</CockpitButton>
        </div>
      </div>

      {/* 2. Рабочее тело */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Контент */}
      </div>

      {/* 3. Нижняя панель телеметрии (Statusbar) */}
      <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500 select-none">
        <span>DATABASE: SUPABASE CLOUD • CACHE: LOCALSTORAGE</span>
        <span>RUNTIME READY</span>
      </div>
    </div>
  </main>

  {/* Глобальный футер */}
  <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
    <span>3D LABS · [SECTION] RUNTIME v2.4</span>
  </footer>
</div>
```

---

## 4. Материалы, цвет и акценты

| Роль | Классы Tailwind |
|---|---|
| Фон страницы | `bg-dot-grid` на `#0a0a0a` |
| Cockpit-консоль | `bg-neutral-950/90 border border-white/15 backdrop-blur-2xl` |
| Карточки и плитки | `bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.05]` |
| Поле ввода | `bg-neutral-950/80 border border-white/15 focus:border-white/30 rounded-lg` |
| Overlay / Backdrop | `bg-black/80 backdrop-blur-xl` |
| Основной текст | `text-white` |
| Вторичный текст | `text-neutral-300` |
| Поясняющий текст | `text-neutral-400` |
| Телеметрия и метки | `text-neutral-500 font-mono` |

### Сдержанные функциональные акценты (БЕЗ свечения):
Цвет используется только для передачи смысла в бейджах, статусах и маленьких точках:
- **`cyan`** — активный выбор, текущая печать, информационный бейдж (`bg-cyan-950/50 border-cyan-800/40 text-cyan-400`).
- **`emerald`** — успех, завершено, прибыль (`bg-emerald-950/50 border-emerald-800/40 text-emerald-400`).
- **`amber`** — ожидание, пауза, внимание (`bg-amber-950/50 border-amber-800/40 text-amber-400`).
- **`rose`** — ошибка, критическое действие, удаление (`bg-rose-950/50 border-rose-800/40 text-rose-400`).

Никаких цветных светящихся теней или неоновых рамок вокруг элементов с акцентами.

---

## 5. Типографика и инженерный язык
- **`font-mono` + `tabular-nums`** — строго для всех чисел, цен, дат, процентов, формул, артикулов, статусов, меток и кнопок консоли.
- **`font-sans`** — для длинного читаемого текста, описаний деталей и названий заказов.
- **Инженерные штампы**:
  - `3D-LABS // КАЛЬКУЛЯТОР`
  - `3D-LABS // РЕЕСТР_ПЕЧАТИ`
  - Кнопки кокпита: `[ сохранить ]`, `[ сбросить ]`, `[ + новый заказ ]`.
  - **Знак параграфа (`§`):** СТРОГО ЗАПРЕЩЁН во всем интерфейсе.

---

## 6. Базовые компоненты

1. **Кнопки:** Использовать `<CockpitButton>` (`src/shared/ui/CockpitButton.tsx`) со скобочной нотацией `[ действие ]`.
2. **Селекты:** Использовать `<CockpitDropdown>` (`src/shared/ui/CockpitDropdown.tsx`) вместо нативных выпадающих списков.
3. **Подсказки:** `<Tooltip>` или `<CustomTooltip>` с формулами и пояснениями.
4. **Таблицы:** Моноширинные реестры с четкими границами `border-white/5` или `border-white/10`, без ярких цветных фонов при наведении.

---

## 7. Анимация (Meridian Motion)
- **Только `motion` (`motion/react`)**: Все переходы, раскрытия, перестановки и модальные окна анимируются через Motion.
- **Физика:** Спокойные, выверенные кривые (`ease: [0.16, 1, 0.3, 1]` или демпфированные пружины без отскоков/желе).
- **Длительность:** Компактный отклик — `150–250мс`, сложные переходы/морфы — `300–600мс`.
- **Доступность:** Учитывать `prefers-reduced-motion` через `MotionConfig`.

---

## 8. Стандарт модальных окон (Modal Window Standard)

> Эталон модального окна в дизайн-системе: **«Финансовая цель» (`src/widgets/Orders/components/GoalSettingsModal.tsx`)**. Все модальные окна приложения обязаны строго следовать этому шаблону.

### 🚫 Правила и табу для модальных окон:
1. **БЕЗ КРЕСТИКОВ `X`:**
   - Никаких кнопок с иконкой крестика (`X`, `Close`) в верхнем правом углу или в шапке модалки.
2. **Закрытие окна:**
   - Только через **красный кружочек** в левом верхнем углу шапки (`w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125`).
   - Либо через кнопку `[ Закрыть ]` / `[ Отмена ]` в нижней панели действий (футере).
   - Поддерживаются стандартные горячие клавиши: закрытие по `Escape` и клику по затемненному фону (backdrop).
3. **Кружочки терминала в шапке:**
   - Оставлять **ТОЛЬКО активный красный кружочек**.
   - Если жёлтый или зелёный кружочки не привязаны к отдельному реальному действию (например, сворачивание черновика), **их быть не должно** (никаких декоративных некликабельных кружков).
4. **Запрет надписи «3D-Labs» и знака «§»:**
   - В модальных окнах запрещено писать штамп «3D-Labs», «3D-LABS //» или знак «§».
5. **Формат заголовка в шапке:**
   - Структура: `<Название модального окна>` · `<Маленькое пояснение о назначении>`
   - Пример: `Финансовая цель · Все месяцы`
   - Пример: `Учёт оплаты заказа · Детализация и оплата частями`
   - Пример: `Контакты клиента · Способы связи и ссылки`
   - Пример: `Удаление заказа · Подтверждение действия`
   - Справа в шапке: только системное время (`ЧЧ:ММ MSK`) или лаконичный статус (без крестика).
6. **Материалы и геометрия:**
   - Каркас: `rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden font-mono`.
   - Шапка: `border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 font-mono text-xs`.
   - Футер: `border-t border-white/10 px-5 py-3 bg-neutral-900/60 font-mono text-xs flex items-center justify-between`.
