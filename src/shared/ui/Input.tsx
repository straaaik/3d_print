import React, { InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  requiredStar?: boolean;
  isShaking?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, requiredStar, isShaking, className = '', onFocus, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <span className="text-gray-300 text-xs sm:text-sm font-medium flex items-center select-none">
            {label}
            {(requiredStar || props.required) && (
              <span className="text-red-400 ml-1 font-bold">*</span>
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
            className={`w-full h-9 min-h-[36px] bg-[#14161d] border border-[#242930] hover:border-secondary focus:border-primary focus:outline-none rounded-xl px-3 text-white text-xs sm:text-sm font-sans transition-colors placeholder-neutral-accent disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#101217] disabled:border-[#1e222b] disabled:hover:border-[#1e222b] ${
              error || isShaking ? 'border-red-500/80 focus:border-red-500 shadow-sm shadow-red-500/20' : ''
            } ${className}`}
            {...props}
          />
        </motion.div>
        {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
        {hint && !error && <span className="text-neutral-accent text-xs mt-0.5 leading-relaxed">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
