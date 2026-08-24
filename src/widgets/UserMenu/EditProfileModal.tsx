'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Palette, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  Save
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PALETTE = [
  '#FF6B00', '#00E676', '#0CB4E0', '#8B5CF6', 
  '#EC4899', '#F59E0B', '#3B82F6', '#10B981',
  '#6366F1', '#14B8A6', '#E11D48', '#84CC16'
];

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { currentUser, updateProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState('#8B5CF6');

  // Смена пароля
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Синхронизация при открытии
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatarColor(currentUser.avatar_color || '#8B5CF6');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
      setError(null);
    }
  }, [currentUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Имя и email обязательны для заполнения');
      return;
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        setError('Введите текущий пароль');
        return;
      }
      if (newPassword.length < 6) {
        setError('Новый пароль должен содержать минимум 6 символов');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Новый пароль и подтверждение не совпадают');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatarColor,
        currentPassword: isChangingPassword ? currentPassword : undefined,
        newPassword: isChangingPassword ? newPassword : undefined,
      });

      if (res.success) {
        showSuccess('Профиль успешно обновлен', 'Сохранено');
        onClose();
      } else {
        setError(res.error || 'Не удалось обновить профиль');
        showError(res.error || 'Ошибка сохранения');
      }
    } catch {
      setError('Произошла непредвиденная ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактирование профиля"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Сообщение об ошибке */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Верхняя плашка с текущим аватаром и выбором цвета */}
        <div className="bg-[#12141a] border border-[#242930] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shrink-0 transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="text-xs font-semibold text-gray-300 flex items-center justify-center sm:justify-start gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              Цвет аватара
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              {AVATAR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-6 h-6 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                    avatarColor === color ? 'scale-110 ring-2 ring-white shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {avatarColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Поле Имя */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-purple-400" />
            Имя пользователя / Название студии
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full h-10 bg-[#14161d] border border-[#242930] hover:border-purple-800 focus:border-purple-500 rounded-xl px-3.5 text-xs sm:text-sm text-white focus:outline-none transition-colors"
          />
        </div>

        {/* Поле Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-purple-400" />
            Электронная почта
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full h-10 bg-[#14161d] border border-[#242930] hover:border-purple-800 focus:border-purple-500 rounded-xl px-3.5 text-xs sm:text-sm text-white focus:outline-none transition-colors"
          />
        </div>

        {/* Системная информация (Роль и ключ) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#12141a] border border-[#242930] rounded-xl p-2.5">
            <div className="text-[10px] text-gray-500 font-semibold">Роль в системе</div>
            <div className="font-bold text-white flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              {currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
          </div>
          <div className="bg-[#12141a] border border-[#242930] rounded-xl p-2.5">
            <div className="text-[10px] text-gray-500 font-semibold">Ключ регистрации</div>
            <div className="font-mono text-amber-300 text-[11px] truncate font-bold mt-0.5">
              {currentUser?.registration_key_used || 'Системный'}
            </div>
          </div>
        </div>

        {/* Переключатель смены пароля */}
        <div className="pt-2 border-t border-[#242930]">
          <button
            type="button"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isChangingPassword ? 'Отменить смену пароля' : 'Изменить пароль аккаунта'}</span>
          </button>
        </div>

        {/* Блок смены пароля */}
        {isChangingPassword && (
          <div className="space-y-3 p-3.5 bg-[#12141a] border border-purple-900/40 rounded-2xl">
            {/* Текущий пароль */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                  <span>Текущий пароль</span>
                  <span className="text-red-400 font-bold">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 bg-[#14161d] border border-[#242930] focus:border-purple-500 rounded-xl pl-3.5 pr-10 text-xs sm:text-sm text-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Новый пароль и повтор (идеально выровненная сетка) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Новый пароль */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <label className="text-xs font-semibold text-gray-300">
                    Новый пароль
                  </label>
                  <span className="text-[10px] text-gray-500">мин. 6 знаков</span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 bg-[#14161d] border border-[#242930] focus:border-purple-500 rounded-xl pl-3.5 pr-10 text-xs sm:text-sm text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Повтор пароля */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <label className="text-xs font-semibold text-gray-300">
                    Повтор пароля
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 bg-[#14161d] border border-[#242930] focus:border-purple-500 rounded-xl pl-3.5 pr-10 text-xs sm:text-sm text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки модалки */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить изменения</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
