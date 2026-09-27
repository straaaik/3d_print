# 3D Labs Statistics Cockpit — Design Specification

**Date:** 2026-08-31
**Status:** Awaiting user approval
**Route:** `/stats`

## Objective

Replace the current “В разработке” placeholder with a production analytics cockpit that turns the workshop’s existing orders, products, filament, printers, and monthly goals into a single interactive operational picture. The page must answer four questions quickly: how much the workshop earns, where profit is lost, what sells, and how production capacity is used.

## Scope and constraints

- Use only existing project dependencies: React 19, Next.js 16.3.1, Motion 13, Lucide, and Number Flow.
- Do not add or update direct dependencies.
- Do not change the Supabase schema. All required records already exist and the current database API supplies a LocalStorage fallback.
- Preserve the existing `/stats` route, `DataProvider`, order events, and monthly-goals API.
- Follow `DESIGN_SYSTEM.md` and the `/orders` and `/calculator` reference pages.
- All analytics are derived in the browser from the current user’s already-scoped data.
- Do not invent operational values. Missing relations are shown as “Без привязки” or an honest empty state.

## Financial modes

The toolbar contains one global two-option segmented control:

- **По заказам** (`accrual`): revenue is the full `order.amount` of income orders.
- **По оплатам** (`cash`): revenue is the actually received `order.payment` of income orders.

Both modes recognize the same expenses: `order.cost` for income orders plus `order.amount` for direct expense records. Therefore the main result is `selected revenue − recognized expenses`. Labels change with the mode: “Чистая прибыль” in accrual mode and “Кассовый результат” in cash mode. Receivables always equal `max(order.amount − order.payment, 0)`.

Payment records do not store transaction dates. Time-series cash values will be assigned to their order date and the UI will state this in a tooltip. No false daily payment timeline will be implied.

## Information architecture

The page remains a single scrolling Meridian Cockpit Console rather than tabs. One period filter and one financial-mode switch control every compatible metric.

1. Terminal header with real storage status, refresh action, selected mode, and last calculation timestamp.
2. Period toolbar with month navigation, quick presets, custom dates, and financial mode.
3. KPI deck.
4. Primary financial dynamics chart.
5. Finance diagnostic row: goal progress and order/payment gap.
6. Operations row: order statuses and activity heatmap.
7. Commercial row: product performance and cost structure.
8. Production row: filament usage and printer workload.
9. Insight rail with deterministic recommendations and data-quality warnings.
10. Telemetry footer with record counts and storage mode.

## Metrics and chart definitions

### KPI deck

Six cards, recalculated for the selected period and mode:

1. Revenue / received payments.
2. Recognized expenses.
3. Net profit / cash result.
4. Margin percentage (`result / selected revenue × 100`).
5. Average check (`selected revenue / income order count`).
6. Receivables with unpaid-order count.

Each card uses tabular mono numerals, Number Flow with the user’s reduced-motion preference, a concise formula tooltip, and a comparison with the immediately preceding equal-length period when that comparison is well-defined. “All history” shows no fabricated comparison.

### Financial dynamics

An interactive SVG chart grouped by day for ranges up to 62 days and by month for longer/all-history ranges. It displays selected revenue, expenses, and result. Controls switch between bars and smooth area lines and can isolate one series. Hover shows a crosshair and exact values; click pins the bucket; Escape clears the pin.

### Goal progress

A radial/linear hybrid gauge compares the selected result with monthly goals already stored by `getMonthlyGoalsConfig()`. For multi-month ranges, the target is the sum of each intersecting month’s explicit goal or the default goal. If no goal exists, the card explains how to create one in Orders instead of showing a fake percentage.

### Order/payment gap

A compact horizontal reconciliation chart shows ordered value, received payments, and receivables. It does not change meaning when the global mode changes, making the difference between accrual and cash visible.

### Order status distribution

An accessible donut shows income-order counts by workflow status. Related waiting states may share a semantic hue, but every segment has a text label and count. Hover/focus selects a segment and the center label updates.

### Activity heatmap

A calendar-style heatmap shows income-order volume per day. The selected period is bounded to a useful viewport; long history uses the latest twelve months. Cells expose date, order count, revenue, and profit via pointer and keyboard focus.

### Product performance

Horizontal ranked bars show up to eight products. A local selector switches `Прибыль / Выручка / Количество`. Orders without `product_id` appear as “Без привязки”; this is also surfaced as a data-quality insight. Product profit uses the current global financial mode.

### Cost structure

A stacked bar plus ranked legend aggregates `cost_items` categories. Income-order cost without detailed items is assigned to “Себестоимость заказа”; direct expense records use their detailed category when present and otherwise “Прямые расходы”. The aggregate must reconcile exactly to the KPI expense total.

### Filament usage

Horizontal bars aggregate estimated grams from linked products and assembly parts by filament. Unknown material becomes “Не указан”. The chart explicitly says “расчётный расход по связанным товарам”; it does not pretend to be live spool inventory.

### Printer workload

Bars aggregate estimated print hours by linked printer. A local selector switches `Часы / Прибыль на час`. Orders with no linked printer are shown as “Не указан”. Profit per hour is only calculated for non-zero hours.

### Insight rail

Deterministic cards, not AI-generated text:

- strongest product by selected profit;
- most loaded printer;
- dominant cost category;
- margin warning when below 20%;
- receivables warning when above 15% of booked revenue;
- data-quality warning for unlinked orders or products.

Only insights supported by available data are shown.

## Visual direction

The page follows Meridian Cockpit Console exactly: `bg-dot-grid`, a single `neutral-950/90` cockpit, restrained white borders, mono telemetry, and shared `CockpitButton`, `CockpitDropdown`, and tooltip primitives. Cyan is the page accent; emerald means positive profit, rose means cost/loss, amber means outstanding/action needed, and violet distinguishes production capacity.

The signature interaction is a **synchronized analysis cursor**: hovering or pinning a daily time bucket in the financial chart highlights the same date in the activity heatmap; a monthly bucket highlights that month’s heatmap cells. A small “срез периода” readout updates with the selection. This is useful data linkage, not decorative motion.

No neon blobs, PageHeader, rainbow buttons, permanent decorative pulses, or competing local palettes are allowed.

## Motion and interaction

- Cockpit content enters once with a restrained 40–60 ms stagger and 260–360 ms opacity/transform transitions.
- KPI values animate through Number Flow.
- Bars grow from the zero axis using low-bounce springs; line paths reveal through `pathLength`; donut segments reveal through stroke dash offset.
- Changing period or mode morphs geometry through Motion where stable keys exist; it never blocks input.
- Hovered marks dim siblings and reveal exact values. Click/focus pins selection.
- Only `transform` and `opacity` receive frequent animation; large surfaces are not continuously animated.
- `MotionConfig reducedMotion="user"` and `useReducedMotion()` preserve final values while disabling non-essential movement.

## Data flow

`StatsDashboard` reads products, filaments, printers, and storage status from `useData()`. Orders and monthly goals load in parallel through the existing database API, which already falls back to user-scoped LocalStorage. The dashboard listens for `orders_updated`, `monthly_goals_updated`, and storage events, then recomputes a memoized `StatsReport` through pure helper functions.

Chart components consume prepared view models only. They do not query storage or repeat business calculations. Heavy chart components are split with top-level `next/dynamic` imports from the client dashboard.

## States and resilience

- **Loading:** existing page loader, then chart skeletons during refresh.
- **Error:** cockpit error strip with retry; cached data remains visible when available.
- **Empty:** explains which source is missing and offers CockpitButton links to create an order, product, filament, or printer.
- **Partial data:** compatible charts render; unavailable charts show scoped guidance rather than failing the page.
- **Offline:** all calculations use the API’s LocalStorage fallback and the header/telemetry report `LocalStorage` honestly.

## Accessibility and responsive behavior

- Every chart has a visible title, concise description, text legend, and screen-reader summary.
- Interactive SVG marks are keyboard focusable and expose names and values.
- Color never carries meaning alone; series use labels and distinct shapes/placement.
- Focus rings are visible and the DOM follows reading order.
- At 1536/1280 px the cockpit uses a dense two-column chart grid; at 768 px it reduces to one or two columns; at 375 px charts stack, legends scroll horizontally, and minimum touch targets remain usable.
- Large values, negative profit, empty series, a single record, and long Russian labels must not break layout.

## Verification criteria

- Pure calculations pass deterministic Node tests for both financial modes, previous-period comparisons, products, costs, materials, printers, heatmap, goals, empty data, and negative profit.
- `npm test`, `npm run lint`, and `npm run build` succeed without new warnings introduced by this work.
- Visual QA is completed at 375, 768, 1280, and 1536 px for the current live data, including hover, keyboard focus, pinned selections, and reduced motion. Empty, partial, negative, and cached-error states are covered by deterministic report and server-rendered component fixtures without mutating user data; the live storage badge is verified in its naturally available state.
- No dependency, Supabase schema, or unrelated application changes are made.
