'use server';
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this project yet. */

import { createClient } from '@/lib/supabase/server';
import { getRandomAvatarColor } from '@/shared/api/authDb';
import { persistProfileUpdate, type ProfileUpdateResult } from '@/shared/lib/profileUpdate';
import { cookies } from 'next/headers';

export interface RegisterActionParams {
  name: string;
  email: string;
  password: string;
  registrationKey: string;
}

export interface UpdateProfileActionParams {
  name: string;
  email: string;
  avatarColor?: string;
}

export type UpdateProfileActionResult = ProfileUpdateResult;

/**
 * Регистрация нового пользователя по пригласительному ключу
 */
export async function registerAction({
  name,
  email,
  password,
  registrationKey,
}: RegisterActionParams): Promise<{ success: boolean; error?: string }> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanKey = registrationKey.trim().toUpperCase();

  if (!cleanName) {
    return { success: false, error: 'Укажите ваше имя или название студии' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Укажите корректный email адрес' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Пароль должен содержать не менее 6 символов' };
  }
  if (!cleanKey) {
    return { success: false, error: 'Для регистрации необходим ключ доступа' };
  }

  try {
    const supabase = await createClient();

    // Публичный RPC раскрывает только факт валидности ключа. Сам ключ
    // атомарно погашается триггером в транзакции создания auth-пользователя.
    const { data: isKeyValid, error: keyError } = await supabase
      .rpc('validate_registration_key', { p_key: cleanKey });

    if (keyError || !isKeyValid) {
      return { success: false, error: 'Ключ доступа не найден или введён с ошибкой' };
    }

    // Роль никогда не принимается от клиента: безопасный триггер получает её
    // из погашаемого регистрационного ключа.
    const avatarColor = getRandomAvatarColor();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          avatar_color: avatarColor,
          registration_key_used: cleanKey,
        },
      },
    });

    if (authError) {
      const message = /INVALID_REGISTRATION_KEY/i.test(authError.message)
        ? 'Ключ уже использован, просрочен или недействителен'
        : authError.message;
      return { success: false, error: message };
    }

    if (!authData.user) {
      return { success: false, error: 'Не удалось создать пользователя в системе' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Ошибка в registerAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Произошла ошибка при регистрации',
    };
  }
}

/**
 * Обновление данных профиля
 */
export async function updateProfileAction({
  name,
  email,
  avatarColor,
}: UpdateProfileActionParams): Promise<UpdateProfileActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { success: false, error: 'Имя не может быть пустым' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Укажите корректный email' };
    }
    if (avatarColor && !/^#[0-9a-f]{6}$/i.test(avatarColor)) {
      return { success: false, error: 'Укажите корректный цвет аватара' };
    }

    return await persistProfileUpdate(
      {
        currentEmail: user.email,
        name: cleanName,
        email: cleanEmail,
        avatarColor,
      },
      {
        updateEmail: async (updatedEmail) => {
          const { error } = await supabase.auth.updateUser({ email: updatedEmail });
          return error?.message;
        },
        updateProfile: async (profile) => {
          const { error } = await (supabase as any)
            .from('profiles')
            .update({
              name: profile.name,
              email: profile.email,
              avatar_color: profile.avatarColor,
            })
            .eq('id', user.id);
          return error?.message;
        },
      }
    );
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Ошибка обновления профиля' };
  }
}

/**
 * Смена пароля
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    if (!currentPassword) {
      return { success: false, error: 'Введите текущий пароль' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Новый пароль должен содержать минимум 6 символов' };
    }

    // Проверяем текущий пароль через попытку входа
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Текущий пароль указан неверно' };
    }

    // Обновляем пароль
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Ошибка при изменении пароля' };
  }
}

/**
 * Выход из системы
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('3d_dev_session');
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Returns the authoritative development session state from the server cookie. */
export async function getDevSessionAction(): Promise<{ active: boolean }> {
  if (process.env.NODE_ENV !== 'development') return { active: false };

  const cookieStore = await cookies();
  return { active: cookieStore.get('3d_dev_session')?.value === 'true' };
}

/**
 * Быстрый вход для режима разработки (Dev Login)
 */
export async function devLoginAction(): Promise<{ success: boolean; error?: string }> {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, error: 'Dev-вход отключён вне локальной разработки' };
  }

  const cookieStore = await cookies();
  cookieStore.set('3d_dev_session', 'true', {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
  });
  return { success: true };
}
