'use client';

import React from 'react';
import { RoundDeleteModal } from './RoundDeleteModal';

export interface CockpitDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  itemName?: React.ReactNode;
  itemDetails?: React.ReactNode;
  itemType?: string;
  description?: React.ReactNode;
  warningDetails?: React.ReactNode;
  undoHint?: boolean;
  swipeLabel?: string;
  confirmingLabel?: string;
  isDeleting?: boolean;
  children?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CockpitDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение удаления',
  subtitle,
  itemName,
  itemDetails,
  description,
  isDeleting = false,
  warningDetails,
  children,
}: CockpitDeleteModalProps) {
  const displayItemName = itemName || subtitle || 'Выбранная запись';
  const displayItemDetails = itemDetails || (subtitle && subtitle !== itemName ? subtitle : undefined);

  return (
    <RoundDeleteModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      itemName={displayItemName}
      itemDetails={displayItemDetails}
      description={description || 'Вы действительно хотите удалить эту запись? Действие необратимо.'}
      isDeleting={isDeleting}
    >
      {warningDetails}
      {children}
    </RoundDeleteModal>
  );
}
