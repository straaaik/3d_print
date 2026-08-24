'use client';

import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Поля формы входа
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Поля формы регистрации
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regKey, setRegKey] = useState('');

  // Обработка отправки формы Входа
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Декоративные фоновые неоновые пятна */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0CB4E0]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Основной контейнер авторизации */}
      <div className="w-full max-w-[440px] relative z-10">
        {/* Логотип и брендинг */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B00] via-[#8B5CF6] to-[#0CB4E0] p-[1.5px] shadow-xl shadow-[#FF6B00]/15 mb-3">
            <div className="w-full h-full bg-[#12141a] rounded-2xl flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-[#FF6B00]" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            3D Labs Cloud
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Система учета, калькуляции и управления 3D-печатью
          </p>
        </div>

        {/* Карточка формы */}
        <div className="bg-[#14161d]/95 border border-[#242930] rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          {/* Верхний акцентный градиент карточки */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] via-[#8B5CF6] to-[#0CB4E0]" />

          {/* Стабильный переключатель Вход / Регистрация с плавным слайдером */}
          <div className="bg-[#0e1015] border border-[#242930] p-1 rounded-2xl grid grid-cols-2 gap-1 mb-6 relative">
            {/* Плавающий фон активной вкладки */}
            <motion.div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl z-0 shadow-lg ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#e05e00] shadow-[#FF6B00]/25'
                  : 'bg-gradient-to-r from-[#8B5CF6] to-[#7c3aed] shadow-[#8B5CF6]/25'
              }`}
              animate={{
                left: activeTab === 'login' ? '4px' : 'calc(50% + 0px)',
              }}
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />

            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setFormError(null);
              }}
              className={`relative z-10 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'login' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Вход</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setFormError(null);
              }}
              className={`relative z-10 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'register' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Регистрация</span>
            </button>
          </div>

          {/* Сообщение об ошибке */}
          <AnimatePresence mode="wait">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 flex items-start gap-2.5 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{formError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Контейнер форм с плавной сменой без дергания высоты */}
          <AnimatePresence mode="wait">
            {/* ============================================================= */}
            {/* ВКЛАДКА: ВХОД                                                */}
            {/* ============================================================= */}
            {activeTab === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                {/* Поле Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Электронная почта
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3.5 text-sm text-white focus:outline-none transition-colors placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Поле Пароль */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl pl-3.5 pr-10 text-sm text-white focus:outline-none transition-colors placeholder-gray-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Кнопка отправки Входа */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 mt-3 bg-gradient-to-r from-[#FF6B00] to-[#e05e00] hover:from-[#ff7b1a] hover:to-[#eb680a] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#FF6B00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Войти в аккаунт</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* ============================================================= */
              /* ВКЛАДКА: РЕГИСТРАЦИЯ ТОЛЬКО ПО КЛЮЧУ                          */
              /* ============================================================= */
              <motion.form
                key="register-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={handleRegisterSubmit}
                className="space-y-3.5"
              >
                {/* Предупреждающий баннер о необходимости ключа */}
                <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-2.5 flex items-start gap-2.5 text-xs text-purple-200">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold text-white">Регистрация по приглашению.</span>{' '}
                    Для создания профиля требуется специальный ключ доступа от администратора.
                  </div>
                </div>

                {/* Поле Имя / Название */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                    Ваше имя или название студии
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Иван Иванов / 3D Студия"
                    className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl px-3.5 text-xs sm:text-sm text-white focus:outline-none transition-colors placeholder-gray-600"
                  />
                </div>

                {/* Поле Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    Электронная почта
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl px-3.5 text-xs sm:text-sm text-white focus:outline-none transition-colors placeholder-gray-600"
                  />
                </div>

                {/* Пароль и подтверждение */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Мин. 6 знаков"
                        className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl pl-3 pr-8 text-xs sm:text-sm text-white focus:outline-none transition-colors placeholder-gray-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Повтор пароля
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Повторите"
                        className="w-full h-10 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl pl-3 pr-8 text-xs sm:text-sm text-white focus:outline-none transition-colors placeholder-gray-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* КЛЮЧ ДОСТУПА (ОБЯЗАТЕЛЬНОЕ ПОЛЕ) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      Ключ доступа (Invite Key) *
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">Обязательно</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regKey}
                      onChange={(e) => setRegKey(e.target.value.toUpperCase())}
                      placeholder="3DLAB-XXXX-XXXX-XXXX"
                      className="w-full h-10 bg-[#0e1017] border-2 border-amber-500/40 focus:border-amber-400 rounded-xl px-3.5 text-xs sm:text-sm font-mono tracking-wider font-bold text-amber-300 focus:outline-none transition-colors placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Кнопка регистрации */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Зарегистрироваться</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Футер */}
        <p className="text-center text-gray-500 text-xs mt-6">
          3D Labs © {new Date().getFullYear()} • Безопасный доступ по пригласительным ключам
        </p>
      </div>
    </div>
  );
}
