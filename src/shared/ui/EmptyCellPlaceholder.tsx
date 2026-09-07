'use client';

import React from 'react';

interface EmptyCellPlaceholderProps {
  label?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
}

export function EmptyCellPlaceholder({
  label = '—',
  align = 'left',
  className = '',
  title = 'Неприменимо для типа Расход'
}: EmptyCellPlaceholderProps) {
  const alignClasses = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  };

  return (
    <div className={`flex items-center w-full select-none ${alignClasses[align]}`}>
      <span
        className={`font-mono text-xs text-gray-500/40 cursor-not-allowed select-none px-1 ${className}`}
        title={title}
      >
        {label}
      </span>
    </div>
  );
}
