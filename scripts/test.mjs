import { copyFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDirectory = resolve('.test-dist');
const tscScript = resolve('node_modules', 'typescript', 'bin', 'tsc');
rmSync(outputDirectory, { recursive: true, force: true });
try {
  const compileRuntimeArchitecture = spawnSync(process.execPath, [tscScript,
    '--project', resolve('tsconfig.json'),
    '--outDir', outputDirectory,
    '--noEmit', 'false',
    '--incremental', 'false',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2022',
    '--jsx', 'react-jsx',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { stdio: 'inherit' });
  if (compileRuntimeArchitecture.status !== 0) process.exit(compileRuntimeArchitecture.status ?? 1);
  mkdirSync(resolve(outputDirectory, 'src', 'app'), { recursive: true });
  copyFileSync(resolve('src', 'app', 'globals.css'), resolve(outputDirectory, 'src', 'app', 'globals.css'));

  const run = spawnSync(process.execPath, [
    '--require',
    resolve('tests', 'register-aliases.cjs'),
    '--test',
    resolve(outputDirectory, 'tests', 'business-orders.test.js'),
    resolve(outputDirectory, 'tests', 'order-items-ui.test.js'),
    resolve(outputDirectory, 'tests', 'order-items-editor.test.js'),
    resolve(outputDirectory, 'tests', 'order-financial-semantics.test.js'),
    resolve(outputDirectory, 'tests', 'product-calculation.test.js'),
    resolve(outputDirectory, 'tests', 'product-calculation-editor.test.js'),
    resolve(outputDirectory, 'tests', 'catalog-commands.test.js'),
    resolve(outputDirectory, 'tests', 'calculator-project-ui.test.js'),
    resolve(outputDirectory, 'tests', 'project-orders.test.js'),
    resolve(outputDirectory, 'tests', 'calculation-projects.test.js'),
    resolve(outputDirectory, 'tests', 'calculation-draft.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-projection.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-engine.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-repository.test.js'),
    resolve(outputDirectory, 'tests', 'color-picker.test.js'),
    resolve(outputDirectory, 'tests', 'foundation-storage.test.js'),
    resolve(outputDirectory, 'tests', 'phase1-calculation-engine.test.js'),
    resolve(outputDirectory, 'tests', 'phase1-number-input.test.js'),
    resolve(outputDirectory, 'tests', 'phase1-calculation-receipt.test.js'),
    resolve(outputDirectory, 'tests', 'calculator-state.test.js'),
    resolve(outputDirectory, 'tests', 'workshop.test.js'),
    resolve(outputDirectory, 'tests', 'workshop-persistence.test.js'),
    resolve(outputDirectory, 'tests', 'page-loading-assets.test.js'),
    resolve(outputDirectory, 'tests', 'page-loading-overlay.test.js'),
    resolve(outputDirectory, 'tests', 'page-loading-data.test.js'),
    resolve(outputDirectory, 'tests', 'page-transition-model.test.js'),
    resolve(outputDirectory, 'tests', 'formulas.test.js'),
    resolve(outputDirectory, 'tests', 'number-counter.test.js'),
    resolve(outputDirectory, 'tests', 'stats-calculator.test.js'),
    resolve(outputDirectory, 'tests', 'stats-components.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-cockpit.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-icons.test.js'),
    resolve(outputDirectory, 'tests', 'admin-settings-model.test.js'),
    resolve(outputDirectory, 'tests', 'workspace-navigation.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-registry-table.test.js'),
    resolve(outputDirectory, 'tests', 'auth-hydration.test.js'),
    resolve(outputDirectory, 'tests', 'security-boundaries.test.js'),
    resolve(outputDirectory, 'tests', 'products-v2.test.js'),
    resolve(outputDirectory, 'tests', 'data-backup.test.js'),
    resolve(outputDirectory, 'tests', 'business-backup.test.js'),
    resolve(outputDirectory, 'tests', 'atomic-local-snapshot.test.js'),
    resolve(outputDirectory, 'tests', 'database-maintenance.test.js'),
    resolve(outputDirectory, 'tests', 'ui-resilience.test.js'),
    resolve(outputDirectory, 'tests', 'table-sort.test.js'),
    resolve(outputDirectory, 'tests', 'runtime-architecture.test.js'),
    resolve(outputDirectory, 'tests', 'color-utils.test.js'),
    resolve(outputDirectory, 'tests', 'hub-icon-preferences.test.js'),
    resolve(outputDirectory, 'tests', 'assembly-totals.test.js'),
    resolve(outputDirectory, 'tests', 'products-search.test.js'),
    resolve(outputDirectory, 'tests', 'receipt-template.test.js'),
    resolve(outputDirectory, 'tests', 'order-contacts-modal.test.js'),
    resolve(outputDirectory, 'tests', 'inventory-spool-background.test.js'),
    resolve(outputDirectory, 'tests', 'cockpit-delete-modal.test.js'),
    resolve(outputDirectory, 'tests', 'round-modals.test.js'),
    resolve(outputDirectory, 'tests', 'order-payment.test.js'),
  ], { stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
