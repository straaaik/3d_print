'use client';

import React, { useState } from 'react';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../../shared/ui/CockpitDropdown';
import { Input } from '../../../shared/ui/Input';
import { UserRole, RegistrationKey } from '../../../shared/types';
import { useAuth } from '../../../entities/model/AuthProvider';
import { useToast } from '../../../entities/model/ToastProvider';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Layers, 
  CheckCircle2,
  FileText
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
      stamp="ACCESS_KEY_GENERATOR"
      title="Генератор ключей доступа"
      subtitle="Создавайте один или несколько одноразовых ключей с ролью и сроком действия."
      variant="cyan"
      maxWidth="lg"
      badge={<span className="rounded border border-cyan-800/40 bg-cyan-950/60 px-2 py-0.5 text-[9px] font-bold text-cyan-400">SECURE</span>}
    >
      {!generatedKeys ? (
        <div className="space-y-4 pt-1 font-mono text-xs">
          {/* Количество ключей */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Количество ключей:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                    count === num
                      ? 'bg-white text-neutral-950 border-white shadow-sm'
                      : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {num === 1 ? '1 ключ' : `${num} шт`}
                </button>
              ))}
            </div>
          </div>

          {/* Роль */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Уровень доступа (Роль):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  role === 'user'
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-white shadow-sm'
                    : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  Пользователь
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Доступ к калькулятору, заказам, складам и расчетам
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-amber-950/50 border-amber-500/40 text-white shadow-sm'
                    : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Администратор
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  Полный доступ + генерация ключей и управление аккаунтами
                </div>
              </button>
            </div>
          </div>

          {/* Срок действия */}
          <div className="space-y-1.5">
            <CockpitDropdown
              label={
                <span className="flex items-center gap-1.5 text-xs text-neutral-400 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Срок действия ключа:
                </span>
              }
              value={expiresInDays}
              onChange={(val) => setExpiresInDays(val)}
              options={[
                { value: '0', label: 'Бессрочно', subtext: 'Без ограничений по времени' },
                { value: '1', label: '24 часа (1 день)', badge: '1 день' },
                { value: '3', label: '3 дня', badge: '3 дня' },
                { value: '7', label: '7 дней (1 неделя)', badge: '1 неделя' },
                { value: '30', label: '30 дней (1 месяц)', badge: '1 месяц' },
                { value: '90', label: '90 дней (3 месяца)', badge: '3 месяца' },
              ]}
              variant="input"
              placeholder="Выберите срок действия..."
            />
          </div>

          {/* Заметка */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Заметка / Назначение:
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: Для оператора цеха, Мастер Иван..."
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <CockpitButton
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Отмена
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              icon={Sparkles}
              isActive={true}
              className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
            >
              {isGenerating ? 'Генерация...' : `Сгенерировать ${count > 1 ? `(${count} шт)` : 'ключ'}`}
            </CockpitButton>
          </div>
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
                  className="bg-neutral-900 border border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-white/30 transition-colors"
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
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

          {/* Футер после генерации */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <CockpitButton
              type="button"
              onClick={resetForm}
            >
              Сгенерировать ещё
            </CockpitButton>

            <div className="flex items-center gap-2">
              {generatedKeys.length > 1 && (
                <CockpitButton
                  type="button"
                  onClick={copyAllKeys}
                  icon={copiedAll ? Check : Copy}
                >
                  {copiedAll ? 'Все скопированы' : 'Скопировать все'}
                </CockpitButton>
              )}
              <CockpitButton
                type="button"
                onClick={handleClose}
                isActive={true}
                className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
              >
                Готово
              </CockpitButton>
            </div>
          </div>
        </div>
      )}
    </CockpitModal>
  );
}
