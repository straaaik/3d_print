import type { RegistrationKey, User } from '../../shared/types';

export type RegistrationKeyStatus = 'active' | 'used' | 'expired';

export function getRegistrationKeyStatus(key: RegistrationKey, now = new Date()): RegistrationKeyStatus {
  if (key.is_used) return 'used';
  if (key.expires_at && new Date(key.expires_at).getTime() < now.getTime()) return 'expired';
  return 'active';
}

export function calculateAdminStats(keys: RegistrationKey[], usersTotal: number, now = new Date()) {
  const result = { total: keys.length, active: 0, used: 0, expired: 0, usersTotal };
  keys.forEach((key) => {
    result[getRegistrationKeyStatus(key, now)] += 1;
  });
  return result;
}

export function filterRegistrationKeys(
  keys: RegistrationKey[],
  query: string,
  status: RegistrationKeyStatus | 'all',
  now = new Date(),
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  return keys.filter((key) => {
    const matchesQuery = !normalizedQuery || [key.key, key.note, key.used_by_email, key.created_by]
      .some((value) => value?.toLocaleLowerCase('ru').includes(normalizedQuery));
    return matchesQuery && (status === 'all' || getRegistrationKeyStatus(key, now) === status);
  });
}

export function getExportableKeys(keys: RegistrationKey[], now = new Date()) {
  return keys.filter((key) => getRegistrationKeyStatus(key, now) === 'active');
}

export function calculateAdminUserStats(users: User[]) {
  const active = users.filter((user) => user.is_active).length;
  return {
    total: users.length,
    active,
    blocked: users.length - active,
    admins: users.filter((user) => user.role === 'admin').length,
    activePercent: users.length > 0 ? active / users.length * 100 : 0,
  };
}
