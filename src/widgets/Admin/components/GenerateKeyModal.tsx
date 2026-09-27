'use client';

import React, { useState } from 'react';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { ModalDropdown } from '../../../shared/ui/ModalDropdown';
import { Input } from '../../../shared/ui/Input';
import { ModalDetails } from '../../../shared/ui/ModalDetails';
import { UserRole, RegistrationKey } from '../../../shared/types';
import { useAuth } from '../../../entities/model/AuthProvider';
import { useToast } from '../../../entities/model/ToastProvider';
import {
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface GenerateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateKeyModal({ isOpen, onClose }: GenerateKeyModalProps) {
  const { generateKey, generateBatchKeys } = useAuth();
  const { showSuccess, showToast } = useToast();

  const [count, setCount] = useState<number>(1);
  const [role, setRole] = useState<UserRole>('user');
  const [expiresInDays, setExpiresInDays] = useState<string>('0');
  const [note, setNote] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<RegistrationKey[] | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const resetForm = () => {
    setCount(1);
    setRole('user');
    setExpiresInDays('0');
    setNote('');
    setGeneratedKeys(null);
    setCopiedKeyId(null);
    setCopiedAll(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const expDays = parseInt(expiresInDays, 10);
      const options = {
        role,
        note: note.trim() || undefined,
        expiresInDays: expDays > 0 ? expDays : null,
      };

      if (count === 1) {
        const key = await generateKey(options);
        setGeneratedKeys([key]);
        showSuccess('Ключ доступа успешно сгенерирован', 'Успешно');
      } else {
        const batch = await generateBatchKeys(count, options);
        setGeneratedKeys(batch);
        showSuccess(`Сгенерировано ключей: ${batch.length}`, 'Успешно');
      }
    } catch {
      showToast('Не удалось сгенерировать ключи', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copySingleKey = (key: RegistrationKey) => {
    navigator.clipboard.writeText(key.key);
    setCopiedKeyId(key.id);
    showSuccess(`Ключ ${key.key} скопирован в буфер`);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const copyAllKeys = () => {
    if (!generatedKeys || generatedKeys.length === 0) return;
    const text = generatedKeys
      .map((k, idx) => `${idx + 1}. ${k.key} [${k.role_to_grant === 'admin' ? 'Администратор' : 'Пользователь'}]${k.note ? ` - ${k.note}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    showSuccess(`Все ${generatedKeys.length} ключей скопированы в буфер`);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <CockpitModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Генератор ключей доступа"
      subtitle="Одноразовые ключи"
      maxWidth="md"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {!generatedKeys ? (
            <CockpitButton onClick={handleGenerate} disabled={isGenerating} icon={Sparkles}>{isGenerating ? 'Создание...' : count === 1 ? 'Создать ключ' : 'Создать ключи (' + count + ')'}</CockpitButton>
          ) : (
            <>
              <CockpitButton onClick={resetForm}>Создать ещё</CockpitButton>
              {generatedKeys.length > 1 && <CockpitButton onClick={copyAllKeys} icon={copiedAll ? Check : Copy}>{copiedAll ? 'Скопировано' : 'Копировать все'}</CockpitButton>}
            </>
          )}
        </div>
      }
    >
      {!generatedKeys ? (
        <div className="space-y-5">
          <ModalDropdown
            label="Кому выдать доступ"
            ariaLabel="Уровень доступа"
            value={role}
            onChange={(value) => setRole(value as UserRole)}
            options={[
              { value: 'user', label: 'Пользователь', subtext: 'Калькулятор, заказы и каталог' },
              { value: 'admin', label: 'Администратор', subtext: 'Полный доступ, включая управление аккаунтами' },
            ]}
            usePortal
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ModalDropdown label="Количество ключей" ariaLabel="Количество ключей" value={String(count)} onChange={(value) => setCount(Number(value))} options={[1, 5, 10, 20].map((value) => ({ value: String(value), label: String(value) }))} usePortal />
            <ModalDropdown label="Срок активации" ariaLabel="Срок активации ключа" value={expiresInDays} onChange={setExpiresInDays} options={[
              { value: '0', label: 'Без ограничения' }, { value: '1', label: '1 день' }, { value: '3', label: '3 дня' }, { value: '7', label: '7 дней' }, { value: '30', label: '30 дней' }, { value: '90', label: '90 дней' },
            ]} usePortal />
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">Каждый ключ позволяет зарегистрировать один аккаунт.</p>
          <ModalDetails title="Заметка" summary={note || 'Необязательно'}>
            <Input aria-label="Заметка о ключе" placeholder="Например, для оператора Ивана" value={note} onChange={(e) => setNote(e.target.value)} />
          </ModalDetails>
        </div>
      ) : (
        /* Результаты генерации */
        <div className="space-y-4 pt-1 font-mono text-xs">
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 flex items-center gap-3 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white font-mono">
                {generatedKeys.length === 1 ? 'Ключ успешно создан!' : `Сгенерировано ключей: ${generatedKeys.length}`}
              </div>
              <div className="text-[11px] text-emerald-300/80 font-sans">
                Передайте ключ пользователю для одноразовой регистрации
              </div>
            </div>
          </div>

          {/* Список ключей */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {generatedKeys.map((keyItem) => {
              const isCopied = copiedKeyId === keyItem.id;
              return (
                <div
                  key={keyItem.id}
                  className="bg-[#121214]/90 border border-[#26262b] rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-white/30 "
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-bold text-amber-300 tracking-wider">
                      {keyItem.key}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                      <span className={keyItem.role_to_grant === 'admin' ? 'text-amber-400 font-semibold' : 'text-cyan-400'}>
                        {keyItem.role_to_grant === 'admin' ? 'Администратор' : 'Пользователь'}
                      </span>
                      {keyItem.note && (
                        <>
                          <span>•</span>
                          <span className="truncate">{keyItem.note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copySingleKey(keyItem)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-[#26262b]'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </CockpitModal>
  );
}
