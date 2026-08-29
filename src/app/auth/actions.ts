'use server';

import { createClient } from '@/lib/supabase/server';
import { getRandomAvatarColor } from '@/shared/api/authDb';
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

    // 1. Валидация ключа в таблице registration_keys
    const { data: keyRecord, error: keyError } = await (supabase as any)
      .from('registration_keys')
      .select('*')
      .eq('key', cleanKey)
      .single();

    if (keyError || !keyRecord) {
      return { success: false, error: 'Ключ доступа не найден или введён с ошибкой' };
    }

    if (keyRecord.is_used) {
      return {
        success: false,
        error: `Этот ключ уже был использован (${keyRecord.used_by_email || 'другим пользователем'})`,
      };
    }

    if (keyRecord.expires_at) {
      const expiry = new Date(keyRecord.expires_at);
      if (expiry < new Date()) {
        return { success: false, error: 'Срок действия данного ключа доступа истёк' };
      }
    }

    // 2. Регистрация в Supabase Auth
    const roleToGrant = keyRecord.role_to_grant || 'user';
    const avatarColor = getRandomAvatarColor();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role: roleToGrant,
          avatar_color: avatarColor,
          registration_key_used: cleanKey,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Не удалось создать пользователя в системе' };
    }

    const userId = authData.user.id;

    // 3. Создаем/обновляем запись профиля в таблице profiles
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: userId,
        email: cleanEmail,
        name: cleanName,
        role: roleToGrant,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        registration_key_used: cleanKey,
        avatar_color: avatarColor,
      });

    if (profileError) {
      console.error('Ошибка создания профиля:', profileError);
      // Не прерываем, если auth создан, но логируем
    }

    // 4. Погашаем регистрационный ключ
    await (supabase as any)
      .from('registration_keys')
      .update({
        is_used: true,
        used_by_email: cleanEmail,
        used_by_user_id: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', keyRecord.id);

    return { success: true };
  } catch (err: any) {
    console.error('Ошибка в registerAction:', err);
    return { success: false, error: err.message || 'Произошла ошибка при регистрации' };
  }
}

/**
 * Обновление данных профиля
 */
export async function updateProfileAction({
  name,
  email,
  avatarColor,
}: UpdateProfileActionParams): Promise<{ success: boolean; error?: string }> {
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

    // Если изменился email, обновляем в Supabase Auth
    if (cleanEmail !== user.email?.toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: cleanEmail,
      });
      if (emailError) {
        return { success: false, error: emailError.message };
      }
    }

    // Обновляем метаданные в profiles
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .update({
        name: cleanName,
        email: cleanEmail,
        avatar_color: avatarColor,
      })
      .eq('id', user.id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка обновления профиля' };
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
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка при изменении пароля' };
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

/**
 * Быстрый вход для режима разработки (Dev Login)
 */
export async function devLoginAction(): Promise<{ success: boolean; email?: string; password?: string; error?: string }> {
  const DEV_EMAIL = 'dev@3dlabs.pro';
  const DEV_PASSWORD = 'devpassword123';
  const DEV_NAME = 'Kumo';

  try {
    const cookieStore = await cookies();
    cookieStore.set('3d_dev_session', 'true', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const supabase = await createClient();

    // 1. Попытка входа
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });

    if (!signInError && signInData?.user) {
      return { success: true, email: DEV_EMAIL, password: DEV_PASSWORD };
    }

    // 2. Если пользователя нет — регистрируем
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      options: {
        data: {
          name: DEV_NAME,
          role: 'admin',
          avatar_color: '#ec4899',
          registration_key_used: 'DEV_MODE_BYPASS',
        },
      },
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.warn('Dev signUp error:', signUpError);
    }

    const userId = signUpData?.user?.id || signInData?.user?.id;
    if (userId) {
      await (supabase as any)
        .from('profiles')
        .upsert({
          id: userId,
          email: DEV_EMAIL,
          name: DEV_NAME,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          registration_key_used: 'DEV_MODE_BYPASS',
          avatar_color: '#ec4899',
        });
    }

    return { success: true, email: DEV_EMAIL, password: DEV_PASSWORD };
  } catch (err: any) {
    console.error('Ошибка devLoginAction:', err);
    return { success: true, email: DEV_EMAIL, password: DEV_PASSWORD };
  }
}

