import React, { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  requiredStar?: boolean;
  isShaking?: boolean;
  isModified?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, requiredStar, isShaking, isModified, className = '', onFocus, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 font-mono text-xs">
        {label && (
          <span className="text-neutral-400 text-xs font-mono uppercase tracking-wider flex items-center select-none">
            {label}
            {(requiredStar || props.required) && (
              <span className="text-rose-400 ml-1 font-bold">*</span>
            )}
          </span>
        )}
        <motion.div
          animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="w-full"
        >
          <input
            ref={ref}
            step={props.type === 'number' ? (props.step ?? 'any') : props.step}
            onFocus={(e) => {
              if (onFocus) onFocus(e);
              if (props.type === 'number' || e.target.value === '0' || e.target.value === '0.00') {
                e.target.select();
              }
            }}
            className={`w-full h-9 min-h-[36px] bg-neutral-900 border border-white/15 hover:border-white/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none rounded-xl px-3 text-white text-xs font-mono placeholder-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed ${
              isModified ? '!border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-amber-500/[0.03]' : ''
            } ${
              error || isShaking ? '!border-rose-500/80 focus:!border-rose-500 shadow-sm shadow-rose-500/20' : ''
            } ${className}`}
            {...props}
          />
        </motion.div>
        {error && <span className="text-rose-400 text-[11px] font-mono mt-0.5">{error}</span>}
        {hint && !error && <span className="text-neutral-500 text-[10px] font-mono mt-0.5 leading-relaxed">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
