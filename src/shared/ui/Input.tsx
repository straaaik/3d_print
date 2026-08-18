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
  ({ label, error, hint, requiredStar, isShaking, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <span className="text-gray-300 text-sm font-medium flex items-center">
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
            className={`w-full bg-[#1a1d24] border border-[#242930] hover:border-secondary focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-white text-sm font-sans transition-colors placeholder-neutral-accent ${
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
