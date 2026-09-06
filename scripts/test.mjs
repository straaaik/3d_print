import { copyFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDirectory = resolve('.test-dist');
const tscScript = resolve('node_modules', 'typescript', 'bin', 'tsc');
const unitTestFiles = [
  'tests/formulas.test.ts',
  'tests/number-counter.test.tsx',
  'tests/stats-calculator.test.ts',
  'tests/stats-components.test.tsx',
  'tests/inventory-cockpit.test.ts',
  'tests/inventory-icons.test.tsx',
  'tests/admin-settings-model.test.ts',
  'tests/workspace-navigation.test.tsx',
  'tests/inventory-registry-table.test.tsx',
  'tests/auth-hydration.test.ts',
  'tests/security-boundaries.test.ts',
  'tests/products-v2.test.tsx',
  'tests/data-backup.test.ts',
  'tests/database-maintenance.test.ts',
  'tests/ui-resilience.test.tsx',
];

rmSync(outputDirectory, { recursive: true, force: true });
try {
  const compile = spawnSync(process.execPath, [tscScript,
    ...unitTestFiles,
    '--outDir', outputDirectory,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2022',
    '--jsx', 'react-jsx',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { stdio: 'inherit' });
  if (compile.status !== 0) process.exit(compile.status ?? 1);

  const compileRuntimeArchitecture = spawnSync(process.execPath, [tscScript,
    '--project', resolve('tsconfig.json'),
    '--outDir', outputDirectory,
    '--noEmit', 'false',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2022',
    '--jsx', 'react-jsx',
    '--esModuleInterop',
    '--skipLibCheck',
  ], { stdio: 'inherit' });
  if (compileRuntimeArchitecture.status !== 0) process.exit(compileRuntimeArchitecture.status ?? 1);
  copyFileSync(resolve('src', 'app', 'globals.css'), resolve(outputDirectory, 'src', 'app', 'globals.css'));

  const run = spawnSync(process.execPath, [
    '--require',
    resolve('tests', 'register-aliases.cjs'),
    '--test',
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
    resolve(outputDirectory, 'tests', 'database-maintenance.test.js'),
    resolve(outputDirectory, 'tests', 'ui-resilience.test.js'),
    resolve(outputDirectory, 'tests', 'runtime-architecture.test.js'),
  ], { stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
