'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RegistrationKey, UserRole } from '../../shared/types';
import { createClient } from '@/lib/supabase/client';
import * as authApi from '../../shared/api/authDb';
import { registerAction, updateProfileAction, changePasswordAction } from '@/app/auth/actions';

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
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: UpdateProfileData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // Admin methods
  generateKey: (options?: GenerateKeyOptions) => Promise<RegistrationKey>;
  generateBatchKeys: (count: number, options?: GenerateKeyOptions) => Promise<RegistrationKey[]>;
  deleteKey: (id: string) => Promise<boolean>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [registrationKeys, setRegistrationKeys] = useState<RegistrationKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Загрузка данных профиля текущего пользователя
  const loadProfile = useCallback(async (userId: string) => {
    try {
      let { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Если записи профиля нет в таблице profiles, восстанавливаем из метаданных auth.user
      if (!profile) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user && user.id === userId) {
          const userRole = (user.user_metadata?.role as UserRole) || 'user';
          const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Пользователь';
          const userAvatar = user.user_metadata?.avatar_color || '#8B5CF6';
          const keyUsed = user.user_metadata?.registration_key_used || 'Системный';

          const fallbackProfile: User = {
            id: user.id,
            email: user.email || '',
            name: userName,
            role: userRole,
            is_active: true,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            registration_key_used: keyUsed,
            avatar_color: userAvatar,
          };

          try {
            const { data: inserted } = await (supabase as any)
              .from('profiles')
              .upsert(fallbackProfile)
              .select()
              .single();
            profile = inserted || fallbackProfile;
          } catch {
            profile = fallbackProfile;
          }
        }
      }

      if (profile) {
        if (profile.is_active) {
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
          setCurrentUser(null);
          await supabase.auth.signOut();
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Инициализация при старте и подписка на изменения сессии Supabase Auth
  useEffect(() => {
    let isMounted = true;

    // Первоначальная проверка пользователя
    supabase.auth.getUser().then((res: any) => {
      if (!isMounted) return;
      const user = res?.data?.user;
      if (user) {
        loadProfile(user.id);
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    // Подписка на события авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!isMounted) return;
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUsers([]);
        setRegistrationKeys([]);
        setIsLoading(false);
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
        setCurrentUser(profile as User);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Ошибка входа:', err);
      return { success: false, error: 'Произошла непредвиденная ошибка при входе' };
    }
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
    await supabase.auth.signOut();
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
  };

  const toggleUserStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const success = await authApi.toggleProfileStatus(userId, target.is_active);
    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
      );
      if (currentUser?.id === userId && target.is_active) {
        await logout();
      }
    }
  };

  const deleteUser = async (userId: string) => {
    const success = await authApi.deleteProfile(userId);
    if (success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUser?.id === userId) {
        await logout();
      }
    }
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
