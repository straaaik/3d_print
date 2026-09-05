# Full Audit Remediation Design

## Goal

Remove every confirmed defect from the 2026-09-05 audit while preserving current product behavior and the Meridian Cockpit Console visual language.

## Constraints

- Work on the existing `test` branch; do not push without an explicit push request.
- Do not install, remove, or update npm packages.
- Do not change the Postgres schema: the fixes must use the existing Supabase tables and RLS policies.
- Use `motion/react` for retained interface animation and remove CSS/Tailwind animation utilities.
- Keep an offline `localStorage` fallback, but never report a cloud mutation as successful when Supabase returned an error.
- Preserve existing URLs and user data formats; backup files gain a version while remaining able to import the previous shape.
- Use test-first changes for observable behavior and run the full existing test and E2E suites before completion.

## Architecture

### Data safety

Move backup parsing and normalization into a pure module. A backup contains filaments, printers, settings, saved calculations, collections, orders, monthly goals, export timestamp, and format version. Import validates every entity collection before writing anything. The DataProvider owns restoration so it can update Supabase through the existing API and then refresh React state.

Bulk database helpers must inspect every Supabase `{ error }` response and throw a descriptive aggregate error. Local caches are changed only after cloud operations have succeeded, or when there is no authenticated cloud client. Full reset clears the offline sync queue so deleted rows cannot be replayed. Seeding checks every insert and exposes failure to the UI.

### Authentication and routing

OAuth callback destinations are accepted only when they are same-origin absolute paths. `/login`, `/about`, and `/auth/callback` are public in both client and proxy policy. The development session uses the server cookie as the authority; local storage is only a hydration hint and is cleared when the cookie is absent.

Email/profile updates validate input and update the profile only after Auth accepts the email change. If profile persistence fails after an email request, the action returns a specific partial-update error and refreshes the client user instead of presenting stale success.

The proxy generates a per-request CSP nonce, propagates it through request and response headers, preserves refreshed Supabase cookies across redirects, and omits `upgrade-insecure-requests` in development. Production scripts use a nonce instead of `unsafe-inline`; inline style support remains because Motion and React render style attributes.

### Rendering and performance

`CockpitWorkspace` dynamically imports each workspace with its existing skeleton so only the active section is loaded. Data connection checking and entity reads start concurrently. The interactive canvas is removed in favor of the existing static `bg-dot-grid`, eliminating RAF, pointer listeners, glow, and duplicate canvas buffers.

Global providers are split by route concern: the root layout owns fonts and document chrome; authenticated application routes own Data/Order/AuthGuard/Motion providers; login owns only Auth and Toast requirements; about stays lightweight.

### UI resilience and accessibility

Add App Router loading, not-found, segment error, and global error surfaces in the cockpit style. Receipt print/export always clears pending state and reports failure. Login and filter inputs receive programmatic labels, names, and autocomplete metadata; icon-only controls receive accessible names. The orders filter bar wraps without horizontal clipping at intermediate widths.

Native select usage is replaced by `CockpitDropdown`. Legacy `framer-motion` imports become `motion/react`. Retained motion respects reduced-motion preferences. Tailwind/CSS transition, animation, and scale gesture utilities are removed where no Motion component owns the interaction.

### Maintainability

Delete the 15 confirmed dead components and stale barrel exports. Resolve all ESLint errors and warnings by removing unused code, deriving state during render where possible, moving imperative synchronization to event handlers/effects, stabilizing hook dependencies, and replacing unsafe `any` types. Split only the largest files along existing cohesive boundaries; do not redesign product behavior.

## Verification

- Regression unit tests cover backup completeness/validation, safe OAuth destinations, CSP construction, reset error propagation, sync-queue clearing, dev-session reconciliation, and parallel data loading.
- E2E covers every route, public `/about`, login accessibility, development login, the 1000px orders toolbar, error surfaces where practical, and existing visual snapshots.
- Final gates: `npm test`, `npm run test:e2e`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --json`, production bundle measurement, secret scan, and a fresh runtime accessibility/network/console audit.
