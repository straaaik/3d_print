---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance, eliminate async waterfalls, reduce bundle size, and optimize rendering.
---

# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications, based on Vercel Engineering best practices.

## When to Apply

Reference these guidelines when:
- Writing new React components or Next.js pages/routes
- Implementing data fetching (client-side or server-side)
- Reviewing code for performance bottlenecks or async waterfalls
- Refactoring existing React/Next.js code
- Optimizing bundle size, Core Web Vitals (LCP, INP, CLS), and load times

---

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| **1** | **Eliminating Waterfalls** | **CRITICAL** | `async-` |
| **2** | **Bundle Size Optimization** | **CRITICAL** | `bundle-` |
| **3** | **Server-Side Performance** | **HIGH** | `server-` |
| **4** | **Client-Side Data Fetching** | **MEDIUM-HIGH** | `client-` |
| **5** | **Re-render Optimization** | **MEDIUM** | `rerender-` |
| **6** | **Rendering Performance** | **MEDIUM** | `rendering-` |
| **7** | **JavaScript Performance** | **LOW-MEDIUM** | `js-` |
| **8** | **Advanced Patterns** | **LOW** | `advanced-` |

---

## 1. Eliminating Waterfalls (CRITICAL)

### `async-parallel` — Use `Promise.all()` for Independent Operations
Execute independent asynchronous operations concurrently instead of sequentially.
```typescript
// ❌ BAD: Sequential waterfall
const user = await fetchUser(id);
const posts = await fetchPosts(id);
const settings = await fetchSettings(id);

// ✅ GOOD: Parallel execution
const [user, posts, settings] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchSettings(id)
]);
```

### `async-defer-await` — Move `await` into Branches Where Used
Do not await promises before branching logic if the value is only needed in one branch.
```typescript
// ❌ BAD: Awaits unnecessarily even if cache hit
const remoteData = await fetchRemoteData();
if (cache.has(key)) return cache.get(key);
return remoteData;

// ✅ GOOD: Defer await
if (cache.has(key)) return cache.get(key);
const remoteData = await fetchRemoteData();
return remoteData;
```

### `async-cheap-condition-before-await` — Check Cheap Sync Conditions First
Validate local parameters and cheap conditions before triggering expensive remote calls.
```typescript
// ❌ BAD
const session = await getSession();
if (!userId) return null;

// ✅ GOOD
if (!userId) return null;
const session = await getSession();
```

### `async-suspense-boundaries` — Stream Content with React Suspense
Wrap slower dynamic sections in `<Suspense>` boundaries to unblock fast static shell rendering.
```tsx
// ✅ GOOD: Instant shell + streamed dynamic content
export default function Page() {
  return (
    <main>
      <Header />
      <Suspense fallback={<FeedSkeleton />}>
        <DynamicFeed />
      </Suspense>
    </main>
  );
}
```

---

## 2. Bundle Size Optimization (CRITICAL)

### `bundle-barrel-imports` — Import Directly, Avoid Barrel Files
Direct imports allow tree-shaking tools and bundlers to skip parsing thousands of unused modules.
```typescript
// ❌ BAD: Pulls entire library index into compilation
import { Check, ArrowRight } from "lucide-react";

// ✅ GOOD (when barrel is heavy): Direct import or modular transforms
import Check from "lucide-react/dist/esm/icons/check";
```

### `bundle-dynamic-imports` — Lazy Load Heavy Components
Use `next/dynamic` or `React.lazy` for dialogs, charts, 3D viewers, and rich text editors.
```tsx
import dynamic from "next/dynamic";

const Heavy3DCanvas = dynamic(() => import("@/components/ThreeCanvas"), {
  ssr: false,
  loading: () => <CanvasPlaceholder />
});
```

### `bundle-defer-third-party` — Defer Analytics and Non-Critical Scripts
Load third-party widgets, chat tools, and analytics after initial hydration using `next/script` with `strategy="afterInteractive"` or `strategy="lazyOnload"`.

---

## 3. Server-Side Performance (HIGH)

### `server-cache-react` — Use `React.cache()` for Per-Request Deduplication
Wrap data-fetching helper functions in `React.cache()` to share identical database or API queries across multiple server components in a single render pass.
```typescript
import { cache } from "react";

export const getCurrentUser = cache(async (userId: string) => {
  return await db.users.findUnique({ where: { id: userId } });
});
```

### `server-dedup-props` — Avoid Duplicate Serialization in RSC Props
Pass only the minimal required fields from Server Components to Client Components rather than giant nested database objects.

### `server-auth-actions` — Always Authenticate Server Actions
Treat Server Actions as public API endpoints. Always verify session and permissions at the beginning of the action.

---

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

- Use specialized libraries (SWR, TanStack Query) with stale-while-revalidate caching and deduplication.
- Implement **Optimistic Updates** for instant user feedback on mutations.
- Avoid duplicate fetches on focus unless data is frequently changing.

---

## 5. Re-render & Rendering Performance (MEDIUM)

### State Colocation
Keep state as close as possible to where it is consumed. Pushing state up causes entire subtrees to re-render unnecessarily.

### Stable Callbacks & Values
- Use `useCallback` when passing functions to memoized children (`React.memo`).
- Use `useMemo` for computationally expensive transforms or when creating referentially stable dependencies for `useEffect`.

### Fast Layout & CSS
- Animate `transform` and `opacity` exclusively to trigger GPU compositing instead of CPU reflows (`top`, `left`, `width`, `height`).
- Use `content-visibility: auto` on long scrollable lists.

---

## 6. JavaScript Performance & Micro-optimizations

- **Map/Set for Lookups**: Use `Set` for `has()` checks (`O(1)`) instead of `Array.includes()` (`O(N)`).
- **Index-by-ID**: Convert array lists to `Record<string, Item>` or `Map` when doing frequent entity lookups by ID.
