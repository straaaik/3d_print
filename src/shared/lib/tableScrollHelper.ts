export const ROW_ELEVATION_EASE = [0.22, 1, 0.36, 1] as const;
export const DRAWER_EXPAND_DURATION = 0.68;
export const ROW_ELEVATION_DURATION = 0.64;
export const SURFACE_FADE_DURATION = 0.65;
export const DRAWER_OPACITY_DURATION = 0.52;

export interface ElevationScrollParams {
  rowTop: number;
  rowHeight: number;
  drawerHeight: number;
  viewportHeight: number;
  currentScrollY: number;
  minTopPadding?: number;
}

export interface ElevationScrollResult {
  shouldScroll: boolean;
  targetScrollY: number;
  scrollDiff: number;
}

/**
 * Pure calculation for determining whether an elevated row and its drawer
 * extend below the viewport, and calculating the exact scroll offset to center it.
 */
export function calculateElevatedScrollPosition({
  rowTop,
  rowHeight,
  drawerHeight,
  viewportHeight,
  currentScrollY,
  minTopPadding = 24,
}: ElevationScrollParams): ElevationScrollResult {
  const effectiveRowHeight = rowHeight > 0 ? rowHeight : 48;
  const effectiveDrawerHeight = drawerHeight > 0 ? drawerHeight : 320;
  const totalExpandedHeight = effectiveRowHeight + effectiveDrawerHeight;
  const projectedBottom = rowTop + totalExpandedHeight;

  // Condition: only scroll if it opens below the viewport (or if top is severely clipped)
  const isBelowViewport = projectedBottom > viewportHeight - 20;
  const isAboveViewport = rowTop < minTopPadding;

  if (!isBelowViewport && !isAboveViewport) {
    return {
      shouldScroll: false,
      targetScrollY: currentScrollY,
      scrollDiff: 0,
    };
  }

  const rowDocTop = rowTop + currentScrollY;
  const elementCenter = rowDocTop + (totalExpandedHeight / 2);
  const desiredScrollY = elementCenter - (viewportHeight / 2);

  // Safety clamp: top of the row should never be hidden above viewport
  const maxAllowedScrollY = Math.max(0, rowDocTop - minTopPadding);
  const finalScrollY = Math.max(0, Math.min(desiredScrollY, maxAllowedScrollY));
  const scrollDiff = finalScrollY - currentScrollY;

  return {
    shouldScroll: Math.abs(scrollDiff) >= 8,
    targetScrollY: finalScrollY,
    scrollDiff,
  };
}

let activeScrollCancel: (() => void) | null = null;

/**
 * Automatically centers an elevated table row and its drawer in the viewport
 * if the expanded menu extends below the bottom edge of the viewport.
 */
export function autoScrollElevatedRowIntoView(
  rowElement: HTMLElement | null,
  duration = 680
): (() => void) | undefined {
  if (typeof window === 'undefined' || !rowElement) return undefined;

  if (activeScrollCancel) {
    activeScrollCancel();
    activeScrollCancel = null;
  }

  const rowRect = rowElement.getBoundingClientRect();
  const drawerEl = rowElement.querySelector<HTMLElement>('[data-row-drawer="true"]');
  const drawerHeight = drawerEl ? (drawerEl.scrollHeight || drawerEl.offsetHeight || 320) : 320;

  // Header height of the row excluding drawer
  const firstCell = rowElement.querySelector<HTMLElement>('td') || (rowElement.firstElementChild as HTMLElement | null);
  const rowHeaderHeight = firstCell ? (firstCell.offsetHeight || 48) : 48;

  const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  const viewportHeight = window.innerHeight;

  const { shouldScroll, targetScrollY, scrollDiff } = calculateElevatedScrollPosition({
    rowTop: rowRect.top,
    rowHeight: rowHeaderHeight,
    drawerHeight,
    viewportHeight,
    currentScrollY,
  });

  if (!shouldScroll) return undefined;

  // Instant scroll if prefers-reduced-motion is active
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: targetScrollY, behavior: 'auto' });
    return undefined;
  }

  let rafId: number;
  const startTime = performance.now();

  const cancel = () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchmove', cancel);
    if (activeScrollCancel === cancel) {
      activeScrollCancel = null;
    }
  };

  activeScrollCancel = cancel;
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchmove', cancel, { passive: true });

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Quintic ease-out curve matching [0.22, 1, 0.36, 1]
    const ease = 1 - Math.pow(1 - progress, 4);
    const nextY = currentScrollY + scrollDiff * ease;

    window.scrollTo(0, nextY);

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      cancel();
    }
  };

  rafId = requestAnimationFrame(step);
  return cancel;
}
