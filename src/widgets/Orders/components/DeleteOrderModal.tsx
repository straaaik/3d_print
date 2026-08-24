import React from 'react';
import { Order } from '../types';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatMoney } from '../helpers';

interface DeleteOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteOrderModal({
  order,
  onClose,
  onConfirm,
}: DeleteOrderModalProps) {
  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title="Подтверждение удаления"
      variant="error"
      maxWidth="sm"
    >
      {order && (
        <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Вы уверены, что хотите удалить {order.type === 'expense' ? 'операционный расход' : 'заказ'}{' '}
            <strong className="text-white">#{order.order_number || ''} «{order.title}»</strong> на сумму{' '}
            <span className="font-mono font-bold text-rose-400">{formatMoney(order.amount)}</span>?
          </div>
        </div>

        <p className="text-xs text-gray-400 select-none">
          Это действие можно будет отменить нажатием клавиш <kbd className="px-1.5 py-0.5 bg-[#242930] rounded text-gray-300 font-mono">Alt + Z</kbd>.
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
            Удалить запись
          </Button>
        </div>
      </div>
      )}
    </Modal>
  );
}
