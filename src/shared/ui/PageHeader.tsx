'use client';

import React from 'react';

export interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  /** Акцентный цвет секции в HEX (например #FF6B00, #00e676, #0CB4E0) */
  accentColor?: string;
  /** Кнопки и элементы управления в правой части шапки */
  actions?: React.ReactNode;
  /** Дополнительный контент под заголовком (например переключатель месяцев) */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  accentColor = '#FF6B00',
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`bg-[#16181d] border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden z-10 select-none ${className}`}
      style={{
        borderColor: `${accentColor}33`, // 20% не прозрачности в hex (33)
      }}
    >
      {/* Мягкое фоновое неоновое свечение в правом верхнем углу */}
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none -z-10"
        style={{
          backgroundColor: `${accentColor}1F`, // ~12% непрозрачности
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Контейнер иконки раздела */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              backgroundColor: `${accentColor}26`, // 15% opacity
              borderColor: `${accentColor}4D`, // 30% opacity
              borderWidth: '1px',
              color: accentColor,
              boxShadow: `0 4px 14px ${accentColor}20`,
            }}
          >
            <Icon className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[#9ca3af] text-xs sm:text-sm mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Правый блок действий */}
        {actions && (
          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Дополнительное содержимое (например, фильтр месяцев) */}
      {children}
    </div>
  );
}
