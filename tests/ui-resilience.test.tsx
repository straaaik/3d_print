import assert from 'node:assert/strict';
import test from 'node:test';
import {
  performReceiptAction,
  type ReceiptPrintWindow,
} from '../src/widgets/Calculator/ClientReceiptModal';

function createPrintWindow(print: () => void = () => undefined): {
  printWindow: ReceiptPrintWindow;
  triggerLoad: () => void;
  triggerError: () => void;
  events: string[];
} {
  let onLoad: (() => void) | undefined;
  let onError: (() => void) | undefined;
  const events: string[] = [];

  return {
    events,
    triggerLoad: () => onLoad?.(),
    triggerError: () => onError?.(),
    printWindow: {
      document: {
        write: () => events.push('write'),
        close: () => events.push('document-close'),
      },
      addEventListener: (type, listener) => {
        if (type === 'load') onLoad = listener;
        if (type === 'error') onError = listener;
      },
      removeEventListener: () => undefined,
      print: () => {
        events.push('print');
        print();
      },
      close: () => events.push('close'),
    },
  };
}

function createReceiptActionDependencies(overrides: Partial<Parameters<typeof performReceiptAction>[1]> = {}) {
  const pendingStates: boolean[] = [];
  const reportedErrors: string[] = [];
  const downloads: string[] = [];
  const copied: string[] = [];

  return {
    pendingStates,
    reportedErrors,
    downloads,
    copied,
    dependencies: {
      receiptNode: {} as HTMLDivElement,
      orderNumber: '3DL-TEST',
      toBlob: async () => new Blob(['receipt']),
      toPng: async () => 'data:image/png;base64,receipt',
      clipboard: { write: async () => { copied.push('clipboard'); } },
      createClipboardItem: () => ({}) as ClipboardItem,
      downloadPng: (dataUrl: string) => downloads.push(dataUrl),
      openPrintWindow: () => null,
      fallbackPrint: () => copied.push('fallback-print'),
      onCopied: () => copied.push('copied'),
      setIsExporting: (isExporting: boolean) => pendingStates.push(isExporting),
      reportError: (message: string) => reportedErrors.push(message),
      ...overrides,
    },
  };
}

test('receipt copy falls back to PNG download and clears pending state', async () => {
  const fixture = createReceiptActionDependencies({ toBlob: async () => null });

  await performReceiptAction('copy', fixture.dependencies);

  assert.deepEqual(fixture.pendingStates, [true, false]);
  assert.deepEqual(fixture.downloads, ['data:image/png;base64,receipt']);
  assert.deepEqual(fixture.reportedErrors, []);
});

test('receipt download reports renderer failure and clears pending state', async () => {
  const pendingStates: boolean[] = [];
  const reportedErrors: string[] = [];

  const fixture = createReceiptActionDependencies({
    toPng: async () => { throw new Error('image renderer unavailable'); },
    setIsExporting: (isExporting: boolean) => pendingStates.push(isExporting),
    reportError: (message: string) => reportedErrors.push(message),
  });

  await performReceiptAction('download', fixture.dependencies);

  assert.deepEqual(pendingStates, [true, false]);
  assert.deepEqual(reportedErrors, ['Не удалось подготовить чек. Повторите попытку.']);
});

test('receipt renderer loads lazily inside the export lifecycle', async () => {
  let rendererLoads = 0;
  const fixture = createReceiptActionDependencies({
    toBlob: undefined,
    toPng: undefined,
    loadRenderer: async () => {
      rendererLoads += 1;
      return {
        toBlob: async () => new Blob(['receipt']),
        toPng: async () => 'data:image/png;base64,lazy-receipt',
      };
    },
  });

  assert.equal(rendererLoads, 0);
  await performReceiptAction('download', fixture.dependencies);

  assert.equal(rendererLoads, 1);
  assert.deepEqual(fixture.pendingStates, [true, false]);
  assert.deepEqual(fixture.downloads, ['data:image/png;base64,lazy-receipt']);
});

test('receipt print opens its popup before the lazy renderer starts', async () => {
  const print = createPrintWindow();
  const events: string[] = [];
  let resolveRenderer: ((renderer: { toBlob: () => Promise<Blob>; toPng: () => Promise<string> }) => void) | undefined;
  const fixture = createReceiptActionDependencies({
    toBlob: undefined,
    toPng: undefined,
    openPrintWindow: () => {
      events.push('open');
      return print.printWindow;
    },
    loadRenderer: () => {
      events.push('renderer-start');
      return new Promise((resolve) => {
        resolveRenderer = resolve;
      });
    },
  });

  const pending = performReceiptAction('print', fixture.dependencies);
  assert.deepEqual(events, ['open', 'renderer-start']);
  resolveRenderer?.({
    toBlob: async () => new Blob(['receipt']),
    toPng: async () => 'data:image/png;base64,receipt',
  });
  await Promise.resolve();
  await Promise.resolve();
  print.triggerLoad();
  await pending;

  assert.deepEqual(print.events, ['write', 'document-close', 'print', 'close']);
  assert.deepEqual(fixture.pendingStates, [true, false]);
});

test('receipt print reports a blocked popup without printing the application', async () => {
  const fixture = createReceiptActionDependencies({
    openPrintWindow: () => null,
  });

  await performReceiptAction('print', fixture.dependencies);

  assert.deepEqual(fixture.copied, []);
  assert.deepEqual(fixture.pendingStates, [true, false]);
  assert.deepEqual(fixture.reportedErrors, ['Не удалось подготовить чек. Повторите попытку.']);
});

test('receipt print closes an opened popup when renderer setup or rendering fails', async () => {
  const failures = [
    {
      name: 'loader',
      overrides: {
        toBlob: undefined,
        toPng: undefined,
        loadRenderer: async () => { throw new Error('renderer import failed'); },
      },
    },
    {
      name: 'render',
      overrides: {
        toPng: async () => { throw new Error('renderer failed'); },
      },
    },
  ] as const;

  for (const failure of failures) {
    const print = createPrintWindow();
    const fixture = createReceiptActionDependencies({
      ...failure.overrides,
      openPrintWindow: () => print.printWindow,
    });

    await performReceiptAction('print', fixture.dependencies);

    assert.deepEqual(print.events, ['close'], `${failure.name} closes the blank popup`);
    assert.deepEqual(fixture.pendingStates, [true, false], `${failure.name} clears pending state`);
    assert.deepEqual(
      fixture.reportedErrors,
      ['Не удалось подготовить чек. Повторите попытку.'],
      `${failure.name} reports the failure`,
    );
  }
});

test('receipt print remains pending until the print window loads, prints, and closes', async () => {
  const print = createPrintWindow();
  const fixture = createReceiptActionDependencies({ openPrintWindow: () => print.printWindow });

  const pending = performReceiptAction('print', fixture.dependencies);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(fixture.pendingStates, [true]);
  assert.deepEqual(print.events, ['write', 'document-close']);

  print.triggerLoad();
  await pending;

  assert.deepEqual(print.events, ['write', 'document-close', 'print', 'close']);
  assert.deepEqual(fixture.pendingStates, [true, false]);
  assert.deepEqual(fixture.reportedErrors, []);
});

test('receipt print reports a print failure and clears pending state after load', async () => {
  const print = createPrintWindow(() => { throw new Error('printer unavailable'); });
  const fixture = createReceiptActionDependencies({ openPrintWindow: () => print.printWindow });

  const pending = performReceiptAction('print', fixture.dependencies);
  await Promise.resolve();
  print.triggerLoad();
  await pending;

  assert.deepEqual(print.events, ['write', 'document-close', 'print', 'close']);
  assert.deepEqual(fixture.pendingStates, [true, false]);
  assert.deepEqual(fixture.reportedErrors, ['Не удалось подготовить чек. Повторите попытку.']);
});

test('receipt print reports window load errors and bounded timeouts', async () => {
  const loadError = createPrintWindow();
  const loadFixture = createReceiptActionDependencies({ openPrintWindow: () => loadError.printWindow });
  const pendingAfterLoadError = performReceiptAction('print', loadFixture.dependencies);
  await Promise.resolve();
  loadError.triggerError();
  await pendingAfterLoadError;

  assert.deepEqual(loadError.events, ['write', 'document-close', 'close']);
  assert.deepEqual(loadFixture.pendingStates, [true, false]);
  assert.deepEqual(loadFixture.reportedErrors, ['Не удалось подготовить чек. Повторите попытку.']);

  const timeout = createPrintWindow();
  const timeoutFixture = createReceiptActionDependencies({
    openPrintWindow: () => timeout.printWindow,
    printTimeoutMs: 1,
  });
  await performReceiptAction('print', timeoutFixture.dependencies);

  assert.deepEqual(timeout.events, ['write', 'document-close', 'close']);
  assert.deepEqual(timeoutFixture.pendingStates, [true, false]);
  assert.deepEqual(timeoutFixture.reportedErrors, ['Не удалось подготовить чек. Повторите попытку.']);
});
