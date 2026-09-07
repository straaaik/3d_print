import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-bold focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none';

  const variants = {
    primary: 'bg-white text-neutral-950 hover:bg-neutral-200 shadow-sm rounded-xl',
    secondary: 'bg-white/10 text-white hover:bg-white/15 border border-white/15 rounded-xl',
    danger: 'bg-rose-950/60 text-rose-300 border border-rose-800/40 hover:bg-rose-900/80 rounded-xl',
    outline: 'border border-white/15 text-neutral-300 hover:text-white hover:bg-white/10 rounded-xl',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs sm:text-sm',
    lg: 'px-5 py-2.5 text-sm sm:text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
