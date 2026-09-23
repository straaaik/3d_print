'use client';

import React, { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { ModalDetails } from '../../shared/ui/ModalDetails';
import { MotionRevealDiv } from '../../shared/ui/MotionPrimitives';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';

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
  const [previousSource, setPreviousSource] = useState({ isOpen, currentUser });

  if (previousSource.isOpen !== isOpen || previousSource.currentUser !== currentUser) {
    setPreviousSource({ isOpen, currentUser });
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
  }

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
    <Modal isOpen={isOpen} onClose={onClose} title="Профиль" subtitle={currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'} maxWidth="md"
      footer={<div className="flex w-full justify-end"><CockpitButton type="submit" form="edit-profile-form" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</CockpitButton></div>}
    >
      <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <p role="alert" className="text-xs leading-relaxed text-rose-300">{error}</p>}
        <Input label="Имя" aria-label="Имя пользователя" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" required autoFocus />
        <Input label="Электронная почта" aria-label="Электронная почта" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
        <ModalDetails title="Оформление и данные аккаунта">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base text-neutral-950" style={{ backgroundColor: avatarColor }}>{name ? name.charAt(0).toUpperCase() : '?'}</span>
            <div className="space-y-2">
              <span className="text-xs text-neutral-400">Цвет аватара</span>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PALETTE.map((color) => (
                  <motion.button key={color} type="button" aria-label={'Цвет аватара ' + color} aria-pressed={avatarColor === color} onClick={() => setAvatarColor(color)} whileHover={{ scale: 1.12 }} transition={{ duration: 0.15 }} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white/20" style={{ backgroundColor: color }}>
                    {avatarColor === color && <Check className="h-3 w-3 text-neutral-950" />}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
          <p className="break-all text-[11px] leading-relaxed text-neutral-500">Ключ регистрации: {currentUser?.registration_key_used || 'Системный аккаунт'}</p>
        </ModalDetails>
        <div className="space-y-4 border-t border-[#2a2a30] pt-3">
          <CockpitButton aria-expanded={isChangingPassword} onClick={() => setIsChangingPassword(!isChangingPassword)}>{isChangingPassword ? 'Не менять пароль' : 'Изменить пароль'}</CockpitButton>
          {isChangingPassword && (
            <MotionRevealDiv className="space-y-4">
              {[
                { label: 'Текущий пароль', value: currentPassword, setValue: setCurrentPassword, visible: showCurrentPass, setVisible: setShowCurrentPass, autoComplete: 'current-password' },
                { label: 'Новый пароль', value: newPassword, setValue: setNewPassword, visible: showNewPass, setVisible: setShowNewPass, autoComplete: 'new-password' },
                { label: 'Повторите новый пароль', value: confirmPassword, setValue: setConfirmPassword, visible: showConfirmPass, setVisible: setShowConfirmPass, autoComplete: 'new-password' },
              ].map((field) => (
                <div key={field.label} className="relative">
                  <Input label={field.label} aria-label={field.label} type={field.visible ? 'text' : 'password'} value={field.value} onChange={(e) => field.setValue(e.target.value)} autoComplete={field.autoComplete} className="pr-10" required />
                  <motion.button type="button" aria-label={(field.visible ? 'Скрыть: ' : 'Показать: ') + field.label} onClick={() => field.setVisible(!field.visible)} whileHover={{ color: 'var(--cockpit-accent-color)' }} className="absolute bottom-2.5 right-3 cursor-pointer text-neutral-500">
                    {field.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </motion.button>
                </div>
              ))}
              <p className="text-[11px] text-neutral-500">Новый пароль — не менее 6 символов.</p>
            </MotionRevealDiv>
          )}
        </div>
      </form>
    </Modal>
  );
}
