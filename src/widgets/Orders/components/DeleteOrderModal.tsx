'use client';

import React from 'react';
import { Order } from '../types';
import { RoundDeleteModal } from '../../../shared/ui/RoundDeleteModal';
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
  if (!order) return null;

  const isExpense = order.type === 'expense';
  const itemType = isExpense ? 'операционный расход' : 'заказ';
  const itemLabel = `#${order.order_number || ''} «${order.title}»`;

  return (
    <RoundDeleteModal
      isOpen={!!order}
      onClose={onClose}
      onConfirm={onConfirm}
      title={isExpense ? 'Удаление расхода' : 'Удаление заказа'}
      itemName={itemLabel}
      itemDetails={`Сумма: ${formatMoney(order.amount)}`}
      description={`Вы действительно хотите безвозвратно удалить ${itemType}? Действие необратимо.`}
    />
  );
}
