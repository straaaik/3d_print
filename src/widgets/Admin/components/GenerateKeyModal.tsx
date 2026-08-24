'use client';

import React, { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { UserRole, RegistrationKey } from '../../../shared/types';
import { useAuth } from '../../../entities/model/AuthProvider';
import { useToast } from '../../../entities/model/ToastProvider';
import { 
  KeyRound, 
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
  const [expiresInDays, setExpiresInDays] = useState<string>('0'); // 0 = бессрочно
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Генератор ключей доступа"
      maxWidth="md"
    >
      {!generatedKeys ? (
        <div className="space-y-4 pt-1">
          {/* Количество ключей */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Количество ключей
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    count === num
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                      : 'bg-[#14161d] border-[#242930] text-gray-400 hover:text-white hover:border-purple-800'
                  }`}
                >
                  {num === 1 ? '1 ключ' : `${num} шт`}
                </button>
              ))}
            </div>
          </div>

          {/* Роль, которую дает ключ */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Уровень доступа (Роль)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  role === 'user'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-600/20'
                    : 'bg-[#14161d] border-[#242930] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                  <UserCheck className="w-4 h-4" />
                  Пользователь
                </div>
                <div className="text-[11px] text-gray-400">
                  Доступ к калькулятору, заказам, складам и настройкам
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-600/20'
                    : 'bg-[#14161d] border-[#242930] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  Администратор
                </div>
                <div className="text-[11px] text-gray-400">
                  Полный доступ + генерация ключей и управление аккаунтами
                </div>
              </button>
            </div>
          </div>

          {/* Срок действия */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Срок действия ключа
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="w-full h-10 bg-[#14161d] border border-[#242930] hover:border-purple-700 focus:border-purple-500 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none transition-colors"
            >
              <option value="0">Бессрочно (без ограничений по времени)</option>
              <option value="1">24 часа (1 день)</option>
              <option value="3">3 дня</option>
              <option value="7">7 дней (1 неделя)</option>
              <option value="30">30 дней (1 месяц)</option>
              <option value="90">90 дней (3 месяца)</option>
            </select>
          </div>

          {/* Заметка / Назначение */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Заметка / Кому выдается (опционально)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: Для оператора цеха, Мастер Иван, Клиент VIP"
              className="w-full h-10 bg-[#14161d] border border-[#242930] hover:border-purple-700 focus:border-purple-500 rounded-xl px-3 text-xs sm:text-sm text-white focus:outline-none transition-colors placeholder-gray-600"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Отмена
            </Button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Сгенерировать {count > 1 ? `(${count} шт)` : 'ключ'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Экран с результатами генерации */
        <div className="space-y-4 pt-1">
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">
                {generatedKeys.length === 1 ? 'Ключ успешно создан!' : `Сгенерировано ключей: ${generatedKeys.length}`}
              </div>
              <div className="text-[11px] text-emerald-300/80">
                Передайте ключ пользователю для одноразовой регистрации
              </div>
            </div>
          </div>

          {/* Список сгенерированных ключей */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {generatedKeys.map((keyItem) => {
              const isCopied = copiedKeyId === keyItem.id;
              return (
                <div
                  key={keyItem.id}
                  className="bg-[#14161d] border border-purple-900/40 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-purple-600/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm sm:text-base font-bold text-amber-300 tracking-wider">
                      {keyItem.key}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span className={keyItem.role_to_grant === 'admin' ? 'text-purple-400 font-semibold' : 'text-blue-400'}>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-700/50'
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

          {/* Кнопки действий после генерации */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242930]">
            <Button
              variant="outline"
              onClick={resetForm}
            >
              Сгенерировать ещё
            </Button>

            <div className="flex items-center gap-2">
              {generatedKeys.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={copyAllKeys}
                  className="flex items-center gap-1.5"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Все скопированы' : 'Скопировать все'}</span>
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleClose}
              >
                Готово
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
