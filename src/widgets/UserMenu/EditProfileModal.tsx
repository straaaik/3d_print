'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { CockpitButton } from '../../shared/ui/CockpitButton';
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
  '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#3B82F6', '#14B8A6', '#F43F5E',
  '#6366F1', '#84CC16', '#737373', '#FFFFFF'
];

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { currentUser, updateProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState('#06B6D4');

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

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatarColor(currentUser.avatar_color || '#06B6D4');
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
      title="Профиль пользователя"
      subtitle="Настройки аккаунта"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 font-mono text-xs">
        {/* Сообщение об ошибке */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800/40 rounded-xl p-3 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Верхняя плашка с текущим аватаром */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-neutral-950 shadow-xl shrink-0 transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="text-xs text-neutral-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 font-mono">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Цвет аватара:
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              {AVATAR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-6 h-6 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                    avatarColor === color ? 'scale-110 ring-2 ring-white shadow-md' : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {avatarColor === color && (
                    <Check className={`w-3.5 h-3.5 ${color === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Поле Имя */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
            Имя пользователя / Название студии:
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full h-9 bg-neutral-900 border border-white/15 hover:border-white/25 focus:border-cyan-400 rounded-xl px-3 text-xs text-white focus:outline-none transition-colors font-sans"
          />
        </div>

        {/* Поле Email */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            Электронная почта:
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full h-9 bg-neutral-900 border border-white/15 hover:border-white/25 focus:border-cyan-400 rounded-xl px-3 text-xs text-white focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Системная информация */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-2.5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Роль в системе</div>
            <div className="font-bold text-white flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              {currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
          </div>
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-2.5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Ключ регистрации</div>
            <div className="font-mono text-amber-300 text-[11px] truncate font-bold mt-0.5">
              {currentUser?.registration_key_used || 'Системный'}
            </div>
          </div>
        </div>

        {/* Переключатель смены пароля */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isChangingPassword ? '[ Отменить смену пароля ]' : '[ Изменить пароль аккаунта ]'}</span>
          </button>
        </div>

        {/* Блок смены пароля */}
        {isChangingPassword && (
          <div className="space-y-3 p-3.5 bg-neutral-900/60 border border-white/15 rounded-2xl">
            {/* Текущий пароль */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <span>Текущий пароль</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl pl-3 pr-10 text-xs text-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Новый пароль и повтор */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400 uppercase tracking-wider">
                    Новый пароль
                  </label>
                  <span className="text-[10px] text-neutral-500">мин. 6</span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl pl-3 pr-10 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 uppercase tracking-wider block">
                  Повтор пароля
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl pl-3 pr-10 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки модалки */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <CockpitButton
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="submit"
            disabled={isSaving}
            icon={Save}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </CockpitButton>
        </div>
      </form>
    </Modal>
  );
}
