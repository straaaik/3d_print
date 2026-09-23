'use client';

import React from 'react';
import { RoundDeleteModal } from '../../../shared/ui/RoundDeleteModal';
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

  const isAll = selectedMonthKey === 'all';
  const targetLabel = isAll ? 'все время' : formatMonthKeyLabel(selectedMonthKey);
  const title = isAll ? 'Очистка всех записей' : `Очистка месяца ${targetLabel}`;

  return (
    <RoundDeleteModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      itemName={`${monthOrdersCount} записей (${targetLabel})`}
      itemDetails={`Объём операции: ${monthOrdersCount} позиций`}
      description={`Вы уверены, что хотите безвозвратно удалить все ${monthOrdersCount} записей за ${targetLabel}?`}
    />
  );
}
