'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { usePersistentState } from '../../shared/lib/usePersistentState';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, devLogin, isLoading: isAuthLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const isDev = process.env.NODE_ENV === 'development';

  const [activeTab, setActiveTab] = usePersistentState<'login' | 'register'>('3d_auth_tab', 'login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Поля формы входа
  const [loginEmail, setLoginEmail] = usePersistentState('3d_auth_login_email', '');
  const [loginPassword, setLoginPassword] = useState('');

  // Поля формы регистрации
  const [regName, setRegName] = usePersistentState('3d_auth_reg_name', '');
  const [regEmail, setRegEmail] = usePersistentState('3d_auth_reg_email', '');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regKey, setRegKey] = usePersistentState('3d_auth_reg_key', '');

  // Обработка отправки формы Входа
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // В DEV-режиме: если поля не заполнены, выполняем мгновенный вход без ввода данных!
    if (isDev && (!loginEmail.trim() || !loginPassword)) {
      setIsSubmitting(true);
      try {
        const res = await devLogin();
        if (res.success) {
          showSuccess('Вы успешно вошли в систему', 'Добро пожаловать!');
          router.replace('/orders');
          window.location.href = '/orders';
        } else {
          setFormError(res.error || 'Не удалось выполнить вход');
          showError(res.error || 'Не удалось выполнить вход');
        }
      } catch {
        setFormError('Произошла непредвиденная ошибка при входе');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Стандартный вход по email/паролю
    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Заполните все обязательные поля');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        showSuccess('Вы успешно вошли в систему', 'Добро пожаловать!');
        router.refresh();
        router.replace('/orders');
      } else {
        setFormError(res.error || 'Неверный email или пароль');
        showError(res.error || 'Не удалось выполнить вход');
      }
    } catch {
      setFormError('Произошла непредвиденная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка отправки формы Регистрации
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regKey.trim()) {
      setFormError('Пожалуйста, заполните все поля формы');
      return;
    }

    if (regPassword.length < 6) {
      setFormError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setFormError('Введенные пароли не совпадают');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        registrationKey: regKey,
      });

      if (res.success) {
        showSuccess('Регистрация прошла успешно!', 'Добро пожаловать в 3D Labs');
        router.refresh();
        router.replace('/orders');
      } else {
        setFormError(res.error || 'Ошибка при регистрации');
        showError(res.error || 'Не удалось зарегистрироваться');
      }
    } catch {
      setFormError('Произошла непредвиденная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Инициализация шлюза авторизации 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans selection:bg-white/20 selection:text-white">
      
      {/* 1. Верхняя панель навигации / брендинга */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between select-none">
        <Link 
          href="/about" 
          className="flex items-center gap-2.5 font-mono text-xs text-neutral-300 hover:text-white transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/15 flex items-center justify-center text-white group-hover:border-white/30 transition-colors shadow-sm">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight">3D LABS</span>
            <span className="text-neutral-600">//</span>
            <span className="text-neutral-400 hidden sm:inline">OS v2.4</span>
          </div>
        </Link>

        <Link
          href="/about"
          className="px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>[ О системе ]</span>
        </Link>
      </header>

      {/* 2. Основная рабочая область — Cockpit Card авторизации */}
      <main className="w-full max-w-[480px] mx-auto px-4 py-6 select-none">
        <div className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
          
          {/* Верхняя статусная панель консоли (Cockpit Topbar) */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-neutral-900/60">
            <div className="flex items-center gap-3">
              {/* Терминальные светодиоды */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-400/40 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
              </div>

              {/* Штамп раздела */}
              <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
                <span className="text-white font-bold">§ 3D-LABS</span>
                <span className="text-neutral-600">//</span>
                <span className="text-neutral-400 text-[11px]">ACCESS_GATEWAY</span>
              </div>
            </div>

            {/* Индикатор облака */}
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Cloud
            </span>
          </div>

          {/* Тело карточки (Cockpit Canvas) */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/90 space-y-5">
            
            {/* Заголовок и штамп */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                  // {activeTab === 'login' ? 'АУТЕНТИФИКАЦИЯ' : 'РЕГИСТРАЦИЯ ПО КЛЮЧУ'}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  AUTH ENGINE v2.4
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {activeTab === 'login' ? 'Вход в систему 3D Labs' : 'Создание профиля студии'}
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {activeTab === 'login' 
                  ? 'Управление воронкой заказов, складом филаментов и расчетом печати' 
                  : 'Введите ваши данные и уникальный инвайт-ключ администратора'}
              </p>
            </div>

            {/* Скобочный таббар режимов */}
            <div className="bg-white/[0.02] border border-white/10 p-1 rounded-xl grid grid-cols-2 gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setFormError(null);
                }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white/15 text-white font-bold border border-white/20 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>[ Вход ]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setFormError(null);
                }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white/15 text-white font-bold border border-white/20 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>[ Регистрация ]</span>
              </button>
            </div>

            {/* Блок ошибок (Rose Alert) */}
            <AnimatePresence mode="wait">
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-3 flex items-start gap-2.5 text-rose-300 text-xs font-mono"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Форма авторизации / регистрации */}
            <AnimatePresence mode="wait">
              {activeTab === 'login' ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleLoginSubmit}
                  className="space-y-3.5"
                >
                  {/* Поле Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                      // Электронная почта
                    </label>
                    <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                      <input
                        type="email"
                        required={!isDev}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="master@3dlabs.pro"
                        className="w-full bg-transparent font-mono text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Поле Пароль */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                      // Пароль доступа
                    </label>
                    <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!isDev}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent font-mono text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Кнопка отправки Входа (Primary White Capsule) */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-neutral-950 font-bold font-mono text-xs sm:text-sm tracking-tight transition-all shadow-[0_0_25px_-5px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>[ Войти в систему ]</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleRegisterSubmit}
                  className="space-y-3"
                >
                  {/* Баннер о пригласительном ключе */}
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5 text-xs font-mono text-amber-300/90">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <span className="font-bold text-white">Доступ по приглашениям:</span> Для создания профиля требуется одноразовый ключ доступа от администратора.
                    </div>
                  </div>

                  {/* Имя / Название студии */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                      // Имя или название студии
                    </label>
                    <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2.5">
                      <UserIcon className="w-4 h-4 text-neutral-500 shrink-0" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Студия печати 'Форма'"
                        className="w-full bg-transparent font-mono text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                      // Рабочая почта
                    </label>
                    <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="studio@3dlabs.pro"
                        className="w-full bg-transparent font-mono text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Пароль и повтор */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                        // Пароль
                      </label>
                      <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Мин. 6 симв."
                          className="w-full bg-transparent font-mono text-xs text-white placeholder-neutral-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                        // Повтор пароля
                      </label>
                      <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Повтор"
                          className="w-full bg-transparent font-mono text-xs text-white placeholder-neutral-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ключ доступа */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        // Ключ доступа (Invite Key)
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">ТРЕБУЕТСЯ</span>
                    </div>
                    <div className="bg-amber-950/20 border border-amber-500/40 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 rounded-xl px-3 py-2 transition-all flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={regKey}
                        onChange={(e) => setRegKey(e.target.value.toUpperCase())}
                        placeholder="3DLAB-XXXX-XXXX-XXXX"
                        className="w-full bg-transparent font-mono text-xs sm:text-sm font-bold tracking-wider text-amber-300 placeholder-neutral-600 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Кнопка Регистрации (Primary White Capsule) */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-5 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-neutral-950 font-bold font-mono text-xs sm:text-sm tracking-tight transition-all shadow-[0_0_25px_-5px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>[ Активировать ключ и войти ]</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

          </div>

          {/* Нижний статус-бар консоли (Cockpit Status Bar) */}
          <div className="border-t border-white/10 px-4 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>TLS 1.3 · SUPABASE AUTH</span>
            </div>
            <span>INVITE-ONLY GATEWAY</span>
          </div>

        </div>
      </main>

      {/* 3. Глобальный подвал страницы */}
      <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>§ 3D LABS · ENGINE v2.4 · ACCESS RUNTIME</span>
          <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
        </div>
      </footer>

    </div>
  );
}

