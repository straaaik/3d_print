import React from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatMonthKeyLabel } from '../helpers';

interface ClearMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthKey: string;
  monthOrdersCount: number;
  onConfirm: () => void;
}

export function ClearMonthModal({
  isOpen,
  onClose,
  selectedMonthKey,
  monthOrdersCount,
  onConfirm,
}: ClearMonthModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Очистка месяца ${selectedMonthKey !== 'all' ? formatMonthKeyLabel(selectedMonthKey) : ''}`}
      variant="error"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Вы уверены, что хотите удалить все <strong className="text-white font-bold">{monthOrdersCount} записей</strong> за{' '}
            <strong className="text-white font-bold">{formatMonthKeyLabel(selectedMonthKey)}</strong>?
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed select-none">
          Все заказы и расходы за этот месяц будут удалены. Это действие можно будет отменить клавишами <kbd className="px-1.5 py-0.5 bg-[#242930] rounded text-gray-300 font-mono">Alt + Z</kbd>.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242930]">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Отмена
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={onConfirm}
            className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white border-none shadow-lg shadow-rose-950/50 font-bold px-4 py-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Очистить {monthOrdersCount} {monthOrdersCount === 1 ? 'запись' : monthOrdersCount < 5 ? 'записи' : 'записей'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
