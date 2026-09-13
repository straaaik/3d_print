import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateElevatedScrollPosition } from '../src/shared/lib/tableScrollHelper';

test('does not scroll if expanded row fits comfortably inside viewport', () => {
  const result = calculateElevatedScrollPosition({
    rowTop: 200,
    rowHeight: 48,
    drawerHeight: 300,
    viewportHeight: 900,
    currentScrollY: 100,
  });

  assert.equal(result.shouldScroll, false);
  assert.equal(result.targetScrollY, 100);
  assert.equal(result.scrollDiff, 0);
});

test('scrolls and centers row if it opens below the bottom of the viewport', () => {
  // rowTop: 650, total height: 48 + 320 = 368. Projected bottom = 1018 > 900 - 20 (880).
  const result = calculateElevatedScrollPosition({
    rowTop: 650,
    rowHeight: 48,
    drawerHeight: 320,
    viewportHeight: 900,
    currentScrollY: 500,
  });

  assert.equal(result.shouldScroll, true);
  // rowDocTop = 650 + 500 = 1150
  // center = 1150 + 184 = 1334
  // desiredScrollY = 1334 - 450 = 884
  assert.equal(result.targetScrollY, 884);
  assert.equal(result.scrollDiff, 384);

  // Verification of centering:
  // In new scroll position 884:
  // newRowTop = 1150 - 884 = 266px.
  // newRowBottom = 266 + 368 = 634px.
  // spaceAbove = 266px. spaceBelow = 900 - 634 = 266px.
  // Perfectly centered!
});

test('clamps target scroll so top of the row is never clipped under screen top', () => {
  // Drawer is taller than screen
  const result = calculateElevatedScrollPosition({
    rowTop: 400,
    rowHeight: 48,
    drawerHeight: 650,
    viewportHeight: 600,
    currentScrollY: 1000,
    minTopPadding: 24,
  });

  assert.equal(result.shouldScroll, true);
  // rowDocTop = 400 + 1000 = 1400.
  // maxAllowedScrollY = 1400 - 24 = 1376.
  assert.equal(result.targetScrollY, 1376);
  // Row top will start at 1400 - 1376 = 24px from top of viewport.
});

test('does not scroll if target scroll position is within 8px threshold', () => {
  // Tall drawer where projected bottom still exceeds viewport threshold even near target
  const rowDocTop = 1000;
  const currentScrollY = 978; // only 2px away from clamp target (1000 - 24 = 976)
  const rowTop = rowDocTop - currentScrollY; // 22px (< 24px minTopPadding, so isAboveViewport = true)

  const result = calculateElevatedScrollPosition({
    rowTop,
    rowHeight: 48,
    drawerHeight: 700,
    viewportHeight: 600,
    currentScrollY,
    minTopPadding: 24,
  });

  // Target is 1000 - 24 = 976.
  // currentScrollY is 978. Difference is -2px (< 8px threshold).
  assert.equal(result.targetScrollY, 976);
  assert.equal(result.scrollDiff, -2);
  assert.equal(result.shouldScroll, false);
});
