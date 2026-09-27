# Statistics Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/stats` placeholder with a complete animated and interactive workshop analytics cockpit.

**Architecture:** A client-side `StatsDashboard` orchestrates existing user-scoped data and delegates all calculations to one pure report builder. Focused chart components consume prepared view models, while a shared chart shell and selection state keep visuals consistent and synchronize time-bucket interaction.

**Tech Stack:** Next.js 16.3.1 App Router, React 19, TypeScript, Tailwind CSS 4, Motion 13, Number Flow, Lucide, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-31-stats-dashboard-design.md`

## Global Constraints

- Do not install, remove, or update any dependency.
- Do not alter Supabase tables, migrations, RLS, or `supabase_schema.sql`.
- Use only current user data returned by existing APIs and their LocalStorage fallback.
- Follow `DESIGN_SYSTEM.md`; use one Meridian Cockpit Container with cyan as the restrained section accent.
- Keep Motion imports inside narrow Client Components and import them from `motion/react`.
- Respect `prefers-reduced-motion` through `MotionConfig reducedMotion="user"` and Number Flow’s motion preference.
- Implement every production behavior with a failing test first.
- Preserve all unrelated dirty-worktree changes and do not push or merge branches.
- Do not create commits unless the user explicitly asks for them.

---

## File map

### Create

- `src/widgets/Stats/types.ts` — analytics modes, prepared report models, and chart datum contracts.
- `src/widgets/Stats/components/StatsChartShell.tsx` — shared chart surface, title, description, legend region, and accessible summary.
- `src/widgets/Stats/components/AnalyticsModeToggle.tsx` — exactly two financial-mode options.
- `src/widgets/Stats/components/GoalProgressChart.tsx` — plan/fact gauge.
- `src/widgets/Stats/components/PaymentGapChart.tsx` — ordered/paid/receivable reconciliation.
- `src/widgets/Stats/components/OrderStatusChart.tsx` — status donut.
- `src/widgets/Stats/components/ActivityHeatmap.tsx` — calendar activity view and synchronized date highlight.
- `src/widgets/Stats/components/ProductPerformanceChart.tsx` — ranked product bars.
- `src/widgets/Stats/components/CostStructureChart.tsx` — reconciled expense categories.
- `src/widgets/Stats/components/FilamentUsageChart.tsx` — estimated material consumption.
- `src/widgets/Stats/components/PrinterWorkloadChart.tsx` — hours and result-per-hour.
- `src/widgets/Stats/components/StatsInsights.tsx` — deterministic insights and data-quality notices.
- `src/widgets/Stats/components/StatsEmptyState.tsx` — empty and partial-data guidance.
- `tests/stats-calculator.test.ts` — pure analytics tests.
- `tests/stats-components.test.tsx` — server-rendered semantics tests for stateless controls/shells.

### Modify

- `src/widgets/Stats/helpers/statsCalculator.ts` — build the normalized report for both financial modes.
- `src/widgets/Stats/StatsDashboard.tsx` — replace placeholder with orchestration and cockpit layout.
- `src/widgets/Stats/components/PeriodFilterBar.tsx` — Meridian controls and global mode switch placement.
- `src/widgets/Stats/components/StatsKpiCards.tsx` — six mode-aware animated KPI cards.
- `src/widgets/Stats/components/FinancialDynamicsChart.tsx` — Motion geometry, pinning, keyboard access, and synchronized cursor.
- `src/app/stats/page.tsx` — runtime footer wording/version only; retain loading shell and navbar.
- `scripts/test.mjs` — compile and run the two new test files with the existing tests.

---

### Task 1: Define and test the analytics report

**Files:**
- Create: `src/widgets/Stats/types.ts`
- Create: `tests/stats-calculator.test.ts`
- Modify: `src/widgets/Stats/helpers/statsCalculator.ts`
- Modify: `scripts/test.mjs`

**Interfaces:**
- Consumes: `Order[]`, `SavedCalculation[]`, `Filament[]`, `Printer[]`, `MonthlyGoalsConfig`, `DateRange`, `PeriodPreset`.
- Produces: `buildStatsReport(input: StatsReportInput): StatsReport`, `getPreviousDateRange(range: DateRange): DateRange | null`, and prepared arrays for every chart.

- [ ] **Step 1: Add the new test file to the test runner**

Add `tests/stats-calculator.test.ts` to both the TypeScript compile argument list and the Node `--test` argument list in `scripts/test.mjs`.

- [ ] **Step 2: Write failing mode and reconciliation tests**

Use a fixture containing one income order (`amount: 1000`, `payment: 600`, `cost: 350`) and one direct expense (`amount: 100`). Assert:

```ts
const accrual = buildStatsReport({ ...fixture, mode: 'accrual' });
assert.equal(accrual.kpi.revenue, 1000);
assert.equal(accrual.kpi.expenses, 450);
assert.equal(accrual.kpi.result, 550);
assert.equal(accrual.kpi.receivables, 400);

const cash = buildStatsReport({ ...fixture, mode: 'cash' });
assert.equal(cash.kpi.revenue, 600);
assert.equal(cash.kpi.expenses, 450);
assert.equal(cash.kpi.result, 150);
assert.deepEqual(cash.paymentGap, { ordered: 1000, paid: 600, receivable: 400 });
```

- [ ] **Step 3: Run the tests and verify the expected RED state**

Run: `npm test`
Expected: TypeScript reports that `buildStatsReport` and the new analytics types do not exist.

- [ ] **Step 4: Add the report contracts**

Define exact public contracts in `types.ts`:

```ts
export type FinancialMode = 'accrual' | 'cash';
export type PeriodPreset = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'month' | 'all' | 'custom';
export type DateRange = { startDate: Date | null; endDate: Date | null };
export type MetricDelta = { value: number; percent: number | null };
export type RankedDatum = { id: string; label: string; value: number; secondary: number; color?: string };
export type ChartBucket = {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
  expense: number;
  result: number;
  ordersCount: number;
  filamentG: number;
  printHours: number;
};
export type StatsInsight = {
  id: string;
  severity: 'positive' | 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  value: number;
  href?: '/orders' | '/products' | '/filaments' | '/printers';
};

export interface StatsKPI {
  revenue: number;
  expenses: number;
  result: number;
  margin: number;
  averageCheck: number;
  receivables: number;
  unpaidOrders: number;
  incomeOrders: number;
  expenseOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  filamentG: number;
  printHours: number;
}

export interface StatsReportInput {
  orders: Order[];
  products: SavedCalculation[];
  filaments: Filament[];
  printers: Printer[];
  goals: MonthlyGoalsConfig;
  range: DateRange;
  preset: PeriodPreset;
  mode: FinancialMode;
  now?: Date;
}

export interface StatsReport {
  kpi: StatsKPI;
  previousKpi: StatsKPI | null;
  deltas: Record<'revenue' | 'expenses' | 'result' | 'margin' | 'averageCheck', MetricDelta>;
  dynamics: ChartBucket[];
  paymentGap: { ordered: number; paid: number; receivable: number };
  goal: { target: number; actual: number; progressPercent: number | null };
  statuses: RankedDatum[];
  products: Array<RankedDatum & { revenue: number; profit: number; quantity: number }>;
  costs: RankedDatum[];
  filamentUsage: RankedDatum[];
  printerWorkload: Array<RankedDatum & { hours: number; profitPerHour: number }>;
  activity: Array<{ key: string; date: Date; orders: number; revenue: number; result: number }>;
  insights: StatsInsight[];
  quality: { unlinkedOrders: number; unknownFilamentG: number; unknownPrinterHours: number };
}
```

Move the existing `PeriodPreset`, `DateRange`, `StatsKPI`, and `ChartBucket` definitions out of `statsCalculator.ts` into `types.ts` while updating imports. Import the source entity types from `src/shared/types` and `MonthlyGoalsConfig` from `src/shared/api/db`. This avoids competing analytics shapes and leaves `statsCalculator.ts` as pure implementation.

- [ ] **Step 5: Implement the minimum calculation core**

Refactor the existing KPI and bucket calculations so one mode-aware helper supplies financial values:

```ts
function getOrderFinancials(order: Order, mode: FinancialMode) {
  if (order.type === 'expense') {
    return { ordered: 0, paid: 0, revenue: 0, expense: Math.max(0, Number(order.amount) || 0) };
  }
  const ordered = Math.max(0, Number(order.amount) || 0);
  const paid = Math.max(0, Number(order.payment) || 0);
  return {
    ordered,
    paid,
    revenue: mode === 'cash' ? paid : ordered,
    expense: Math.max(0, Number(order.cost) || 0),
  };
}
```

Build the first complete `StatsReport` with zero-valued arrays for chart families not yet implemented so the mode tests pass without UI code.

- [ ] **Step 6: Run the mode tests and verify GREEN**

Run: `npm test`
Expected: existing formula/number tests and new accrual/cash tests pass.

- [ ] **Step 7: Write failing aggregation tests**

Add separate tests for:

- assemblies allocate grams and print hours to each part’s filament/printer;
- product ranking includes “Без привязки” for income orders without `product_id`;
- detailed `cost_items` reconcile to total expenses and any undistributed remainder goes to “Себестоимость заказа”;
- explicit monthly goals override the default and multi-month ranges sum targets;
- previous range has the same inclusive duration and ends one millisecond before the current range;
- invalid/empty data returns finite zeros and empty arrays;
- negative results keep a negative margin and do not create `NaN`/`Infinity`.

- [ ] **Step 8: Run the aggregation tests and verify RED**

Run: `npm test`
Expected: the first missing aggregation assertion fails with an empty prepared array or missing goal/delta value.

- [ ] **Step 9: Implement all report aggregations in one pass over filtered orders**

Create maps for products, filament aliases, printer aliases, statuses, cost categories, per-day activity, and ranked entities. Normalize names by ID first and case-insensitive name second. Convert maps to sorted arrays with deterministic tie-breaking by label. Limit only at presentation time, not in the report builder.

- [ ] **Step 10: Run the complete analytics suite and refactor while green**

Run: `npm test`
Expected: all analytics and existing tests pass with no warnings.

---

### Task 2: Build accessible shared analytics controls and surfaces

**Files:**
- Create: `src/widgets/Stats/components/StatsChartShell.tsx`
- Create: `src/widgets/Stats/components/AnalyticsModeToggle.tsx`
- Create: `src/widgets/Stats/components/StatsEmptyState.tsx`
- Create: `tests/stats-components.test.tsx`
- Modify: `scripts/test.mjs`

**Interfaces:**
- Consumes: `FinancialMode`, titles, descriptions, summaries, legend/actions slots.
- Produces: consistent cards and a controlled `AnalyticsModeToggle` with exactly two buttons.

- [ ] **Step 1: Add the component test file to `scripts/test.mjs`**

Compile it with `--jsx react-jsx` and add its emitted JavaScript path to Node `--test`.

- [ ] **Step 2: Write failing server-rendered semantics tests**

Render the controls with `renderToStaticMarkup` and assert:

```tsx
const toggle = renderToStaticMarkup(
  <AnalyticsModeToggle value="cash" onChange={() => undefined} />,
);
assert.match(toggle, /По заказам/);
assert.match(toggle, /По оплатам/);
assert.equal((toggle.match(/role="radio"/g) ?? []).length, 2);
assert.match(toggle, /aria-checked="true"/);

const shell = renderToStaticMarkup(
  <StatsChartShell title="Динамика" description="Описание" summary="Выручка выросла" />,
);
assert.match(shell, /aria-label="Динамика"/);
assert.match(shell, /Выручка выросла/);
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test`
Expected: imports for the three new components cannot be resolved.

- [ ] **Step 4: Implement the components with Meridian primitives**

`StatsChartShell` uses `bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl`, one header, one optional controls slot, content, and a visually hidden summary. `AnalyticsModeToggle` uses a `role="radiogroup"`, two `role="radio"` buttons, `aria-checked`, visible focus rings, and labels exactly `[ По заказам ]` and `[ По оплатам ]`. `StatsEmptyState` accepts a reason plus optional CockpitButton action.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test`
Expected: semantics and prior analytics tests pass.

---

### Task 3: Replace the placeholder with the live cockpit shell

**Files:**
- Modify: `src/widgets/Stats/StatsDashboard.tsx`
- Modify: `src/widgets/Stats/components/PeriodFilterBar.tsx`
- Modify: `src/widgets/Stats/components/StatsKpiCards.tsx`
- Modify: `src/app/stats/page.tsx`

**Interfaces:**
- Consumes: `useData()`, `getOrders()`, `getMonthlyGoalsConfig()`, `buildStatsReport()`.
- Produces: one cockpit, global date/mode state, refresh/error/empty states, six KPI cards, and prepared report props for charts.

- [ ] **Step 1: Write a failing report-level test for mode-aware KPI labels**

Add a pure exported `getFinancialLabels(mode)` test asserting `accrual` returns `Выручка`/`Чистая прибыль` and `cash` returns `Получено`/`Кассовый результат`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`
Expected: `getFinancialLabels` is missing.

- [ ] **Step 3: Implement labels and dashboard state**

Load independent sources in parallel:

```ts
const refresh = useCallback(async () => {
  setLoadState('refreshing');
  try {
    const [nextOrders, nextGoals] = await Promise.all([
      getOrders(),
      getMonthlyGoalsConfig(),
    ]);
    setOrders(nextOrders);
    setGoals(nextGoals);
    setLastUpdatedAt(new Date());
    setLoadState('ready');
  } catch (error) {
    setLoadState('error');
    setLoadError(error instanceof Error ? error.message : 'Не удалось обновить статистику');
  }
}, []);
```

Listen to `orders_updated`, `monthly_goals_updated`, and `storage`, with one cleanup function. Derive the report with `useMemo`; do not duplicate calculations in JSX.

- [ ] **Step 4: Build the Meridian cockpit structure**

Replace the placeholder with terminal dots, stamp `§ 3D-LABS // СТАТИСТИКА`, real Supabase/LocalStorage badge, refresh CockpitButton, period toolbar, KPI grid, chart grid slots, insight rail, and telemetry. Keep `bg-dot-grid`, MainNavbar, and update the global footer to `§ 3D LABS · STATISTICS RUNTIME v2.0`.

- [ ] **Step 5: Integrate period and mode controls**

Preserve month, 7-day, 30-day, all-history, and custom ranges. Place `AnalyticsModeToggle` beside period controls. Use `startTransition` when changing mode or a large range so controls remain responsive.

- [ ] **Step 6: Convert KPI cards to six mode-aware cards**

Use Number Flow for revenue, expenses, result, margin, average check, and receivables. Each card receives `value`, `delta`, and `mode`; each formula tooltip contains the exact formula from the specification. Negative results use rose text and a minus sign, not absolute values.

- [ ] **Step 7: Add exact empty and partial-data states**

No orders: show actions to `/orders` and `/calculator`. Orders but no product links: finance/status/activity remain visible and production cards explain that product links are required. A refresh error leaves the last good report mounted and displays a retry strip.

- [ ] **Step 8: Run automated checks**

Run: `npm test`
Run: `npm run lint`
Expected: tests pass and the modified shell has no lint errors.

---

### Task 4: Implement the four finance and operations charts

**Files:**
- Modify: `src/widgets/Stats/components/FinancialDynamicsChart.tsx`
- Create: `src/widgets/Stats/components/GoalProgressChart.tsx`
- Create: `src/widgets/Stats/components/PaymentGapChart.tsx`
- Create: `src/widgets/Stats/components/OrderStatusChart.tsx`
- Create: `src/widgets/Stats/components/ActivityHeatmap.tsx`
- Modify: `src/widgets/Stats/StatsDashboard.tsx`

**Interfaces:**
- Consumes: prepared report fields plus `activeBucketKey` and `onActiveBucketChange`.
- Produces: interactive, keyboard-accessible SVG visuals with text summaries.

- [ ] **Step 1: Write failing geometry/summary tests**

Add pure helpers to the calculator test target and assert that chart summaries mention exact totals, donut percentages sum to 100 within rounding tolerance, and heatmap intensity returns an integer from 0 through 4 for zero/max values.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`
Expected: summary/intensity helpers are missing.

- [ ] **Step 3: Implement tested chart helpers**

Add `formatFinancialSummary`, `normalizeSharePercentages`, and `getHeatLevel(value, max)` as pure exports. Keep SVG geometry local to each component but keep business values in the report.

- [ ] **Step 4: Rewrite financial dynamics**

Use `motion.rect` for bars, `motion.path` with `pathLength` for lines/areas, and stable bucket keys. Provide series isolation, bar/area toggle, crosshair, exact tooltip, click-to-pin, Escape-to-clear, and `aria-label` on interactive marks. Never read a MotionValue during render.

- [ ] **Step 5: Implement goal and payment-gap visuals**

Goal progress clamps only visual fill to `0..100`; the text may show values above 100%. Payment gap renders ordered, paid, and receivable on one common scale so widths are directly comparable. Both include textual totals below the SVG.

- [ ] **Step 6: Implement status donut**

Render focusable segments with stroke-dash geometry, text legend, and center readout. Animate stroke dash offset with low-bounce transitions and skip the reveal under reduced motion.

- [ ] **Step 7: Implement activity heatmap and synchronized cursor**

Render at most the latest 366 days. Match a daily `activeBucketKey` directly and a monthly key by `YYYY-MM` prefix; hover/focus updates shared state and click pins it. Every cell exposes date, orders, selected revenue, and result.

- [ ] **Step 8: Dynamically split chart modules**

Declare top-level `next/dynamic` imports in `StatsDashboard.tsx` with fixed literal paths and compact skeleton cards. Do not set `ssr: false`; Client Components are prerendered by default and should retain useful first paint.

- [ ] **Step 9: Run automated checks**

Run: `npm test`
Run: `npm run lint`
Expected: all checks pass.

---

### Task 5: Implement commercial analytics

**Files:**
- Create: `src/widgets/Stats/components/ProductPerformanceChart.tsx`
- Create: `src/widgets/Stats/components/CostStructureChart.tsx`
- Modify: `src/widgets/Stats/StatsDashboard.tsx`

**Interfaces:**
- Consumes: `report.products`, `report.costs`, and global financial mode.
- Produces: product ranking and expense reconciliation visuals.

- [ ] **Step 1: Write failing ranking stability tests**

Assert that equal product values sort alphabetically, ranking switches return the same records with profit/revenue/quantity values, and cost category values sum exactly to `report.kpi.expenses` after rounding.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`
Expected: deterministic tie order or cost reconciliation assertion fails.

- [ ] **Step 3: Correct report sorting and cost remainder allocation**

Apply descending numeric order then `label.localeCompare('ru')`. Allocate only the difference between `order.cost` and detailed income-order items to “Себестоимость заказа”; never double-count detail plus total cost.

- [ ] **Step 4: Implement product performance bars**

Display top eight plus a “ещё N” footer. A local Cockpit-style selector switches profit, revenue, and sold quantity without affecting the global mode. Animate bar scale from zero and show exact values on hover/focus.

- [ ] **Step 5: Implement cost structure**

Render a 100% stacked overview bar and ranked category rows. Use deterministic semantic colors, labels, ruble values, and percentages. Show a reconciliation footer whose value equals the expense KPI.

- [ ] **Step 6: Add dynamic imports and verify**

Run: `npm test`
Run: `npm run lint`
Expected: checks pass and no chart imports expand the page’s initial synchronous module graph unnecessarily.

---

### Task 6: Implement production analytics and insight rail

**Files:**
- Create: `src/widgets/Stats/components/FilamentUsageChart.tsx`
- Create: `src/widgets/Stats/components/PrinterWorkloadChart.tsx`
- Create: `src/widgets/Stats/components/StatsInsights.tsx`
- Modify: `src/widgets/Stats/StatsDashboard.tsx`

**Interfaces:**
- Consumes: `report.filamentUsage`, `report.printerWorkload`, `report.insights`, `report.quality`.
- Produces: linked-product production charts and evidence-based guidance.

- [ ] **Step 1: Write failing assembly and insight threshold tests**

Assert one assembly order distributes each part’s quantity-adjusted grams/hours to the correct material/printer; receivables above 15% create an amber warning; margin below 20% creates a rose warning; absent data creates neither claim.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`
Expected: at least the insight threshold or assembly allocation assertion fails.

- [ ] **Step 3: Complete allocation and deterministic insight rules**

Allocate assembly metrics by part, then multiply by order quantity. Single products use their own filament/printer. Keep unknown metrics in named buckets and report their totals in `quality`.

- [ ] **Step 4: Implement filament usage**

Render ranked gram/kilogram bars with material colors when stored, neutral fallback otherwise, and subtitle “Расчётный расход по связанным товарам”. Include linked/unknown shares in the footer.

- [ ] **Step 5: Implement printer workload**

Render ranked bars with `Часы` and `Прибыль/час` views. Disable the second view with explanatory text when every recorded hour is zero. Profit-per-hour formatting must remain finite.

- [ ] **Step 6: Implement insight rail**

Render three to six compact tiles ordered by severity: data quality, receivables, margin, then positive leaders. Each tile cites its supporting value and routes to the relevant page only when an action is useful.

- [ ] **Step 7: Add dynamic imports and verify**

Run: `npm test`
Run: `npm run lint`
Expected: checks pass.

---

### Task 7: Motion, accessibility, responsive QA, and final verification

**Files:**
- Modify: only the Stats files from Tasks 2–6 where QA identifies a scoped issue.

**Interfaces:**
- Consumes: completed cockpit.
- Produces: verified responsive, reduced-motion, keyboard-accessible page.

- [ ] **Step 1: Apply one shared Motion policy**

Wrap chart content with `MotionConfig reducedMotion="user"`. Use a 40–60 ms entrance stagger once, low-bounce chart transitions, and no permanent loops. Animate SVG wrapper opacity/transform when direct SVG animation would trigger expensive layout.

- [ ] **Step 2: Verify keyboard behavior manually**

Tab through period controls, both mode buttons, chart selectors, legend controls, SVG marks, and action links. Confirm Space/Enter selects, Escape clears pinned time data, focus never disappears, and the DOM reading order matches the visual order.

- [ ] **Step 3: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`. Confirm final chart geometry and values remain visible, while entrance stagger, path drawing, and spring growth no longer run.

- [ ] **Step 4: Run responsive visual QA**

Start the existing development server and inspect `/stats` at 375, 768, 1280, and 1536 px. Capture screenshots for comparison. Confirm no clipped tooltips, overlapping legends, horizontal page overflow, truncated critical values, or unusable touch targets.

- [ ] **Step 5: Verify data states without mutating user records**

Use the pure report fixtures and server-rendered component tests to cover: no orders, one order, negative result, unpaid order, direct expense only, unlinked product, assembly product, and cached-data error copy. In the browser, inspect the storage badge in its naturally available current state. Do not seed, clear, or overwrite the user’s LocalStorage or Supabase records for QA.

- [ ] **Step 6: Run full automated verification**

Run: `npm test`
Run: `npm run lint`
Run: `npm run build`
Expected: every command exits with code 0 and introduces no new warnings.

- [ ] **Step 7: Review the final diff**

Run: `git diff --check` and `git diff -- src/app/stats src/widgets/Stats scripts/test.mjs tests/stats-calculator.test.ts tests/stats-components.test.tsx docs/superpowers`. Confirm the diff contains no unrelated edits, dependency changes, database changes, debug output, or placeholder copy.

- [ ] **Step 8: Present the completed page**

Open `/stats` in the in-app browser and summarize implemented charts, the two financial modes, verification results, and any honest limitation caused by payment dates not being stored.
