import React from 'react';

interface CardProps {
  title?: string;
  stepNumber?: string;
  className?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode; // Дополнительный элемент в шапке (например, кнопка сброса)
}

export function Card({ title, stepNumber, className = '', children, headerAction }: CardProps) {
  return (
    <div className={`bg-[#16181d] border border-[#242930] rounded-xl p-4 sm:p-5 ${className}`}>
      {(title || stepNumber) && (
        <div className="flex items-center justify-between gap-4 mb-4 select-none">
          <div className="flex items-center gap-2">
            {stepNumber && (
              <span className="text-primary font-mono text-xl font-bold shrink-0">
                {stepNumber}
              </span>
            )}
            {title && (
              <h2 className="text-white text-lg font-bold tracking-wide">
                {title}
              </h2>
            )}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}
