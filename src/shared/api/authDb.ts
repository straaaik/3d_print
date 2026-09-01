import { User, RegistrationKey, UserRole } from '../types';
import { createClient } from '@/lib/supabase/client';
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this project yet. */

// Генератор криптографически стойких ключей вида 3DLAB-XXXX-XXXX-XXXX
export function generateKeyString(prefix = '3DLAB'): string {
  // Исключаем визуально похожие символы (0, O, 1, I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const getRandomChunk = (len = 4) => {
    let result = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const values = new Uint32Array(len);
      window.crypto.getRandomValues(values);
      for (let i = 0; i < len; i++) {
        result += chars.charAt(values[i] % chars.length);
      }
    } else {
      for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return result;
  };

  return `${prefix}-${getRandomChunk(4)}-${getRandomChunk(4)}-${getRandomChunk(4)}`;
}

// Палитра аватарок
const AVATAR_COLORS = [
  '#FF6B00', '#00E676', '#0CB4E0', '#8B5CF6', 
  '#EC4899', '#F59E0B', '#3B82F6', '#10B981'
];

export function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ============================================================================
// SUPABASE-BASED AUTH DATABASE HELPERS
// ============================================================================

/**
 * Получение списка профилей пользователей (для панели администратора)
 */
export async function getProfiles(): Promise<User[]> {
  const supabase = createClient();
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Ошибка загрузки профилей:', error);
      return [];
    }
    return (data || []) as User[];
  } catch (err) {
    console.error('Ошибка getProfiles:', err);
    return [];
  }
}

/**
 * Обновление роли пользователя
 */
export async function updateProfileRole(userId: string, role: UserRole): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: userId,
      new_role: role,
      new_is_active: null,
    });

    return !error;
  } catch (err) {
    console.error('Ошибка updateProfileRole:', err);
    return false;
  }
}

/**
 * Включение/отключение блокировки пользователя
 */
export async function toggleProfileStatus(userId: string, currentActiveStatus: boolean): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: userId,
      new_role: null,
      new_is_active: !currentActiveStatus,
    });

    return !error;
  } catch (err) {
    console.error('Ошибка toggleProfileStatus:', err);
    return false;
  }
}

/**
 * Удаление профиля пользователя
 */
export async function deleteProfile(userId: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await (supabase as any)
      .from('profiles')
      .delete()
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Ошибка deleteProfile:', err);
    return false;
  }
}

/**
 * Получение списка регистрационных ключей (для панели администратора)
 */
export async function getRegistrationKeys(): Promise<RegistrationKey[]> {
  const supabase = createClient();
  try {
    const { data, error } = await (supabase as any)
      .from('registration_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Ошибка загрузки ключей:', error);
      return [];
    }
    return (data || []) as RegistrationKey[];
  } catch (err) {
    console.error('Ошибка getRegistrationKeys:', err);
    return [];
  }
}

/**
 * Сохранение нового регистрационного ключа
 */
export async function saveRegistrationKey(key: RegistrationKey): Promise<RegistrationKey | null> {
  const supabase = createClient();
  try {
    const { data, error } = await (supabase as any)
      .from('registration_keys')
      .insert(key)
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения ключа:', error);
      return null;
    }
    return data as RegistrationKey;
  } catch (err) {
    console.error('Ошибка saveRegistrationKey:', err);
    return null;
  }
}

/**
 * Пакетное сохранение ключей
 */
export async function saveRegistrationKeysBatch(keys: RegistrationKey[]): Promise<RegistrationKey[]> {
  const supabase = createClient();
  try {
    const { data, error } = await (supabase as any)
      .from('registration_keys')
      .insert(keys)
      .select();

    if (error) {
      console.error('Ошибка пакетного сохранения ключей:', error);
      return [];
    }
    return (data || []) as RegistrationKey[];
  } catch (err) {
    console.error('Ошибка saveRegistrationKeysBatch:', err);
    return [];
  }
}

/**
 * Удаление регистрационного ключа
 */
export async function deleteRegistrationKey(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await (supabase as any)
      .from('registration_keys')
      .delete()
      .eq('id', id);

    return !error;
  } catch (err) {
    console.error('Ошибка deleteRegistrationKey:', err);
    return false;
  }
}

/**
 * Валидация регистрационного ключа
 */
export async function validateRegistrationKey(
  rawKey: string
): Promise<{ valid: boolean; error?: string; keyObj?: RegistrationKey }> {
  const cleanKey = rawKey.trim().toUpperCase();
  if (!cleanKey) {
    return { valid: false, error: 'Пожалуйста, введите регистрационный ключ доступа' };
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase.rpc('validate_registration_key', { p_key: cleanKey });

    if (error || !data) {
      return { valid: false, error: 'Ключ доступа не найден или введён с ошибкой' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Ошибка проверки ключа' };
  }
}
