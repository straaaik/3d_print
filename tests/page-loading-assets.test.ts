import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForPageImage } from '../src/shared/ui/page-transition/waitForPageAssets';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class ImageStub extends EventTarget {
  currentSrc = 'first.png'; src = 'first.png'; naturalWidth = 100; complete = true; loading = 'eager';
  style = { visibility: '' }; attributes = new Map<string, string>();
  decodeWork = deferred();
  decode = () => this.decodeWork.promise;
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
}

test('cancelled decode cannot hide an image belonging to the next page', async () => {
  const img = new ImageStub();
  const controller = new AbortController();
  const result = waitForPageImage(img as unknown as HTMLImageElement, controller.signal);
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  img.currentSrc = 'next.png';
  img.decodeWork.reject(new Error('old decode'));
  await Promise.resolve();
  assert.equal(img.style.visibility, '');
});

test('changing currentSrc during decode waits for the new source', async () => {
  const img = new ImageStub();
  const old = img.decodeWork;
  const result = waitForPageImage(img as unknown as HTMLImageElement, new AbortController().signal);
  let done = false;
  void result.then(() => { done = true; });
  img.currentSrc = 'next.png';
  img.complete = false;
  img.decodeWork = deferred();
  old.resolve();
  await Promise.resolve();
  assert.equal(done, false);
  img.complete = true;
  img.dispatchEvent(new Event('load'));
  img.decodeWork.resolve();
  await result;
  assert.equal(done, true);
});

test('a broken picture resolves with a stable reserved box', async () => {
  const img = new ImageStub();
  img.naturalWidth = 0;
  await waitForPageImage(img as unknown as HTMLImageElement, new AbortController().signal);
  assert.equal(img.style.visibility, 'hidden');
  assert.equal(img.attributes.get('data-page-image-failed'), 'true');
});
