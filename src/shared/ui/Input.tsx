import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <span className="text-gray-300 text-sm font-medium">
            {label}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#1a1d24] border border-[#242930] hover:border-secondary focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-white text-sm font-sans transition-colors placeholder-neutral-accent ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
        {hint && !error && <span className="text-neutral-accent text-xs mt-0.5 leading-relaxed">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
