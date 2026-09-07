'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this project yet. */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RegistrationKey, UserRole } from '../../shared/types';
import { createClient } from '@/lib/supabase/client';
import * as authApi from '../../shared/api/authDb';
import { registerAction, updateProfileAction, changePasswordAction, devLoginAction, getDevSessionAction, logoutAction } from '@/app/auth/actions';
import { setStorageScope } from '../../shared/lib/storageScope';
import { createInitialAuthRenderState, reconcileDevSessionHydration, reconcilePartialProfileUser } from './authHydration';

const DEV_FALLBACK_USER: User = {
  id: 'dev-admin-id',
  email: 'dev@3dlabs.pro',
  name: 'Kumo',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  registration_key_used: 'DEV_MODE_BYPASS',
  avatar_color: '#ec4899',
};

interface GenerateKeyOptions {
  role?: UserRole;
  note?: string;
  expiresInDays?: number | null;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  registrationKey: string;
}

interface UpdateProfileData {
  name: string;
  email: string;
  avatarColor?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  users: User[];
  registrationKeys: RegistrationKey[];

  // Auth methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  devLogin: () => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: UpdateProfileData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // Admin methods
  generateKey: (options?: GenerateKeyOptions) => Promise<RegistrationKey>;
  generateBatchKeys: (count: number, options?: GenerateKeyOptions) => Promise<RegistrationKey[]>;
  deleteKey: (id: string) => Promise<boolean>;
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialRenderState = createInitialAuthRenderState();
  const [currentUser, setCurrentUser] = useState<User | null>(initialRenderState.currentUser);
  const [users, setUsers] = useState<User[]>([]);
  const [registrationKeys, setRegistrationKeys] = useState<RegistrationKey[]>([]);
  const [isLoading, setIsLoading] = useState(initialRenderState.isLoading);

  const supabase = createClient();

  // Загрузка данных профиля текущего пользователя
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        console.error('Профиль пользователя отсутствует. Проверьте auth-триггер Supabase.', error);
        setStorageScope(null);
        setCurrentUser(null);
        await supabase.auth.signOut();
        return;
      }

      if (profile) {
        if (profile.is_active) {
          setStorageScope(profile.id);
          setCurrentUser(profile as User);
          // Если администратор, загружаем пользователей и ключи
          if (profile.role === 'admin') {
            const [allUsers, allKeys] = await Promise.all([
              authApi.getProfiles(),
              authApi.getRegistrationKeys(),
            ]);
            setUsers(allUsers);
            setRegistrationKeys(allKeys);
          }
        } else {
          // Пользователь заблокирован
          setStorageScope(null);
          setCurrentUser(null);
          await supabase.auth.signOut();
        }
      } else {
        setStorageScope(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setStorageScope(null);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Инициализация при старте и подписка на изменения сессии Supabase Auth
  useEffect(() => {
    let isMounted = true;

    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasDevLocal = isDevelopment && typeof window !== 'undefined' && localStorage.getItem('3d_dev_session') === 'true';

    const clearUnauthenticatedState = () => {
      setStorageScope(null);
      setCurrentUser(null);
      setUsers([]);
      setRegistrationKeys([]);
      setIsLoading(false);
    };

    const reconcileDevSession = async () => {
      let hasServerSession = false;
      if (isDevelopment) {
        try {
          hasServerSession = (await getDevSessionAction()).active;
        } catch {
          hasServerSession = false;
        }
      }

      if (!isMounted) return;
      const hydration = reconcileDevSessionHydration(hasServerSession, hasDevLocal);
      if (hydration.clearLocalHint && typeof window !== 'undefined') {
        localStorage.removeItem('3d_dev_session');
      }
      if (hydration.authenticateAsDev) {
        setStorageScope(DEV_FALLBACK_USER.id);
        setCurrentUser(DEV_FALLBACK_USER);
        setIsLoading(false);
        return;
      }
      clearUnauthenticatedState();
    };

    // Первоначальная проверка пользователя
    supabase.auth.getUser().then(async (res: any) => {
      if (!isMounted) return;
      const user = res?.data?.user;
      if (user) {
        loadProfile(user.id);
      } else {
        await reconcileDevSession();
      }
    }).catch(async () => {
      if (!isMounted) return;
      await reconcileDevSession();
    });

    // Подписка на события авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!isMounted) return;
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        void reconcileDevSession();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  // Обновление админских списков пользователей и ключей
  const refreshAuthData = async () => {
    try {
      const [freshUsers, freshKeys] = await Promise.all([
        authApi.getProfiles(),
        authApi.getRegistrationKeys(),
      ]);
      setUsers(freshUsers);
      setRegistrationKeys(freshKeys);

      if (currentUser) {
        const { data: freshProfile } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (freshProfile && freshProfile.is_active) {
          setStorageScope(freshProfile.id);
          setCurrentUser(freshProfile as User);
        }
      }
    } catch (e) {
      console.error('Ошибка обновления Auth данных:', e);
    }
  };

  // ВХОД В СИСТЕМУ
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Введите email и пароль' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Неверный email или пароль';
        }
        return { success: false, error: msg };
      }

      if (!data.user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      // Проверяем статус в profiles
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return { success: false, error: 'Ваш аккаунт заблокирован администратором' };
      }

      // Обновляем last_login_at
      await (supabase as any)
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      if (profile) {
        setStorageScope(profile.id);
        setCurrentUser(profile as User);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Ошибка входа:', err);
      return { success: false, error: 'Произошла непредвиденная ошибка при входе' };
    }
  };

  // БЫСТРЫЙ ВХОД ДЛЯ РЕЖИМА РАЗРАБОТКИ
  const devLogin = async (): Promise<{ success: boolean; error?: string }> => {
    if (process.env.NODE_ENV !== 'development') {
      return { success: false, error: 'Dev-вход доступен только локально' };
    }

    const result = await devLoginAction();
    if (!result.success) return result;

    localStorage.setItem('3d_dev_session', 'true');
    setStorageScope(DEV_FALLBACK_USER.id);
    setCurrentUser(DEV_FALLBACK_USER);
    return { success: true };
  };

  // РЕГИСТРАЦИЯ ПО КЛЮЧУ
  const register = async ({
    name,
    email,
    password,
    registrationKey,
  }: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Вызываем серверное действие регистрации (валидация ключа + signUp + профиль + погашение ключа)
      const res = await registerAction({
        name,
        email,
        password,
        registrationKey,
      });

      if (!res.success) {
        return { success: false, error: res.error };
      }

      // 2. Автоматически входим на клиенте
      const loginRes = await login(email, password);
      return loginRes;
    } catch (err: any) {
      console.error('Ошибка регистрации:', err);
      return { success: false, error: 'Произошла ошибка при регистрации' };
    }
  };

  // ОБНОВЛЕНИЕ ДАННЫХ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
  const updateProfile = async (
    data: UpdateProfileData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    try {
      // 1. Если меняется пароль
      if (data.newPassword) {
        if (!data.currentPassword) {
          return { success: false, error: 'Для изменения пароля введите текущий пароль' };
        }
        const passRes = await changePasswordAction(data.currentPassword, data.newPassword);
        if (!passRes.success) {
          return { success: false, error: passRes.error };
        }
      }

      // 2. Обновляем имя, email, цвет аватара
      const profileRes = await updateProfileAction({
        name: data.name,
        email: data.email,
        avatarColor: data.avatarColor,
      });

      if (!profileRes.success) {
        if (profileRes.partial) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              setCurrentUser((existingUser) => existingUser
                ? reconcilePartialProfileUser(existingUser, user.email)
                : existingUser);
            }
          } catch (refreshError) {
            console.error('Не удалось обновить Auth-пользователя после частичного обновления профиля:', refreshError);
          }
        }
        return { success: false, error: profileRes.error };
      }

      await loadProfile(currentUser.id);
      return { success: true };
    } catch (err: any) {
      console.error('Ошибка обновления профиля:', err);
      return { success: false, error: err.message || 'Ошибка обновления профиля' };
    }
  };

  // ВЫХОД ИЗ СИСТЕМЫ
  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('3d_dev_session');
    }
    await logoutAction();
    await supabase.auth.signOut();
    setStorageScope(null);
    setCurrentUser(null);
    setUsers([]);
    setRegistrationKeys([]);
  };

  // ============================================================================
  // АДМИН-МЕТОДЫ
  // ============================================================================

  const generateKey = async (options?: GenerateKeyOptions): Promise<RegistrationKey> => {
    const keyStr = authApi.generateKeyString('3DLAB');
    let expiresAt: string | null = null;

    if (options?.expiresInDays && options.expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + options.expiresInDays);
      expiresAt = expDate.toISOString();
    }

    const newKey: RegistrationKey = {
      id: crypto.randomUUID(),
      key: keyStr,
      is_used: false,
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || currentUser?.email || 'Администратор',
      expires_at: expiresAt,
      role_to_grant: options?.role || 'user',
      note: options?.note?.trim() || undefined,
    };

    const saved = await authApi.saveRegistrationKey(newKey);
    if (saved) {
      setRegistrationKeys((prev) => [saved, ...prev]);
      return saved;
    }
    return newKey;
  };

  const generateBatchKeys = async (
    count: number,
    options?: GenerateKeyOptions
  ): Promise<RegistrationKey[]> => {
    const safeCount = Math.max(1, Math.min(count, 50));
    let expiresAt: string | null = null;

    if (options?.expiresInDays && options.expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + options.expiresInDays);
      expiresAt = expDate.toISOString();
    }

    const generated: RegistrationKey[] = [];
    for (let i = 0; i < safeCount; i++) {
      generated.push({
        id: crypto.randomUUID(),
        key: authApi.generateKeyString('3DLAB'),
        is_used: false,
        created_at: new Date().toISOString(),
        created_by: currentUser?.name || currentUser?.email || 'Администратор',
        expires_at: expiresAt,
        role_to_grant: options?.role || 'user',
        note: options?.note?.trim() ? `${options.note.trim()} (#${i + 1})` : undefined,
      });
    }

    const savedBatch = await authApi.saveRegistrationKeysBatch(generated);
    setRegistrationKeys((prev) => [...savedBatch, ...prev]);
    return savedBatch;
  };

  const deleteKey = async (id: string): Promise<boolean> => {
    const success = await authApi.deleteRegistrationKey(id);
    if (success) {
      setRegistrationKeys((prev) => prev.filter((k) => k.id !== id));
    }
    return success;
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    const success = await authApi.updateProfileRole(userId, role);
    if (success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      if (currentUser?.id === userId) {
        setCurrentUser((prev) => (prev ? { ...prev, role } : null));
      }
    }
    return success;
  };

  const toggleUserStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const success = await authApi.toggleProfileStatus(userId, target.is_active);
    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
      );
      if (currentUser?.id === userId && target.is_active) {
        await logout();
      }
    }
    return success;
  };

  const deleteUser = async (userId: string) => {
    const success = await authApi.deleteProfile(userId);
    if (success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUser?.id === userId) {
        await logout();
      }
    }
    return success;
  };

  const isAuthenticated = !!currentUser && currentUser.is_active;
  const isAdmin = isAuthenticated && currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isLoading,
        users,
        registrationKeys,
        login,
        devLogin,
        register,
        updateProfile,
        logout,
        generateKey,
        generateBatchKeys,
        deleteKey,
        updateUserRole,
        toggleUserStatus,
        deleteUser,
        refreshAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}
