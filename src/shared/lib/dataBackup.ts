import type { Filament, Order, Printer, ProductCollection, SavedCalculation, Settings } from '../types';

export interface BackupMonthlyGoalsConfig {
  defaultGoal: number;
  targetType: 'profit' | 'income';
  monthlyGoals: Record<string, number>;
}

export interface DataBackupSnapshot {
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
  savedCalculations: SavedCalculation[];
  collections: ProductCollection[];
  orders: Order[];
  monthlyGoals: BackupMonthlyGoalsConfig;
}

export interface DataBackupV2 extends DataBackupSnapshot {
  version: 2;
  exportedAt: string;
}

export interface ParsedDataBackup {
  version: 1 | 2;
  exportedAt?: string;
  filaments?: Filament[];
  printers?: Printer[];
  settings?: Settings | null;
  savedCalculations?: SavedCalculation[];
  collections?: ProductCollection[];
  orders?: Order[];
  monthlyGoals?: BackupMonthlyGoalsConfig;
}

type UnknownRecord = Record<string, unknown>;

/** Adds the V2 envelope while preserving the application snapshot verbatim.
 * The runtime parser remains the trust boundary for imported files. */
export function createDataBackup(snapshot: DataBackupSnapshot): DataBackupV2 {
  return {
    ...snapshot,
    version: 2,
    exportedAt: new Date().toISOString(),
  };
}

export function parseDataBackup(input: unknown): ParsedDataBackup {
  if (!isRecord(input)) throw new Error('Неверный формат файла резервной копии.');

  const version = input.version === undefined ? 1 : input.version;
  if (version !== 1 && version !== 2) throw new Error('Неподдерживаемая версия резервной копии.');
  if (version === 2 && (typeof input.exportedAt !== 'string'
    || input.exportedAt.trim() === ''
    || Number.isNaN(Date.parse(input.exportedAt)))) {
    throw new Error('Поле exportedAt обязательно для резервной копии V2.');
  }
  if (version === 1 && input.exportedAt !== undefined && typeof input.exportedAt !== 'string') {
    throw new Error('Поле exportedAt имеет неверный формат.');
  }

  const required = version === 2;
  const parsed: ParsedDataBackup = { version, exportedAt: input.exportedAt as string | undefined };
  parsed.filaments = parseArraySection(input, 'filaments', required, isFilament);
  parsed.printers = parseArraySection(input, 'printers', required, isPrinter);
  parsed.settings = parseSettingsSection(input, required);
  parsed.savedCalculations = parseArraySection(input, 'savedCalculations', required, isSavedCalculation);
  parsed.collections = parseArraySection(input, 'collections', required, isCollection);
  parsed.orders = parseArraySection(input, 'orders', required, isOrder);
  parsed.monthlyGoals = parseMonthlyGoalsSection(input, required);

  if (!Object.keys(input).some(key => ['filaments', 'printers', 'settings', 'savedCalculations', 'collections', 'orders', 'monthlyGoals'].includes(key))) {
    throw new Error('В файле нет поддерживаемых данных для восстановления.');
  }

  return parsed;
}

function parseArraySection<T>(input: UnknownRecord, key: string, required: boolean, validate: (value: unknown, path: string) => value is T): T[] | undefined {
  const value = input[key];
  if (value === undefined) {
    if (required) throw new Error(`В резервной копии отсутствует поле ${key}.`);
    return undefined;
  }
  if (!Array.isArray(value)) throw new Error(`Поле ${key} имеет неверный формат.`);
  value.forEach((item, index) => {
    if (!validate(item, `${key}[${index}]`)) throw new Error(`Сущность ${key}[${index}] имеет неверный формат.`);
  });
  return value as T[];
}

function parseSettingsSection(input: UnknownRecord, required: boolean): Settings | null | undefined {
  const value = input.settings;
  if (value === undefined) {
    if (required) throw new Error('В резервной копии отсутствует поле settings.');
    return undefined;
  }
  if (value === null) return null;
  if (!isSettings(value)) throw new Error('Сущность settings имеет неверный формат.');
  return value;
}

function parseMonthlyGoalsSection(input: UnknownRecord, required: boolean): BackupMonthlyGoalsConfig | undefined {
  const value = input.monthlyGoals;
  if (value === undefined) {
    if (required) throw new Error('В резервной копии отсутствует поле monthlyGoals.');
    return undefined;
  }
  if (!isMonthlyGoals(value)) throw new Error('Сущность monthlyGoals имеет неверный формат.');
  return value;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasString(record: UnknownRecord, key: string): boolean {
  return isString(record[key]);
}

function hasNumber(record: UnknownRecord, key: string): boolean {
  return isNumber(record[key]);
}

function isFilament(value: unknown): value is Filament {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name') && hasNumber(value, 'weight_g') && hasNumber(value, 'price');
}

function isPrinter(value: unknown): value is Printer {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name') && hasNumber(value, 'power_w') && hasNumber(value, 'price') && hasNumber(value, 'lifespan_hours');
}

function isSettings(value: unknown): value is Settings {
  return isRecord(value)
    && hasString(value, 'currency')
    && hasNumber(value, 'electricity_rate')
    && (value.default_printer_id === null || isString(value.default_printer_id))
    && hasNumber(value, 'labor_rate_per_hour')
    && hasNumber(value, 'labor_time_minutes')
    && hasNumber(value, 'default_markup_percent')
    && hasNumber(value, 'default_defect_percent');
}

function isSavedCalculation(value: unknown, path: string): value is SavedCalculation {
  if (!isRecord(value)
    || !hasString(value, 'id') || !hasString(value, 'name') || !hasString(value, 'filament_name') || !hasString(value, 'printer_name')
    || !hasNumber(value, 'weight_g') || !hasNumber(value, 'hours') || !hasNumber(value, 'minutes') || !hasNumber(value, 'quantity')
    || !hasNumber(value, 'base_cost') || !hasNumber(value, 'final_price')) return false;

  return validateNestedArray(value.assembly_parts, `${path}.assembly_parts`, isAssemblyPart)
    && validateNestedArray(value.assembly_hardware, `${path}.assembly_hardware`, isAssemblyHardware)
    && validateNestedArray(value.custom_cost_items, `${path}.custom_cost_items`, isCustomCostItem)
    && validateStringArray(value.tags, `${path}.tags`);
}

function isCollection(value: unknown, path: string): value is ProductCollection {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name') && validateStringArray(value.tags, `${path}.tags`);
}

function isOrder(value: unknown, path: string): value is Order {
  if (!isRecord(value)
    || !hasString(value, 'id') || !hasString(value, 'date') || (value.type !== 'income' && value.type !== 'expense')
    || !hasString(value, 'title') || !hasNumber(value, 'amount') || !hasNumber(value, 'cost') || !hasNumber(value, 'payment')
    || !hasString(value, 'client') || !hasString(value, 'contact') || !hasString(value, 'deadline') || !hasString(value, 'status') || !hasString(value, 'notes')) return false;

  return validateNestedArray(value.cost_items, `${path}.cost_items`, isCostItem)
    && validateNestedArray(value.payments, `${path}.payments`, isPayment)
    && validateNestedArray(value.contacts, `${path}.contacts`, isContact);
}

function validateNestedArray(value: unknown, path: string, validate: (value: unknown, path: string) => boolean): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) throw new Error(`Поле ${path} имеет неверный формат.`);
  value.forEach((item, index) => {
    if (!validate(item, `${path}[${index}]`)) throw new Error(`Сущность ${path}[${index}] имеет неверный формат.`);
  });
  return true;
}

function validateStringArray(value: unknown, path: string): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || !value.every(isString)) throw new Error(`Поле ${path} имеет неверный формат.`);
  return true;
}

function isAssemblyPart(value: unknown): boolean {
  return isRecord(value) && hasString(value, 'name') && hasNumber(value, 'weight_g') && hasNumber(value, 'hours')
    && hasNumber(value, 'minutes') && hasNumber(value, 'quantity') && hasNumber(value, 'base_cost') && hasNumber(value, 'final_price');
}

function isAssemblyHardware(value: unknown): boolean {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name') && hasNumber(value, 'quantity')
    && hasNumber(value, 'cost_per_unit') && hasNumber(value, 'price_per_unit');
}

function isCustomCostItem(value: unknown): boolean {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name') && hasNumber(value, 'amount') && typeof value.isEnabled === 'boolean';
}

function isCostItem(value: unknown): boolean {
  return isRecord(value) && hasString(value, 'category') && hasNumber(value, 'amount');
}

function isPayment(value: unknown): boolean {
  return isNumber(value) || (isRecord(value) && hasString(value, 'id') && hasNumber(value, 'amount') && hasString(value, 'date'));
}

function isContact(value: unknown): boolean {
  return isRecord(value) && hasString(value, 'type') && hasString(value, 'value') && (value.label === undefined || isString(value.label));
}

function isMonthlyGoals(value: unknown): value is BackupMonthlyGoalsConfig {
  if (!isRecord(value) || !hasNumber(value, 'defaultGoal') || (value.targetType !== 'profit' && value.targetType !== 'income') || !isRecord(value.monthlyGoals)) return false;
  return Object.values(value.monthlyGoals).every(isNumber);
}
