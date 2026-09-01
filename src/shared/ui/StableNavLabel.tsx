import React from 'react';

interface StableNavLabelProps {
  isActive: boolean;
  children: React.ReactNode;
}

/** Reserves the bold label width so changing the active tab cannot resize the navbar. */
export function StableNavLabel({ isActive, children }: StableNavLabelProps) {
  return (
    <span className="grid whitespace-nowrap">
      <span
        className={`col-start-1 row-start-1 font-sans text-xs transition-colors duration-150 ${
          isActive
            ? 'text-white font-bold'
            : 'text-neutral-400 group-hover:text-white font-normal'
        }`}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 font-sans text-xs font-bold"
      >
        {children}
      </span>
    </span>
  );
}
