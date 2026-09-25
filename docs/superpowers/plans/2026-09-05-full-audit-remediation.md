# Full Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct all confirmed security, data-integrity, performance, runtime, accessibility, design-system, lint, dead-code, and coverage findings from the 2026-09-05 audit.

**Architecture:** Pure boundary helpers make security and backup behavior testable; Supabase mutations become fail-fast and cache-safe; route-specific layouts and dynamic imports reduce public and workspace payloads; UI fixes reuse Cockpit primitives and Motion. Cleanup follows behavior fixes so deleted legacy code reduces the lint surface before remaining warnings are addressed.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5, Motion 13.1.1, Supabase JS 2.112.3, Playwright 1.62.1, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-full-audit-remediation-design.md`

## Global Constraints

- Work on the existing `test` branch; do not push without an explicit push request.
- Do not install, remove, or update npm packages.
- Do not change the Postgres schema.
- All retained interface animation imports from `motion/react`; CSS animation utilities are forbidden.
- Database/cache operations never claim success after a Supabase `{ error }` response.
- Preserve the offline fallback and existing URLs.
- Every behavior fix starts with a failing regression test and ends with focused plus full verification.

---

### Task 1: Data backup and destructive-operation safety

**Files:**
- Create: `src/shared/lib/dataBackup.ts`
- Modify: `src/shared/api/db.ts`
- Modify: `src/entities/model/DataProvider.tsx`
- Modify: `src/widgets/SettingsForm/components/DataManagementTab.tsx`
- Create: `tests/data-backup.test.ts`
- Create: `tests/database-maintenance.test.ts`
- Modify: `scripts/test.mjs`

**Interfaces:**
- Produce `DataBackupV2`, `createDataBackup(snapshot)`, and `parseDataBackup(input)`.
- Produce `clearAllDatabaseTables(): Promise<void>` that throws on cloud failure and clears `SYNC_QUEUE` on success/offline completion.
- Produce `restoreDatabaseSnapshot(snapshot): Promise<void>` and a DataProvider `restoreBackup(snapshot): Promise<void>`.

- [ ] Write failing tests with literal fixtures proving orders/monthly goals are exported, malformed nested entities are rejected before writes, a returned Supabase error rejects maintenance, and reset removes a pre-existing sync queue.
- [ ] Run `npm test` and confirm failures name the missing backup/maintenance behavior.
- [ ] Implement the pure backup contract and fail-fast Supabase response checker.
- [ ] Route import/export through DataProvider and show success only after restoration completes.
- [ ] Run focused tests, then `npm test`.

### Task 2: Authentication, public routes, and CSP

**Files:**
- Create: `src/shared/lib/safeRedirect.ts`
- Create: `src/shared/lib/contentSecurityPolicy.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/proxy.ts`
- Modify: `src/lib/supabase/proxy.ts`
- Modify: `src/app/auth/actions.ts`
- Modify: `src/entities/model/AuthProvider.tsx`
- Modify: `src/app/login/page.tsx`
- Create: `tests/security-boundaries.test.ts`
- Modify: `tests/auth-hydration.test.ts`
- Modify: `scripts/test.mjs`

**Interfaces:**
- Produce `resolveSafeRedirectPath(candidate, fallback): string` accepting only a leading single-slash path and rejecting protocol-relative, credential, backslash, control-character, and cross-origin forms.
- Produce `createContentSecurityPolicy({ nonce, isDevelopment, supabaseOrigin }): string` with nonce/strict-dynamic scripts and production-only HTTPS upgrade.
- `updateSession` treats `/login`, `/about`, and `/auth/callback` as public and preserves CSP plus refreshed cookies on all responses.

- [ ] Write failing table-driven tests for malicious redirect values, public route policy, CSP development/production differences, and stale dev-session reconciliation.
- [ ] Run `npm test` and confirm expected failures.
- [ ] Implement safe redirect and CSP helpers, then integrate proxy/session handling.
- [ ] Remove the duplicate hard navigation from dev login and make profile partial failure explicit.
- [ ] Run focused tests, `npm test`, and unauthenticated route probes.

### Task 3: Route payload and runtime performance

**Files:**
- Modify: `src/widgets/CockpitWorkspace/CockpitWorkspace.tsx`
- Modify: `src/entities/model/DataProvider.tsx`
- Delete: `src/shared/ui/InteractiveDotGrid.tsx`
- Modify: `src/app/layout.tsx`
- Create/modify route-group layouts and move existing page files without changing their URLs.
- Modify: `tests/workspace-navigation.test.tsx`
- Create: `tests/runtime-architecture.test.tsx`
- Modify: `scripts/test.mjs`

**Interfaces:**
- Each workspace is a `next/dynamic` named export with the matching existing skeleton fallback.
- Root layout contains document chrome only; protected routes use a dedicated provider layout; login uses its minimal provider layout; about has no data provider.
- `loadData` starts connectivity and seven entity reads before awaiting the combined result.

- [ ] Write failing architecture tests that import the real modules and verify lazy workspace boundaries, absence of global canvas, minimal public layout, and concurrent load orchestration.
- [ ] Run `npm test` and confirm expected failures.
- [ ] Implement route grouping/provider ownership, dynamic workspace imports, and concurrent data load.
- [ ] Delete the canvas component and retain `bg-dot-grid` as the static background.
- [ ] Run `npm test`, typecheck, build, and measure production route chunks.

### Task 4: UI resilience, accessibility, and responsive behavior

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/app/not-found.tsx`
- Modify: `src/widgets/Calculator/ClientReceiptModal.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/widgets/Orders/components/v2/OrdersV2FilterBar.tsx`
- Modify: `src/widgets/Orders/components/v2/OrderContactsModal.tsx`
- Modify icon-only window controls found by accessibility audit.
- Create: `tests/ui-resilience.test.tsx`
- Modify: `e2e/auth.spec.ts`
- Create: `e2e/routes-and-accessibility.spec.ts`

**Interfaces:**
- Receipt handlers always clear `isExporting` in `finally` and surface a toast/error state.
- Login controls have stable `id`, `name`, `htmlFor`, `autoComplete`, and icon-button `aria-label` values.
- Orders toolbar has no document-level horizontal overflow at 1000px.

- [ ] Write failing unit/E2E checks for export failure cleanup, named form controls, public routes, route smoke coverage, and 1000px toolbar bounds.
- [ ] Run focused tests and confirm expected failures.
- [ ] Add cockpit error/loading/not-found surfaces and the minimal accessibility/responsive fixes.
- [ ] Replace the native contact select with `CockpitDropdown`.
- [ ] Run unit tests and targeted Playwright tests at mobile, 1000px, and desktop widths.

### Task 5: Motion compliance, lint, dead code, and maintainability

**Files:**
- Delete the 15 dead component files identified in the audit and remove stale exports.
- Modify all files reported by ESLint.
- Modify files containing Tailwind/CSS `transition-*`, `animate-*`, or scale gesture utilities.
- Split cohesive helpers/subviews from the largest actively modified modules when that reduces their responsibility without changing behavior.

**Interfaces:**
- No import from `framer-motion` remains.
- No CSS/Tailwind animation or transition utility remains; retained animations use `motion/react` and reduced-motion support.
- `npm run lint` produces zero errors and zero warnings.
- `rg` finds no trailing whitespace, prohibited `§`, native `<select>`, or dead symbol declaration.

- [ ] Delete confirmed unreferenced components first and run typecheck.
- [ ] Replace legacy Motion imports and remove/convert non-Motion animation utilities in same-shape batches.
- [ ] Resolve hook purity/state/dependency findings by changing data flow, not by disabling rules.
- [ ] Replace explicit `any`, remove unused symbols, apply `prefer-const`, and remove relative `window.location` assignment.
- [ ] Extract cohesive units from oversized active files touched by the cleanup.
- [ ] Trim trailing whitespace and run lint/typecheck until clean.

### Task 6: Final coverage, audit, and review

**Files:**
- Modify/add tests only where a realistic mutation remains unprotected.
- Update this plan's SDD ledger and review artifacts under the ignored `.superpowers` workspace.

**Interfaces:**
- All app routes have smoke coverage; critical data/auth/security behaviors have regression coverage.
- Final audit reproduces no prior confirmed defect.

- [ ] Run `npm test` and record passed/failed counts.
- [ ] Run `npm run test:e2e` and record passed/failed counts plus `playwright-report/index.html`.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- [ ] Run `npm audit --json`, secret scan, production bundle measurement, and forbidden-pattern/dead-code scans.
- [ ] Use Playwright MCP to inspect console, network, accessibility names, `/about`, login, all workspaces, and 1000px responsive layout.
- [ ] Dispatch a final whole-diff code review, address important findings, rerun affected and full gates, and leave the working tree ready for user review without pushing.
