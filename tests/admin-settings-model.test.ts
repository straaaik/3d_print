import assert from 'node:assert/strict';
import test from 'node:test';
import type { RegistrationKey, User } from '../src/shared/types';
import {
  calculateAdminStats,
  calculateAdminUserStats,
  filterRegistrationKeys,
  getExportableKeys,
} from '../src/widgets/Admin/model';
import { hasNumericSettingChanged, isSettingsDraftEquivalent, normalizeWholeMinutes, parseNonNegativeSetting } from '../src/widgets/SettingsForm/model';

const now = new Date('2026-09-01T12:00:00.000Z');
const keys: RegistrationKey[] = [
  { id: 'active', key: 'ACTIVE-1', is_used: false, created_at: '', created_by: 'Admin', role_to_grant: 'user', expires_at: '2026-09-10T00:00:00.000Z' },
  { id: 'expired', key: 'EXPIRED-1', is_used: false, created_at: '', created_by: 'Admin', role_to_grant: 'user', expires_at: '2026-08-20T00:00:00.000Z' },
  { id: 'used', key: 'USED-1', is_used: true, created_at: '', created_by: 'Admin', role_to_grant: 'admin', expires_at: null },
];

test('admin key statistics classify active, expired and used keys exactly once', () => {
  assert.deepEqual(calculateAdminStats(keys, 4, now), {
    total: 3,
    active: 1,
    used: 1,
    expired: 1,
    usersTotal: 4,
  });
});

test('active-key export excludes expired unused keys', () => {
  assert.deepEqual(getExportableKeys(keys, now).map((key) => key.id), ['active']);
});

test('key filters share the same expiration classification as statistics', () => {
  assert.deepEqual(filterRegistrationKeys(keys, '', 'expired', now).map((key) => key.id), ['expired']);
});

test('settings parser preserves intentional zero and rejects invalid or negative input', () => {
  assert.equal(parseNonNegativeSetting('0', 100), 0);
  assert.equal(parseNonNegativeSetting('12.5', 100), 12.5);
  assert.equal(parseNonNegativeSetting('-5', 100), 100);
  assert.equal(parseNonNegativeSetting('not-a-number', 100), 100);
});

test('admin fullscreen user insights separate active, blocked and privileged accounts', () => {
  const users: User[] = [
    { id: 'u1', name: 'Admin', email: 'admin@example.com', role: 'admin', is_active: true, created_at: '2026-01-01' },
    { id: 'u2', name: 'Operator', email: 'operator@example.com', role: 'user', is_active: true, created_at: '2026-01-02' },
    { id: 'u3', name: 'Paused', email: 'paused@example.com', role: 'user', is_active: false, created_at: '2026-01-03' },
  ];

  assert.deepEqual(calculateAdminUserStats(users), {
    total: 3,
    active: 2,
    blocked: 1,
    admins: 1,
    activePercent: 2 / 3 * 100,
  });
});

test('settings draft treats canonical numeric formatting as unchanged', () => {
  assert.equal(hasNumericSettingChanged('4.890', 4.89), false);
  assert.equal(hasNumericSettingChanged('', 4.89), true);
  assert.equal(hasNumericSettingChanged('invalid', 4.89), true);
});

test('pristine settings draft can be recognized before an external settings refresh', () => {
  const saved = {
    currency: '₽', electricity_rate: 4.89, default_printer_id: null, min_order_price: 300,
    labor_rate_per_hour: 0, labor_time_minutes: 15, is_owner_labor_default: true,
    is_labor_per_unit_default: false, default_markup_percent: 100, default_defect_percent: 5,
    default_urgency_percent: 25, enable_material_difficulty: true,
    material_multipliers: { pla_petg: 100, abs_asa: 120, tpu_flex: 140, nylon_cf: 170 },
  };
  assert.equal(isSettingsDraftEquivalent({
    currency: '₽', electricityRate: '4.890', defaultPrinterId: '', minOrderPrice: '300',
    laborRate: '0', laborTimeMinutes: '15', isOwnerLaborDefault: true,
    isLaborPerUnitDefault: false, defaultMarkup: '100', defaultDefect: '5',
    defaultUrgencyPercent: '25', enableMaterialDifficulty: true,
    materialMultipliers: { pla_petg: 100, abs_asa: 120, tpu_flex: 140, nylon_cf: 170 },
  }, saved), true);
});

test('labor duration is canonicalized to the same whole minutes used by the save payload', () => {
  assert.equal(normalizeWholeMinutes(15.4), 15);
  assert.equal(normalizeWholeMinutes(15.6), 16);
  assert.equal(normalizeWholeMinutes(-2), 0);
});
