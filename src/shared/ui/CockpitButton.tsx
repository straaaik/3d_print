import React, { ButtonHTMLAttributes } from 'react';
import { Tooltip } from './Tooltip';

export interface CockpitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title?: string;
  tooltip?: React.ReactNode;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  tooltipShortcut?: string;
  tooltipSubtext?: string;
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  dotColor?: string;
  badge?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const CockpitButton = React.forwardRef<HTMLButtonElement, CockpitButtonProps>(
  function CockpitButton(
    {
      isActive = false,
      icon: Icon,
      dotColor,
      badge,
      className = '',
      children,
      disabled = false,
      size = 'sm',
      title,
      tooltip,
      tooltipPosition = 'top',
      tooltipShortcut,
      tooltipSubtext,
      ...props
    },
    ref
  ) {
    const sizeStyles = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm';

    const buttonNode = (
      <button
        ref={ref}
        type={props.type || 'button'}
        disabled={disabled}
        className={`group font-mono flex items-center gap-1.5 cursor-pointer border rounded-lg ${sizeStyles} ${
          disabled
            ? 'border-white/5 bg-white/[0.02] text-neutral-600 opacity-40 cursor-not-allowed'
            : isActive
            ? 'border-white/20 bg-white/15 text-white font-bold shadow-sm'
            : 'border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/15 hover:border-white/20'
        } ${className}`}
        {...props}
      >
        {dotColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
        {Icon && (
          <Icon
            className={`w-3 h-3 shrink-0 ${
              disabled
                ? 'text-neutral-600'
                : isActive
                ? 'text-cyan-400'
                : 'text-neutral-400 group-hover:text-cyan-400'
            }`}
          />
        )}
        <span className="inline-flex items-center gap-1">
          <span
            className={` ${
              disabled
                ? 'text-neutral-600'
                : isActive
                ? 'text-cyan-400 font-bold'
                : 'text-neutral-500 group-hover:text-cyan-400'
            }`}
          >
            [
          </span>
          <span className="leading-none">{children}</span>
          {badge !== undefined && badge !== null && (
            <span
              className={`text-[10px] leading-none ${
                isActive ? 'text-white/90 font-bold' : 'text-neutral-400 group-hover:text-white/80'
              }`}
            >
              {badge}
            </span>
          )}
          <span
            className={` ${
              disabled
                ? 'text-neutral-600'
                : isActive
                ? 'text-cyan-400 font-bold'
                : 'text-neutral-500 group-hover:text-cyan-400'
            }`}
          >
            ]
          </span>
        </span>
      </button>
    );

    const tooltipContent = tooltip || title;

    if (tooltipContent) {
      return (
        <Tooltip
          content={tooltipContent}
          position={tooltipPosition}
          shortcut={tooltipShortcut}
          subtext={tooltipSubtext}
        >
          {buttonNode}
        </Tooltip>
      );
    }

    return buttonNode;
  }
);

