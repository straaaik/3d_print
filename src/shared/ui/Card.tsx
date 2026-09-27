import React from 'react';

interface CardProps {
  title?: string;
  stepNumber?: string;
  className?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function Card({ title, stepNumber, className = '', children, headerAction }: CardProps) {
  return (
    <div className={`bg-neutral-950/90 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md ${className}`}>
      {(title || stepNumber) && (
        <div className="flex items-center justify-between gap-4 mb-4 select-none border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {stepNumber && (
              <span className="text-cyan-400 font-mono text-sm font-bold shrink-0 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                {stepNumber}
              </span>
            )}
            {title && (
              <h2 className="text-white text-sm sm:text-base font-bold tracking-wide font-mono uppercase">
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
