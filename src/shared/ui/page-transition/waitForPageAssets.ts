/** Wait for paintable, explicitly bounded first-view resources, never network idle. */
function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Page changed', 'AbortError');
}

export function nextPageFrame(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAbort(signal);
    const abort = () => { cancelAnimationFrame(frame); reject(new DOMException('Page changed', 'AbortError')); };
    const frame = requestAnimationFrame(() => { signal.removeEventListener('abort', abort); resolve(); });
    signal.addEventListener('abort', abort, { once: true });
  });
}

function waitForChildren(root: HTMLElement, signal: AbortSignal): Promise<void> {
  if (!root.querySelector('[data-page-pending]')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => { observer.disconnect(); signal.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Page changed', 'AbortError')); };
    const observer = new MutationObserver(() => {
      if (!root.querySelector('[data-page-pending]')) { cleanup(); resolve(); }
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-page-pending'] });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function waitForPageImage(img: HTMLImageElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const source = () => img.currentSrc || img.src;
    const cleanup = () => { img.removeEventListener('load', done); img.removeEventListener('error', failed); signal.removeEventListener('abort', abort); };
    const finish = () => { if (settled) return; settled = true; cleanup(); resolve(); };
    const abort = () => { if (settled) return; settled = true; cleanup(); reject(new DOMException('Page changed', 'AbortError')); };
    const failed = () => {
      if (settled || signal.aborted) return;
      img.style.visibility = 'hidden';
      img.setAttribute('data-page-image-failed', 'true');
      finish();
    };
    const done = () => {
      if (settled || signal.aborted) return;
      if (img.naturalWidth === 0) { failed(); return; }
      const expected = source();
      const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
      const verify = (broken: boolean) => {
        if (settled || signal.aborted) return;
        if (source() !== expected) {
          if (img.complete) done();
          return;
        }
        if (broken) failed(); else finish();
      };
      void decoded.then(() => verify(false), () => verify(true));
    };
    signal.addEventListener('abort', abort, { once: true });
    img.addEventListener('load', done); img.addEventListener('error', failed);
    if (signal.aborted) abort();
    else if (img.complete) done();
    else img.loading = 'eager';
  });
}

export function pageAssetSignature(root: HTMLElement): string {
  return Array.from(root.querySelectorAll('img')).map(img => [img.currentSrc, img.src, img.srcset, img.sizes, img.complete].join('|')).join('\n');
}

export async function waitForPageAssets(root: HTMLElement, signal: AbortSignal): Promise<void> {
  checkAbort(signal);
  await waitForChildren(root, signal);
  await nextPageFrame(signal);
  const fonts = document.fonts;
  if (fonts) {
    const styles = getComputedStyle(document.documentElement);
    await Promise.all(['--font-inter', '--font-jetbrains-mono'].map(key => {
      const family = styles.getPropertyValue(key).trim();
      return family ? fonts.load(`12px ${family}`).catch(() => []) : Promise.resolve([]);
    }));
  }
  checkAbort(signal);
  const images = Array.from(root.querySelectorAll('img')).filter(img => {
    if (img.hasAttribute('data-page-critical')) return true;
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  });
  await Promise.all(images.map(img => waitForPageImage(img, signal)));
  checkAbort(signal);
}
